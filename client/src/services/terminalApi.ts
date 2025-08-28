import { API_CONFIG } from './../config/api';
import { TerminalResponse } from '@/types/terminal'

class TerminalApi {
  private baseUrl = API_CONFIG.BASE_URL

  async executeCommand(command: string, args: string[] = []): Promise<TerminalResponse> {
    const response = await fetch(`${this.baseUrl}/api/terminal/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ command, args }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Command execution failed')
    }

    return result.data
  }

  async getProcesses() {
    const response = await fetch(`${this.baseUrl}/api/terminal/processes`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to get processes')
    }

    return result.data
  }

  async getTrapTable() {
    const response = await fetch(`${this.baseUrl}/api/terminal/trap-table`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to get trap table')
    }

    return result.data
  }

  async getSystemCalls() {
    const response = await fetch(`${this.baseUrl}/api/terminal/system-calls`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to get system calls')
    }

    return result.data
  }

  async resetSystem() {
    const response = await fetch(`${this.baseUrl}/api/terminal/reset`, {
      method: 'POST',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to reset system')
    }

    return result.data
  }
}

const terminalApi = new TerminalApi()
export default terminalApi