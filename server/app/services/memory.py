"""
Memory management simulations: contiguous allocation, segmentation, paging and
multi-level paging.

All sizes are in KB unless stated otherwise. Every simulation is deterministic
(any pseudo-random reference strings are seeded from the process id) so the same
request always produces the same result.

Time model
----------
* Linear allocation / segmentation are event driven: a process is placed when it
  arrives and (optionally) leaves ``duration`` time units later.  The simulation
  stops once the last process that arrives before ``simulation_time`` has been
  handled, and the reported metrics describe memory at that moment.
* Paging / multi-level paging are tick driven: every live process issues one
  memory reference per tick.  Replacement is global (across all processes) unless
  a per-process working-set cap is hit (multi-level paging only).
"""
import bisect
import math
import random
from collections import OrderedDict, deque
from typing import Any, Dict, List, Optional, Tuple

from app.models.memory import (
    AllocationEvent, Frame, LinearAllocationConfig, MemoryAllocationMethod,
    MemoryBlock, MemoryMetrics, MemoryRequest, MemoryResult, MemoryState,
    MemoryVisualization, MultiLevelPagingConfig, PagingConfig, Process,
    ReplacementAlgorithm, Segment, SegmentationConfig,
)

# Modelled latencies (nanoseconds)
NS_BLOCK_EXAMINED = 50.0       # looking at one hole while searching
NS_SPLIT = 100.0               # splitting / coalescing bookkeeping
NS_COMPACT_PER_KB = 2000.0     # copying 1 KB during compaction
NS_MEMORY_ACCESS = 100.0       # one main-memory access
NS_TLB_LOOKUP = 10.0
NS_PAGE_FAULT = 8_000_000.0    # servicing a fault from the backing store (8 ms)

MAX_EVENT_STATES = 200
MAX_REFERENCES_TOTAL = 1000
MAX_REFERENCES_PER_PROCESS = 200
VIRTUAL_ADDRESS_BITS = 32
PAGE_TABLE_ENTRY_BYTES = 4

DEFAULT_SEGMENT_WEIGHTS = [("code", 0.30), ("data", 0.25), ("stack", 0.20), ("heap", 0.25)]


