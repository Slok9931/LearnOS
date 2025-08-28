from pydantic import BaseModel
from typing import List, Optional

class Process(BaseModel):
    pid: int
    arrival_time: float = 0.0
    burst_time: float
    priority: int = 0
    
    class Config:
        allow_population_by_field_name = True

class MLFQConfig(BaseModel):
    num_queues: int = 3
    time_quantums: List[float] = [2.0, 4.0, 8.0]
    aging_threshold: int = 10
    boost_interval: int = 100

class SchedulingConfig(BaseModel):
    context_switch_cost: float = 0.5
    cores: int = 1
    time_quantum: Optional[float] = None
    preemptive: bool = False
    mlfq_config: Optional[MLFQConfig] = None

class SchedulingRequest(BaseModel):
    processes: List[Process]
    context_switch_cost: Optional[float] = 0.5
    time_quantum: Optional[float] = None
    preemptive: Optional[bool] = False
    mlfq_config: Optional[MLFQConfig] = None

class ProcessResult(BaseModel):
    pid: int
    arrival_time: float
    burst_time: float
    waiting_time: float
    turnaround_time: float
    completion_time: float
    priority: Optional[int] = None

class ScheduleEntry(BaseModel):
    process_id: int
    start_time: float
    end_time: float
    type: str = "execution"
    queue_level: Optional[int] = None

class SchedulingMetrics(BaseModel):
    average_waiting_time: float
    average_turnaround_time: float
    cpu_utilization: float
    throughput: Optional[float] = None

class SchedulingResult(BaseModel):
    processes: List[ProcessResult]
    schedule: List[ScheduleEntry]
    metrics: SchedulingMetrics