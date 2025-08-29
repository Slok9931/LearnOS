import { API_CONFIG, DEFAULT_HEADERS } from "@/config/api"

export interface TerminalResponse {
  output: string
  error?: string
  processes?: any[]
  trap_info?: {
    trap_type?: string
    description?: string
    trap_table?: any[]
    recent_calls?: any[]
  }
  system_calls?: any[]
}

class TerminalApi {
  private baseUrl = API_CONFIG.BASE_URL

  async executeCommand(command: string, args: string[] = []): Promise<TerminalResponse> {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.TERMINAL.EXECUTE}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ command, args }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Command execution failed')
    }

    return result.data
  }

  async getProcesses() {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.TERMINAL.PROCESSES}`, {
      headers: DEFAULT_HEADERS,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to get processes')
    }

    return result.data
  }

  async getTrapTable() {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.TERMINAL.TRAP_TABLE}`, {
      headers: DEFAULT_HEADERS,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to get trap table')
    }

    return result.data
  }

  async resetSystem() {
    const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.TERMINAL.RESET}`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || 'Failed to reset system')
    }

    return result.data
  }
}

export const terminalApi = new TerminalApi()
export default terminalApi

// Export the executeCommand function for direct use
export const executeTerminalCommand = terminalApi.executeCommand.bind(terminalApi)