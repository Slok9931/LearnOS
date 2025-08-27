from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class Process(BaseModel):
    pid: int = Field(..., description="Process ID")
    arrival_time: int = Field(..., description="Arrival Time")
    burst_time: int = Field(..., description="Burst Time")
    priority: int = Field(None, description="Priority (for Priority Scheduling)", default=0)

class CPUConfig(BaseModel):
    time_quantum: Optional[float] = Field(None, description="Time Quantum (for Round Robin Scheduling)")
    context_switch_cost: loat = Field(0, description="Context Switch Cost", default=0)
    cores: int = Field(1, description="Number of CPU Cores", default=1)

class CPUScheduleRequest(BaseModel):
    algo: Literal['FCFS', 'SJF', 'Priority', 'RoundRobin', 'MLFQ'] = Field(..., description="Scheduling Algorithm")
    config: CPUConfig = Field(default_factory=CPUConfig, description="CPU Configuration")
    processes: List[Process] = Field(..., description="List of Processes to Schedule")