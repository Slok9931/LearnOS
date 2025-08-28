export interface Process {
  pid: number
  ppid?: number
  name: string
  state: 'ready' | 'running' | 'blocked' | 'terminated' | 'zombie'
  priority: number
  start_time: number
  cpu_time: number
  memory_usage: number
  command: string
  exit_code?: number
  children: number[]
}

export interface TrapTableEntry {
  trap_type: string
  handler_address: string
  description: string
}

export interface SystemCall {
  name: string
  pid: number
  args: string[]
  timestamp: number
}

export interface TerminalCommand {
  command: string
  args: string[]
}

export interface TerminalResponse {
  output: string
  error?: string
  processes: Process[]
  trap_info?: {
    trap_type?: string
    description?: string
    trap_table?: TrapTableEntry[]
    recent_calls?: SystemCall[]
  }
  system_calls?: SystemCall[]
}

export interface TerminalHistory {
  command: string
  output: string
  timestamp: number
  error?: string
}