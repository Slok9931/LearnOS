export interface Process {
  pid: number
  ppid?: number
  name: string
  state: 'ready' | 'running' | 'blocked' | 'terminated'
  priority: number
  start_time: number
  cpu_time: number
  memory_usage: number
  command: string
  exit_code?: number
  children: number[]
}

export interface SystemCall {
  name: string
  args: string[]
  timestamp: number
  pid: number
}

export interface TrapTableEntry {
  trap_type: 'system_call' | 'timer_interrupt' | 'page_fault' | 'illegal_instruction' | 'divide_by_zero'
  handler_address: string
  description: string
}

export interface TerminalEntry {
  id: number
  command: string
  output: string
  error?: string
  timestamp: number
}

export interface TrapInfo {
  trap_type?: string
  description?: string
  trap_table?: TrapTableEntry[]
  recent_calls?: SystemCall[]
}