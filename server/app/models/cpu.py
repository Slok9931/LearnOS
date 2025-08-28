from pydantic import BaseModel
from typing import List, Optional, Literal
from enum import Enum

class Process(BaseModel):
    id: int
    arrival_time: float
    burst_time: float
    priority: int = 0
    weight: float = 1.0

class MLFQConfig(BaseModel):
    num_queues: int = 3
    time_quantums: List[int] = [2, 4, 8]
    aging_threshold: int = 10
    boost_interval: int = 100
    priority_boost: bool = True
    feedback_mechanism: Literal['time', 'io', 'both'] = 'time'

class SchedulingRequest(BaseModel):
    processes: List[Process]
    time_quantum: Optional[int] = None
    context_switch_cost: float = 0.5
    preemptive: bool = False
    
    rr_variation: Optional[Literal['standard', 'weighted', 'deficit']] = 'standard'
    process_weights: Optional[dict] = None
    
    priority_type: Optional[Literal['fixed', 'dynamic']] = 'fixed'
    priority_inversion_handling: bool = False
    
    mlfq_config: Optional[MLFQConfig] = None

class ScheduleEntry(BaseModel):
    process_id: int
    start_time: float
    end_time: float
    type: str = "execution"
    queue_level: Optional[int] = None

class ProcessResult(BaseModel):
    pid: int
    arrival_time: float
    burst_time: float
    priority: int
    completion_time: float
    turnaround_time: float
    waiting_time: float
    response_time: Optional[float] = None

class SchedulingMetrics(BaseModel):
    average_waiting_time: float
    average_turnaround_time: float
    average_response_time: float
    cpu_utilization: float
    throughput: float
    context_switches: int = 0
    total_time: float = 0

class SchedulingResult(BaseModel):
    processes: List[ProcessResult]
    schedule: List[ScheduleEntry]
    metrics: SchedulingMetrics
    algorithm: str