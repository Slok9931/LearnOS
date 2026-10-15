"""Correctness tests for the memory management service.

The page-replacement tests compare the service against small, independently
written reference implementations and against well-known textbook results.
"""
import random

import pytest

from app.models.memory import (
    LinearAllocationConfig, MemoryRequest, MultiLevelPagingConfig, PagingConfig, Process,
    SegmentationConfig,
)
from app.services.memory import memory_service


def req(algorithm_type, config, processes, sim=100.0):
    return MemoryRequest(processes=processes, config=config, algorithm_type=algorithm_type,
                         simulation_time=sim)


def P(id, size, arrival=0, **kw):
    return Process(id=id, name=f"P{id}", size=size, arrival_time=arrival, **kw)


# --------------------------------------------------------------------------- #
# Linear allocation
# --------------------------------------------------------------------------- #
def _holey_memory(method, enable_compaction=False):
    """Memory with free holes of 100, 500, 200, 300, 600 (in address order) separated by 1 KB
    pinned blocks (classic Silberschatz first/best/worst fit example), then 4 test processes."""
    sizes = [100, 1, 500, 1, 200, 1, 300, 1, 600]
    procs, t = [], 0
    for i, s in enumerate(sizes):
        # the 100/500/200/300/600 blocks leave at t=10, the 1 KB separators stay forever
        duration = (10 - i) if s != 1 else None
        procs.append(P(i + 1, s, arrival=i, duration=duration))
    for j, s in enumerate([212, 417, 112, 426]):
        procs.append(P(100 + j, s, arrival=11 + j))
    cfg = LinearAllocationConfig(total_memory=sum(sizes), os_reserved=0, allocation_method=method,
                                 enable_compaction=enable_compaction)
    return memory_service.linear_allocation(req("linear", cfg, procs))


def _placements(result):
    return {e.process_id: e.address for e in result.visualization.timeline
            if e.event_type == "allocate" and e.process_id >= 100}


def _failed(result):
    return sorted(e.process_id for e in result.visualization.timeline
                  if e.event_type == "allocation_failed")


def test_first_fit_textbook():
    r = _holey_memory("first_fit")
    # 100-hole@0, 500-hole@101, 200@602, 300@803, 600@1104
    assert _placements(r) == {100: 101, 101: 1104, 102: 313}
    assert _failed(r) == [103]


def test_best_fit_textbook():
    r = _holey_memory("best_fit")
    assert _placements(r) == {100: 803, 101: 101, 102: 602, 103: 1104}
    assert _failed(r) == []


def test_worst_fit_textbook():
    r = _holey_memory("worst_fit")
    assert _placements(r) == {100: 1104, 101: 101, 102: 1316}
    assert _failed(r) == [103]


def test_next_fit_resumes_after_last_allocation():
    r = _holey_memory("next_fit")
    # 212 -> 500-hole@101; 417 -> 600-hole@1104; the 112 KB request resumes right after the
    # previous allocation, i.e. in the 183 KB leftover of the 600 hole (first fit would give 313).
    assert _placements(r) == {100: 101, 101: 1104, 102: 1521}
    assert _failed(r) == [103]


def _placements_all(result):
    return {e.process_id: e.address for e in result.visualization.timeline if e.event_type == "allocate"}


def test_next_fit_roving_pointer_vs_first_fit():
    # Memory: X[0,50) Y[50,100) Z[100,150) W[150,300); X and Z leave -> holes [0,50) and [100,150)
    procs = [P(1, 50, 0, duration=10), P(2, 50, 1), P(3, 50, 2, duration=9), P(4, 150, 3),
             P(5, 10, 12), P(6, 45, 13), P(7, 5, 14)]
    def run(method):
        cfg = LinearAllocationConfig(total_memory=300, os_reserved=0, allocation_method=method,
                                     enable_compaction=False)
        a = _placements_all(memory_service.linear_allocation(req("linear", cfg, procs)))
        return a[5], a[6], a[7]
    assert run("first_fit") == (0, 100, 10)      # first fit always refills the first hole
    assert run("next_fit") == (0, 100, 145)      # next fit carries on after the last allocation


