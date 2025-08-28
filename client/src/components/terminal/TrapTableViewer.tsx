import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Zap,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { TrapTableEntry, SystemCall } from '@/types/terminal'

interface TrapTableViewerProps {
  trapTable: TrapTableEntry[]
  systemCalls: SystemCall[]
}

export const TrapTableViewer: React.FC<TrapTableViewerProps> = ({ 
  trapTable, 
  systemCalls 
}) => {
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
    return new Date(timestamp * 1000).toLocaleTimeString()
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Trap Table & System Calls</CardTitle>
            <CardDescription>
              Trap handlers and recent system calls
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Trap Table */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Trap Handlers</h4>
          <div className="space-y-1">
            {trapTable.map((entry, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded border border-border/50 bg-muted/20"
              >
                {getTrapIcon(entry.trap_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {entry.trap_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.handler_address}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Recent System Calls */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Recent System Calls</h4>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {systemCalls.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No system calls yet
                </div>
              ) : (
                systemCalls.slice().reverse().map((call, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span className="text-xs font-mono">
                        {call.name}({call.args.join(', ')})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        PID {call.pid}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(call.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

export default TrapTableViewer