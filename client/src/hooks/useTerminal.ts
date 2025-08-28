import { useState, useEffect, useRef } from 'react'
import { Process, SystemCall, TerminalResponse, TrapTableEntry } from '@/types/terminal'
import terminalApi from '@/services/terminalApi'

interface HistoryEntry {
  command: string
  output?: string
  error?: string
  timestamp: number
}

export const useTerminal = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [processes, setProcesses] = useState<Process[]>([])
  const [trapTable, setTrapTable] = useState<TrapTableEntry[]>([])
  const [systemCalls, setSystemCalls] = useState<SystemCall[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  const terminalRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }

  const executeCommand = async (command: string) => {
    if (!command.trim()) return

    setIsLoading(true)
    const timestamp = Date.now()
    
    // Add command to history
    setCommandHistory(prev => [...prev, command])
    setHistoryIndex(-1)

    try {
      const response: TerminalResponse = await terminalApi.executeCommand(command.trim())
      
      // Update state based on response
      if (response.processes) setProcesses(response.processes)
      if (response.system_calls) setSystemCalls(response.system_calls)
      
      // Add to terminal history
      setHistory(prev => [
        ...prev,
        {
          command: command.trim(),
          output: response.output,
          error: response.error,
          timestamp
        }
      ])
    } catch (error) {
      console.error('Command execution failed:', error)
      setHistory(prev => [
        ...prev,
        {
          command: command.trim(),
          error: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp
        }
      ])
    } finally {
      setIsLoading(false)
      setCurrentCommand('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeCommand(currentCommand)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setCurrentCommand('')
        } else {
          setHistoryIndex(newIndex)
          setCurrentCommand(commandHistory[newIndex])
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Basic tab completion for common commands
      const commands = ['help', 'ps', 'top', 'fork', 'kill', 'wait', 'trap', 'clear', 'reset']
      const matches = commands.filter(cmd => cmd.startsWith(currentCommand))
      if (matches.length === 1) {
        setCurrentCommand(matches[0])
      }
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      setCurrentCommand('')
      setIsLoading(false)
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault()
      clearTerminal()
    }
  }

  const clearTerminal = () => {
    setHistory([])
  }

  const resetSystem = async () => {
    try {
      await terminalApi.executeCommand('reset')
      setHistory([])
      setProcesses([])
      setTrapTable([])
      setSystemCalls([])
      setCurrentCommand('')
    } catch (error) {
      console.error('Reset failed:', error)
    }
  }

  // Auto-scroll when history changes
  useEffect(() => {
    scrollToBottom()
  }, [history])

  return {
    history,
    currentCommand,
    setCurrentCommand,
    processes,
    trapTable,
    systemCalls,
    isLoading,
    terminalRef,
    handleKeyDown,
    clearTerminal,
    resetSystem,
    executeCommand
  }
}