def test_compaction_resolves_external_fragmentation():
    sizes = [100, 50, 100, 50, 100]
    procs = [P(i + 1, s, i, duration=(10 - i) if i % 2 == 0 else None) for i, s in enumerate(sizes)]
    procs.append(P(99, 250, 20))   # 300 KB free in three holes of 100, but nothing >= 250 contiguous
    base = dict(total_memory=500, os_reserved=0, allocation_method="first_fit")
    without = memory_service.linear_allocation(
        req("linear", LinearAllocationConfig(enable_compaction=False, **base), procs))
    with_c = memory_service.linear_allocation(
        req("linear", LinearAllocationConfig(enable_compaction=True, **base), procs))
    assert _failed(without) == [99]
    assert _failed(with_c) == []
    comp = [e for e in with_c.visualization.timeline if e.event_type == "compaction"]
    assert len(comp) == 1 and comp[0].details["kb_moved"] == 100   # the two 50 KB blocks slide down
    # after compaction the allocated blocks are contiguous from address 0
    allocated = [b for b in with_c.visualization.memory_map if b["allocated"]]
    cursor = 0
    for b in sorted(allocated, key=lambda b: b["start"]):
        assert b["start"] == cursor
        cursor += b["size"]


def test_linear_metrics_consistent():
    procs = [P(1, 100, 0), P(2, 200, 1), P(3, 5000, 2)]
    r = memory_service.linear_allocation(req("linear", LinearAllocationConfig(), procs))
    m = r.metrics
    assert m.successful_allocations == 2 and m.failed_allocations == 1
    assert m.allocated_memory + m.free_memory == m.total_memory == 1024
    assert m.allocated_memory == 64 + 100 + 200
    total = sum(b["size"] for b in r.visualization.memory_map)
    assert total == 1024
    # blocks tile memory without gaps or overlaps
    cursor = 0
    for b in r.visualization.memory_map:
        assert b["start"] == cursor
        cursor += b["size"]


def test_linear_deallocation_coalesces():
    procs = [P(1, 100, 0, duration=5), P(2, 100, 1, duration=4), P(3, 10, 6)]
    cfg = LinearAllocationConfig(total_memory=400, os_reserved=0, enable_compaction=False)
    r = memory_service.linear_allocation(req("linear", cfg, procs))
    layout = [(b["start"], b["size"], b["allocated"]) for b in r.visualization.memory_map]
    # both early processes left at t=5; their space merged with the tail into one hole
    assert layout == [(0, 10, True), (10, 390, False)]


# --------------------------------------------------------------------------- #
# Segmentation
# --------------------------------------------------------------------------- #
def _seg(procs, **kw):
    cfg = SegmentationConfig(**{"total_memory": 1024, **kw})
    return memory_service.segmentation(req("segmentation", cfg, procs))


def test_segments_cover_process_size_exactly():
    for size in (1, 2, 3, 7, 100, 250, 999):
        for max_seg in (1, 2, 3, 4):
            r = _seg([P(1, size)], max_segments_per_process=max_seg)
            table = r.visualization.segment_table
            assert sum(s.size for s in table) == size, (size, max_seg)
            assert len(table) == min(max_seg, size, 4)
            assert all(s.limit == s.size for s in table)


def test_segments_do_not_overlap_and_fit():
    r = _seg([P(i, 90 + i * 7, i) for i in range(1, 9)], segment_table_size=64)
    segs = sorted(r.visualization.segment_table, key=lambda s: s.base_address)
    for a, b in zip(segs, segs[1:]):
        assert a.base_address + a.size <= b.base_address
    assert all(s.base_address + s.size <= 1024 for s in segs)


def test_segmentation_is_all_or_nothing():
    r = _seg([P(1, 600, 0), P(2, 600, 1)])
    assert r.metrics.failed_allocations == 1
    assert {s.process_id for s in r.visualization.segment_table} == {1}
    assert r.metrics.allocated_memory == 600           # nothing left over from the failed process


