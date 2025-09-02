import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HardDrive,
  ChevronDown,
  ChevronRight,
  History,
  Zap
} from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryTimelineProps {
  results: MemoryResult
}

const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ results }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set())
  const [showAllEvents, setShowAllEvents] = useState(false)

  if (!results.visualization?.timeline) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Timeline Available</h3>
          <p className="text-muted-foreground">Timeline data is not available for this simulation</p>
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
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getEventBadgeStyle = (eventType: string) => {
    switch (eventType) {
      case 'allocate':
        return 'bg-green-500/20 text-green-700 border-green-500/30'
      case 'deallocate':
        return 'bg-red-500/20 text-red-700 border-red-500/30'
      case 'page_fault':
        return 'bg-orange-500/20 text-orange-700 border-orange-500/30'
      case 'compaction':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
      case 'allocation_failed':
        return 'bg-red-500/20 text-red-700 border-red-500/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getEventCardStyle = (eventType: string) => {
    switch (eventType) {
      case 'allocate':
        return 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
      case 'deallocate':
        return 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
      case 'page_fault':
        return 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10'
      case 'compaction':
        return 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
      case 'allocation_failed':
        return 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
      default:
        return 'border-border bg-muted/20 hover:bg-muted/30'
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
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Clock className="h-5 w-5 text-primary" />
          Memory Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Chronological view of memory allocation and management events
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Events Recorded</h3>
            <p className="text-muted-foreground">No memory management events occurred during this simulation</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-96 rounded-md border border-border/50">
              <div className="space-y-3 p-4">
                {displayEvents.map((event, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg transition-all cursor-pointer ${getEventCardStyle(event.event_type)}`}
                  >
                    <div
                      className="flex items-start gap-3 p-4"
                      onClick={() => toggleEventExpansion(index)}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event.event_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs border ${getEventBadgeStyle(event.event_type)}`}>
                              {event.event_type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">
                              {event.process_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              t={formatTime(event.time)}s
                            </span>
                            {expandedEvents.has(index) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-foreground mb-2">
                          {event.description}
                        </p>

                        {expandedEvents.has(index) && (
                          <>
                            <Separator className="my-3" />
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Process ID:</span>
                                  <span className="font-mono text-foreground">{event.process_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Time:</span>
                                  <span className="font-mono text-foreground">{formatTime(event.time)}s</span>
                                </div>
                                {event.size && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Size:</span>
                                    <span className="font-mono text-foreground">{formatSize(event.size)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                {event.address !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Address:</span>
                                    <span className="font-mono text-foreground">{formatAddress(event.address)}</span>
                                  </div>
                                )}
                                {event.page_number !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Page:</span>
                                    <span className="font-mono text-foreground">{event.page_number}</span>
                                  </div>
                                )}
                                {event.frame_number !== undefined && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Frame:</span>
                                    <span className="font-mono text-foreground">{event.frame_number}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {events.length > 20 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllEvents(!showAllEvents)}
                  className="border-border text-foreground hover:bg-muted"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {showAllEvents ? 'Show Less' : `Show All ${events.length} Events`}
                </Button>
              </div>
            )}

            {/* Summary Stats */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">{events.length}</div>
                  <div className="text-xs text-muted-foreground">Total Events</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {events.filter(e => e.event_type === 'allocate').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Allocations</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    {events.filter(e => e.event_type === 'allocation_failed').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default MemoryTimeline