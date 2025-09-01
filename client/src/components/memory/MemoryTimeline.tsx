import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Cpu, HardDrive, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryTimelineProps {
  results: MemoryResult
}

const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ results }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set())
  const [showAllEvents, setShowAllEvents] = useState(false)

  if (!results.visualization?.timeline) {
    return (
      <Card className="border-green-200/50">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No timeline data available</p>
        </CardContent>
      </Card>
    )
  }

  const events = results.visualization.timeline
  const displayEvents = showAllEvents ? events : events.slice(0, 20)

  const toggleEventExpansion = (index: number) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedEvents(newExpanded)
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'allocate':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'deallocate':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'page_fault':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'compaction':
        return <HardDrive className="h-4 w-4 text-blue-600" />
      case 'allocation_failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'allocate':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'deallocate':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'page_fault':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'compaction':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'allocation_failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTime = (time: number) => {
    return typeof time === 'number' ? time.toFixed(2) : '0.00'
  }

  const formatSize = (size?: number) => {
    if (typeof size !== 'number') return 'N/A'
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }
    return `${size} B`
  }

  const formatAddress = (address?: number) => {
    if (typeof address !== 'number') return 'N/A'
    return `0x${address.toString(16).toUpperCase().padStart(4, '0')}`
  }

  return (
    <Card className="border-green-200/50">
      <CardHeader className="border-b border-green-200/50">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Clock className="h-5 w-5" />
          Memory Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Chronological view of memory allocation events
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-80 rounded-md border border-green-200/50">
          <div className="space-y-3 p-4">
            {displayEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-green-100/50 bg-green-50/30 hover:bg-green-50/50 transition-colors cursor-pointer"
                onClick={() => toggleEventExpansion(index)}
              >
                <div className="flex-shrink-0 mt-1">
                  {getEventIcon(event.event_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getEventBadgeColor(event.event_type)}`}>
                        {event.event_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium text-green-800">
                        {event.process_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      t={formatTime(event.time)}s
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {event.description}
                  </p>
                  
                  {expandedEvents.has(index) && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-white/50 p-2 rounded border">
                      <div>
                        <span className="font-medium">Process ID:</span> {event.process_id}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span> {formatTime(event.time)}s
                      </div>
                      {event.size && (
                        <div>
                          <span className="font-medium">Size:</span> {formatSize(event.size)}
                        </div>
                      )}
                      {event.address && (
                        <div>
                          <span className="font-medium">Address:</span> {formatAddress(event.address)}
                        </div>
                      )}
                      {event.page_number !== undefined && (
                        <div>
                          <span className="font-medium">Page:</span> {event.page_number}
                        </div>
                      )}
                      {event.frame_number !== undefined && (
                        <div>
                          <span className="font-medium">Frame:</span> {event.frame_number}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {events.length > 20 && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              {showAllEvents ? 'Show Less' : `Show All ${events.length} Events`}
            </Button>
          </div>
        )}
        
        {events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No events recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MemoryTimeline