class MemoryManagementService:

    # ------------------------------------------------------------------ #
    # Shared helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _ordered(processes: List[Process]) -> List[Process]:
        """Stable ordering by (arrival_time, original position)."""
        indexed = list(enumerate(processes))
        indexed.sort(key=lambda ip: (ip[1].arrival_time, ip[0]))
        return [p for _, p in indexed]

    @staticmethod
    def _lifecycle(processes: List[Process], simulation_time: float):
        """Return (arrivals, skipped, cutoff) for an event-driven simulation."""
        ordered = MemoryManagementService._ordered(processes)
        arrivals = [p for p in ordered if p.arrival_time <= simulation_time]
        skipped = [p for p in ordered if p.arrival_time > simulation_time]
        cutoff = max((p.arrival_time for p in arrivals), default=0.0)
        return arrivals, skipped, cutoff

    @staticmethod
    def _coalesce(blocks: List[MemoryBlock]) -> List[MemoryBlock]:
        """Merge adjacent free blocks (blocks must be sorted by address)."""
        merged: List[MemoryBlock] = []
        for block in blocks:
            if (merged and not block.is_allocated and not merged[-1].is_allocated
                    and merged[-1].start_address + merged[-1].size == block.start_address):
                merged[-1].size += block.size
            else:
                merged.append(block)
        return merged

    @staticmethod
    def _external_fragmentation(blocks: List[MemoryBlock]) -> float:
        """Share of free memory that is NOT in the largest hole, in percent."""
        free = [b.size for b in blocks if not b.is_allocated]
        total_free = sum(free)
        if total_free == 0:
            return 0.0
        return round((total_free - max(free)) / total_free * 100, 2)

    @staticmethod
    def _layout(blocks: List[MemoryBlock]) -> List[Dict[str, Any]]:
        return [{
            "start": b.start_address, "end": b.start_address + b.size - 1, "size": b.size,
            "allocated": b.is_allocated, "process_id": b.process_id,
            "process_name": b.process_name,
            "type": "allocated" if b.is_allocated else "free",
        } for b in blocks]

    def _block_state(self, blocks: List[MemoryBlock], time: float) -> MemoryState:
        allocated = sum(b.size for b in blocks if b.is_allocated)
        total = sum(b.size for b in blocks)
        holes = [b for b in blocks if not b.is_allocated]
        return MemoryState(
            time=time,
            memory_layout=self._layout(blocks),
            free_memory=total - allocated,
            allocated_memory=allocated,
            fragmentation={"external": self._external_fragmentation(blocks), "internal": 0.0,
                           "free_blocks": float(len(holes))},
            processes=[{"id": b.process_id, "name": b.process_name, "size": b.size,
                        "start": b.start_address}
                       for b in blocks if b.is_allocated and b.process_id != -1],
        )

    @staticmethod
    def _first_fit_place(blocks: List[MemoryBlock], size: int, owner_id: int, owner_name: str
                         ) -> Tuple[Optional[MemoryBlock], int]:
        """First-fit placement used by segmentation. Returns (block, holes_examined)."""
        examined = 0
        for i, block in enumerate(blocks):
            if block.is_allocated:
                continue
            examined += 1
            if block.size >= size:
                return MemoryManagementService._carve(blocks, i, size, owner_id, owner_name), examined
        return None, examined

    @staticmethod
    def _carve(blocks: List[MemoryBlock], index: int, size: int, owner_id: int,
               owner_name: str) -> MemoryBlock:
        """Allocate `size` KB from the start of free block `index`, leaving the rest free."""
        block = blocks[index]
        if block.size > size:
            blocks.insert(index + 1, MemoryBlock(
                start_address=block.start_address + size, size=block.size - size,
                is_allocated=False))
        block.size = size
        block.is_allocated = True
        block.process_id = owner_id
        block.process_name = owner_name
        return block

    @staticmethod
    def _renumber(blocks: List[MemoryBlock]) -> None:
        for i, b in enumerate(blocks):
            b.id = i

    @staticmethod
    def _result(algorithm: str, metrics: MemoryMetrics, visualization: MemoryVisualization,
                states: List[MemoryState], explanation: List[str]) -> MemoryResult:
        return MemoryResult(
            algorithm=algorithm, metrics=metrics, visualization=visualization,
            states=states, explanation=explanation,
            execution_time=metrics.average_allocation_time, success=True)

    # ------------------------------------------------------------------ #
    # 1. Linear (contiguous, variable partition) allocation
    # ------------------------------------------------------------------ #
    @staticmethod
    def _select_hole(blocks: List[MemoryBlock], size: int, method: MemoryAllocationMethod,
                     next_fit_pointer: int) -> Tuple[Optional[int], int]:
        """
        Pick a free block for `size` KB. Returns (index into blocks or None, holes examined).

        first_fit : first hole (by address) that is large enough.
        best_fit  : smallest hole that is large enough (ties -> lowest address).
        worst_fit : largest hole that is large enough (ties -> lowest address).
        next_fit  : like first fit but the search resumes where the previous
                    allocation ended, wrapping around.
        """
        holes = [(i, b) for i, b in enumerate(blocks) if not b.is_allocated]
        if method == MemoryAllocationMethod.NEXT_FIT:
            # Holes containing/after the pointer first, then wrap to the earlier ones.
            holes.sort(key=lambda ib: (0 if ib[1].start_address + ib[1].size > next_fit_pointer else 1,
                                       ib[1].start_address))
        examined = 0
        if method in (MemoryAllocationMethod.FIRST_FIT, MemoryAllocationMethod.NEXT_FIT):
            for i, b in holes:
                examined += 1
                if b.size >= size:
                    return i, examined
            return None, examined

        examined = len(holes)  # best / worst fit must scan every hole
        fitting = [(i, b) for i, b in holes if b.size >= size]
        if not fitting:
            return None, examined
        if method == MemoryAllocationMethod.BEST_FIT:
            return min(fitting, key=lambda ib: (ib[1].size, ib[1].start_address))[0], examined
        return max(fitting, key=lambda ib: (ib[1].size, -ib[1].start_address))[0], examined

    @staticmethod
    def _compact(blocks: List[MemoryBlock], total: int) -> Tuple[List[MemoryBlock], int, int]:
        """Slide every allocated block (OS first) to low addresses.
        Returns (new blocks, number of blocks that moved, KB moved)."""
        allocated = [b for b in blocks if b.is_allocated]
        moved_blocks = moved_kb = 0
        cursor = 0
        for b in allocated:
            if b.start_address != cursor:
                moved_blocks += 1
                moved_kb += b.size
                b.start_address = cursor
            cursor += b.size
        out = list(allocated)
        if cursor < total:
            out.append(MemoryBlock(start_address=cursor, size=total - cursor, is_allocated=False))
        return out, moved_blocks, moved_kb

    def linear_allocation(self, request: MemoryRequest) -> MemoryResult:
        config = request.config
        if not isinstance(config, LinearAllocationConfig):
            raise ValueError("Linear allocation requires a LinearAllocationConfig")
        total = config.total_memory
        os_reserved = min(config.os_reserved, total)
        method = config.allocation_method

        blocks = []
        if os_reserved > 0:
            blocks.append(MemoryBlock(start_address=0, size=os_reserved, is_allocated=True,
                                      process_id=-1, process_name="OS"))
        if total > os_reserved:
            blocks.append(MemoryBlock(start_address=os_reserved, size=total - os_reserved))
        self._renumber(blocks)

        arrivals, skipped, cutoff = self._lifecycle(request.processes, request.simulation_time)
        # (time, kind, order, process): departures (0) run before arrivals (1) at equal times.
        timeline: List[Tuple[float, int, int, Process]] = [(p.arrival_time, 1, i, p)
                                                            for i, p in enumerate(arrivals)]
        departures: Dict[int, float] = {}
        for i, p in enumerate(arrivals):
            if p.duration is not None and p.duration > 0 and p.arrival_time + p.duration <= cutoff:
                departures[p.id] = p.arrival_time + p.duration
                timeline.append((p.arrival_time + p.duration, 0, i, p))
        timeline.sort(key=lambda t: (t[0], t[1], t[2]))

        events: List[AllocationEvent] = []
        states: List[MemoryState] = []
        latencies: List[float] = []
        placed: set = set()
        next_fit_pointer = 0
        ok = failed = 0
        explanation = [
            f"Contiguous allocation using {method.value.replace('_', ' ')} over {total} KB "
            f"({os_reserved} KB reserved for the OS).",
        ]
        for p in skipped:
            explanation.append(f"{p.name} arrives at t={p.arrival_time}, after the simulation "
                               f"ended (t={request.simulation_time}); it is ignored.")

        for time, kind, _, p in timeline:
            if kind == 0:  # departure
                if p.id not in placed:
                    continue
                freed = next(b for b in blocks if b.is_allocated and b.process_id == p.id)
                events.append(AllocationEvent(
                    time=time, event_type="deallocate", process_id=p.id, process_name=p.name,
                    size=freed.size, address=freed.start_address, success=True,
                    latency=NS_SPLIT,
                    description=f"{p.name} terminated; freed {freed.size} KB at {freed.start_address}"))
                freed.is_allocated = False
                freed.process_id = None
                freed.process_name = None
                blocks = self._coalesce(blocks)
                self._renumber(blocks)
                placed.discard(p.id)
                explanation.append(f"t={time}: {p.name} left memory; adjacent free blocks were merged.")
                states.append(self._block_state(blocks, time))
                continue

            # arrival
            size = p.size
            idx, examined = self._select_hole(blocks, size, method, next_fit_pointer)
            latency = examined * NS_BLOCK_EXAMINED
            if idx is None:
                free_total = sum(b.size for b in blocks if not b.is_allocated)
                if config.enable_compaction and free_total >= size:
                    blocks, moved_blocks, moved_kb = self._compact(blocks, total)
                    self._renumber(blocks)
                    cost = moved_kb * NS_COMPACT_PER_KB
                    events.append(AllocationEvent(
                        time=p.arrival_time, event_type="compaction", process_id=p.id,
                        process_name=p.name, size=moved_kb, success=True, latency=cost,
                        details={"blocks_moved": moved_blocks, "kb_moved": moved_kb},
                        description=f"Compaction for {p.name}: moved {moved_blocks} block(s), "
                                    f"{moved_kb} KB, to merge {free_total} KB of free space"))
                    explanation.append(
                        f"t={p.arrival_time}: {p.name} needs {size} KB; {free_total} KB is free but "
                        f"fragmented, so memory was compacted ({moved_kb} KB moved).")
                    next_fit_pointer = 0
                    idx, extra = self._select_hole(blocks, size, method, next_fit_pointer)
                    examined += extra
                    latency += cost + extra * NS_BLOCK_EXAMINED

            if idx is None:
                failed += 1
                free_total = sum(b.size for b in blocks if not b.is_allocated)
                largest = max((b.size for b in blocks if not b.is_allocated), default=0)
                reason = ("external fragmentation (enough total free memory but no single hole "
                          f"large enough; largest hole {largest} KB)"
                          if free_total >= size else f"only {free_total} KB free")
                events.append(AllocationEvent(
                    time=p.arrival_time, event_type="allocation_failed", process_id=p.id,
                    process_name=p.name, size=size, success=False, latency=latency,
                    description=f"Failed to allocate {size} KB for {p.name}: {reason}"))
                explanation.append(f"t={p.arrival_time}: could not place {p.name} ({size} KB) - {reason}.")
            else:
                block = self._carve(blocks, idx, size, p.id, p.name)
                latency += NS_SPLIT
                self._renumber(blocks)
                next_fit_pointer = block.start_address + block.size
                placed.add(p.id)
                ok += 1
                latencies.append(latency)
                events.append(AllocationEvent(
                    time=p.arrival_time, event_type="allocate", process_id=p.id,
                    process_name=p.name, size=size, address=block.start_address, success=True,
                    latency=latency, details={"holes_examined": examined},
                    description=f"Allocated {size} KB for {p.name} at address {block.start_address}"))
                explanation.append(
                    f"t={p.arrival_time}: placed {p.name} ({size} KB) at {block.start_address}"
                    f"-{block.start_address + size - 1} after examining {examined} hole(s).")
            states.append(self._block_state(blocks, p.arrival_time))

        allocated = sum(b.size for b in blocks if b.is_allocated)
        free_blocks = [b for b in blocks if not b.is_allocated]
        metrics = MemoryMetrics(
            total_memory=total, allocated_memory=allocated, free_memory=total - allocated,
            memory_utilization=round(allocated / total * 100, 2) if total else 0.0,
            external_fragmentation=self._external_fragmentation(blocks),
            internal_fragmentation=0.0,  # variable partitions are sized exactly
            average_allocation_time=round(sum(latencies) / len(latencies) / 1e6, 6) if latencies else 0.0,
            failed_allocations=failed, successful_allocations=ok)
        explanation.append(
            f"Finished: {ok} allocated, {failed} failed. {len(free_blocks)} free hole(s), "
            f"largest {max((b.size for b in free_blocks), default=0)} KB, "
            f"external fragmentation {metrics.external_fragmentation}%.")
        visualization = MemoryVisualization(
            memory_map=self._layout(blocks), timeline=events,
            fragmentation_chart=[{"block_id": i, "size": b.size, "start": b.start_address}
                                 for i, b in enumerate(free_blocks)])
        return self._result("linear", metrics, visualization, states, explanation)

    # ------------------------------------------------------------------ #
    # 2. Segmentation
    # ------------------------------------------------------------------ #
    @staticmethod
    def _split_into_segments(process: Process, max_segments: int) -> List[Tuple[str, int]]:
        """Return [(segment_type, size_kb)].  Honours explicit `process.segments`;
        otherwise splits the process size by fixed weights across up to
        `max_segments` types (code, data, stack, heap, in that priority order)."""
        if process.segments:
            out = []
            for i, seg in enumerate(process.segments):
                out.append((str(seg.get("type") or seg.get("segment_type") or f"segment{i}"),
                            int(seg.get("size", 0))))
            return out
        count = max(1, min(max_segments, len(DEFAULT_SEGMENT_WEIGHTS), process.size))
        chosen = DEFAULT_SEGMENT_WEIGHTS[:count]
        weight_sum = sum(w for _, w in chosen)
        sizes = [max(1, int(process.size * w / weight_sum)) for _, w in chosen]
        sizes[-1] += process.size - sum(sizes)       # remainder goes to the last segment
        if sizes[-1] < 1:                            # (can only happen for tiny processes)
            sizes[-1] = 1
            sizes[0] += process.size - sum(sizes)
        return [(name, s) for (name, _), s in zip(chosen, sizes)]

    @staticmethod
    def _protection(segment_type: str, enabled: bool) -> Dict[str, bool]:
        if not enabled:
            return {"read": True, "write": True, "execute": True}
        if segment_type == "code":
            return {"read": True, "write": False, "execute": True}
        return {"read": True, "write": True, "execute": False}

    def segmentation(self, request: MemoryRequest) -> MemoryResult:
        config = request.config
        if not isinstance(config, SegmentationConfig):
            raise ValueError("Segmentation requires a SegmentationConfig")
        total = config.total_memory
        table_size = config.segment_table_size

        blocks = [MemoryBlock(start_address=0, size=total)]
        # segment table: slot -> Segment (slots are reused lowest-first)
        table: Dict[int, Segment] = {}
        owner_segments: Dict[int, List[int]] = {}      # process id -> slots it uses
        shared_code: Dict[str, int] = {}               # program name -> slot of shared code segment

        arrivals, skipped, cutoff = self._lifecycle(request.processes, request.simulation_time)
        timeline: List[Tuple[float, int, int, Process]] = [(p.arrival_time, 1, i, p)
                                                            for i, p in enumerate(arrivals)]
        for i, p in enumerate(arrivals):
            if p.duration is not None and p.duration > 0 and p.arrival_time + p.duration <= cutoff:
                timeline.append((p.arrival_time + p.duration, 0, i, p))
        timeline.sort(key=lambda t: (t[0], t[1], t[2]))

        events: List[AllocationEvent] = []
        states: List[MemoryState] = []
        latencies: List[float] = []
        ok = failed = 0
        explanation = [
            f"Segmentation over {total} KB, at most {config.max_segments_per_process} segment(s) per "
            f"process and {table_size} entries in the segment table. Segments are placed with first fit.",
            "Protection is " + ("enabled: code is read/execute, other segments read/write."
                                if config.enable_protection else "disabled: every segment is read/write/execute."),
        ]
        if config.enable_sharing:
            explanation.append("Sharing is enabled: processes with the same name are instances of the "
                               "same program and share one read-only code segment.")
        for p in skipped:
            explanation.append(f"{p.name} arrives after the simulation ended and is ignored.")

        def free_slot() -> Optional[int]:
            return next((s for s in range(table_size) if s not in table), None)

        def snapshot(time: float):
            states.append(self._seg_state(blocks, table, time))

        def release(slot: int, pid: int) -> bool:
            """Drop `pid`'s hold on a segment; free memory when nobody uses it. True if freed."""
            seg = table[slot]
            if pid in seg.shared_by:
                seg.shared_by.remove(pid)
            if seg.shared_by:
                if seg.process_id == pid:
                    seg.process_id = seg.shared_by[0]
                return False
            block = next(b for b in blocks if b.is_allocated and b.start_address == seg.base_address)
            block.is_allocated = False
            block.process_id = None
            block.process_name = None
            del table[slot]
            for name, shared_slot in list(shared_code.items()):
                if shared_slot == slot:
                    del shared_code[name]
            return True

        for time, kind, _, p in timeline:
            if kind == 0:
                if p.id not in owner_segments:
                    continue
                freed_kb = 0
                for slot in list(owner_segments.pop(p.id)):
                    size = table[slot].size
                    if release(slot, p.id):
                        freed_kb += size
                blocks = self._coalesce(blocks)
                self._renumber(blocks)
                events.append(AllocationEvent(
                    time=time, event_type="deallocate", process_id=p.id, process_name=p.name,
                    size=freed_kb, success=True, latency=NS_SPLIT,
                    description=f"{p.name} terminated; freed {freed_kb} KB of segments"))
                explanation.append(f"t={time}: {p.name} left; its segments were freed"
                                   f"{' (shared code stays while others use it)' if config.enable_sharing else ''}.")
                snapshot(time)
                continue

            segments = self._split_into_segments(p, config.max_segments_per_process)
            problem = None
            if len(segments) > config.max_segments_per_process:
                problem = (f"{len(segments)} segments requested but at most "
                           f"{config.max_segments_per_process} are allowed")
            elif any(size <= 0 for _, size in segments):
                problem = "a segment has a non-positive size"

            done: List[int] = []             # slots acquired so far (for rollback)
            new_slots: List[int] = []        # slots whose memory we allocated (for rollback)
            shared_hits: List[int] = []
            latency = 0.0
            if problem is None:
                for seg_type, size in segments:
                    if config.enable_sharing and seg_type == "code" and p.name in shared_code \
                            and shared_code[p.name] in table and table[shared_code[p.name]].size == size \
                            and table[shared_code[p.name]].segment_type == "code":
                        slot = shared_code[p.name]
                        table[slot].shared_by.append(p.id)
                        done.append(slot)
                        shared_hits.append(slot)
                        continue
                    slot = free_slot()
                    if slot is None:
                        problem = f"segment table is full ({table_size} entries)"
                        break
                    block, examined = self._first_fit_place(blocks, size, p.id, p.name)
                    latency += examined * NS_BLOCK_EXAMINED
                    if block is None:
                        largest = max((b.size for b in blocks if not b.is_allocated), default=0)
                        problem = (f"no hole can hold the {seg_type} segment ({size} KB; "
                                   f"largest hole {largest} KB)")
                        break
                    latency += NS_SPLIT
                    self._renumber(blocks)
                    table[slot] = Segment(
                        id=slot, segment_id=slot, process_id=p.id, segment_type=seg_type, size=size,
                        base_address=block.start_address, limit=size,
                        protection=self._protection(seg_type, config.enable_protection),
                        shared_by=[p.id])
                    if config.enable_sharing and seg_type == "code":
                        shared_code[p.name] = slot
                    done.append(slot)
                    new_slots.append(slot)

            if problem is not None:
                for slot in done:                      # roll back: admission is all-or-nothing
                    release(slot, p.id)
                blocks = self._coalesce(blocks)
                self._renumber(blocks)
                failed += 1
                events.append(AllocationEvent(
                    time=p.arrival_time, event_type="allocation_failed", process_id=p.id,
                    process_name=p.name, size=p.size, success=False, latency=latency,
                    description=f"Failed to allocate segments for {p.name}: {problem}"))
                explanation.append(f"t={p.arrival_time}: {p.name} rejected - {problem}.")
            else:
                ok += 1
                latencies.append(latency)
                owner_segments[p.id] = done
                for slot in done:
                    s = table[slot]
                    events.append(AllocationEvent(
                        time=p.arrival_time, event_type="allocate", process_id=p.id,
                        process_name=p.name, size=s.size, address=s.base_address, success=True,
                        latency=latency / max(len(done), 1),
                        details={"segment": slot, "type": s.segment_type, "base": s.base_address,
                                 "limit": s.size, "shared": slot in shared_hits},
                        description=(f"{p.name}: {s.segment_type} segment #{slot} -> base {s.base_address}, "
                                     f"limit {s.size}" + (" (shared)" if slot in shared_hits else ""))))
                layout = ", ".join(f"{table[s].segment_type}#{s}@{table[s].base_address}+{table[s].size}"
                                   for s in done)
                explanation.append(f"t={p.arrival_time}: {p.name} admitted with {len(done)} segment(s): {layout}.")
                first = table[done[0]]
                explanation.append(
                    f"  Translation example: logical (segment {first.segment_type}#{first.id}, offset 0) -> "
                    f"physical {first.base_address}; an offset >= {first.size} traps (segmentation fault).")
            snapshot(p.arrival_time)

        live = list(table.values())
        allocated = sum(s.size for s in live)
        metrics = MemoryMetrics(
            total_memory=total, allocated_memory=allocated, free_memory=total - allocated,
            memory_utilization=round(allocated / total * 100, 2) if total else 0.0,
            external_fragmentation=self._external_fragmentation(blocks),
            internal_fragmentation=0.0,  # segments are sized exactly
            average_allocation_time=round(sum(latencies) / len(latencies) / 1e6, 6) if latencies else 0.0,
            failed_allocations=failed, successful_allocations=ok)
        explanation.append(f"Finished: {ok} process(es) admitted, {failed} rejected; "
                           f"external fragmentation {metrics.external_fragmentation}%.")
        memory_map = []
        for b in blocks:
            entry = {"start": b.start_address, "end": b.start_address + b.size - 1, "size": b.size,
                     "allocated": b.is_allocated, "process_id": b.process_id,
                     "process_name": b.process_name, "type": "allocated" if b.is_allocated else "free"}
            seg = next((s for s in live if s.base_address == b.start_address and b.is_allocated), None)
            if seg:
                entry.update({"segment_id": seg.id, "segment_type": seg.segment_type,
                              "protection": seg.protection, "shared_by": seg.shared_by})
            memory_map.append(entry)
        free_blocks = [b for b in blocks if not b.is_allocated]
        visualization = MemoryVisualization(
            memory_map=memory_map, segment_table=sorted(live, key=lambda s: s.id), timeline=events,
            fragmentation_chart=[{"block_id": i, "size": b.size, "start": b.start_address}
                                 for i, b in enumerate(free_blocks)])
        return self._result("segmentation", metrics, visualization, states, explanation)

    def _seg_state(self, blocks: List[MemoryBlock], table: Dict[int, Segment], time: float) -> MemoryState:
        state = self._block_state(blocks, time)
        state.processes = [{"id": s.process_id, "name": f"{s.segment_type}#{s.id}", "size": s.size,
                            "start": s.base_address} for s in sorted(table.values(), key=lambda s: s.id)]
        return state

    # ------------------------------------------------------------------ #
    # 3 & 4. Paging and multi-level paging (demand paged simulation)
    # ------------------------------------------------------------------ #
    @staticmethod
    def _reference_string(process: Process, pages_needed: int) -> Tuple[List[int], List[bool]]:
        """Return (page references, is_write flags). Uses `process.pages` if given, otherwise a
        seeded locality-based string: 80% of references fall in a small moving locality."""
        rng = random.Random(process.id * 1_000_003 + pages_needed)
        if process.pages:
            refs = [r for r in process.pages if 0 <= r < pages_needed][:MAX_REFERENCES_PER_PROCESS]
        else:
            length = min(max(8, pages_needed * 3), 40)
            locality = max(1, min(pages_needed, 3))
            base = 0
            refs = []
            for i in range(length):
                if i % 8 == 0:
                    base = rng.randrange(pages_needed)
                if rng.random() < 0.8:
                    refs.append((base + rng.randrange(locality)) % pages_needed)
                else:
                    refs.append(rng.randrange(pages_needed))
        writes = [rng.random() < 0.25 for _ in refs]
        return refs, writes

    @staticmethod
    def _bits_per_level(levels: int, page_number_bits: int) -> List[int]:
        base, extra = divmod(page_number_bits, levels)
        return [base + (1 if i < extra else 0) for i in range(levels)]

    @staticmethod
    def _split_page_number(page: int, bits: List[int]) -> List[int]:
        indices, shift = [], sum(bits)
        for b in bits:
            shift -= b
            indices.append((page >> shift) & ((1 << b) - 1))
        return indices

    def paging(self, request: MemoryRequest) -> MemoryResult:
        if not isinstance(request.config, PagingConfig):
            raise ValueError("Paging requires a PagingConfig")
        return self._demand_paging(request, multi_level=False)

    def multi_level_paging(self, request: MemoryRequest) -> MemoryResult:
        if not isinstance(request.config, MultiLevelPagingConfig):
            raise ValueError("Multi-level paging requires a MultiLevelPagingConfig")
        return self._demand_paging(request, multi_level=True)

    def _demand_paging(self, request: MemoryRequest, multi_level: bool) -> MemoryResult:
        cfg = request.config
        page_kb = cfg.page_size
        if page_kb <= 0:
            raise ValueError("Page size must be greater than 0")
        total_frames = cfg.total_memory // page_kb
        if total_frames < 1:
            raise ValueError("Memory is smaller than one page")
        algo: ReplacementAlgorithm = cfg.replacement_algorithm
        demand = cfg.enable_demand_paging if multi_level else cfg.enable_virtual_memory
        tlb_on = (not multi_level) and cfg.tlb_enabled and cfg.tlb_size > 0
        tlb_size = cfg.tlb_size if tlb_on else 0
        max_pages = None if multi_level else cfg.max_pages_per_process
        ws_cap = cfg.working_set_size if (multi_level and demand) else None

        levels = bits = None
        offset_bits = 0
        if multi_level:
            levels = cfg.levels
            page_bytes = page_kb * 1024
            offset_bits = int(math.log2(page_bytes))
            if 2 ** offset_bits != page_bytes:
                raise ValueError("Page size must be a power of two for multi-level paging")
            page_number_bits = VIRTUAL_ADDRESS_BITS - offset_bits
            if page_number_bits < levels:
                raise ValueError("Page size too large for the requested number of levels")
            bits = self._bits_per_level(levels, page_number_bits)

        events: List[AllocationEvent] = []
        states: List[MemoryState] = []
        explanation: List[str] = []
        name_of: Dict[int, str] = {p.id: p.name for p in request.processes}
        sim_time = request.simulation_time

        explanation.append(
            f"{'Multi-level ' if multi_level else ''}paging: {cfg.total_memory} KB of memory = "
            f"{total_frames} frame(s) of {page_kb} KB; replacement = {algo.value}; "
            f"{'demand paging' if demand else 'all pages loaded at admission (no virtual memory)'}.")
        if multi_level:
            explanation.append(
                f"{VIRTUAL_ADDRESS_BITS}-bit virtual addresses: {offset_bits} offset bits, "
                f"page number split {' / '.join(map(str, bits))} over {levels} levels "
                f"(per-process resident cap {ws_cap} frame(s)).")
        elif tlb_on:
            explanation.append(f"TLB: {tlb_size} entries, LRU replacement, entries tagged with process id.")

        # ---- admission & reference schedule (independent of paging outcome) ----
        ordered = self._ordered(request.processes)
        admitted: Dict[int, Dict[str, Any]] = {}
        seq: List[Tuple[int, int, int, str, Any]] = []  # (tick, kind, order, op, payload)
        total_refs = 0
        truncated = False
        for order, p in enumerate(ordered):
            if p.arrival_time > sim_time:
                explanation.append(f"{p.name} arrives after the simulation ended and is ignored.")
                continue
            pages_needed = max(1, math.ceil(p.size / page_kb))
            start = int(math.ceil(p.arrival_time))
            end = start + int(math.ceil(p.duration)) if p.duration and p.duration > 0 else None
            refs, writes = self._reference_string(p, pages_needed)
            info = {"proc": p, "pages": pages_needed, "start": start, "end": end,
                    "refs": refs, "writes": writes}
            admitted[p.id] = info
            seq.append((start, 1, order, "admit", p))
            for i, (page, w) in enumerate(zip(refs, writes)):
                tick = start + i
                if end is not None and tick >= end:
                    break
                if tick > sim_time:
                    break
                if total_refs >= MAX_REFERENCES_TOTAL:
                    truncated = True
                    break
                seq.append((tick, 2, order, "ref", (p.id, page, w)))
                total_refs += 1
            if end is not None and end <= sim_time:
                seq.append((end, 0, order, "depart", p))
        seq.sort(key=lambda s: (s[0], s[1], s[2]))
        if truncated:
            explanation.append(f"Reference stream truncated to {MAX_REFERENCES_TOTAL} references.")

        # Future reference positions per page (used by the Optimal algorithm).
        future: Dict[Tuple[int, int], List[int]] = {}
        ref_index = 0
        ref_positions: List[int] = []   # position in `seq` -> running reference number
        for pos, (_, kind, _, op, payload) in enumerate(seq):
            if op == "ref":
                future.setdefault((payload[0], payload[1]), []).append(ref_index)
                ref_positions.append(ref_index)
                ref_index += 1
            else:
                ref_positions.append(ref_index)

        # ---- simulation state ----
        frame_owner: List[Optional[Tuple[int, int]]] = [None] * total_frames
        resident: Dict[Tuple[int, int], Dict[str, Any]] = {}
        page_tables: Dict[int, Dict[int, Dict[str, Any]]] = {}   # pid -> page -> entry
        fifo_queue: deque = deque()                              # second chance queue
        tlb: "OrderedDict[Tuple[int,int], int]" = OrderedDict()
        clock_hand = 0
        counters = dict(faults=0, hits=0, tlb_hits=0, tlb_misses=0, swap_in=0, swap_out=0,
                        refs=0, failed=0, admitted=0, fault_ns=0.0)
        fault_explained = 0
        ml_nodes: Dict[int, set] = {}                             # pid -> set of allocated node paths
        recent: Dict[int, deque] = {}                             # working-set windows
        ws_samples: Dict[int, List[int]] = {}
        live: set = set()
        access_clock = 0

        def pname(pid: int) -> str:
            return name_of.get(pid, f"P{pid}")

        def emit(time, etype, pid, success=None, **kw):
            events.append(AllocationEvent(time=time, event_type=etype, process_id=pid,
                                          process_name=pname(pid), success=success, **kw))

        def free_frame() -> Optional[int]:
            return next((i for i, o in enumerate(frame_owner) if o is None), None)

        def snapshot(time: float):
            if len(states) >= MAX_EVENT_STATES:
                return
            states.append(self._frame_state(frame_owner, resident, page_kb, name_of, time))

        def drop_page(key, reason_time):
            """Remove a resident page from every structure."""
            info = resident.pop(key)
            frame_owner[info["frame"]] = None
            tlb.pop(key, None)
            if key in fifo_queue:
                fifo_queue.remove(key)
            entry = page_tables.get(key[0], {}).get(key[1])
            if entry:
                entry["present"] = False
                entry["frame_number"] = None
            return info

        def pick_victim(cands: List[Tuple[int, int]], now_ref: int):
            nonlocal clock_hand
            if algo == ReplacementAlgorithm.FIFO:
                return min(cands, key=lambda k: resident[k]["loaded_at"])
            if algo == ReplacementAlgorithm.LRU:
                return min(cands, key=lambda k: (resident[k]["last_access"], resident[k]["loaded_at"]))
            if algo == ReplacementAlgorithm.LFU:
                return min(cands, key=lambda k: (resident[k]["count"], resident[k]["loaded_at"]))
            if algo == ReplacementAlgorithm.OPTIMAL:
                def next_use(k):
                    positions = future.get(k, [])
                    j = bisect.bisect_right(positions, now_ref)
                    return positions[j] if j < len(positions) else math.inf
                return max(cands, key=lambda k: (next_use(k), -resident[k]["loaded_at"]))
            cand_set = set(cands)
            if algo == ReplacementAlgorithm.CLOCK:
                while True:   # at most two sweeps: the first clears reference bits
                    owner = frame_owner[clock_hand]
                    clock_hand = (clock_hand + 1) % total_frames
                    if owner is None or owner not in cand_set:
                        continue
                    if resident[owner]["ref"]:
                        resident[owner]["ref"] = False
                        continue
                    return owner
            # SECOND_CHANCE: FIFO queue, pages with the reference bit set get a second pass
            while True:
                for key in list(fifo_queue):
                    if key not in cand_set:
                        continue
                    if resident[key]["ref"]:
                        resident[key]["ref"] = False
                        fifo_queue.remove(key)
                        fifo_queue.append(key)
                        break
                    return key
                else:
                    raise RuntimeError("no replacement candidate")

        def ensure_node_path(pid: int, page: int):
            """Allocate any missing page-table nodes on the walk to `page`."""
            idx = self._split_page_number(page, bits)
            for depth in range(levels):          # depth 0 = directory ... levels-1 = leaf table
                ml_nodes[pid].add(tuple(idx[:depth]))
            return idx

        def load_page(pid: int, page: int, now: float, write: bool, local_only: bool) -> int:
            """Bring (pid,page) into memory, replacing a page if required. Returns fault latency (ns)."""
            nonlocal fault_explained, access_clock
            key = (pid, page)
            latency = NS_PAGE_FAULT
            frame = None
            victim_desc = ""
            own = [k for k in resident if k[0] == pid]
            if local_only and ws_cap is not None and len(own) >= ws_cap:
                victim = pick_victim(own, ref_counter)
                frame, dirty = self._evict(victim, drop_page, resident, now, events, name_of, counters)
                latency += NS_PAGE_FAULT if dirty else 0
                victim_desc = f", replaced own page {victim[1]} (resident-set cap)"
            else:
                frame = free_frame()
                if frame is None:
                    victim = pick_victim(list(resident), ref_counter)
                    frame, dirty = self._evict(victim, drop_page, resident, now, events, name_of, counters)
                    latency += NS_PAGE_FAULT if dirty else 0
                    victim_desc = (f", replaced {pname(victim[0])} page {victim[1]} "
                                   f"({algo.value})")
            frame_owner[frame] = key
            access_clock += 1
            resident[key] = {"frame": frame, "loaded_at": access_clock, "last_access": access_clock,
                             "count": 0, "ref": False, "modify": False}
            fifo_queue.append(key)
            entry = page_tables[pid].setdefault(page, {"page_number": page, "process_id": pid})
            entry.update({"frame_number": frame, "present": True})
            counters["swap_in"] += 1
            emit(now, "swap_in", pid, True, page_number=page, frame_number=frame, size=page_kb,
                 latency=NS_PAGE_FAULT,
                 description=f"Loaded page {page} of {pname(pid)} into frame {frame}")
            if fault_explained < 25:
                explanation.append(f"t={now}: page fault on {pname(pid)} page {page} -> frame {frame}{victim_desc}.")
                fault_explained += 1
            return int(latency)

        ref_counter = -1

        for pos, (tick, kind, order, op, payload) in enumerate(seq):
            ref_counter = ref_positions[pos]   # index of the reference being served
            if op == "admit":
                p: Process = payload
                info = admitted[p.id]
                pages = info["pages"]
                if max_pages is not None and pages > max_pages:
                    counters["failed"] += 1
                    emit(tick, "allocation_failed", p.id, False, size=p.size,
                         description=f"{p.name} needs {pages} pages but the limit is {max_pages} per process")
                    explanation.append(f"t={tick}: {p.name} rejected - needs {pages} pages, limit is {max_pages}.")
                    info["rejected"] = True
                    continue
                if not demand:
                    free_count = sum(1 for o in frame_owner if o is None)
                    if pages > free_count:
                        counters["failed"] += 1
                        emit(tick, "allocation_failed", p.id, False, size=p.size,
                             description=f"{p.name} needs {pages} frames but only {free_count} are free")
                        explanation.append(f"t={tick}: {p.name} rejected - needs {pages} frames, "
                                           f"{free_count} free (virtual memory is off).")
                        info["rejected"] = True
                        continue
                live.add(p.id)
                shown = info["refs"][:20]
                explanation.append(f"{p.name} reference string ({len(info['refs'])} refs): "
                                   f"{shown}{' ...' if len(info['refs']) > 20 else ''}")
                page_tables[p.id] = {}
                if multi_level:
                    ml_nodes[p.id] = {()}          # the top-level directory always exists
                recent[p.id] = deque(maxlen=max(1, cfg.working_set_size)) if multi_level else deque()
                ws_samples[p.id] = []
                counters["admitted"] += 1
                emit(tick, "allocate", p.id, True, size=p.size,
                     details={"pages": pages, "waste_kb": pages * page_kb - p.size},
                     latency=NS_MEMORY_ACCESS,
                     description=f"Created address space for {p.name}: {pages} page(s) of {page_kb} KB "
                                 f"(internal fragmentation {pages * page_kb - p.size} KB)")
                if not demand:
                    for page in range(pages):
                        f = free_frame()
                        frame_owner[f] = (p.id, page)
                        access_clock += 1
                        resident[(p.id, page)] = {"frame": f, "loaded_at": access_clock,
                                                  "last_access": access_clock, "count": 0,
                                                  "ref": False, "modify": False}
                        fifo_queue.append((p.id, page))
                        page_tables[p.id][page] = {"page_number": page, "process_id": p.id,
                                                   "frame_number": f, "present": True}
                        if multi_level:
                            ensure_node_path(p.id, page)
                    explanation.append(f"t={tick}: {p.name} loaded entirely: {pages} page(s) in frames "
                                       f"{[page_tables[p.id][pg]['frame_number'] for pg in range(pages)]}.")
                else:
                    explanation.append(f"t={tick}: {p.name} admitted with {pages} page(s); none resident yet (demand paging).")
                snapshot(tick)

            elif op == "depart":
                p = payload
                if p.id not in live:
                    continue
                keys = [k for k in resident if k[0] == p.id]
                for k in keys:
                    drop_page(k, tick)
                live.discard(p.id)
                emit(tick, "deallocate", p.id, True, size=p.size, latency=NS_MEMORY_ACCESS,
                     description=f"{p.name} terminated; freed {len(keys)} frame(s)")
                explanation.append(f"t={tick}: {p.name} terminated and released {len(keys)} frame(s).")
                page_tables.pop(p.id, None)
                snapshot(tick)

            else:  # reference
                pid, page, write = payload
                if pid not in live:
                    continue
                key = (pid, page)
                counters["refs"] += 1
                access_clock += 1
                hit_tlb = False
                if tlb_on:
                    if key in tlb:
                        tlb.move_to_end(key)
                        counters["tlb_hits"] += 1
                        hit_tlb = True
                    else:
                        counters["tlb_misses"] += 1
                        emit(tick, "tlb_miss", pid, False, page_number=page, latency=NS_TLB_LOOKUP,
                             description=f"TLB miss for {pname(pid)} page {page}")
                if multi_level:
                    idx = ensure_node_path(pid, page)
                if key in resident:
                    counters["hits"] += 1
                else:
                    counters["faults"] += 1
                    emit(tick, "page_fault", pid, False, page_number=page, latency=NS_PAGE_FAULT,
                         description=f"Page fault: {pname(pid)} page {page} is not in memory")
                    lat = load_page(pid, page, tick, write, local_only=multi_level)
                    counters["fault_ns"] += lat
                    snapshot(tick)
                info = resident[key]
                info["ref"] = True
                info["count"] += 1
                info["last_access"] = access_clock
                if write:
                    info["modify"] = True
                page_tables[pid][page]["reference"] = True
                page_tables[pid][page]["modify"] = info["modify"]
                if tlb_on and not hit_tlb:
                    tlb[key] = info["frame"]
                    if len(tlb) > tlb_size:
                        tlb.popitem(last=False)
                if multi_level:
                    window = recent[pid]
                    window.append(page)
                    ws_samples[pid].append(len(set(window)))

        # ---- final accounting ----
        refs = counters["refs"]
        allocated_frames = sum(1 for o in frame_owner if o is not None)
        allocated_kb = allocated_frames * page_kb
        total_kb = total_frames * page_kb
        live_info = [admitted[pid] for pid in live]
        pages_total = sum(i["pages"] for i in live_info)
        waste_kb = sum(i["pages"] * page_kb - i["proc"].size for i in live_info)
        internal = round(waste_kb / (pages_total * page_kb) * 100, 2) if pages_total else 0.0
        hit_ratio = round(counters["hits"] / refs * 100, 2) if refs else 0.0
        tlb_lookups = counters["tlb_hits"] + counters["tlb_misses"]
        metrics = MemoryMetrics(
            total_memory=total_kb, allocated_memory=allocated_kb, free_memory=total_kb - allocated_kb,
            memory_utilization=round(allocated_kb / total_kb * 100, 2),
            external_fragmentation=0.0,  # paging never leaves unusable holes
            internal_fragmentation=internal,
            average_allocation_time=round(counters["fault_ns"] / counters["faults"] / 1e6, 4)
            if counters["faults"] else 0.0,
            failed_allocations=counters["failed"], successful_allocations=counters["admitted"],
            page_faults=counters["faults"], page_hits=counters["hits"],
            swap_ins=counters["swap_in"], swap_outs=counters["swap_out"], hit_ratio=hit_ratio,
            tlb_hits=counters["tlb_hits"], tlb_misses=counters["tlb_misses"],
            tlb_hit_ratio=round(counters["tlb_hits"] / tlb_lookups * 100, 2) if tlb_lookups else 0.0,
            total_references=refs)
        explanation.append(
            f"Finished: {refs} reference(s), {counters['faults']} page fault(s), {counters['hits']} hit(s) "
            f"(hit ratio {hit_ratio}%), {counters['swap_out']} dirty page(s) written back"
            + (f", TLB hit ratio {metrics.tlb_hit_ratio}%." if tlb_on else "."))
        if counters["faults"] > 25:
            explanation.append(f"(Only the first 25 of {counters['faults']} faults are described above; "
                               f"the Timeline tab lists every event.)")

        memory_map = []
        for f, owner in enumerate(frame_owner):
            entry = {"frame_number": f, "start": f * page_kb, "end": (f + 1) * page_kb - 1,
                     "size": page_kb, "allocated": owner is not None,
                     "process_id": owner[0] if owner else None,
                     "process_name": pname(owner[0]) if owner else None,
                     "page_number": owner[1] if owner else None,
                     "type": "allocated" if owner else "free"}
            if owner:
                entry["reference"] = resident[owner]["ref"]
                entry["modify"] = resident[owner]["modify"]
            memory_map.append(entry)
        flat_table = []
        for pid in sorted(page_tables):
            for page in sorted(page_tables[pid]):
                e = page_tables[pid][page]
                row = {"process_id": pid, "page_number": page, "frame_number": e.get("frame_number"),
                       "present": e.get("present", False), "reference": e.get("reference", False),
                       "modify": e.get("modify", False)}
                if multi_level:
                    row["indices"] = self._split_page_number(page, bits)
                flat_table.append(row)

        multi_tables = None
        if multi_level:
            multi_tables = {}
            single_bytes_per_proc = (2 ** sum(bits)) * PAGE_TABLE_ENTRY_BYTES
            for pid in sorted(live):
                nodes = ml_nodes[pid]
                node_rows, overhead = [], 0
                touched = [tuple(self._split_page_number(pg, bits)[:-1]) for pg in page_tables[pid]]
                for path in sorted(nodes, key=lambda q: (len(q), q)):
                    level = len(path)
                    entries = 2 ** bits[level]
                    overhead += entries * PAGE_TABLE_ENTRY_BYTES
                    if level == levels - 1:     # leaf table: one used entry per touched page
                        used = sum(1 for leaf in touched if leaf == path)
                    else:                       # inner table: one used entry per child table
                        used = sum(1 for q in nodes if len(q) == level + 1 and q[:level] == path)
                    node_rows.append({"level": level, "path": list(path), "entries": entries,
                                      "entries_used": used})
                samples = ws_samples.get(pid, [])
                first = next(iter(sorted(page_tables[pid])), None)
                example = None
                if first is not None:
                    pg = first
                    idx = self._split_page_number(pg, bits)
                    entry = page_tables[pid][pg]
                    offset = 0x1A4 % (page_kb * 1024)
                    va = (pg << offset_bits) | offset
                    frame = entry.get("frame_number")
                    example = {"virtual_address": va, "indices": idx, "offset": offset,
                               "present": bool(entry.get("present")), "frame_number": frame,
                               "physical_address": (frame * page_kb * 1024 + offset) if frame is not None else None,
                               "memory_accesses_on_tlb_miss": levels + 1}
                multi_tables[str(pid)] = {
                    "process_name": pname(pid), "levels": levels, "bits_per_level": bits,
                    "offset_bits": offset_bits, "virtual_address_bits": VIRTUAL_ADDRESS_BITS,
                    "tables_allocated": len(nodes), "overhead_bytes": overhead,
                    "single_level_bytes": single_bytes_per_proc,
                    "saved_percent": round((1 - overhead / single_bytes_per_proc) * 100, 4),
                    "working_set_avg": round(sum(samples) / len(samples), 2) if samples else 0.0,
                    "working_set_max": max(samples, default=0),
                    "nodes": node_rows, "translation_example": example}
                if example:
                    explanation.append(
                        f"{pname(pid)}: {len(nodes)} page-table node(s) use {overhead} B instead of "
                        f"{single_bytes_per_proc} B for a flat table "
                        f"({multi_tables[str(pid)]['saved_percent']}% saved); a TLB-miss translation costs "
                        f"{levels + 1} memory accesses.")

        visualization = MemoryVisualization(
            memory_map=memory_map, page_table=flat_table, timeline=events,
            fragmentation_chart=[], multi_level_tables=multi_tables)
        if not states or states[-1].time != (seq[-1][0] if seq else 0):
            states.append(self._frame_state(frame_owner, resident, page_kb, name_of,
                                            seq[-1][0] if seq else 0))
        name = "multi_level_paging" if multi_level else "paging"
        return self._result(name, metrics, visualization, states, explanation)

    def _evict(self, victim, drop_page, resident, now, events, name_of, counters) -> Tuple[int, bool]:
        """Evict `victim`, writing it back if dirty. Returns (freed frame number, was_dirty)."""
        info = resident[victim]
        dirty = info["modify"]
        frame = info["frame"]
        pid, page = victim
        drop_page(victim, now)
        events.append(AllocationEvent(
            time=now, event_type="page_replacement", process_id=pid,
            process_name=name_of.get(pid, f"P{pid}"), page_number=page, frame_number=frame,
            success=True, latency=NS_MEMORY_ACCESS,
            description=f"Evicted page {page} of {name_of.get(pid, pid)} from frame {frame}"
                        f"{' (dirty)' if dirty else ''}"))
        if dirty:
            counters["swap_out"] += 1
            events.append(AllocationEvent(
                time=now, event_type="swap_out", process_id=pid,
                process_name=name_of.get(pid, f"P{pid}"), page_number=page, frame_number=frame,
                success=True, latency=NS_PAGE_FAULT,
                description=f"Wrote dirty page {page} of {name_of.get(pid, pid)} back to the backing store"))
        return frame, dirty

    @staticmethod
    def _frame_state(frame_owner, resident, page_kb, name_of, time: float) -> MemoryState:
        used = sum(1 for o in frame_owner if o is not None)
        layout = []
        for f, o in enumerate(frame_owner):
            layout.append({"frame_number": f, "allocated": o is not None,
                           "process_id": o[0] if o else None,
                           "process_name": name_of.get(o[0]) if o else None,
                           "page_number": o[1] if o else None})
        per_process: Dict[int, int] = {}
        for o in frame_owner:
            if o is not None:
                per_process[o[0]] = per_process.get(o[0], 0) + 1
        return MemoryState(
            time=time, memory_layout=layout,
            free_memory=(len(frame_owner) - used) * page_kb, allocated_memory=used * page_kb,
            fragmentation={"external": 0.0, "internal": 0.0},
            processes=[{"id": pid, "name": name_of.get(pid, f"P{pid}"), "size": n * page_kb}
                       for pid, n in sorted(per_process.items())])


# Instance imported by the API layer
memory_service = MemoryManagementService()
