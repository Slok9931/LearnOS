import time
import random
from typing import Dict, List, Any
from app.models.process import (
    Process, ProcessState, TrapType, TrapTableEntry, 
    SystemCall
)

class ProcessManager:
    def __init__(self):
        self.processes: Dict[int, Process] = {}
        self.next_pid = 1
        self.current_time = 0
        self.system_calls: List[SystemCall] = []
        self.trap_table = self._initialize_trap_table()
        self.command_history: List[str] = []
        self.aliases: Dict[str, str] = {
            'h': 'help',
            'p': 'ps'
        }
        
        self._create_kernel_process()
        self._create_init_process()
    
    def get_all_processes(self):
        """Get all processes - used by endpoints"""
        return list(self.processes.values())
    
    def get_trap_table(self):
        """Get the trap table - used by endpoints"""
        return self.trap_table
    
    def get_recent_system_calls(self, count: int = 10):
        """Get recent system calls - used by endpoints"""
        return self.system_calls[-count:] if self.system_calls else []
    
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
            name="[kernel]",
            state=ProcessState.RUNNING,
            priority=10,
            start_time=time.time(),
            command="[kernel]",
            memory_usage=8192
        )
        self.processes[0] = kernel_process
    
    def _create_init_process(self):
        """Create the init process (PID 1)"""
        init_process = Process(
            pid=1,
            ppid=0,
            name="init",
            state=ProcessState.RUNNING,
            priority=1,
            start_time=time.time(),
            command="/sbin/init",
            memory_usage=4096
        )
        self.processes[1] = init_process
        self.processes[0].children.append(1)
        self.next_pid = 2
    
    def _log_system_call(self, call_name: str, args: List[str]):
        """Log a system call"""
        system_call = SystemCall(
            name=call_name,
            args=args,
            timestamp=time.time(),
            pid=1
        )
        self.system_calls.append(system_call)
        if len(self.system_calls) > 100:
            self.system_calls = self.system_calls[-100:]
    
    def execute_command(self, command: str, args: List[str]) -> Dict[str, Any]:
        """Execute a terminal command and return the result"""
        self.current_time = time.time()
        
        full_command = f"{command} {' '.join(args)}".strip()
        if command in self.aliases:
            alias_parts = self.aliases[command].split()
            command = alias_parts[0]
            args = alias_parts[1:] + args
        
        self.command_history.append(full_command)
        if len(self.command_history) > 1000:
            self.command_history = self.command_history[-1000:]
        
        self._log_system_call("exec", [command] + args)
        
        command_map = {
            'ps': self._cmd_ps,
            'fork': self._cmd_fork,
            'kill': self._cmd_kill,
            'wait': self._cmd_wait,
            'sleep': self._cmd_sleep,
            'exit': self._cmd_exit,
            'pstree': self._cmd_pstree,
            
            'trap': self._cmd_trap,
            'help': self._cmd_help,
            'top': self._cmd_top,
            'uptime': self._cmd_uptime,
            'free': self._cmd_free,
            'whoami': self._cmd_whoami,
            'id': self._cmd_id,
            'uname': self._cmd_uname,
            
            'pgrep': self._cmd_pgrep,
            'pkill': self._cmd_pkill,
            'killall': self._cmd_killall,
            
            'history': self._cmd_history,
            'alias': self._cmd_alias,
            'env': self._cmd_env,
            'clear': self._cmd_clear,
            
            'ls': self._cmd_ls,
            'pwd': self._cmd_pwd,
            'cd': self._cmd_cd,
        }
        
        if command in command_map:
            return command_map[command](args)
        else:
            return {
                "output": f"Command '{command}' not found. Type 'help' for available commands.\n",
                "processes": list(self.processes.values()),
                "error": f"Unknown command: {command}"
            }
    
    def _cmd_help(self, args: List[str]) -> Dict[str, Any]:
        """Show available commands"""
        output = """
PROCESS MANAGEMENT:
  ps [options]            - List processes (-a for all, -f for tree, -u for user info)
  top                     - Display running processes
  pstree                  - Show process tree
  fork <name>             - Create a new process
  kill [-sig] pid         - Terminate/signal a process (signals: 9=KILL, 15=TERM, 19=STOP, 18=CONT)
  wait <pid>              - Wait for process completion
  sleep <pid>             - Put process to sleep
  exit                    - Exit information

SYSTEM INFORMATION:
  uptime                  - Show system uptime and load
  free [-h]               - Display memory usage
  uname [-a|-r|-s|-n|-m]  - System information
  whoami                  - Current user
  id                      - User and group IDs

PROCESS UTILITIES:
  pgrep <name>            - Find processes by name
  pkill <name>            - Kill processes by name
  killall <name>          - Kill all processes with name

SYSTEM CALLS & TRAPS:
  trap                    - Show trap table and system calls

TERMINAL & UTILITIES:
  history                 - Command history
  alias [name]            - Show or create command alias
  unalias <name>          - Remove alias
  env                     - Show environment variables
  clear                   - Clear terminal (Ctrl+L)

EXAMPLES:
  fork webserver          - Creates process named 'webserver'
  kill -9 123             - Force kill process 123
  ps -a                   - Show all processes
  ps -f                   - Show process tree
  free -h                 - Human readable memory info
  alias ll='ls -l'        - Create alias (view with 'alias')
  pgrep init              - Find processes containing 'init'
  sleep 123               - Put process 123 to sleep
  uname -a                - Show all system info
  
AVAILABLE ALIASES:
  h → help
  p → ps
        """
        
        return {
            "output": output,
            "processes": list(self.processes.values())
        }

    def _cmd_ls(self, args: List[str]) -> Dict[str, Any]:
        """List directory contents (simulated)"""
        path = args[0] if args else "/"
        
        if path in ["/", "~", ""]:
            output = "total 8\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 bin\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 etc\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 home\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 proc\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 tmp\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 usr\n"
            output += "drwxr-xr-x  2 user user 4096 Jan 01 12:00 var\n"
        elif path == "/proc":
            output = "Process information directory:\n"
            for pid in self.processes.keys():
                output += f"{pid}\n"
        else:
            output = f"ls: cannot access '{path}': No such file or directory\n"
        
        return {"output": output, "processes": list(self.processes.values())}
    
    def _cmd_pwd(self, args: List[str]) -> Dict[str, Any]:
        """Print working directory (simulated)"""
        return {"output": "/home/user\n", "processes": list(self.processes.values())}
    
    def _cmd_cd(self, args: List[str]) -> Dict[str, Any]:
        """Change directory (simulated)"""
        path = args[0] if args else "~"
        return {"output": f"Changed to directory: {path}\n", "processes": list(self.processes.values())}
    
    def _cmd_clear(self, args: List[str]) -> Dict[str, Any]:
        """Clear terminal"""
        return {"output": "\033[2J\033[H", "processes": list(self.processes.values())}

    def _cmd_fork(self, args: List[str]) -> Dict[str, Any]:
        """Create a new process (fork simulation)"""
        if not args:
            return {
                "output": "Usage: fork <process_name>\nExample: fork webserver\n",
                "processes": list(self.processes.values()),
                "error": "Missing process name"
            }
        
        parent_pid = 1
        process_name = args[0]
        command = ' '.join(args) if len(args) > 1 else f"fork {process_name}"
        
        self._log_system_call("fork", [process_name])
        
        new_process = Process(
            pid=self.next_pid,
            ppid=parent_pid,
            name=process_name,
            state=ProcessState.READY,
            priority=random.randint(1, 10),
            start_time=self.current_time,
            memory_usage=random.randint(1024, 8192),
            command=command
        )
        
        self.processes[self.next_pid] = new_process
        
        if parent_pid in self.processes:
            self.processes[parent_pid].children.append(self.next_pid)
        
        output = f"Process forked successfully!\n"
        output += f"New PID: {self.next_pid}\n"
        output += f"Parent PID: {parent_pid}\n"
        output += f"Process name: {process_name}\n"
        output += f"Command: {command}\n"
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

    def _cmd_ps(self, args: List[str]) -> Dict[str, Any]:
        """List all processes with various options"""
        show_all = '-a' in args or '--all' in args
        show_tree = '-f' in args or '--forest' in args
        
        if show_tree:
            return self._cmd_pstree(args)
        
        output = "PID\tPPID\tSTATE\t\tPRI\tNI\tMEM(KB)\tNAME\t\tCOMMAND\n"
        output += "-" * 80 + "\n"
        
        processes_to_show = list(self.processes.values())
        if not show_all:
            processes_to_show = [p for p in processes_to_show if p.state != ProcessState.TERMINATED]
        
        for process in sorted(processes_to_show, key=lambda p: p.pid):
            output += f"{process.pid}\t{process.ppid or '-'}\t{process.state.value[:10]}\t{process.priority}\t{process.memory_usage}\t{process.name[:12]}\t{process.command[:20]}\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": "Process listing system call executed"
            }
        }

    def _cmd_pstree(self, args: List[str]) -> Dict[str, Any]:
        """Show process tree"""
        def build_tree(pid: int, indent: str = "", is_last: bool = True) -> str:
            if pid not in self.processes:
                return ""
            
            process = self.processes[pid]
            connector = "└─" if is_last else "├─"
            tree_output = f"{indent}{connector}{process.name}({pid})\n"
            
            children = process.children
            for i, child_pid in enumerate(children):
                is_last_child = i == len(children) - 1
                child_indent = indent + ("  " if is_last else "│ ")
                tree_output += build_tree(child_pid, child_indent, is_last_child)
            
            return tree_output
        
        output = "Process Tree:\n"
        output += "=" * 40 + "\n"
        output += build_tree(0)
        
        return {
            "output": output,
            "processes": list(self.processes.values())
        }

    def _cmd_kill(self, args: List[str]) -> Dict[str, Any]:
        """Kill a process"""
        if not args:
            return {
                "output": "Usage: kill [-signal] <pid>\nSignals: -9 (KILL), -15 (TERM), -19 (STOP), -18 (CONT)\n",
                "processes": list(self.processes.values()),
                "error": "Missing PID"
            }
        
        signal = 15
        pid_arg = args[0]
        
        if pid_arg.startswith('-'):
            try:
                signal = int(pid_arg[1:])
                if len(args) < 2:
                    return {
                        "output": "Error: PID required after signal\n",
                        "processes": list(self.processes.values()),
                        "error": "Missing PID after signal"
                    }
                pid_arg = args[1]
            except ValueError:
                return {
                    "output": f"Error: Invalid signal '{pid_arg}'\n",
                    "processes": list(self.processes.values()),
                    "error": "Invalid signal"
                }
        
        try:
            pid = int(pid_arg)
        except ValueError:
            return {
                "output": f"Error: Invalid PID '{pid_arg}'\n",
                "processes": list(self.processes.values()),
                "error": "Invalid PID"
            }
        
        if pid not in self.processes:
            return {
                "output": f"Error: No such process (PID {pid})\n",
                "processes": list(self.processes.values()),
                "error": "Process not found"
            }
        
        if pid in [0, 1]:
            return {
                "output": f"Error: Cannot kill system process (PID {pid})\n",
                "processes": list(self.processes.values()),
                "error": "Cannot kill system process"
            }
        
        process = self.processes[pid]
        signal_names = {9: "KILL", 15: "TERM", 19: "STOP", 18: "CONT"}
        signal_name = signal_names.get(signal, str(signal))
        
        if signal == 9 or signal == 15:
            process.state = ProcessState.TERMINATED
            process.exit_code = signal
            output = f"Process {pid} ({process.name}) terminated with signal {signal_name}\n"
        elif signal == 19:
            process.state = ProcessState.BLOCKED
            output = f"Process {pid} ({process.name}) stopped with signal {signal_name}\n"
        elif signal == 18:
            process.state = ProcessState.READY
            output = f"Process {pid} ({process.name}) continued with signal {signal_name}\n"
        else:
            output = f"Signal {signal} sent to process {pid} ({process.name})\n"
        
        self._log_system_call("kill", [str(pid), str(signal)])
        
        return {
            "output": output,
            "processes": list(self.processes.values()),
            "trap_info": {
                "trap_type": "system_call",
                "description": f"Kill signal {signal_name} sent to process {pid}"
            }
        }

    def _cmd_trap(self, args: List[str]) -> Dict[str, Any]:
        """Show trap table and recent system calls"""
        output = "TRAP TABLE:\n"
        output += "=" * 60 + "\n"
        output += "Type\t\t\tHandler Address\t\t\tDescription\n"
        output += "-" * 60 + "\n"
        
        for entry in self.trap_table:
            output += f"{entry.trap_type.value[:20]}\t\t\t{entry.handler_address}\t\t\t{entry.description}\n"
        
        output += "\nRECENT SYSTEM CALLS:\n"
        output += "=" * 60 + "\n"
        output += "Time\t\tPID\tCall\t\tArgs\n"
        output += "-" * 60 + "\n"
        
        recent_calls = self.system_calls[-10:]
        for call in recent_calls:
            timestamp = time.strftime("%H:%M:%S", time.localtime(call.timestamp))
            args_str = " ".join(call.args[:3])
            output += f"{timestamp}\t\t{call.pid}\t\t{call.name[:10]}\t\t{args_str[:20]}\n"
        
        return {
            "output": output,
            "processes": list(self.processes.values())
        }

    def _cmd_wait(self, args: List[str]) -> Dict[str, Any]:
        if not args:
            return {"output": "Usage: wait <pid>\n", "processes": list(self.processes.values())}
        
        try:
            pid = int(args[0])
            if pid in self.processes:
                process = self.processes[pid]
                if process.state == ProcessState.TERMINATED:
                    output = f"Process {pid} has already terminated with exit code {process.exit_code}\n"
                else:
                    output = f"Waiting for process {pid} ({process.name}) to complete...\n"
                    process.state = ProcessState.TERMINATED
                    process.exit_code = 0
                    output += f"Process {pid} completed with exit code 0\n"
            else:
                output = f"No such process: {pid}\n"
        except ValueError:
            output = "Invalid PID\n"
        
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_sleep(self, args: List[str]) -> Dict[str, Any]:
        if not args:
            return {"output": "Usage: sleep <pid>\n", "processes": list(self.processes.values())}
        
        try:
            pid = int(args[0])
            if pid in self.processes and pid not in [0, 1]:
                self.processes[pid].state = ProcessState.BLOCKED
                return {"output": f"Process {pid} put to sleep\n", "processes": list(self.processes.values())}
            else:
                return {"output": f"Cannot sleep process {pid}\n", "processes": list(self.processes.values())}
        except ValueError:
            return {"output": "Invalid PID\n", "processes": list(self.processes.values())}

    def _cmd_exit(self, args: List[str]) -> Dict[str, Any]:
        return {"output": "Use 'kill <pid>' to terminate processes or Ctrl+C to exit terminal\n", "processes": list(self.processes.values())}

    def _cmd_top(self, args: List[str]) -> Dict[str, Any]:
        output = f"top - {time.strftime('%H:%M:%S')} up {int(self.current_time - self.processes[0].start_time)}s\n"
        output += f"Tasks: {len(self.processes)} total, "
        running = len([p for p in self.processes.values() if p.state == ProcessState.RUNNING])
        sleeping = len([p for p in self.processes.values() if p.state == ProcessState.BLOCKED])
        output += f"{running} running, {sleeping} sleeping\n"
        output += f"CPU(s): 100.0%us, 0.0%sy, 0.0%ni, 0.0%id, 0.0%wa\n"
        output += f"Memory: 8GB total, {sum(p.memory_usage for p in self.processes.values())/1024:.1f}MB used\n\n"
        
        output += "PID\tUSER\t%CPU\t%MEM\tTIME+\tCOMMAND\n"
        
        processes = sorted(self.processes.values(), 
                         key=lambda p: random.uniform(0, 100) if p.state == ProcessState.RUNNING else 0, 
                         reverse=True)
        
        for process in processes[:15]:
            cpu_percent = random.uniform(0, 25) if process.state == ProcessState.RUNNING else 0
            mem_percent = (process.memory_usage / (8*1024*1024)) * 100
            runtime = int(self.current_time - process.start_time)
            output += f"{process.pid}\tuser\t{cpu_percent:.1f}\t{mem_percent:.1f}\t{runtime:02d}:{(runtime%3600)//60:02d}\t{process.command[:15]}\n"
        
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_uptime(self, args: List[str]) -> Dict[str, Any]:
        uptime_seconds = int(self.current_time - self.processes[0].start_time)
        hours, remainder = divmod(uptime_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        load1, load5, load15 = random.uniform(0.1, 2.0), random.uniform(0.1, 2.0), random.uniform(0.1, 2.0)
        output = f" {time.strftime('%H:%M:%S')} up {hours:02d}:{minutes:02d}:{seconds:02d}, {len(self.processes)} processes, load average: {load1:.2f}, {load5:.2f}, {load15:.2f}\n"
        return {"output": output, "processes": list(self.processes.values())}
    
    def _cmd_free(self, args: List[str]) -> Dict[str, Any]:
        total_mem = 8 * 1024 * 1024
        used_mem = sum(p.memory_usage for p in self.processes.values())
        free_mem = total_mem - used_mem
        
        if '-h' in args:
            output = f"              total       used       free     shared    buffers     cached\n"
            output += f"Mem:           {total_mem//1024//1024}G        {used_mem//1024}M        {free_mem//1024//1024}G          0          0          0\n"
        else:
            output = f"              total        used        free      shared  buff/cache   available\n"
            output += f"Mem:       {total_mem:8d}  {used_mem:8d}  {free_mem:8d}           0           0  {free_mem:8d}\n"
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_whoami(self, args: List[str]) -> Dict[str, Any]:
        return {"output": "user\nDummy user of LearnOS terminal\n", "processes": list(self.processes.values())}

    def _cmd_id(self, args: List[str]) -> Dict[str, Any]:
        return {"output": "uid=1000(user) gid=1000(user)\n", "processes": list(self.processes.values())}

    def _cmd_uname(self, args: List[str]) -> Dict[str, Any]:
        if '-a' in args:
            return {"output": "Linux learnos 5.15.0 #1 SMP x86_64 GNU/Linux\n", "processes": list(self.processes.values())}
        return {"output": "Linux\n", "processes": list(self.processes.values())}

    def _cmd_env(self, args: List[str]) -> Dict[str, Any]:
        output = "PATH=/usr/local/bin:/usr/bin:/bin\n"
        output += "HOME=/home/user\n"
        output += "USER=user\n"
        output += "SHELL=/bin/bash\n"
        output += "PWD=/home/user\n"
        output += "TERM=xterm-256color\n"
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_history(self, args: List[str]) -> Dict[str, Any]:
        if not self.command_history:
            return {"output": "No command history\n", "processes": list(self.processes.values())}
        
        output = ""
        start_idx = max(0, len(self.command_history) - 20)
        for i, cmd in enumerate(self.command_history[start_idx:], start_idx + 1):
            output += f"{i:4d}  {cmd}\n"
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_alias(self, args: List[str]) -> Dict[str, Any]:
        if not args:
            output = ""
            for alias, command in self.aliases.items():
                output += f"alias {alias}='{command}'\n"
            return {"output": output, "processes": list(self.processes.values())}
        return {"output": "Alias management\n", "processes": list(self.processes.values())}

    def _cmd_pgrep(self, args: List[str]) -> Dict[str, Any]:
        if not args: 
            return {"output": "Usage: pgrep <pattern>\n", "processes": list(self.processes.values())}
        
        pattern = args[0].lower()
        matches = []
        for p in self.processes.values():
            if pattern in p.name.lower() or pattern in p.command.lower():
                matches.append(str(p.pid))
        
        output = "\n".join(matches) + "\n" if matches else f"pgrep: no process found matching '{pattern}'\n"
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_pkill(self, args: List[str]) -> Dict[str, Any]:
        if not args:
            return {"output": "Usage: pkill <pattern>\n", "processes": list(self.processes.values())}
        
        pattern = args[0].lower()
        killed_count = 0
        killed_processes = []
        
        for p in self.processes.values():
            if p.pid not in [0, 1] and (pattern in p.name.lower() or pattern in p.command.lower()):
                p.state = ProcessState.TERMINATED
                p.exit_code = 15
                killed_count += 1
                killed_processes.append(f"{p.pid} ({p.name})")
        
        if killed_count == 0:
            output = f"pkill: no process found matching '{pattern}'\n"
        else:
            output = f"pkill: killed {killed_count} process(es):\n"
            for proc in killed_processes:
                output += f"  {proc}\n"
        
        return {"output": output, "processes": list(self.processes.values())}

    def _cmd_killall(self, args: List[str]) -> Dict[str, Any]:
        if not args:
            return {"output": "Usage: killall <name>\n", "processes": list(self.processes.values())}
        
        name = args[0]
        killed_count = 0
        killed_processes = []
        
        for p in self.processes.values():
            if p.pid not in [0, 1] and p.name == name:
                p.state = ProcessState.TERMINATED
                p.exit_code = 15
                killed_count += 1
                killed_processes.append(str(p.pid))
        
        if killed_count == 0:
            output = f"killall: no process found with name '{name}'\n"
        else:
            output = f"killall: killed {killed_count} process(es) named '{name}': {', '.join(killed_processes)}\n"
        
        return {"output": output, "processes": list(self.processes.values())}

process_manager = ProcessManager()