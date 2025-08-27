from pydantic import BaseModel
from typing import List, Dict, Any

class Event(BaseModel):
    time: float
    type: str
    data: Dict[str, Any] = {}

class GanttSlice(BaseModel):
    pid: int
    start: float
    end: float
    core: int = 0

class Metrics(BaseModel):
    pid: int
    waiting_time: float
    turnaround_time: float
    response_time: float

class SimulationSummary(BaseModel):
    gantt: List[GanttSlice] = []
    metrics: List[Metrics] = []
    aggregate: Dict[str, float] = {}

class SimulationResult(BaseModel):
    events: List[Event] = []
    summary: SimulationSummary