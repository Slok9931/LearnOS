from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class Process(BaseModel):
    pid: int = Field(..., description="Process ID")
    arrival_time: int = Field(..., description="Arrival Time")
    burst_time: int = Field(..., description="Burst Time")
    priority: int = Field(0, description="Priority (for Priority Scheduling)")
    remaining_time: Optional[float] = Field(None, description="Remaining Burst Time (for preemptive algorithms)")

class MLFQConfig(BaseModel):
    num_queues: int = Field(3, description="Number of priority queues")
    time_quantums: List[float] = Field([2.0, 4.0, 8.0], description="Time quantum for each queue")
    aging_threshold: int = Field(10, description="Time units after which a process is promoted")
    boost_interval: int = Field(100, description="Time interval for priority boost")

class CPUConfig(BaseModel):
    time_quantum: Optional[float] = Field(None, description="Time Quantum (for Round Robin Scheduling)")
    context_switch_cost: float = Field(0, description="Context Switch Cost")
    cores: int = Field(1, description="Number of CPU Cores")
    preemptive: bool = Field(False, description="Enable preemptive scheduling (for SJF, Priority)")
    mlfq_config: Optional[MLFQConfig] = Field(None, description="MLFQ Configuration")

class CPUScheduleRequest(BaseModel):
    algo: Literal['FCFS', 'SJF', 'Priority', 'RoundRobin', 'MLFQ'] = Field(..., description="Scheduling Algorithm")
    config: CPUConfig = Field(default_factory=CPUConfig, description="CPU Configuration")
    processes: List[Process] = Field(..., description="List of Processes to Schedule")

class ProcessResult(BaseModel):
    pid: int
    arrival_time: int
    burst_time: int
    start_time: float
    completion_time: float
    turnaround_time: float
    waiting_time: float
    response_time: float

class CPUScheduleResponse(BaseModel):
    algorithm: str
    total_processes: int
    total_time: float
    avg_waiting_time: float
    avg_turnaround_time: float
    avg_response_time: float
    cpu_utilization: float
    throughput: float
    processes: List[ProcessResult]
    gantt_chart: List[dict]