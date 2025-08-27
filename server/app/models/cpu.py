from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class Process(BaseModel):
    pid: int = Field(..., description="Process ID")
    arrival_time: int = Field(..., description="Arrival Time")
    burst_time: int = Field(..., description="Burst Time")
    priority: int = Field(0, description="Priority (for Priority Scheduling)")
    remaining_time: Optional[int] = Field(None, description="Remaining Burst Time (for preemptive algorithms)")

class CPUConfig(BaseModel):
    time_quantum: Optional[float] = Field(None, description="Time Quantum (for Round Robin Scheduling)")
    context_switch_cost: float = Field(0, description="Context Switch Cost")
    cores: int = Field(1, description="Number of CPU Cores")

class CPUScheduleRequest(BaseModel):
    algo: Literal['FCFS', 'SJF', 'Priority', 'RoundRobin', 'MLFQ'] = Field(..., description="Scheduling Algorithm")
    config: CPUConfig = Field(default_factory=CPUConfig, description="CPU Configuration")
    processes: List[Process] = Field(..., description="List of Processes to Schedule")

class ProcessResult(BaseModel):
    pid: int
    arrival_time: int
    burst_time: int
    start_time: int
    completion_time: int
    turnaround_time: int
    waiting_time: int
    response_time: int

class CPUScheduleResponse(BaseModel):
    algorithm: str
    total_processes: int
    total_time: int
    avg_waiting_time: float
    avg_turnaround_time: float
    avg_response_time: float
    cpu_utilization: float
    throughput: float
    processes: List[ProcessResult]
    gantt_chart: List[dict]