def test_segment_table_limit():
    r = _seg([P(1, 100, 0), P(2, 100, 1)], segment_table_size=5, max_segments_per_process=4)
    assert r.metrics.successful_allocations == 1 and r.metrics.failed_allocations == 1
    assert len(r.visualization.segment_table) == 4


def test_protection_bits():
    r = _seg([P(1, 100)], enable_protection=True)
    for s in r.visualization.segment_table:
        assert s.protection["execute"] == (s.segment_type == "code")
        assert s.protection["write"] == (s.segment_type != "code")
    r = _seg([P(1, 100)], enable_protection=False)
    assert all(all(s.protection.values()) for s in r.visualization.segment_table)


def test_sharing_code_segments():
    procs = [Process(id=1, name="editor", size=100), Process(id=2, name="editor", size=100, arrival_time=1)]
    shared = _seg(procs, enable_sharing=True)
    unshared = _seg(procs, enable_sharing=False)
    assert shared.metrics.allocated_memory < unshared.metrics.allocated_memory
    code = [s for s in shared.visualization.segment_table if s.segment_type == "code"]
    assert len(code) == 1 and sorted(code[0].shared_by) == [1, 2]


def test_shared_code_survives_one_exit():
    procs = [Process(id=1, name="editor", size=100, duration=5),
             Process(id=2, name="editor", size=100, arrival_time=1), P(3, 10, 8)]
    r = _seg(procs, enable_sharing=True)
    # P1 and P2 share a 30 KB code segment; P3 (a different program) has its own small one
    shared = [s for s in r.visualization.segment_table if s.segment_type == "code" and s.size == 30]
    assert len(shared) == 1 and shared[0].shared_by == [2] and shared[0].process_id == 2


def test_explicit_segments_used():
    p = Process(id=1, name="A", size=60, segments=[{"type": "code", "size": 10}, {"type": "data", "size": 50}])
    r = _seg([p])
    assert [(s.segment_type, s.size) for s in r.visualization.segment_table] == [("code", 10), ("data", 50)]


# --------------------------------------------------------------------------- #
# Paging: page replacement vs. independent reference implementations
# --------------------------------------------------------------------------- #
def ref_fifo(refs, n):
    frames, faults = [], 0
    for r in refs:
        if r not in frames:
            faults += 1
            if len(frames) == n:
                frames.pop(0)
            frames.append(r)
    return faults


def ref_lru(refs, n):
    frames, faults = [], 0
    for r in refs:
        if r in frames:
            frames.remove(r)
        else:
            faults += 1
            if len(frames) == n:
                frames.pop(0)
        frames.append(r)
    return faults


def ref_lfu(refs, n):
    frames, counts, loaded, faults, clock = [], {}, {}, 0, 0
    for r in refs:
        clock += 1
        if r in frames:
            counts[r] += 1
            continue
        faults += 1
        if len(frames) == n:
            victim = min(frames, key=lambda p: (counts[p], loaded[p]))
            frames.remove(victim)
        frames.append(r)
        counts[r], loaded[r] = 1, clock
    return faults


def ref_opt(refs, n):
    frames, faults = [], 0
    for i, r in enumerate(refs):
        if r in frames:
            continue
        faults += 1
        if len(frames) == n:
            def nxt(p):
                for j in range(i + 1, len(refs)):
                    if refs[j] == p:
                        return j
                return float("inf")
            victim = max(frames, key=lambda p: (nxt(p), -frames.index(p)))
            frames.remove(victim)
        frames.append(r)
    return faults


def ref_second_chance(refs, n):
    queue, faults = [], 0           # entries [page, use_bit]
    for r in refs:
        hit = next((e for e in queue if e[0] == r), None)
        if hit:
            hit[1] = 1
            continue
        faults += 1
        if len(queue) == n:
            while True:
                head = queue.pop(0)
                if head[1]:
                    head[1] = 0
                    queue.append(head)
                else:
                    break
        queue.append([r, 1])
    return faults


def ref_clock(refs, n):
    frames, use, hand, faults = [None] * n, [0] * n, 0, 0
    for r in refs:
        if r in frames:
            use[frames.index(r)] = 1
            continue
        faults += 1
        if None in frames:
            i = frames.index(None)
            frames[i], use[i] = r, 1
            continue
        while use[hand]:
            use[hand] = 0
            hand = (hand + 1) % n
        frames[hand], use[hand] = r, 1
        hand = (hand + 1) % n
    return faults


