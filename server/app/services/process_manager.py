import time
import random
from typing import Dict, List, Optional, Any
from app.models.process import (
    Process, ProcessState, TrapType, TrapTableEntry, 
    SystemCall, TerminalCommand
)

class ProcessManager:
    def __init__(self):
        self.processes: Dict[int, Process] = {}
        self.next_pid = 1
        self.current_time = 0
        self.system_calls: List[SystemCall] = []
        self.trap_table = self._initialize_trap_table()
        
        self._create_kernel_process()
    
    def _initialize_trap_table(self) -> List[TrapTableEntry]:
        """Initialize the trap table with common trap handlers"""
        return [
            TrapTableEntry(
                trap_type=TrapType.SYSTEM_CALL,
                handler_address="0x80000000",
                description="System call handler - handles fork, exec, wait, exit"
            ),
            TrapTableEntry(
                trap_type=TrapType.TIMER_INTERRUPT,
                handler_address="0x80000100",
                description="Timer interrupt handler - context switching"
            ),
            TrapTableEntry(
                trap_type=TrapType.PAGE_FAULT,
                handler_address="0x80000200",
                description="Page fault handler - memory management"
            ),
            TrapTableEntry(
                trap_type=TrapType.ILLEGAL_INSTRUCTION,
                handler_address="0x80000300",
                description="Illegal instruction handler - process termination"
            ),
            TrapTableEntry(
                trap_type=TrapType.DIVIDE_BY_ZERO,
                handler_address="0x80000400",
                description="Divide by zero handler - arithmetic exception"
            )
        ]
    
    def _create_kernel_process(self):
        """Create the kernel process (PID 0)"""
        kernel_process = Process(
            pid=0,
            ppid=None,
            name="kernel",
            state=ProcessState.RUNNING,
            priority=10,
            start_time=time.time(),
            command="[kernel]"
        )
        self.processes[0] = kernel_process
    
    def execute_command(self, command: str, args: List[str]) -> Dict[str, Any]:
        """Execute a terminal command and return the result"""
        self.current_time = time.time()
        
        self._log_system_call("exec", [command] + args)
        
        if command == "ps":
            return self._cmd_ps(args)
        elif command == "fork":
            return self._cmd_fork(args)
        elif command == "kill":
            return self._cmd_kill(args)
        elif command == "wait":
            return self._cmd_wait(args)
        elif command == "trap":
            return self._cmd_trap(args)
        elif command == "help":
            return self._cmd_help(args)
        elif command == "top":
            return self._cmd_top(args)
        elif command == "sleep":
            return self._cmd_sleep(args)
        elif command == "exit":
            return self._cmd_exit(args)
        elif command == "clear":
            return {"output": "\033[2J\033[H", "processes": list(self.processes.values())}
        else:
            return {
                "output": f"Command '{command}' not found. Type 'help' for available commands.",
                "error": "Command not found",
                "processes": list(self.processes.values())
            }
    
    def _cmd_ps(self, args: List[str]) -> Dict[str, Any]:
        """List all processes"""
        output = "PID\tPPID\tSTATE\t\tNAME\t\tCOMMAND\n"
        output += "-" * 60 + "\n"
        
        for process in self.processes.values():
            ppid_str = str(process.ppid) if process.ppid is not None else "-"
            output += f"{process.pid}\t{ppid_str}\t{process.state.value.upper()}\t\t{process.name}\t\t{process.command}\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": "Process listing system call executed"
            }
        }
    
    def _cmd_fork(self, args: List[str]) -> Dict[str, Any]:
        """Create a new process (fork simulation)"""
        parent_pid = 1
        process_name = args[0] if args else f"process_{self.next_pid}"
        
        self._log_system_call("fork", [process_name])
        
        new_process = Process(
            pid=self.next_pid,
            ppid=parent_pid,
            name=process_name,
            state=ProcessState.READY,
            priority=random.randint(1, 10),
            start_time=self.current_time,
            memory_usage=random.randint(1024, 8192),
            command=f"fork {process_name}"
        )
        
        self.processes[self.next_pid] = new_process
        
        if parent_pid in self.processes:
            self.processes[parent_pid].children.append(self.next_pid)
        
        output = f"Process forked successfully!\n"
        output += f"New PID: {self.next_pid}\n"
        output += f"Parent PID: {parent_pid}\n"
        output += f"Process name: {process_name}\n"
        output += f"State: {new_process.state.value}\n"
        
        self.next_pid += 1
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": f"Fork system call created process {new_process.pid}"
            }
        }
    
    def _cmd_kill(self, args: List[str]) -> Dict[str, Any]:
        """Kill a process"""
        if not args:
            return {
                "output": "Usage: kill <pid>",
                "error": "Missing PID argument",
                "processes": list(self.processes.values())
            }
        
        try:
            pid = int(args[0])
        except ValueError:
            return {
                "output": "Error: PID must be a number",
                "error": "Invalid PID",
                "processes": list(self.processes.values())
            }
        
        if pid == 0:
            return {
                "output": "Error: Cannot kill kernel process",
                "error": "Permission denied",
                "processes": list(self.processes.values())
            }
        
        if pid not in self.processes:
            return {
                "output": f"Error: Process {pid} not found",
                "error": "Process not found",
                "processes": list(self.processes.values())
            }
        
        self._log_system_call("kill", [str(pid)])
        
        process = self.processes[pid]
        process.state = ProcessState.TERMINATED
        process.exit_code = 9
        
        output = f"Process {pid} ({process.name}) terminated\n"
        output += f"Exit code: 9 (SIGKILL)\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": f"Kill system call terminated process {pid}"
            }
        }
    
    def _cmd_wait(self, args: List[str]) -> Dict[str, Any]:
        """Wait for a process to complete"""
        if not args:
            return {
                "output": "Usage: wait <pid>",
                "error": "Missing PID argument",
                "processes": list(self.processes.values())
            }
        
        try:
            pid = int(args[0])
        except ValueError:
            return {
                "output": "Error: PID must be a number",
                "error": "Invalid PID",
                "processes": list(self.processes.values())
            }
        
        if pid not in self.processes:
            return {
                "output": f"Error: Process {pid} not found",
                "error": "Process not found",
                "processes": list(self.processes.values())
            }
        
        self._log_system_call("wait", [str(pid)])
        
        process = self.processes[pid]
        
        if process.state == ProcessState.TERMINATED:
            output = f"Process {pid} has already terminated\n"
            output += f"Exit code: {process.exit_code or 0}\n"
        else:
            process.state = ProcessState.TERMINATED
            process.exit_code = 0
            output = f"Waited for process {pid} ({process.name})\n"
            output += f"Process completed with exit code: 0\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": f"Wait system call for process {pid}"
            }
        }
    
    def _cmd_trap(self, args: List[str]) -> Dict[str, Any]:
        """Show trap table information"""
        output = "TRAP TABLE\n"
        output += "=" * 60 + "\n"
        output += "TYPE\t\t\tHANDLER\t\tDESCRIPTION\n"
        output += "-" * 60 + "\n"
        
        for entry in self.trap_table:
            output += f"{entry.trap_type.value}\t{entry.handler_address}\t{entry.description}\n"
        
        output += "\nRecent System Calls:\n"
        output += "-" * 30 + "\n"
        recent_calls = self.system_calls[-5:]
        for call in recent_calls:
            output += f"PID {call.pid}: {call.name}({', '.join(call.args)})\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_table": [entry.dict() for entry in self.trap_table],
                "recent_calls": [call.dict() for call in recent_calls]
            }
        }
    
    def _cmd_help(self, args: List[str]) -> Dict[str, Any]:
        """Show available commands"""
        output = """
OS CPU Virtualization Terminal

Available Commands:
------------------
ps              - List all processes
fork <name>     - Create a new process
kill <pid>      - Terminate a process
wait <pid>      - Wait for a process to complete
trap            - Show trap table and system calls
sleep <pid>     - Put a process to sleep
exit <pid>      - Exit a process gracefully
top             - Show running processes (live view)
clear           - Clear the terminal
help            - Show this help message

Examples:
---------
fork myprocess  - Creates a new process named 'myprocess'
kill 123        - Terminates process with PID 123
wait 123        - Waits for process 123 to complete
trap            - Shows the trap table and recent system calls

Note: This terminal demonstrates OS CPU virtualization concepts
including process management, system calls, and trap handling.
        """
        
        return {
            "output": output,
            "processes": list(self.processes.values())
        }
    
    def _cmd_top(self, args: List[str]) -> Dict[str, Any]:
        """Show running processes with resource usage"""
        output = "TOP - Process Monitor\n"
        output += "=" * 80 + "\n"
        output += "PID\tPPID\tSTATE\t\tNAME\t\tCPU%\tMEM(KB)\tTIME\n"
        output += "-" * 80 + "\n"
        
        for process in self.processes.values():
            cpu_percent = random.uniform(0, 100) if process.state == ProcessState.RUNNING else 0
            runtime = self.current_time - process.start_time
            
            output += f"{process.pid}\t{process.ppid or '-'}\t{process.state.value.upper()}\t\t"
            output += f"{process.name[:10]}\t{cpu_percent:.1f}\t{process.memory_usage}\t{runtime:.1f}s\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values())
        }
    
    def _cmd_sleep(self, args: List[str]) -> Dict[str, Any]:
        """Put a process to sleep"""
        if not args:
            return {
                "output": "Usage: sleep <pid>",
                "error": "Missing PID argument",
                "processes": list(self.processes.values())
            }
        
        try:
            pid = int(args[0])
        except ValueError:
            return {
                "output": "Error: PID must be a number",
                "error": "Invalid PID",
                "processes": list(self.processes.values())
            }
        
        if pid not in self.processes:
            return {
                "output": f"Error: Process {pid} not found",
                "error": "Process not found",
                "processes": list(self.processes.values())
            }
        
        self._log_system_call("sleep", [str(pid)])
        
        process = self.processes[pid]
        process.state = ProcessState.BLOCKED
        
        output = f"Process {pid} ({process.name}) is now sleeping\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": f"Sleep system call for process {pid}"
            }
        }
    
    def _cmd_exit(self, args: List[str]) -> Dict[str, Any]:
        """Exit a process gracefully"""
        if not args:
            return {
                "output": "Usage: exit <pid>",
                "error": "Missing PID argument",
                "processes": list(self.processes.values())
            }
        
        try:
            pid = int(args[0])
        except ValueError:
            return {
                "output": "Error: PID must be a number",
                "error": "Invalid PID",
                "processes": list(self.processes.values())
            }
        
        if pid not in self.processes:
            return {
                "output": f"Error: Process {pid} not found",
                "error": "Process not found",
                "processes": list(self.processes.values())
            }
        
        self._log_system_call("exit", [str(pid)])
        
        process = self.processes[pid]
        process.state = ProcessState.TERMINATED
        process.exit_code = 0
        
        output = f"Process {pid} ({process.name}) exited gracefully\n"
        output += f"Exit code: 0\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": f"Exit system call for process {pid}"
            }
        }
    
    def _log_system_call(self, name: str, args: List[str]):
        """Log a system call"""
        system_call = SystemCall(
            name=name,
            pid=1,
            args=args,
            timestamp=self.current_time
        )
        self.system_calls.append(system_call)
        
        if len(self.system_calls) > 100:
            self.system_calls = self.system_calls[-100:]
    
    def get_all_processes(self) -> List[Process]:
        """Get all processes"""
        return list(self.processes.values())
    
    def get_trap_table(self) -> List[TrapTableEntry]:
        """Get the trap table"""
        return self.trap_table
    
    def get_recent_system_calls(self) -> List[SystemCall]:
        """Get recent system calls"""
        return self.system_calls[-20:]
    
    def reset_system(self):
        """Reset the system to initial state"""
        self.processes.clear()
        self.system_calls.clear()
        self.next_pid = 1
        self._create_kernel_process()

process_manager = ProcessManager()