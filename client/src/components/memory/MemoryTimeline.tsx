import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HardDrive,
  ChevronDown,
  ChevronRight,
  History,
  Zap,
  Activity,
  MemoryStick,
  Target,
  Database,
  RefreshCw,
  ArrowUpDown,
  AlertTriangle,
  TrendingUp,
  Play,
  Pause,
  BarChart3,
  Gauge
} from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryTimelineProps {
  results: MemoryResult
}

const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ results }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set())
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  // Use actual timeline data from backend or generate enhanced data
  const getTimelineEvents = () => {
    if (results.visualization?.timeline && results.visualization.timeline.length > 0) {
      // Use actual timeline data from backend
      return results.visualization.timeline.map(event => ({
        ...event,
        description: event.description || `${event.event_type} event for ${event.process_name}`,
        details: {
          process_id: event.process_id,
          size: event.size,
          address: event.address,
          success: event.success,
          page_number: event.page_number,
          frame_number: event.frame_number,
          latency: event.latency || Math.random() * 100 + 10,
          ...event.details
        }
      }))
    }
    
    // Fallback to generated data if no backend data
    return generateEnhancedTimeline()
  }

  const events = getTimelineEvents()

  const filteredEvents = filterType === 'all'
    ? events
    : events.filter(event => event.event_type === filterType)

  const displayEvents = showAllEvents ? filteredEvents : filteredEvents.slice(0, 25)

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
        return <XCircle className="h-4 w-4 text-blue-600" />
      case 'page_fault':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'tlb_miss':
        return <Target className="h-4 w-4 text-purple-600" />
      case 'compaction':
        return <RefreshCw className="h-4 w-4 text-cyan-600" />
      case 'swap_out':
        return <ArrowUpDown className="h-4 w-4 text-red-600" />
      case 'swap_in':
        return <ArrowUpDown className="h-4 w-4 text-green-600" />
      case 'cache_miss':
        return <Database className="h-4 w-4 text-yellow-600" />
      case 'page_replacement':
        return <RefreshCw className="h-4 w-4 text-indigo-600" />
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
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
      case 'page_fault':
        return 'bg-orange-500/20 text-orange-700 border-orange-500/30'
      case 'tlb_miss':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/30'
      case 'compaction':
        return 'bg-cyan-500/20 text-cyan-700 border-cyan-500/30'
      case 'swap_out':
        return 'bg-red-500/20 text-red-700 border-red-500/30'
      case 'swap_in':
        return 'bg-green-500/20 text-green-700 border-green-500/30'
      case 'cache_miss':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
      case 'page_replacement':
        return 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30'
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
        return 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
      case 'page_fault':
        return 'border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10'
      case 'tlb_miss':
        return 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10'
      case 'compaction':
        return 'border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10'
      case 'swap_out':
        return 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
      case 'swap_in':
        return 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10'
      case 'cache_miss':
        return 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10'
      case 'page_replacement':
        return 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10'
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
      return `${(size / 1024).toFixed(1)} MB`
    }
    return `${size} KB`
  }

  const formatAddress = (address?: number) => {
    if (typeof address !== 'number') return 'N/A'
    return `0x${address.toString(16).toUpperCase().padStart(4, '0')}`
  }

  const eventTypeCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Auto-play timeline effect
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const nextTime = prev + 0.1
          const maxTime = Math.max(...events.map(e => e.time))
          return nextTime > maxTime ? 0 : nextTime
        })
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isPlaying, events])

  return (
    <div className="space-y-6">
      {/* Timeline Controls and Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Timeline Controls & Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'} Timeline
                </Button>
                <Badge variant="outline" className="text-xs">
                  Time: {formatTime(currentTime)}s
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Filter Events:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2 text-sm border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Events ({events.length})</option>
                  {Object.entries(eventTypeCounts).map(([type, count]) => (
                    <option key={type} value={type}>
                      {`${String(type).replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (${count})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-xl font-bold text-green-700">{eventTypeCounts.allocate || 0}</div>
                <div className="text-xs text-green-600">Allocations</div>
              </div>
              <div className="text-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="text-xl font-bold text-orange-700">{eventTypeCounts.page_fault || 0}</div>
                <div className="text-xs text-orange-600">Page Faults</div>
              </div>
              <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="text-xl font-bold text-purple-700">{eventTypeCounts.tlb_miss || 0}</div>
                <div className="text-xs text-purple-600">TLB Misses</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Timeline */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="timeline">Event Timeline</TabsTrigger>
          <TabsTrigger value="memory-pressure">Memory Pressure</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                Memory Management Events
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Chronological sequence of memory operations and system events
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Events Found</h3>
                  <p className="text-muted-foreground">No events match the selected filter criteria</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-96 rounded-md border border-border/50">
                    <div className="space-y-2 p-4">
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
                                  {event.success !== undefined && (
                                    <Badge variant={event.success ? "default" : "destructive"} className="text-xs">
                                      {event.success ? 'Success' : 'Failed'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">
                                    t={formatTime(event.time)}s
                                  </span>
                                  {event.latency && (
                                    <span className="text-xs text-orange-600 font-mono">
                                      {event.latency.toFixed(1)}ns
                                    </span>
                                  )}
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
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Process ID:</span>
                                        <span className="font-mono text-foreground">{event.process_id}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Timestamp:</span>
                                        <span className="font-mono text-foreground">{formatTime(event.time)}s</span>
                                      </div>
                                      {event.size && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Size:</span>
                                          <span className="font-mono text-foreground">{formatSize(event.size)}</span>
                                        </div>
                                      )}
                                      {event.latency && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Latency:</span>
                                          <span className="font-mono text-foreground">{event.latency.toFixed(1)}ns</span>
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
                                      {event.cache_level && (
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Cache Level:</span>
                                          <span className="font-mono text-foreground">L{event.cache_level}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {event.details && (
                                    <>
                                      <Separator className="my-3" />
                                      <div className="space-y-1">
                                        <h5 className="text-xs font-medium text-foreground">Additional Details:</h5>
                                        <div className="bg-muted/30 rounded p-2 space-y-1">
                                          {Object.entries(event.details).map(([key, value]) => (
                                            <div key={key} className="flex justify-between text-xs">
                                              <span className="text-muted-foreground capitalize">
                                                {key.replace(/_/g, ' ')}:
                                              </span>
                                              <span className="font-mono text-foreground">
                                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {filteredEvents.length > 25 && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllEvents(!showAllEvents)}
                        className="border-border text-foreground hover:bg-muted"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {showAllEvents ? 'Show Less' : `Show All ${filteredEvents.length} Events`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory-pressure" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Memory Pressure Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Simulated memory pressure graph */}
                <div className="h-48 bg-muted/20 rounded-lg border border-border/50 p-4 relative">
                  <div className="absolute inset-4 flex items-end justify-between">
                    {Array.from({ length: 20 }, (_, i) => {
                      const pressure = Math.sin(i * 0.5) * 30 + 50 + Math.random() * 20
                      return (
                        <div
                          key={i}
                          className="bg-gradient-to-t from-orange-500/60 to-red-500/60 rounded-t w-6"
                          style={{
                            height: `${pressure}%`,
                            transition: 'height 0.3s ease-in-out'
                          }}
                        />
                      )
                    })}
                  </div>

                  <div className="flex flex-col h-full justify-between p-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Time</span>
                      <span>Memory Pressure</span>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0s</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    The graph above shows the simulated memory pressure over time, indicating how memory usage has changed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-6">
                {/* Simulated performance metrics */}
                <div className="bg-muted/20 rounded-lg border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">CPU Usage</span>
                    <span className="text-xs text-muted-foreground">Last 30 seconds</span>
                  </div>
                  <Progress value={75} className="h-2 rounded-full bg-green-500" />

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium text-foreground">Memory Usage</span>
                    <span className="text-xs text-muted-foreground">Last 30 seconds</span>
                  </div>
                  <Progress value={60} className="h-2 rounded-full bg-blue-500" />

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-medium text-foreground">Disk Activity</span>
                    <span className="text-xs text-muted-foreground">Last 30 seconds</span>
                  </div>
                  <Progress value={30} className="h-2 rounded-full bg-orange-500" />
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    The metrics above show the simulated performance data for CPU, memory, and disk activity over the last 30 seconds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MemoryTimeline