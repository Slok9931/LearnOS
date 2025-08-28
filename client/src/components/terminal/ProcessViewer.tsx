import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Cpu, 
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Pause
} from 'lucide-react'
import { Process } from '@/types/terminal'

interface ProcessViewerProps {
  processes: Process[]
}

export const ProcessViewer: React.FC<ProcessViewerProps> = ({ processes }) => {
  const getStateIcon = (state: string) => {
    switch (state) {
      case 'running':
        return <CheckCircle className="w-3 h-3 text-green-400" />
      case 'ready':
        return <Clock className="w-3 h-3 text-blue-400" />
      case 'blocked':
        return <Pause className="w-3 h-3 text-yellow-400" />
      case 'terminated':
        return <XCircle className="w-3 h-3 text-red-400" />
      case 'zombie':
        return <AlertTriangle className="w-3 h-3 text-purple-400" />
      default:
        return <AlertTriangle className="w-3 h-3 text-gray-400" />
    }
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'bg-green-500/10 text-green-400 border-green-500/30'
      case 'ready':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'blocked':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
      case 'terminated':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      case 'zombie':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Process Table</CardTitle>
            <CardDescription>
              Active processes in the system
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {processes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No processes running
              </div>
            ) : (
              processes.map((process) => (
                <div
                  key={process.pid}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {getStateIcon(process.state)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          PID {process.pid}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {process.name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        PPID: {process.ppid || '-'}
                        {process.memory_usage > 0 && (
                          <span className="ml-2">
                            {(process.memory_usage / 1024).toFixed(1)}KB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStateColor(process.state)}`}
                    >
                      {process.state.toUpperCase()}
                    </Badge>
                    {process.priority > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        P{process.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default ProcessViewer