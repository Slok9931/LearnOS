export interface MemoryProcess {
  id: number
  name: string
  size: number
  arrival_time: number
  priority: number
  segments?: Array<{
    type: string
    size: number
  }>
  pages?: number[]
}

export interface LinearAllocationConfig {
  total_memory: number
  allocation_method: 'first_fit' | 'best_fit' | 'worst_fit' | 'next_fit'
  enable_compaction: boolean
  os_reserved: number
}

export interface SegmentationConfig {
  total_memory: number
  max_segments_per_process: number
  enable_protection: boolean
  enable_sharing: boolean
  segment_table_size: number
}

export interface PagingConfig {
  total_memory: number
  page_size: number
  enable_virtual_memory: boolean
  replacement_algorithm: 'fifo' | 'lru' | 'lfu' | 'optimal' | 'clock' | 'second_chance'
  max_pages_per_process: number
  tlb_enabled: boolean
  tlb_size: number
}

export interface MultiLevelPagingConfig {
  total_memory: number
  page_size: number
  levels: number
  enable_demand_paging: boolean
  replacement_algorithm: 'fifo' | 'lru' | 'lfu' | 'optimal' | 'clock' | 'second_chance'
  working_set_size: number
}

export interface MemoryRequest {
  processes: MemoryProcess[]
  config: LinearAllocationConfig | SegmentationConfig | PagingConfig | MultiLevelPagingConfig
  algorithm_type: 'linear' | 'segmentation' | 'paging' | 'multi_level_paging'
  simulation_time?: number
}

export interface AllocationEvent {
  time: number
  event_type: string
  process_id: number
  process_name: string
  size?: number
  address?: number
  page_number?: number
  frame_number?: number
  description: string
}

export interface MemoryMetrics {
  total_memory: number
  allocated_memory: number
  free_memory: number
  memory_utilization: number
  external_fragmentation: number
  internal_fragmentation: number
  average_allocation_time: number
  failed_allocations: number
  successful_allocations: number
  page_faults?: number
  page_hits?: number
  swap_ins?: number
  swap_outs?: number
  hit_ratio?: number
}

export interface MemoryVisualization {
  memory_map: Array<{
    start: number
    end?: number
    size: number
    allocated?: boolean
    process_id?: number
    process_name?: string
    type?: string
    segment_type?: string
    frame_number?: number
    page_number?: number
    protection?: any
  }>
  page_table?: any[]
  segment_table?: any[]
  timeline: AllocationEvent[]
  fragmentation_chart: Array<{
    block_id?: number
    size: number
    start?: number
  }>
}

export interface MemoryResult {
  success: boolean
  algorithm: string
  processes: Array<{
    id: number
    name: string
    size: number
    start_address?: number
    end_address?: number
    allocation_method?: string
    segments?: any[]
    total_size?: number
    pages_needed?: number
    pages_loaded?: number
    allocated_frames?: number[]
    page_table?: any[]
    levels?: number
    demand_paging?: boolean
  }>
  metrics: MemoryMetrics
  visualization: MemoryVisualization
  memory_states: any[]
  final_state: any
  statistics: any
}

export interface MemoryApiResponse {
  success: boolean
  message: string
  data: MemoryResult
}