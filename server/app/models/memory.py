from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Literal, Union
from enum import Enum

class MemoryAllocationMethod(str, Enum):
    FIRST_FIT = "first_fit"
    BEST_FIT = "best_fit"
    WORST_FIT = "worst_fit"
    NEXT_FIT = "next_fit"

class SegmentationType(str, Enum):
    SIMPLE = "simple"
    SEGMENTED = "segmented"
    PAGED_SEGMENTED = "paged_segmented"

class ReplacementAlgorithm(str, Enum):
    FIFO = "fifo"
    LRU = "lru"
    LFU = "lfu"
    OPTIMAL = "optimal"
    CLOCK = "clock"
    SECOND_CHANCE = "second_chance"

class Process(BaseModel):
    id: int
    name: str
    size: int
    arrival_time: float = 0
    priority: int = 0
    segments: Optional[List[Dict[str, Any]]] = None
    pages: Optional[List[int]] = None

class MemoryBlock(BaseModel):
    id: int = 0
    start_address: int
    size: int
    is_allocated: bool = False
    process_id: Optional[int] = None
    process_name: Optional[str] = None
    fragment_type: Optional[str] = None

class Segment(BaseModel):
    id: int = 0
    segment_id: Optional[int] = None
    process_id: int
    segment_type: str
    size: int
    base_address: Optional[int] = None
    limit: Optional[int] = None
    protection: Dict[str, bool] = {"read": True, "write": True, "execute": False}

class Page(BaseModel):
    page_number: int
    process_id: int
    size: int = 4096
    frame_number: Optional[int] = None
    is_loaded: bool = False
    reference_bit: bool = False
    modify_bit: bool = False
    last_access_time: float = 0
    access_count: int = 0

class Frame(BaseModel):
    frame_number: int
    size: int = 4096
    is_allocated: bool = False
    page_number: Optional[int] = None
    process_id: Optional[int] = None

class PageTableEntry(BaseModel):
    page_number: int
    frame_number: Optional[int] = None
    present: bool = False
    protection: Dict[str, bool] = {"read": True, "write": True, "execute": False}
    reference: bool = False
    modify: bool = False

class LinearAllocationConfig(BaseModel):
    total_memory: int = 1024
    allocation_method: MemoryAllocationMethod = MemoryAllocationMethod.FIRST_FIT
    enable_compaction: bool = True
    os_reserved: int = 64

class SegmentationConfig(BaseModel):
    total_memory: int = 1024
    max_segments_per_process: int = 4
    enable_protection: bool = True
    enable_sharing: bool = False
    segment_table_size: int = 16

class PagingConfig(BaseModel):
    total_memory: int = 1024
    page_size: int = 4
    enable_virtual_memory: bool = True
    replacement_algorithm: ReplacementAlgorithm = ReplacementAlgorithm.FIFO
    max_pages_per_process: int = 16
    tlb_enabled: bool = True
    tlb_size: int = 4

class MultiLevelPagingConfig(BaseModel):
    total_memory: int = 1024
    page_size: int = 4
    levels: int = 2
    enable_demand_paging: bool = True
    replacement_algorithm: ReplacementAlgorithm = ReplacementAlgorithm.LRU
    working_set_size: int = 8

class MemoryRequest(BaseModel):
    processes: List[Process]
    config: Union[LinearAllocationConfig, SegmentationConfig, PagingConfig, MultiLevelPagingConfig]
    algorithm_type: Literal["linear", "segmentation", "paging", "multi_level_paging"]
    simulation_time: float = 100.0

class AllocationEvent(BaseModel):
    time: float
    event_type: str
    process_id: int
    process_name: str
    size: Optional[int] = None
    address: Optional[int] = None
    page_number: Optional[int] = None
    frame_number: Optional[int] = None
    success: Optional[bool] = None
    description: str
    details: Optional[Dict[str, Any]] = None
    latency: Optional[float] = None

class MemoryMetrics(BaseModel):
    total_memory: int
    allocated_memory: int
    free_memory: int
    memory_utilization: float
    external_fragmentation: float
    internal_fragmentation: float
    average_allocation_time: float
    failed_allocations: int
    successful_allocations: int
    page_faults: int = 0
    page_hits: int = 0
    swap_ins: int = 0
    swap_outs: int = 0
    hit_ratio: float = 0.0

class MemoryVisualization(BaseModel):
    memory_map: List[Dict[str, Any]]
    page_table: Optional[List[Dict[str, Any]]] = None
    segment_table: Optional[List[Segment]] = None
    timeline: List[AllocationEvent]
    fragmentation_chart: List[Dict[str, Any]]
    multi_level_tables: Optional[Dict[str, Any]] = None

class MemoryState(BaseModel):
    time: float
    memory_layout: List[Dict[str, Any]]
    free_memory: int
    allocated_memory: int
    fragmentation: Optional[Dict[str, float]] = None
    processes: Optional[List[Dict[str, Any]]] = None

class MemoryResult(BaseModel):
    algorithm: str
    metrics: MemoryMetrics
    visualization: MemoryVisualization
    states: List[MemoryState]
    explanation: List[str]
    execution_time: float
    success: bool