REFERENCE = {"fifo": ref_fifo, "lru": ref_lru, "lfu": ref_lfu, "optimal": ref_opt,
             "second_chance": ref_second_chance, "clock": ref_clock}
TEXTBOOK = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]


def run_paging(refs, frames, algo, tlb=False, tlb_size=4):
    cfg = PagingConfig(total_memory=frames, page_size=1, replacement_algorithm=algo,
                       max_pages_per_process=64, tlb_enabled=tlb, tlb_size=tlb_size)
    pages = max(refs) + 1
    return memory_service.paging(req("paging", cfg, [P(1, pages, 0, pages=refs)]))


@pytest.mark.parametrize("algo,expected", [("fifo", 15), ("lru", 12), ("optimal", 9)])
def test_textbook_page_fault_counts(algo, expected):
    # Silberschatz Fig. 10.x reference string, 3 frames
    assert run_paging(TEXTBOOK, 3, algo).metrics.page_faults == expected


@pytest.mark.parametrize("algo", list(REFERENCE))
@pytest.mark.parametrize("frames", [1, 2, 3, 4, 5])
def test_replacement_matches_reference_on_textbook_string(algo, frames):
    assert run_paging(TEXTBOOK, frames, algo).metrics.page_faults == REFERENCE[algo](TEXTBOOK, frames)


@pytest.mark.parametrize("algo", list(REFERENCE))
def test_replacement_matches_reference_on_random_strings(algo):
    rng = random.Random(2024)
    for _ in range(25):
        n_pages = rng.randint(2, 9)
        refs = [rng.randrange(n_pages) for _ in range(rng.randint(5, 60))]
        frames = rng.randint(1, 6)
        got = run_paging(refs, frames, algo).metrics.page_faults
        assert got == REFERENCE[algo](refs, frames), (algo, frames, refs)


def test_optimal_is_a_lower_bound():
    rng = random.Random(7)
    for _ in range(20):
        refs = [rng.randrange(8) for _ in range(40)]
        opt = run_paging(refs, 3, "optimal").metrics.page_faults
        for algo in ("fifo", "lru", "lfu", "clock", "second_chance"):
            assert opt <= run_paging(refs, 3, algo).metrics.page_faults


def test_fifo_beladys_anomaly():
    refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    assert run_paging(refs, 3, "fifo").metrics.page_faults == 9
    assert run_paging(refs, 4, "fifo").metrics.page_faults == 10     # more frames, more faults
    assert run_paging(refs, 3, "lru").metrics.page_faults >= run_paging(refs, 4, "lru").metrics.page_faults


def test_paging_accounting_identities():
    r = run_paging(TEXTBOOK, 3, "lru", tlb=True, tlb_size=2)
    m = r.metrics
    assert m.page_hits + m.page_faults == m.total_references == len(TEXTBOOK)
    assert m.tlb_hits + m.tlb_misses == m.total_references
    assert m.swap_ins == m.page_faults
    assert m.hit_ratio == pytest.approx(m.page_hits / m.total_references * 100, abs=0.01)
    types = [e.event_type for e in r.visualization.timeline]
    assert types.count("page_fault") == m.page_faults
    assert types.count("tlb_miss") == m.tlb_misses
    assert types.count("page_replacement") == max(0, m.page_faults - 3)


def test_page_table_matches_frames():
    r = run_paging(TEXTBOOK, 3, "lru")
    present = {(e["process_id"], e["page_number"]): e["frame_number"]
               for e in r.visualization.page_table if e["present"]}
    mapped = {(b["process_id"], b["page_number"]): b["frame_number"]
              for b in r.visualization.memory_map if b["allocated"]}
    assert present == mapped and len(present) == 3


