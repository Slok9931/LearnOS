from typing import List, Dict, Optional, Any, Tuple
import math
import time
from collections import deque, defaultdict
from app.models.memory import (
    Process, MemoryBlock, Segment, Page, Frame, PageTableEntry,
    MemoryRequest, AllocationEvent, MemoryState, MemoryMetrics,
    MemoryVisualization, MemoryResult, LinearAllocationConfig,
    SegmentationConfig, PagingConfig, MultiLevelPagingConfig,
    MemoryAllocationMethod, ReplacementAlgorithm
)

class MemoryManagementService:
    def __init__(self):
        self.current_time = 0.0
        self.events = []
        self.memory_states = []
        
    def linear_allocation(self, request: MemoryRequest) -> MemoryResult:
        """Linear/Contiguous Memory Allocation with different fit algorithms"""
        config = request.config
        processes = request.processes
        
        total_memory = config.total_memory * 1024
        os_memory = config.os_reserved * 1024
        available_memory = total_memory - os_memory
        
        memory_blocks = [
            MemoryBlock(id=0, start_address=0, size=os_memory, is_allocated=True, 
                       process_id=-1, process_name="OS"),
            MemoryBlock(id=1, start_address=os_memory, size=available_memory, is_allocated=False)
        ]
        
        allocated_processes = []
        events = []
        states = []
        failed_allocations = 0
        successful_allocations = 0
        
        sorted_processes = sorted(processes, key=lambda x: x.arrival_time)
        
        for process in sorted_processes:
            self.current_time = process.arrival_time
            process_size = process.size * 1024
            
            allocated_block = self._find_suitable_block(
                memory_blocks, process_size, config.allocation_method
            )
            
            if allocated_block:
                if allocated_block.size > process_size:
                    new_block = MemoryBlock(
                        id=len(memory_blocks),
                        start_address=allocated_block.start_address + process_size,
                        size=allocated_block.size - process_size,
                        is_allocated=False
                    )
                    memory_blocks.append(new_block)
                    allocated_block.size = process_size
                
                allocated_block.is_allocated = True
                allocated_block.process_id = process.id
                allocated_block.process_name = process.name
                
                events.append(AllocationEvent(
                    time=self.current_time,
                    event_type="allocate",
                    process_id=process.id,
                    process_name=process.name,
                    size=process_size,
                    address=allocated_block.start_address,
                    description=f"Process {process.name} allocated {process_size} bytes at address {allocated_block.start_address}"
                ))
                
                allocated_processes.append({
                    "id": process.id,
                    "name": process.name,
                    "size": process_size,
                    "start_address": allocated_block.start_address,
                    "end_address": allocated_block.start_address + process_size - 1,
                    "allocation_method": config.allocation_method.value
                })
                
                successful_allocations += 1
            else:
                if config.enable_compaction:
                    memory_blocks = self._compact_memory(memory_blocks)
                    allocated_block = self._find_suitable_block(
                        memory_blocks, process_size, config.allocation_method
                    )
                    
                    if allocated_block:
                        if allocated_block.size > process_size:
                            new_block = MemoryBlock(
                                id=len(memory_blocks),
                                start_address=allocated_block.start_address + process_size,
                                size=allocated_block.size - process_size,
                                is_allocated=False
                            )
                            memory_blocks.append(new_block)
                            allocated_block.size = process_size
                        
                        allocated_block.is_allocated = True
                        allocated_block.process_id = process.id
                        allocated_block.process_name = process.name
                        
                        events.append(AllocationEvent(
                            time=self.current_time,
                            event_type="compaction",
                            process_id=-1,
                            process_name="System",
                            description="Memory compaction performed"
                        ))
                        
                        events.append(AllocationEvent(
                            time=self.current_time,
                            event_type="allocate",
                            process_id=process.id,
                            process_name=process.name,
                            size=process_size,
                            address=allocated_block.start_address,
                            description=f"Process {process.name} allocated {process_size} bytes at address {allocated_block.start_address} after compaction"
                        ))
                        
                        successful_allocations += 1
                    else:
                        failed_allocations += 1
                        events.append(AllocationEvent(
                            time=self.current_time,
                            event_type="allocation_failed",
                            process_id=process.id,
                            process_name=process.name,
                            size=process_size,
                            description=f"Process {process.name} allocation failed - insufficient memory"
                        ))
                else:
                    failed_allocations += 1
                    events.append(AllocationEvent(
                        time=self.current_time,
                        event_type="allocation_failed",
                        process_id=process.id,
                        process_name=process.name,
                        size=process_size,
                        description=f"Process {process.name} allocation failed - insufficient memory"
                    ))
            
            states.append(self._create_memory_state(memory_blocks, self.current_time))
        
        metrics = self._calculate_linear_metrics(
            memory_blocks, total_memory, successful_allocations, failed_allocations
        )
        
        visualization = self._create_linear_visualization(memory_blocks, events)
        
        return MemoryResult(
            success=True,
            algorithm=f"Linear Allocation ({config.allocation_method.value})",
            processes=allocated_processes,
            metrics=metrics,
            visualization=visualization,
            memory_states=states,
            final_state={"memory_blocks": [block.dict() for block in memory_blocks]},
            statistics={
                "successful_allocations": successful_allocations,
                "failed_allocations": failed_allocations,
                "compaction_enabled": config.enable_compaction
            }
        )
    
    def segmentation(self, request: MemoryRequest) -> MemoryResult:
        """Segmentation Memory Management"""
        config = request.config
        processes = request.processes
        
        total_memory = config.total_memory * 1024
        segments = []
        segment_table = {}
        events = []
        states = []
        allocated_processes = []
        
        current_address = 0
        
        for process in sorted(processes, key=lambda x: x.arrival_time):
            self.current_time = process.arrival_time
            process_segments = []
            
            segment_types = ["code", "data", "stack"]
            if process.segments:
                for i, seg_info in enumerate(process.segments):
                    segment = Segment(
                        id=len(segments),
                        process_id=process.id,
                        segment_type=seg_info.get("type", f"segment_{i}"),
                        size=seg_info.get("size", process.size // len(process.segments)),
                        base_address=current_address
                    )
                    segment.limit = segment.base_address + segment.size - 1
                    segments.append(segment)
                    process_segments.append(segment)
                    current_address += segment.size
            else:
                segment_size = process.size * 1024 // len(segment_types)
                for seg_type in segment_types:
                    segment = Segment(
                        id=len(segments),
                        process_id=process.id,
                        segment_type=seg_type,
                        size=segment_size,
                        base_address=current_address
                    )
                    segment.limit = segment.base_address + segment.size - 1
                    segments.append(segment)
                    process_segments.append(segment)
                    current_address += segment_size
            
            segment_table[process.id] = process_segments
            
            events.append(AllocationEvent(
                time=self.current_time,
                event_type="allocate",
                process_id=process.id,
                process_name=process.name,
                size=sum(seg.size for seg in process_segments),
                description=f"Process {process.name} allocated {len(process_segments)} segments"
            ))
            
            allocated_processes.append({
                "id": process.id,
                "name": process.name,
                "segments": [
                    {
                        "type": seg.segment_type,
                        "base": seg.base_address,
                        "limit": seg.limit,
                        "size": seg.size
                    } for seg in process_segments
                ],
                "total_size": sum(seg.size for seg in process_segments)
            })
            
            states.append(self._create_segmentation_state(segments, self.current_time))
        
        metrics = self._calculate_segmentation_metrics(segments, total_memory)
        
        visualization = self._create_segmentation_visualization(segments, events)
        
        return MemoryResult(
            success=True,
            algorithm="Segmentation",
            processes=allocated_processes,
            metrics=metrics,
            visualization=visualization,
            memory_states=states,
            final_state={"segments": [seg.dict() for seg in segments]},
            statistics={
                "total_segments": len(segments),
                "processes_allocated": len(allocated_processes)
            }
        )
    
    def paging(self, request: MemoryRequest) -> MemoryResult:
        """Paging Memory Management with Virtual Memory"""
        config = request.config
        processes = request.processes
        
        total_memory = config.total_memory * 1024
        page_size = config.page_size * 1024
        total_frames = total_memory // page_size
        
        frames = [Frame(frame_number=i, size=page_size) for i in range(total_frames)]
        page_tables = {}
        allocated_processes = []
        events = []
        states = []
        
        page_faults = 0
        page_hits = 0
        
        for process in sorted(processes, key=lambda x: x.arrival_time):
            self.current_time = process.arrival_time
            process_size = process.size * 1024
            pages_needed = math.ceil(process_size / page_size)
            
            page_table = []
            allocated_frames = []
            
            for page_num in range(pages_needed):
                free_frame = None
                for frame in frames:
                    if not frame.is_allocated:
                        free_frame = frame
                        break
                
                if free_frame:
                    free_frame.is_allocated = True
                    free_frame.page_number = page_num
                    free_frame.process_id = process.id
                    allocated_frames.append(free_frame.frame_number)
                    
                    page_entry = PageTableEntry(
                        page_number=page_num,
                        frame_number=free_frame.frame_number,
                        present=True
                    )
                    page_table.append(page_entry)
                    page_hits += 1
                else:
                    if config.enable_virtual_memory:
                        replaced_frame = self._page_replacement(
                            frames, config.replacement_algorithm, process.id
                        )
                        if replaced_frame:
                            page_entry = PageTableEntry(
                                page_number=page_num,
                                frame_number=replaced_frame.frame_number,
                                present=True
                            )
                            page_table.append(page_entry)
                            page_faults += 1
                            
                            events.append(AllocationEvent(
                                time=self.current_time,
                                event_type="page_fault",
                                process_id=process.id,
                                process_name=process.name,
                                page_number=page_num,
                                frame_number=replaced_frame.frame_number,
                                description=f"Page fault: Page {page_num} loaded into frame {replaced_frame.frame_number}"
                            ))
                    else:
                        page_entry = PageTableEntry(
                            page_number=page_num,
                            present=False
                        )
                        page_table.append(page_entry)
                        page_faults += 1
            
            page_tables[process.id] = page_table
            
            events.append(AllocationEvent(
                time=self.current_time,
                event_type="allocate",
                process_id=process.id,
                process_name=process.name,
                size=process_size,
                description=f"Process {process.name} allocated {pages_needed} pages"
            ))
            
            allocated_processes.append({
                "id": process.id,
                "name": process.name,
                "size": process_size,
                "pages_needed": pages_needed,
                "allocated_frames": allocated_frames,
                "page_table": [entry.dict() for entry in page_table]
            })
            
            states.append(self._create_paging_state(frames, page_tables, self.current_time))
        
        metrics = self._calculate_paging_metrics(
            frames, total_memory, page_faults, page_hits
        )
        
        visualization = self._create_paging_visualization(frames, page_tables, events)
        
        return MemoryResult(
            success=True,
            algorithm="Paging",
            processes=allocated_processes,
            metrics=metrics,
            visualization=visualization,
            memory_states=states,
            final_state={
                "frames": [frame.dict() for frame in frames],
                "page_tables": {pid: [entry.dict() for entry in table] 
                              for pid, table in page_tables.items()}
            },
            statistics={
                "page_faults": page_faults,
                "page_hits": page_hits,
                "hit_ratio": page_hits / (page_hits + page_faults) if (page_hits + page_faults) > 0 else 0,
                "total_frames": total_frames,
                "page_size": page_size
            }
        )
    
    def multi_level_paging(self, request: MemoryRequest) -> MemoryResult:
        """Multi-level Paging with Demand Paging"""
        config = request.config
        processes = request.processes
        
        total_memory = config.total_memory * 1024
        page_size = config.page_size * 1024
        total_frames = total_memory // page_size
        levels = config.levels
        
        frames = [Frame(frame_number=i, size=page_size) for i in range(total_frames)]
        page_tables = {}
        allocated_processes = []
        events = []
        states = []
        
        page_faults = 0
        page_hits = 0
        swap_ins = 0
        swap_outs = 0
        
        for process in sorted(processes, key=lambda x: x.arrival_time):
            self.current_time = process.arrival_time
            process_size = process.size * 1024
            pages_needed = math.ceil(process_size / page_size)
            
            page_table_structure = self._create_multilevel_page_table(
                pages_needed, levels, process.id
            )
            page_tables[process.id] = page_table_structure
            
            loaded_pages = 0
            if config.enable_demand_paging:
                working_set_size = min(config.working_set_size, pages_needed)
                for page_num in range(working_set_size):
                    frame_result = self._allocate_frame_multilevel(
                        frames, page_num, process.id, config.replacement_algorithm
                    )
                    
                    if frame_result["success"]:
                        loaded_pages += 1
                        page_hits += 1
                        if frame_result["page_fault"]:
                            page_faults += 1
                            if frame_result["swap_out"]:
                                swap_outs += 1
                            swap_ins += 1
                    else:
                        page_faults += 1
            else:
                for page_num in range(pages_needed):
                    frame_result = self._allocate_frame_multilevel(
                        frames, page_num, process.id, config.replacement_algorithm
                    )
                    
                    if frame_result["success"]:
                        loaded_pages += 1
                        page_hits += 1
                        if frame_result["page_fault"]:
                            page_faults += 1
            
            events.append(AllocationEvent(
                time=self.current_time,
                event_type="allocate",
                process_id=process.id,
                process_name=process.name,
                size=process_size,
                description=f"Process {process.name} allocated with {levels}-level paging ({loaded_pages}/{pages_needed} pages loaded)"
            ))
            
            allocated_processes.append({
                "id": process.id,
                "name": process.name,
                "size": process_size,
                "pages_needed": pages_needed,
                "pages_loaded": loaded_pages,
                "levels": levels,
                "demand_paging": config.enable_demand_paging
            })
            
            states.append(self._create_multilevel_paging_state(
                frames, page_tables, self.current_time
            ))
        
        metrics = self._calculate_multilevel_paging_metrics(
            frames, total_memory, page_faults, page_hits, swap_ins, swap_outs
        )
        
        visualization = self._create_multilevel_paging_visualization(
            frames, page_tables, events, levels
        )
        
        return MemoryResult(
            success=True,
            algorithm=f"{levels}-Level Paging with Demand Paging",
            processes=allocated_processes,
            metrics=metrics,
            visualization=visualization,
            memory_states=states,
            final_state={
                "frames": [frame.dict() for frame in frames],
                "page_tables": page_tables,
                "levels": levels
            },
            statistics={
                "page_faults": page_faults,
                "page_hits": page_hits,
                "swap_ins": swap_ins,
                "swap_outs": swap_outs,
                "hit_ratio": page_hits / (page_hits + page_faults) if (page_hits + page_faults) > 0 else 0,
                "levels": levels,
                "demand_paging": config.enable_demand_paging
            }
        )
    
    def _find_suitable_block(self, blocks: List[MemoryBlock], size: int, method: MemoryAllocationMethod) -> Optional[MemoryBlock]:
        """Find suitable memory block using specified allocation method"""
        free_blocks = [block for block in blocks if not block.is_allocated and block.size >= size]
        
        if not free_blocks:
            return None
        
        if method == MemoryAllocationMethod.FIRST_FIT:
            return free_blocks[0]
        elif method == MemoryAllocationMethod.BEST_FIT:
            return min(free_blocks, key=lambda x: x.size)
        elif method == MemoryAllocationMethod.WORST_FIT:
            return max(free_blocks, key=lambda x: x.size)
        elif method == MemoryAllocationMethod.NEXT_FIT:
            return free_blocks[0]
        
        return None
    
    def _compact_memory(self, blocks: List[MemoryBlock]) -> List[MemoryBlock]:
        """Compact memory by moving all allocated blocks to the beginning"""
        allocated_blocks = [block for block in blocks if block.is_allocated]
        
        current_address = 0
        for block in allocated_blocks:
            block.start_address = current_address
            current_address += block.size
        
        total_memory = sum(block.size for block in blocks)
        remaining_size = total_memory - current_address
        
        if remaining_size > 0:
            free_block = MemoryBlock(
                id=max(block.id for block in blocks) + 1,
                start_address=current_address,
                size=remaining_size,
                is_allocated=False
            )
            allocated_blocks.append(free_block)
        
        return allocated_blocks
    
    def _page_replacement(self, frames: List[Frame], algorithm: ReplacementAlgorithm, process_id: int) -> Optional[Frame]:
        """Implement page replacement algorithms"""
        allocated_frames = [frame for frame in frames if frame.is_allocated]
        
        if not allocated_frames:
            return None
        
        if algorithm == ReplacementAlgorithm.FIFO:
            victim_frame = allocated_frames[0]
        elif algorithm == ReplacementAlgorithm.LRU:
            victim_frame = allocated_frames[0]
        else:
            victim_frame = allocated_frames[0]
        
        victim_frame.is_allocated = False
        victim_frame.page_number = None
        victim_frame.process_id = None
        
        victim_frame.is_allocated = True
        victim_frame.process_id = process_id
        
        return victim_frame
    
    def _create_memory_state(self, blocks: List[MemoryBlock], time: float) -> MemoryState:
        """Create memory state snapshot"""
        allocated_memory = sum(block.size for block in blocks if block.is_allocated)
        total_memory = sum(block.size for block in blocks)
        free_memory = total_memory - allocated_memory
        
        free_blocks = [block for block in blocks if not block.is_allocated]
        external_frag = len(free_blocks) - 1 if len(free_blocks) > 1 else 0
        
        return MemoryState(
            time=time,
            memory_blocks=blocks.copy(),
            allocated_memory=allocated_memory,
            free_memory=free_memory,
            fragmentation={"external": external_frag, "internal": 0},
            processes=[
                {"id": block.process_id, "name": block.process_name, "size": block.size}
                for block in blocks if block.is_allocated and block.process_id != -1
            ]
        )
    
    def _calculate_linear_metrics(self, blocks: List[MemoryBlock], total_memory: int, 
                                 successful: int, failed: int) -> MemoryMetrics:
        """Calculate metrics for linear allocation"""
        allocated_memory = sum(block.size for block in blocks if block.is_allocated)
        free_memory = total_memory - allocated_memory
        
        free_blocks = [block for block in blocks if not block.is_allocated]
        external_frag = (len(free_blocks) - 1) / len(blocks) * 100 if len(blocks) > 0 else 0
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=free_memory,
            memory_utilization=(allocated_memory / total_memory) * 100,
            external_fragmentation=external_frag,
            internal_fragmentation=0,
            average_allocation_time=1.0,
            failed_allocations=failed,
            successful_allocations=successful
        )
    
    def _create_linear_visualization(self, blocks: List[MemoryBlock], events: List[AllocationEvent]) -> MemoryVisualization:
        """Create visualization data for linear allocation"""
        memory_map = []
        for block in blocks:
            memory_map.append({
                "start": block.start_address,
                "end": block.start_address + block.size - 1,
                "size": block.size,
                "allocated": block.is_allocated,
                "process_id": block.process_id,
                "process_name": block.process_name,
                "type": "allocated" if block.is_allocated else "free"
            })
        
        fragmentation_chart = []
        free_blocks = [block for block in blocks if not block.is_allocated]
        for i, block in enumerate(free_blocks):
            fragmentation_chart.append({
                "block_id": i,
                "size": block.size,
                "start": block.start_address
            })
        
        return MemoryVisualization(
            memory_map=memory_map,
            timeline=events,
            fragmentation_chart=fragmentation_chart
        )
    
    def _create_segmentation_state(self, segments: List[Segment], time: float) -> MemoryState:
        """Create memory state for segmentation"""
        allocated_memory = sum(seg.size for seg in segments)
        
        memory_blocks = []
        for seg in segments:
            block = MemoryBlock(
                id=seg.id,
                start_address=seg.base_address,
                size=seg.size,
                is_allocated=True,
                process_id=seg.process_id,
                process_name=f"P{seg.process_id}_{seg.segment_type}"
            )
            memory_blocks.append(block)
        
        return MemoryState(
            time=time,
            memory_blocks=memory_blocks,
            allocated_memory=allocated_memory,
            free_memory=0,
            fragmentation={"external": 0, "internal": 0},
            processes=[
                {"id": seg.process_id, "type": seg.segment_type, "size": seg.size}
                for seg in segments
            ]
        )
    
    def _calculate_segmentation_metrics(self, segments: List[Segment], total_memory: int) -> MemoryMetrics:
        """Calculate metrics for segmentation"""
        allocated_memory = sum(seg.size for seg in segments)
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=total_memory - allocated_memory,
            memory_utilization=(allocated_memory / total_memory) * 100,
            external_fragmentation=0,
            internal_fragmentation=0,
            average_allocation_time=1.0,
            failed_allocations=0,
            successful_allocations=len(set(seg.process_id for seg in segments))
        )
    
    def _create_segmentation_visualization(self, segments: List[Segment], events: List[AllocationEvent]) -> MemoryVisualization:
        """Create visualization for segmentation"""
        memory_map = []
        for seg in segments:
            memory_map.append({
                "start": seg.base_address,
                "end": seg.limit,
                "size": seg.size,
                "process_id": seg.process_id,
                "segment_type": seg.segment_type,
                "protection": seg.protection
            })
        
        segment_table = segments
        
        return MemoryVisualization(
            memory_map=memory_map,
            segment_table=segments,
            timeline=events,
            fragmentation_chart=[]
        )
    
    def _create_paging_state(self, frames: List[Frame], page_tables: Dict, time: float) -> MemoryState:
        """Create memory state for paging"""
        allocated_frames = [frame for frame in frames if frame.is_allocated]
        allocated_memory = len(allocated_frames) * frames[0].size if frames else 0
        total_memory = len(frames) * frames[0].size if frames else 0
        
        # Convert frames to memory blocks
        memory_blocks = []
        for frame in frames:
            block = MemoryBlock(
                id=frame.frame_number,
                start_address=frame.frame_number * frame.size,
                size=frame.size,
                is_allocated=frame.is_allocated,
                process_id=frame.process_id,
                process_name=f"P{frame.process_id}_Page{frame.page_number}" if frame.process_id else None
            )
            memory_blocks.append(block)
        
        return MemoryState(
            time=time,
            memory_blocks=memory_blocks,
            allocated_memory=allocated_memory,
            free_memory=total_memory - allocated_memory,
            fragmentation={"external": 0, "internal": 0},
            processes=[]
        )
    
    def _calculate_paging_metrics(self, frames: List[Frame], total_memory: int, 
                                 page_faults: int, page_hits: int) -> MemoryMetrics:
        """Calculate metrics for paging"""
        allocated_frames = [frame for frame in frames if frame.is_allocated]
        allocated_memory = len(allocated_frames) * frames[0].size if frames else 0
        
        hit_ratio = page_hits / (page_hits + page_faults) if (page_hits + page_faults) > 0 else 0
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=total_memory - allocated_memory,
            memory_utilization=(allocated_memory / total_memory) * 100,
            external_fragmentation=0,
            internal_fragmentation=0,
            average_allocation_time=1.0,
            failed_allocations=page_faults,
            successful_allocations=page_hits,
            page_faults=page_faults,
            page_hits=page_hits,
            hit_ratio=hit_ratio * 100
        )
    
    def _create_paging_visualization(self, frames: List[Frame], page_tables: Dict, 
                                   events: List[AllocationEvent]) -> MemoryVisualization:
        """Create visualization for paging"""
        memory_map = []
        for frame in frames:
            memory_map.append({
                "frame_number": frame.frame_number,
                "start": frame.frame_number * frame.size,
                "end": (frame.frame_number + 1) * frame.size - 1,
                "size": frame.size,
                "allocated": frame.is_allocated,
                "process_id": frame.process_id,
                "page_number": frame.page_number
            })
        
        page_table_list = []
        for process_id, table in page_tables.items():
            for entry in table:
                page_table_list.append({
                    "process_id": process_id,
                    "page_number": entry.page_number,
                    "frame_number": entry.frame_number,
                    "present": entry.present
                })
        
        return MemoryVisualization(
            memory_map=memory_map,
            page_table=page_table_list,
            timeline=events,
            fragmentation_chart=[]
        )
    
    def _create_multilevel_page_table(self, pages_needed: int, levels: int, process_id: int) -> Dict:
        """Create multi-level page table structure"""
        page_table = {
            "process_id": process_id,
            "levels": levels,
            "pages_needed": pages_needed,
            "structure": {}
        }
        
        entries_per_level = math.ceil(pages_needed ** (1/levels))
        
        for level in range(levels):
            page_table["structure"][f"level_{level}"] = {
                "entries": entries_per_level,
                "pages": []
            }
        
        return page_table
    
    def _allocate_frame_multilevel(self, frames: List[Frame], page_num: int, 
                                  process_id: int, replacement_algorithm: ReplacementAlgorithm) -> Dict:
        """Allocate frame for multi-level paging"""
        free_frame = None
        for frame in frames:
            if not frame.is_allocated:
                free_frame = frame
                break
        
        if free_frame:
            free_frame.is_allocated = True
            free_frame.page_number = page_num
            free_frame.process_id = process_id
            return {"success": True, "frame_number": free_frame.frame_number, "page_fault": False, "swap_out": False}
        else:
            victim_frame = self._page_replacement(frames, replacement_algorithm, process_id)
            if victim_frame:
                victim_frame.page_number = page_num
                return {"success": True, "frame_number": victim_frame.frame_number, "page_fault": True, "swap_out": True}
            else:
                return {"success": False, "page_fault": True, "swap_out": False}
    
    def _create_multilevel_paging_state(self, frames: List[Frame], page_tables: Dict, time: float) -> MemoryState:
        """Create memory state for multi-level paging"""
        return self._create_paging_state(frames, page_tables, time)
    
    def _calculate_multilevel_paging_metrics(self, frames: List[Frame], total_memory: int,
                                           page_faults: int, page_hits: int, swap_ins: int, swap_outs: int) -> MemoryMetrics:
        """Calculate metrics for multi-level paging"""
        metrics = self._calculate_paging_metrics(frames, total_memory, page_faults, page_hits)
        metrics.swap_ins = swap_ins
        metrics.swap_outs = swap_outs
        return metrics
    
    def _create_multilevel_paging_visualization(self, frames: List[Frame], page_tables: Dict,
                                              events: List[AllocationEvent], levels: int) -> MemoryVisualization:
        """Create visualization for multi-level paging"""
        viz = self._create_paging_visualization(frames, {}, events)
        viz.memory_map.append({"levels": levels, "type": "multi_level_info"})
        return viz

memory_service = MemoryManagementService()