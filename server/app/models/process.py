from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class ProcessState(Enum):
    READY = "ready"
    RUNNING = "running"
    BLOCKED = "blocked"
    TERMINATED = "terminated"

class TrapType(Enum):
    SYSTEM_CALL = "system_call"
    TIMER_INTERRUPT = "timer_interrupt"
    PAGE_FAULT = "page_fault"
    ILLEGAL_INSTRUCTION = "illegal_instruction"
    DIVIDE_BY_ZERO = "divide_by_zero"

class Process(BaseModel):
    pid: int
    ppid: Optional[int] = None
    name: str
    state: ProcessState
    priority: int
    start_time: float
    cpu_time: float = 0.0
    memory_usage: int = 0
    command: str = ""
    exit_code: Optional[int] = None
    children: List[int] = []

class SystemCall(BaseModel):
    name: str
    args: List[str]
    timestamp: float
    pid: int

class TrapTableEntry(BaseModel):
    trap_type: TrapType
    handler_address: str
    description: str

class TerminalCommand(BaseModel):
    command: str
    args: List[str] = []
    timestamp: float
    output: str = ""
    error: Optional[str] = None