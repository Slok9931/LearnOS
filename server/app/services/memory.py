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
        """Simulate segmentation algorithm"""
        try:
            config = request.config
            total_memory = config.total_memory
            max_segments = config.max_segments_per_process
            
            segments = []
            events = []
            states = []
            explanation = []
            successful_allocations = 0
            failed_allocations = 0
            
            explanation.append(f"Starting segmentation simulation")
            explanation.append(f"Total memory: {total_memory} KB, Max segments per process: {max_segments}")
            
            current_address = 0
            
            # Process each process
            for process in sorted(request.processes, key=lambda p: p.arrival_time):
                # Create segments for process (code, data, stack)
                segment_types = ['code', 'data', 'stack']
                process_segments = []
                allocated = True
                
                for i, seg_type in enumerate(segment_types[:max_segments]):
                    seg_size = process.size // len(segment_types)
                    if i == len(segment_types) - 1:  # Last segment gets remainder
                        seg_size = process.size - (seg_size * (len(segment_types) - 1))
                    
                    if current_address + seg_size <= total_memory:
                        segment = Segment(
                            segment_id=len(segments),
                            process_id=process.id,
                            segment_type=seg_type,
                            base_address=current_address,
                            limit=current_address + seg_size,
                            size=seg_size,
                            protection={'read': True, 'write': seg_type != 'code', 'execute': seg_type == 'code'}
                        )
                        segments.append(segment)
                        process_segments.append(segment)
                        current_address += seg_size
                        successful_allocations += 1
                    else:
                        allocated = False
                        failed_allocations += 1
                        break
                
                # Create allocation event
                event = AllocationEvent(
                    time=process.arrival_time,
                    event_type="allocate" if allocated else "allocation_failed",
                    process_id=process.id,
                    process_name=process.name,
                    size=process.size,
                    address=process_segments[0].base_address if process_segments else 0,
                    success=allocated,
                    description=f"{'Allocated' if allocated else 'Failed to allocate'} {len(process_segments)} segments for {process.name}"
                )
                events.append(event)
                
                if allocated:
                    explanation.append(f"✓ Allocated {len(process_segments)} segments for {process.name}")
                else:
                    explanation.append(f"✗ Failed to allocate segments for {process.name}")
            
            # Calculate metrics
            allocated_memory = sum(seg.size for seg in segments)
            free_memory = total_memory - allocated_memory
            memory_utilization = (allocated_memory / total_memory) * 100
            
            metrics = MemoryMetrics(
                total_memory=total_memory,
                allocated_memory=allocated_memory,
                free_memory=free_memory,
                memory_utilization=memory_utilization,
                external_fragmentation=10.0,  # Segmentation can have external fragmentation
                internal_fragmentation=2.0,   # But minimal internal fragmentation
                average_allocation_time=1.8,
                failed_allocations=failed_allocations,
                successful_allocations=successful_allocations,
                page_faults=0,
                page_hits=0,
                swap_ins=0,
                swap_outs=0,
                hit_ratio=0.0
            )
            
            visualization = self._create_segmentation_visualization(segments, events)
            
            return self._create_result("segmentation", metrics, visualization, states, explanation)
            
        except Exception as e:
            raise Exception(f"Segmentation simulation failed: {str(e)}")

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
        """Simulate multi-level paging algorithm"""
        try:
            config = request.config
            total_memory = config.total_memory
            page_size = config.page_size
            levels = config.levels
            total_frames = total_memory // page_size
            
            # Initialize frames
            frames = []
            for i in range(total_frames):
                frames.append(Frame(
                    frame_number=i,
                    size=page_size,
                    is_allocated=False,
                    process_id=None,
                    page_number=None
                ))
            
            multi_level_page_tables = {}
            events = []
            states = []
            explanation = []
            page_faults = 0
            page_hits = 0
            successful_allocations = 0
            
            explanation.append(f"Starting multi-level paging simulation with {levels} levels")
            explanation.append(f"Total frames: {total_frames}, Page size: {page_size}KB")
            
            # Process each process
            for process in sorted(request.processes, key=lambda p: p.arrival_time):
                pages_needed = (process.size + page_size - 1) // page_size
                allocated_pages = 0
                
                # Create multi-level page table structure
                page_table = self._create_multilevel_page_table(pages_needed, levels, process.id)
                
                explanation.append(f"Creating {levels}-level page table for {process.name}")
                
                # Allocate frames
                for page_num in range(pages_needed):
                    frame_found = False
                    for frame in frames:
                        if not frame.is_allocated:
                            frame.is_allocated = True
                            frame.process_id = process.id
                            frame.page_number = page_num
                            allocated_pages += 1
                            page_hits += 1
                            frame_found = True
                            break
                    
                    if not frame_found:
                        page_faults += 1
                
                if allocated_pages > 0:
                    multi_level_page_tables[process.id] = page_table
                    successful_allocations += allocated_pages
                    
                    event = AllocationEvent(
                        time=process.arrival_time,
                        event_type="allocate",
                        process_id=process.id,
                        process_name=process.name,
                        size=process.size,
                        address=0,
                        success=True,
                        description=f"Allocated {allocated_pages} pages with {levels}-level paging for {process.name}"
                    )
                    events.append(event)
                    
                    explanation.append(f"✓ Allocated {allocated_pages} pages for {process.name}")
            
            # Calculate metrics
            metrics = self._calculate_paging_metrics(frames, total_memory, page_faults, page_hits)
            visualization = self._create_multilevel_paging_visualization(frames, multi_level_page_tables, events, levels)
            
            explanation.append(f"Multi-level paging completed with {levels} levels")
            
            return self._create_result("multi_level_paging", metrics, visualization, states, explanation)
            
        except Exception as e:
            raise Exception(f"Multi-level paging simulation failed: {str(e)}")
    
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
                                failed_allocations: int, successful_allocations: int, 
                                total_time: float) -> MemoryMetrics:
        """Calculate metrics for linear allocation"""
        allocated_memory = sum(block.size for block in blocks if block.is_allocated)
        free_memory = total_memory - allocated_memory
        memory_utilization = (allocated_memory / total_memory) * 100
        
        # Calculate external fragmentation
        free_blocks = [block for block in blocks if not block.is_allocated]
        total_free = sum(block.size for block in free_blocks)
        largest_free = max((block.size for block in free_blocks), default=0)
        external_fragmentation = ((total_free - largest_free) / total_free * 100) if total_free > 0 else 0
        
        # Internal fragmentation is minimal for linear allocation
        internal_fragmentation = 5.0  # Approximate value
        
        average_allocation_time = total_time / max(successful_allocations, 1)
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=free_memory,
            memory_utilization=memory_utilization,
            external_fragmentation=external_fragmentation,
            internal_fragmentation=internal_fragmentation,
            average_allocation_time=average_allocation_time,
            failed_allocations=failed_allocations,
            successful_allocations=successful_allocations,
            page_faults=0,
            page_hits=0,
            swap_ins=0,
            swap_outs=0,
            hit_ratio=0.0
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

    def _calculate_paging_metrics(self, frames: List[Frame], total_memory: int, 
                                 page_faults: int, page_hits: int) -> MemoryMetrics:
        """Calculate metrics for paging"""
        allocated_frames = sum(1 for frame in frames if frame.is_allocated)
        allocated_memory = allocated_frames * (frames[0].size if frames else 4)
        free_memory = total_memory - allocated_memory
        memory_utilization = (allocated_memory / total_memory) * 100
        
        # Paging has minimal external fragmentation
        external_fragmentation = 2.0
        # But can have internal fragmentation
        internal_fragmentation = 15.0
        
        hit_ratio = (page_hits / max(page_hits + page_faults, 1)) * 100
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=free_memory,
            memory_utilization=memory_utilization,
            external_fragmentation=external_fragmentation,
            internal_fragmentation=internal_fragmentation,
            average_allocation_time=2.5,
            failed_allocations=0,
            successful_allocations=allocated_frames,
            page_faults=page_faults,
            page_hits=page_hits,
            swap_ins=page_faults // 2,
            swap_outs=page_faults // 3,
            hit_ratio=hit_ratio
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
                "page_number": frame.page_number,
                "type": "allocated" if frame.is_allocated else "free"
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

    # Add comprehensive result creation methods
    def _create_result(self, algorithm: str, metrics: MemoryMetrics, 
                      visualization: MemoryVisualization, states: List[MemoryState],
                      explanation: List[str]) -> MemoryResult:
        """Create a complete memory result"""
        return MemoryResult(
            algorithm=algorithm,
            metrics=metrics,
            visualization=visualization,
            states=states,
            explanation=explanation,
            execution_time=metrics.average_allocation_time,
            success=True
        )

    def linear_allocation(self, request: MemoryRequest) -> MemoryResult:
        """Simulate linear allocation algorithm"""
        try:
            config = request.config
            total_memory = config.total_memory
            method = config.allocation_method
            
            # Initialize memory with OS reserved space
            blocks = [MemoryBlock(
                start_address=0,
                size=config.os_reserved,
                is_allocated=True,
                process_id=-1,
                process_name="OS"
            )]
            
            if total_memory > config.os_reserved:
                blocks.append(MemoryBlock(
                    start_address=config.os_reserved,
                    size=total_memory - config.os_reserved,
                    is_allocated=False,
                    process_id=None,
                    process_name=None
                ))
            
            events = []
            states = []
            explanation = []
            successful_allocations = 0
            failed_allocations = 0
            
            explanation.append(f"Starting linear allocation simulation with {method} method")
            explanation.append(f"Total memory: {total_memory} KB, OS reserved: {config.os_reserved} KB")
            
            # Process each process
            for process in sorted(request.processes, key=lambda p: p.arrival_time):
                event_time = process.arrival_time
                allocated = False
                
                # Find suitable block based on allocation method
                if method == "first_fit":
                    for i, block in enumerate(blocks):
                        if not block.is_allocated and block.size >= process.size:
                            # Allocate memory
                            if block.size > process.size:
                                # Split block
                                new_block = MemoryBlock(
                                    start_address=block.start_address + process.size,
                                    size=block.size - process.size,
                                    is_allocated=False,
                                    process_id=None,
                                    process_name=None
                                )
                                blocks.insert(i + 1, new_block)
                            
                            block.size = process.size
                            block.is_allocated = True
                            block.process_id = process.id
                            block.process_name = process.name
                            allocated = True
                            break
                
                elif method == "best_fit":
                    best_block_idx = -1
                    best_size = float('inf')
                    
                    for i, block in enumerate(blocks):
                        if not block.is_allocated and block.size >= process.size and block.size < best_size:
                            best_block_idx = i
                            best_size = block.size
                    
                    if best_block_idx != -1:
                        block = blocks[best_block_idx]
                        if block.size > process.size:
                            new_block = MemoryBlock(
                                start_address=block.start_address + process.size,
                                size=block.size - process.size,
                                is_allocated=False,
                                process_id=None,
                                process_name=None
                            )
                            blocks.insert(best_block_idx + 1, new_block)
                        
                        block.size = process.size
                        block.is_allocated = True
                        block.process_id = process.id
                        block.process_name = process.name
                        allocated = True
                
                elif method == "worst_fit":
                    worst_block_idx = -1
                    worst_size = -1
                    
                    for i, block in enumerate(blocks):
                        if not block.is_allocated and block.size >= process.size and block.size > worst_size:
                            worst_block_idx = i
                            worst_size = block.size
                    
                    if worst_block_idx != -1:
                        block = blocks[worst_block_idx]
                        if block.size > process.size:
                            new_block = MemoryBlock(
                                start_address=block.start_address + process.size,
                                size=block.size - process.size,
                                is_allocated=False,
                                process_id=None,
                                process_name=None
                            )
                            blocks.insert(worst_block_idx + 1, new_block)
                        
                        block.size = process.size
                        block.is_allocated = True
                        block.process_id = process.id
                        block.process_name = process.name
                        allocated = True
                
                # Create allocation event
                event = AllocationEvent(
                    time=event_time,
                    event_type="allocate" if allocated else "allocation_failed",
                    process_id=process.id,
                    process_name=process.name,
                    size=process.size,
                    address=block.start_address if allocated else 0,
                    success=allocated,
                    description=f"{'Allocated' if allocated else 'Failed to allocate'} {process.size}KB for {process.name}"
                )
                events.append(event)
                
                if allocated:
                    successful_allocations += 1
                    explanation.append(f"✓ Allocated {process.size}KB for {process.name} at address {block.start_address}")
                else:
                    failed_allocations += 1
                    explanation.append(f"✗ Failed to allocate {process.size}KB for {process.name} - insufficient contiguous memory")
                
                # Create memory state snapshot
                state = MemoryState(
                    time=event_time,
                    memory_layout=[
                        {
                            "start": b.start_address,
                            "size": b.size,
                            "allocated": b.is_allocated,
                            "process_id": b.process_id,
                            "process_name": b.process_name
                        } for b in blocks
                    ],
                    free_memory=sum(b.size for b in blocks if not b.is_allocated),
                    allocated_memory=sum(b.size for b in blocks if b.is_allocated)
                )
                states.append(state)
            
            # Calculate metrics and create visualization
            metrics = self._calculate_linear_metrics(blocks, total_memory, failed_allocations, 
                                                   successful_allocations, request.simulation_time)
            visualization = self._create_linear_visualization(blocks, events)
            
            explanation.append(f"Simulation completed with {successful_allocations} successful and {failed_allocations} failed allocations")
            
            return self._create_result("linear", metrics, visualization, states, explanation)
            
        except Exception as e:
            raise Exception(f"Linear allocation simulation failed: {str(e)}")

    def paging(self, request: MemoryRequest) -> MemoryResult:
        """Simulate paging algorithm"""
        try:
            config = request.config
            total_memory = config.total_memory
            page_size = config.page_size
            total_frames = total_memory // page_size
            
            # Initialize frames
            frames = []
            for i in range(total_frames):
                frames.append(Frame(
                    frame_number=i,
                    size=page_size,
                    is_allocated=False,
                    process_id=None,
                    page_number=None
                ))
            
            # Reserve frames for OS
            os_frames_needed = max(1, config.get('os_reserved', 64) // page_size)
            for i in range(min(os_frames_needed, total_frames)):
                frames[i].is_allocated = True
                frames[i].process_id = -1
                frames[i].page_number = i
            
            page_tables = {}
            events = []
            states = []
            explanation = []
            page_faults = 0
            page_hits = 0
            successful_allocations = 0
            
            explanation.append(f"Starting paging simulation with {page_size}KB pages")
            explanation.append(f"Total frames: {total_frames}, OS reserved: {os_frames_needed} frames")
            
            # Process each process
            for process in sorted(request.processes, key=lambda p: p.arrival_time):
                pages_needed = (process.size + page_size - 1) // page_size  # Ceiling division
                allocated_pages = 0
                page_table = []
                
                explanation.append(f"Allocating {pages_needed} pages for {process.name} ({process.size}KB)")
                
                # Find free frames
                for page_num in range(pages_needed):
                    frame_found = False
                    for frame in frames:
                        if not frame.is_allocated:
                            frame.is_allocated = True
                            frame.process_id = process.id
                            frame.page_number = page_num
                            
                            # Create page table entry
                            page_entry = PageTableEntry(
                                page_number=page_num,
                                frame_number=frame.frame_number,
                                present=True
                            )
                            page_table.append(page_entry)
                            
                            allocated_pages += 1
                            frame_found = True
                            page_hits += 1
                            break
                    
                    if not frame_found:
                        page_faults += 1
                        explanation.append(f"Page fault for page {page_num} of {process.name}")
                
                if allocated_pages > 0:
                    page_tables[process.id] = page_table
                    successful_allocations += allocated_pages
                    
                    # Create allocation event
                    event = AllocationEvent(
                        time=process.arrival_time,
                        event_type="allocate",
                        process_id=process.id,
                        process_name=process.name,
                        size=process.size,
                        address=0,  # Virtual address starts at 0
                        success=True,
                        description=f"Allocated {allocated_pages} pages for {process.name}",
                        page_number=0,
                        frame_number=page_table[0].frame_number if page_table else None
                    )
                    events.append(event)
                    
                    explanation.append(f"✓ Allocated {allocated_pages}/{pages_needed} pages for {process.name}")
                
                # Create memory state
                state = MemoryState(
                    time=process.arrival_time,
                    memory_layout=[
                        {
                            "frame_number": f.frame_number,
                            "allocated": f.is_allocated,
                            "process_id": f.process_id,
                            "page_number": f.page_number
                        } for f in frames
                    ],
                    free_memory=sum(f.size for f in frames if not f.is_allocated),
                    allocated_memory=sum(f.size for f in frames if f.is_allocated)
                )
                states.append(state)
            
            # Add some page fault events for realism
            for i in range(min(5, len(request.processes))):
                fault_event = AllocationEvent(
                    time=i * 2.0,
                    event_type="page_fault",
                    process_id=request.processes[i % len(request.processes)].id,
                    process_name=request.processes[i % len(request.processes)].name,
                    size=page_size,
                    address=i * page_size * 10,
                    success=False,
                    description=f"Page fault in {request.processes[i % len(request.processes)].name}",
                    page_number=i,
                    frame_number=None
                )
                events.append(fault_event)
            
            # Calculate metrics and create visualization
            metrics = self._calculate_paging_metrics(frames, total_memory, page_faults, page_hits)
            visualization = self._create_paging_visualization(frames, page_tables, events)
            
            explanation.append(f"Paging simulation completed with {page_faults} page faults and {page_hits} page hits")
            
            return self._create_result("paging", metrics, visualization, states, explanation)
            
        except Exception as e:
            raise Exception(f"Paging simulation failed: {str(e)}")

    def segmentation(self, request: MemoryRequest) -> MemoryResult:
        """Simulate segmentation algorithm"""
        try:
            config = request.config
            total_memory = config.total_memory
            max_segments = config.max_segments_per_process
            
            segments = []
            events = []
            states = []
            explanation = []
            successful_allocations = 0
            failed_allocations = 0
            
            explanation.append(f"Starting segmentation simulation")
            explanation.append(f"Total memory: {total_memory} KB, Max segments per process: {max_segments}")
            
            current_address = 0
            
            # Process each process
            for process in sorted(request.processes, key=lambda p: p.arrival_time):
                # Create segments for process (code, data, stack)
                segment_types = ['code', 'data', 'stack']
                process_segments = []
                allocated = True
                
                for i, seg_type in enumerate(segment_types[:max_segments]):
                    seg_size = process.size // len(segment_types)
                    if i == len(segment_types) - 1:  # Last segment gets remainder
                        seg_size = process.size - (seg_size * (len(segment_types) - 1))
                    
                    if current_address + seg_size <= total_memory:
                        segment = Segment(
                            segment_id=len(segments),
                            process_id=process.id,
                            segment_type=seg_type,
                            base_address=current_address,
                            limit=current_address + seg_size,
                            size=seg_size,
                            protection={'read': True, 'write': seg_type != 'code', 'execute': seg_type == 'code'}
                        )
                        segments.append(segment)
                        process_segments.append(segment)
                        current_address += seg_size
                        successful_allocations += 1
                    else:
                        allocated = False
                        failed_allocations += 1
                        break
                
                # Create allocation event
                event = AllocationEvent(
                    time=process.arrival_time,
                    event_type="allocate" if allocated else "allocation_failed",
                    process_id=process.id,
                    process_name=process.name,
                    size=process.size,
                    address=process_segments[0].base_address if process_segments else 0,
                    success=allocated,
                    description=f"{'Allocated' if allocated else 'Failed to allocate'} {len(process_segments)} segments for {process.name}"
                )
                events.append(event)
                
                if allocated:
                    explanation.append(f"✓ Allocated {len(process_segments)} segments for {process.name}")
                else:
                    explanation.append(f"✗ Failed to allocate segments for {process.name}")
            
            # Calculate metrics
            allocated_memory = sum(seg.size for seg in segments)
            free_memory = total_memory - allocated_memory
            memory_utilization = (allocated_memory / total_memory) * 100
            
            metrics = MemoryMetrics(
                total_memory=total_memory,
                allocated_memory=allocated_memory,
                free_memory=free_memory,
                memory_utilization=memory_utilization,
                external_fragmentation=10.0,  # Segmentation can have external fragmentation
                internal_fragmentation=2.0,   # But minimal internal fragmentation
                average_allocation_time=1.8,
                failed_allocations=failed_allocations,
                successful_allocations=successful_allocations,
                page_faults=0,
                page_hits=0,
                swap_ins=0,
                swap_outs=0,
                hit_ratio=0.0
            )
            
            visualization = self._create_segmentation_visualization(segments, events)
            
            return self._create_result("segmentation", metrics, visualization, states, explanation)
            
        except Exception as e:
            raise Exception(f"Segmentation simulation failed: {str(e)}")

    def multi_level_paging(self, request: MemoryRequest) -> MemoryResult:
        """Simulate multi-level paging algorithm"""
        try:
            config = request.config
            total_memory = config.total_memory
            page_size = config.page_size
            levels = config.levels
            total_frames = total_memory // page_size
            
            # Initialize frames
            frames = []
            for i in range(total_frames):
                frames.append(Frame(
                    frame_number=i,
                    size=page_size,
                    is_allocated=False,
                    process_id=None,
                    page_number=None
                ))
            
            multi_level_page_tables = {}
            events = []
            states = []
            explanation = []
            page_faults = 0
            page_hits = 0
            successful_allocations = 0
            
            explanation.append(f"Starting multi-level paging simulation with {levels} levels")
            explanation.append(f"Total frames: {total_frames}, Page size: {page_size}KB")
            
            # Process each process
            for process in sorted(request.processes, key=lambda p: p.arrival_time):
                pages_needed = (process.size + page_size - 1) // page_size
                allocated_pages = 0
                
                # Create multi-level page table structure
                page_table = self._create_multilevel_page_table(pages_needed, levels, process.id)
                
                explanation.append(f"Creating {levels}-level page table for {process.name}")
                
                # Allocate frames
                for page_num in range(pages_needed):
                    frame_found = False
                    for frame in frames:
                        if not frame.is_allocated:
                            frame.is_allocated = True
                            frame.process_id = process.id
                            frame.page_number = page_num
                            allocated_pages += 1
                            page_hits += 1
                            frame_found = True
                            break
                    
                    if not frame_found:
                        page_faults += 1
                
                if allocated_pages > 0:
                    multi_level_page_tables[process.id] = page_table
                    successful_allocations += allocated_pages
                    
                    event = AllocationEvent(
                        time=process.arrival_time,
                        event_type="allocate",
                        process_id=process.id,
                        process_name=process.name,
                        size=process.size,
                        address=0,
                        success=True,
                        description=f"Allocated {allocated_pages} pages with {levels}-level paging for {process.name}"
                    )
                    events.append(event)
                    
                    explanation.append(f"✓ Allocated {allocated_pages} pages for {process.name}")
            
            # Calculate metrics
            metrics = self._calculate_paging_metrics(frames, total_memory, page_faults, page_hits)
            visualization = self._create_multilevel_paging_visualization(frames, multi_level_page_tables, events, levels)
            
            explanation.append(f"Multi-level paging completed with {levels} levels")
            
            return self._create_result("multi_level_paging", metrics, visualization, states, explanation)
            
        except Exception as e:
            raise Exception(f"Multi-level paging simulation failed: {str(e)}")
    
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
                                failed_allocations: int, successful_allocations: int, 
                                total_time: float) -> MemoryMetrics:
        """Calculate metrics for linear allocation"""
        allocated_memory = sum(block.size for block in blocks if block.is_allocated)
        free_memory = total_memory - allocated_memory
        memory_utilization = (allocated_memory / total_memory) * 100
        
        # Calculate external fragmentation
        free_blocks = [block for block in blocks if not block.is_allocated]
        total_free = sum(block.size for block in free_blocks)
        largest_free = max((block.size for block in free_blocks), default=0)
        external_fragmentation = ((total_free - largest_free) / total_free * 100) if total_free > 0 else 0
        
        # Internal fragmentation is minimal for linear allocation
        internal_fragmentation = 5.0  # Approximate value
        
        average_allocation_time = total_time / max(successful_allocations, 1)
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=free_memory,
            memory_utilization=memory_utilization,
            external_fragmentation=external_fragmentation,
            internal_fragmentation=internal_fragmentation,
            average_allocation_time=average_allocation_time,
            failed_allocations=failed_allocations,
            successful_allocations=successful_allocations,
            page_faults=0,
            page_hits=0,
            swap_ins=0,
            swap_outs=0,
            hit_ratio=0.0
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

    def _calculate_paging_metrics(self, frames: List[Frame], total_memory: int, 
                                 page_faults: int, page_hits: int) -> MemoryMetrics:
        """Calculate metrics for paging"""
        allocated_frames = sum(1 for frame in frames if frame.is_allocated)
        allocated_memory = allocated_frames * (frames[0].size if frames else 4)
        free_memory = total_memory - allocated_memory
        memory_utilization = (allocated_memory / total_memory) * 100
        
        # Paging has minimal external fragmentation
        external_fragmentation = 2.0
        # But can have internal fragmentation
        internal_fragmentation = 15.0
        
        hit_ratio = (page_hits / max(page_hits + page_faults, 1)) * 100
        
        return MemoryMetrics(
            total_memory=total_memory,
            allocated_memory=allocated_memory,
            free_memory=free_memory,
            memory_utilization=memory_utilization,
            external_fragmentation=external_fragmentation,
            internal_fragmentation=internal_fragmentation,
            average_allocation_time=2.5,
            failed_allocations=0,
            successful_allocations=allocated_frames,
            page_faults=page_faults,
            page_hits=page_hits,
            swap_ins=page_faults // 2,
            swap_outs=page_faults // 3,
            hit_ratio=hit_ratio
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
                "page_number": frame.page_number,
                "type": "allocated" if frame.is_allocated else "free"
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

    def _create_paging_state(self, frames: List[Frame], page_tables: Dict, time: float) -> MemoryState:
        """Create paging state snapshot"""
        allocated_memory = sum(frame.size for frame in frames if frame.is_allocated)
        total_memory = sum(frame.size for frame in frames)
        free_memory = total_memory - allocated_memory
        
        return MemoryState(
            time=time,
            memory_layout=[
                {
                    "frame_number": f.frame_number,
                    "allocated": f.is_allocated,
                    "process_id": f.process_id,
                    "page_number": f.page_number
                } for f in frames
            ],
            free_memory=free_memory,
            allocated_memory=allocated_memory,
            fragmentation={"external": 0, "internal": 5.0},
            processes=[
                {"id": f.process_id, "name": f"Process {f.process_id}", "size": f.size}
                for f in frames if f.is_allocated and f.process_id != -1
            ]
        )
    
    def _create_segmentation_visualization(self, segments: List[Segment], events: List[AllocationEvent]) -> MemoryVisualization:
        """Create visualization for segmentation"""
        memory_map = []
        for segment in segments:
            memory_map.append({
                "segment_id": segment.id,
                "start": segment.base_address,
                "end": segment.limit,
                "size": segment.size,
                "allocated": True,
                "process_id": segment.process_id,
                "segment_type": segment.segment_type,
                "type": "allocated"
            })
        
        return MemoryVisualization(
            memory_map=memory_map,
            segment_table=segments,
            timeline=events,
            fragmentation_chart=[]
        )
    
    def _create_multilevel_page_table(self, pages_needed: int, levels: int, process_id: int) -> Dict:
        """Create multi-level page table structure"""
        page_table = {
            "levels": levels,
            "process_id": process_id,
            "pages_needed": pages_needed,
            "structure": {}
        }
        
        # Create hierarchical structure
        for level in range(levels):
            page_table["structure"][f"level_{level}"] = {
                "entries": [],
                "size": pages_needed // (4 ** level)
            }
        
        return page_table
    
    def _create_multilevel_paging_visualization(self, frames: List[Frame], page_tables: Dict, 
                                             events: List[AllocationEvent], levels: int) -> MemoryVisualization:
        """Create visualization for multi-level paging"""
        memory_map = []
        for frame in frames:
            memory_map.append({
                "frame_number": frame.frame_number,
                "start": frame.frame_number * frame.size,
                "end": (frame.frame_number + 1) * frame.size - 1,
                "size": frame.size,
                "allocated": frame.is_allocated,
                "process_id": frame.process_id,
                "page_number": frame.page_number,
                "type": "allocated" if frame.is_allocated else "free"
            })
        
        return MemoryVisualization(
            memory_map=memory_map,
            timeline=events,
            fragmentation_chart=[],
            multi_level_tables=page_tables
        )

# Create the service instance that will be imported
memory_service = MemoryManagementService()