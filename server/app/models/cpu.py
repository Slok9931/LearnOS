from pydantic import BaseModel
from typing import List, Optional, Literal, Dict

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

class CFSProcess(Process):
    """CFS-specific process with virtual runtime"""
    vruntime: float = 0.0  # Virtual runtime
    nice_value: int = 0    # Nice value (-20 to 19)
    weight: int = 1024     # Weight based on nice value
    
    def __init__(self, **data):
        super().__init__(**data)
        if 'nice_value' in data:
            self.weight = self.calculate_weight(data['nice_value'])
    
    def calculate_weight(self, nice: int) -> int:
        """Calculate weight based on nice value"""
        # Standard Linux CFS weight calculation
        weights = {
            -20: 88761, -19: 71755, -18: 56483, -17: 46273, -16: 36291,
            -15: 29154, -14: 23254, -13: 18705, -12: 14949, -11: 11916,
            -10: 9548, -9: 7620, -8: 6100, -7: 4904, -6: 3906,
            -5: 3121, -4: 2501, -3: 1991, -2: 1586, -1: 1277,
            0: 1024, 1: 820, 2: 655, 3: 526, 4: 423,
            5: 335, 6: 272, 7: 215, 8: 172, 9: 137,
            10: 110, 11: 87, 12: 70, 13: 56, 14: 45,
            15: 36, 16: 29, 17: 23, 18: 18, 19: 15
        }
        return weights.get(nice, 1024)

class CFSRequest(BaseModel):
    """Request model for CFS scheduling"""
    processes: List[CFSProcess]
    time_slice: int = 6
    min_granularity: int = 1
    
class CFSResult(BaseModel):
    """Result model for CFS scheduling"""
    execution_order: List[Dict]
    gantt_chart: List[Dict]
    statistics: Dict
    timeline: List[Dict]
    red_black_tree_states: List[Dict]