def test_tlb_hits_when_working_set_fits():
    refs = [0, 1, 0, 1, 0, 1, 0, 1]
    m = run_paging(refs, 4, "lru", tlb=True, tlb_size=2).metrics
    assert m.tlb_misses == 2 and m.tlb_hits == 6
    m = run_paging(refs, 4, "lru", tlb=True, tlb_size=1).metrics
    assert m.tlb_hits == 0                                   # thrashes a 1-entry TLB


def test_evicted_page_leaves_tlb():
    # 1 frame: page 0 evicted by page 1; the next access to 0 must miss the TLB *and* fault.
    m = run_paging([0, 1, 0], 1, "fifo", tlb=True, tlb_size=4).metrics
    assert m.tlb_hits == 0 and m.page_faults == 3


def test_dirty_pages_are_written_back():
    r = run_paging(TEXTBOOK * 3, 2, "fifo")
    m = r.metrics
    types = [e.event_type for e in r.visualization.timeline]
    assert m.swap_outs == types.count("swap_out") > 0
    assert m.swap_outs <= m.page_faults


def test_no_virtual_memory_rejects_oversized_process():
    cfg = PagingConfig(total_memory=16, page_size=4, enable_virtual_memory=False,
                       max_pages_per_process=64, tlb_enabled=False)
    r = memory_service.paging(req("paging", cfg, [P(1, 12, 0), P(2, 12, 1)]))
    assert r.metrics.successful_allocations == 1 and r.metrics.failed_allocations == 1
    assert r.metrics.page_faults == 0 and r.metrics.hit_ratio == 100.0
    assert r.metrics.allocated_memory == 12


def test_virtual_memory_allows_process_larger_than_ram():
    cfg = PagingConfig(total_memory=16, page_size=4, max_pages_per_process=64, tlb_enabled=False)
    r = memory_service.paging(req("paging", cfg, [P(1, 100, 0)]))
    assert r.metrics.failed_allocations == 0 and r.metrics.page_faults > 0
    assert r.metrics.allocated_memory <= 16


def test_max_pages_per_process_enforced():
    cfg = PagingConfig(total_memory=64, page_size=4, max_pages_per_process=4)
    r = memory_service.paging(req("paging", cfg, [P(1, 17, 0), P(2, 16, 1)]))
    assert r.metrics.failed_allocations == 1 and r.metrics.successful_allocations == 1


def test_internal_fragmentation():
    cfg = PagingConfig(total_memory=64, page_size=4, enable_virtual_memory=False, tlb_enabled=False)
    r = memory_service.paging(req("paging", cfg, [P(1, 10, 0)]))     # 3 pages = 12 KB, waste 2 KB
    assert r.metrics.internal_fragmentation == pytest.approx(2 / 12 * 100, abs=0.01)
    assert r.metrics.external_fragmentation == 0.0


def test_process_departure_frees_frames():
    cfg = PagingConfig(total_memory=16, page_size=4, enable_virtual_memory=False, tlb_enabled=False)
    r = memory_service.paging(req("paging", cfg, [P(1, 16, 0, duration=3), P(2, 16, 5)]))
    assert r.metrics.failed_allocations == 0 and r.metrics.successful_allocations == 2


def test_paging_is_deterministic():
    cfg = PagingConfig(total_memory=32, page_size=4, max_pages_per_process=32)
    procs = [P(1, 40, 0), P(2, 30, 1), P(3, 20, 2)]
    a = memory_service.paging(req("paging", cfg, procs)).model_dump()
    b = memory_service.paging(req("paging", cfg, procs)).model_dump()
    assert a == b


# --------------------------------------------------------------------------- #
# Multi-level paging
# --------------------------------------------------------------------------- #
def run_ml(procs, **kw):
    cfg = MultiLevelPagingConfig(**{"total_memory": 64, "page_size": 4, **kw})
    return memory_service.multi_level_paging(req("multi_level_paging", cfg, procs))


def test_ml_address_split():
    s = memory_service
    assert s._bits_per_level(2, 20) == [10, 10]
    assert s._bits_per_level(3, 20) == [7, 7, 6]
    assert s._bits_per_level(4, 20) == [5, 5, 5, 5]
    assert s._split_page_number(0b1010101010_0101010101, [10, 10]) == [0b1010101010, 0b0101010101]
    assert s._split_page_number(0xABCDE, [7, 7, 6]) == [(0xABCDE >> 13) & 127, (0xABCDE >> 6) & 127, 0xABCDE & 63]


