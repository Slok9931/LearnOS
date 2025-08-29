import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Zap,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { terminalApi } from '@/services/terminalApi'
import type { TrapTableEntry, SystemCall } from '@/types/terminal'

export const TrapTableViewer: React.FC = () => {
  const [trapTable, setTrapTable] = useState<TrapTableEntry[]>([])
  const [systemCalls, setSystemCalls] = useState<SystemCall[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadTrapData = async () => {
    setIsLoading(true)
    try {
      const data = await terminalApi.getTrapTable()
      setTrapTable(data.trap_table || [])
      setSystemCalls(data.system_calls || [])
    } catch (error) {
      console.error('Failed to load trap data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTrapData()
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadTrapData, 3000)
    return () => clearInterval(interval)
  }, [])

  const getTrapIcon = (trapType: string) => {
    switch (trapType) {
      case 'system_call':
        return <Zap className="w-3 h-3 text-blue-400" />
      case 'timer_interrupt':
        return <Clock className="w-3 h-3 text-green-400" />
      case 'page_fault':
        return <AlertTriangle className="w-3 h-3 text-yellow-400" />
      default:
        return <Shield className="w-3 h-3 text-red-400" />
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Trap Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trap Table</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTrapData}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {trapTable.length === 0 ? (
            <div className="text-center text-gray-500 py-2">
              No trap table data
            </div>
          ) : (
            <div className="space-y-2">
              {trapTable.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-lg text-sm"
                >
                  <div>
                    <div className="font-medium">{entry.trap_type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-xs text-gray-500">{entry.description}</div>
                  </div>
                  <div className="text-xs font-mono text-gray-600">
                    {entry.handler_address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent System Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent System Calls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {systemCalls.length === 0 ? (
            <div className="text-center text-gray-500 py-2">
              No recent system calls
            </div>
          ) : (
            <div className="space-y-1">
              {systemCalls.slice().reverse().map((call, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 border rounded text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{call.name}</span>
                    <span className="text-gray-500">
                      PID {call.pid}
                    </span>
                    <span className="text-gray-400">
                      [{call.args.join(', ')}]
                    </span>
                  </div>
                  <span className="text-gray-500 font-mono">
                    {formatTimestamp(call.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TrapTableViewer