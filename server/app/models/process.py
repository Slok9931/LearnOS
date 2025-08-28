from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum
import time

class ProcessState(str, Enum):
    READY = "ready"
    RUNNING = "running"
    BLOCKED = "blocked"
    TERMINATED = "terminated"
    ZOMBIE = "zombie"

class TrapType(str, Enum):
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
    priority: int = 0
    start_time: float
    cpu_time: float = 0.0
    memory_usage: int = 0
    command: str = ""
    exit_code: Optional[int] = None
    children: List[int] = []

class TrapTableEntry(BaseModel):
    trap_type: TrapType
    handler_address: str
    description: str

class SystemCall(BaseModel):
    name: str
    pid: int
    args: List[str]
    timestamp: float

class TerminalCommand(BaseModel):
    command: str
    args: List[str] = []

class TerminalResponse(BaseModel):
    output: str
    error: Optional[str] = None
    processes: List[Process] = []
    trap_info: Optional[Dict[str, Any]] = None
    system_calls: List[SystemCall] = []