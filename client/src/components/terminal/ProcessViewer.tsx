import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { terminalApi } from '@/services/terminalApi'
import type { Process } from '@/types/terminal'

export const ProcessViewer: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadProcesses = async () => {
    setIsLoading(true)
    try {
      const data = await terminalApi.getProcesses()
      setProcesses(data.processes || [])
    } catch (error) {
      console.error('Failed to load processes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProcesses()
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadProcesses, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running': return 'bg-green-500'
      case 'ready': return 'bg-blue-500'
      case 'blocked': return 'bg-yellow-500'
      case 'terminated': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatUptime = (startTime: number) => {
    const uptime = Date.now() / 1000 - startTime
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Process List</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={loadProcesses}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {processes.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No processes found
          </div>
        ) : (
          processes.map((process) => (
            <div
              key={process.pid}
              className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <Badge
                  variant="outline"
                  className={`${getStateColor(process.state)} text-white border-none`}
                >
                  {process.state}
                </Badge>
                <div>
                  <div className="font-medium text-sm">
                    PID {process.pid}: {process.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {process.command}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>Priority: {process.priority}</div>
                <div>Memory: {formatMemory(process.memory_usage)}</div>
                <div>Uptime: {formatUptime(process.start_time)}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default ProcessViewer