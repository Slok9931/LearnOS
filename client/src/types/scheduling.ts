// Backend-compatible types for CPU scheduling

export interface BackendProcess {
  pid: number;
  arrival_time: number;
  burst_time: number;
  priority: number;
}

export interface BackendSchedulingRequest {
  processes: BackendProcess[];
  context_switch_cost?: number;
  time_quantum?: number;
  preemptive?: boolean;
  mlfq_config?: {
    num_queues?: number;
    time_quantums?: number[];
    aging_threshold?: number;
    boost_interval?: number;
  };
}

export interface BackendSchedulingResponse {
  success: boolean;
  message: string;
  data: {
    processes: Array<{
      pid: number;
      arrival_time: number;
      burst_time: number;
      waiting_time: number;
      turnaround_time: number;
      completion_time: number;
      priority?: number;
    }>;
    schedule: Array<{
      process_id: number;
      start_time: number;
      end_time: number;
      type?: string;
    }>;
    metrics: {
      average_waiting_time: number;
      average_turnaround_time: number;
      cpu_utilization: number;
      throughput?: number;
    };
  };
}

// Frontend types for CPU scheduling

export interface Process {
  id: number
  arrival_time: number
  burst_time: number
  priority?: number
  weight?: number
}

export interface MLFQConfig {
  num_queues: number
  time_quantums: number[]
  aging_threshold: number
  boost_interval: number
  priority_boost?: boolean
  feedback_mechanism?: 'time' | 'io' | 'both'
}

export interface CFSConfig {
  target_latency: number
  min_granularity: number
  nice_levels: boolean
  load_balancing: boolean
  sleeper_fairness: boolean
}

export interface SchedulingRequest {
  processes: Process[]
  time_quantum?: number
  context_switch_cost?: number
  preemptive?: boolean
  mlfq_config?: MLFQConfig
  cfs_config?: CFSConfig
  rr_variation?: 'standard' | 'weighted' | 'deficit'
  process_weights?: {[key: number]: number}
  priority_type?: 'fixed' | 'dynamic'
  priority_inversion_handling?: boolean
}

export interface ScheduleEntry {
  process_id: number;
  start_time: number;
  end_time: number;
  type?: string;
  queue_level?: number;
}

export interface ProcessResult {
  pid: number;
  arrival_time: number;
  burst_time: number;
  waiting_time: number;
  turnaround_time: number;
  completion_time: number;
  priority?: number;
}

export interface SchedulingMetrics {
  average_waiting_time: number;
  average_turnaround_time: number;
  cpu_utilization: number;
  throughput?: number;
}

export interface SchedulingResult {
  success: boolean;
  message: string;
  data: {
    processes: ProcessResult[];
    schedule: ScheduleEntry[];
    metrics: SchedulingMetrics;
  };
}

// Chart-specific types
export interface GanttChartData {
  process_id: number;
  start_time: number;
  end_time: number;
  duration: number;
  type?: string;
  queue_level?: number;
}

export interface MetricsChartData {
  process_id: number;
  waiting_time: number;
  turnaround_time: number;
  burst_time: number;
}

export type SchedulingAlgorithm = 'FCFS' | 'SJF' | 'Priority' | 'RoundRobin' | 'MLFQ' | 'CFS'

export interface AlgorithmOption {
  value: SchedulingAlgorithm
  label: string
  description: string
  requiresQuantum?: boolean
  requiresPriority?: boolean
  supportsPreemptive?: boolean
  requiresMLFQConfig?: boolean
}
