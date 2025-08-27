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
  id: number;
  arrival_time: number;
  burst_time: number;
  priority?: number;
}

export interface SchedulingRequest {
  processes: Process[];
  time_quantum?: number;
  context_switch_cost?: number;
  preemptive?: boolean;
  mlfq_config?: {
    num_queues?: number;
    time_quantums?: number[];
    aging_threshold?: number;
    boost_interval?: number;
  };
}

export interface SchedulingResult {
  success: boolean;
  message: string;
  data: {
    processes: Array<{
      pid?: number;
      id?: number;
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