def test_ml_translation_example_is_consistent():
    r = run_ml([P(1, 40, 0)], levels=2)
    t = r.visualization.multi_level_tables["1"]
    ex = t["translation_example"]
    assert t["bits_per_level"] == [10, 10] and t["offset_bits"] == 12
    assert ex["virtual_address"] >> 12 == (ex["indices"][0] << 10) | ex["indices"][1]
    if ex["present"]:
        assert ex["physical_address"] == ex["frame_number"] * 4096 + ex["offset"]


def test_ml_saves_page_table_space():
    t = run_ml([P(1, 40, 0)], levels=2).visualization.multi_level_tables["1"]
    assert t["single_level_bytes"] == 2 ** 20 * 4
    assert t["overhead_bytes"] == 2 * 4096          # one directory + one leaf table
    assert t["tables_allocated"] == 2 and t["saved_percent"] > 99


def test_ml_three_levels_allocates_chain_of_tables():
    t = run_ml([P(1, 4, 0)], levels=3).visualization.multi_level_tables["1"]
    assert t["tables_allocated"] == 3        # directory + 1 table per deeper level
    assert [n["level"] for n in t["nodes"]] == [0, 1, 2]


def test_ml_working_set_cap_limits_resident_pages():
    r = run_ml([P(1, 80, 0)], working_set_size=3, total_memory=64)
    resident = [e for e in r.visualization.page_table if e["present"]]
    assert len(resident) <= 3


def test_ml_non_demand_loads_everything():
    r = run_ml([P(1, 20, 0)], enable_demand_paging=False)
    assert r.metrics.page_faults == 0 and r.metrics.allocated_memory == 20


def test_ml_rejects_bad_page_size():
    with pytest.raises(ValueError):
        run_ml([P(1, 10)], page_size=3)


def test_ml_accounting():
    m = run_ml([P(1, 60, 0), P(2, 50, 1)], levels=2).metrics
    assert m.page_hits + m.page_faults == m.total_references
    assert m.allocated_memory <= m.total_memory


# --------------------------------------------------------------------------- #
# API layer
# --------------------------------------------------------------------------- #
def test_config_is_selected_by_algorithm_type():
    body = {"processes": [{"id": 1, "name": "A", "size": 10}], "algorithm_type": "multi_level_paging",
            "config": {"total_memory": 64, "page_size": 4, "levels": 3, "working_set_size": 5}}
    parsed = MemoryRequest(**body)
    assert isinstance(parsed.config, MultiLevelPagingConfig) and parsed.config.levels == 3


def test_http_endpoints():
    from fastapi.testclient import TestClient
    from app.main import app
    c = TestClient(app)
    procs = [{"id": i, "name": f"P{i}", "size": s, "arrival_time": i}
             for i, s in enumerate([100, 60, 80], 1)]
    cases = {
        "linear": {"total_memory": 1024, "allocation_method": "best_fit"},
        "segmentation": {"total_memory": 1024},
        "paging": {"total_memory": 64, "page_size": 4, "replacement_algorithm": "lru",
                   "max_pages_per_process": 64},
        "multi-level-paging": {"total_memory": 64, "page_size": 4, "levels": 2},
    }
    for endpoint, cfg in cases.items():
        r = c.post(f"/api/memory/{endpoint}",
                   json={"processes": procs, "config": cfg, "algorithm_type": endpoint.replace("-", "_")})
        assert r.status_code == 200, (endpoint, r.text)
        assert r.json()["data"]["success"] is True
    # algorithm_type / endpoint mismatch is a client error, not a 500
    r = c.post("/api/memory/paging", json={"processes": procs, "config": cases["linear"],
                                           "algorithm_type": "linear"})
    assert r.status_code == 400
    # duplicate process ids are rejected
    dup = [procs[0], procs[0]]
    r = c.post("/api/memory/linear", json={"processes": dup, "config": cases["linear"],
                                           "algorithm_type": "linear"})
    assert r.status_code == 400
