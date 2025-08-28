import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScheduleEntry, GanttChartData } from '@/types/scheduling'

interface GanttChartProps {
    data: ScheduleEntry[]
    title?: string
}

export const GanttChart: React.FC<GanttChartProps> = ({ data, title = "Gantt Chart" }) => {
    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        No scheduling data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Transform data for chart rendering
    const chartData: GanttChartData[] = data.map(entry => ({
        process_id: entry.process_id,
        start_time: entry.start_time,
        end_time: entry.end_time,
        duration: entry.end_time - entry.start_time,
        type: entry.type || 'execution',
        queue_level: entry.queue_level
    }))

    // Calculate chart dimensions
    const maxTime = Math.max(...chartData.map(d => d.end_time))
    const minTime = Math.min(...chartData.map(d => d.start_time))
    const totalTime = maxTime - minTime

    // Group data by queue level (for queue-wise display)
    const queueMap = new Map<number | string | null, GanttChartData[]>()
    
    chartData.forEach(entry => {
        // Use queue_level as is (including null/undefined), or 'main' as fallback
        const queueKey = entry.queue_level !== undefined ? entry.queue_level : 'main'
        
        if (!queueMap.has(queueKey)) {
            queueMap.set(queueKey, [])
        }
        queueMap.get(queueKey)!.push(entry)
    })

    // Sort queues with null/main always first, then numbered queues in ascending order
    const sortedQueues = Array.from(queueMap.keys()).sort((a, b) => {
        // null or 'main' queue always comes first
        if (a === null || a === 'main') return -1
        if (b === null || b === 'main') return 1
        
        // Both are numbers, sort in ascending order
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b
        }
        
        // Convert to numbers for comparison if they're strings
        const numA = typeof a === 'string' ? parseInt(a) : a
        const numB = typeof b === 'string' ? parseInt(b) : b
        
        if (!isNaN(numA as number) && !isNaN(numB as number)) {
            return (numA as number) - (numB as number)
        }
        
        // Fallback to string comparison
        return String(a).localeCompare(String(b))
    })

    // Get unique processes for color mapping
    const uniqueProcesses = [...new Set(chartData.map(d => d.process_id))].sort((a, b) => a - b)

    // Calculate dynamic width based on time scale to prevent overlapping
    const minPixelsPerUnit = 40
    const chartWidth = Math.max(600, Math.ceil(maxTime) * minPixelsPerUnit)
    
    // Calculate time step for markers to prevent overcrowding
    const getTimeStep = (maxTime: number): number => {
        if (maxTime <= 10) return 1
        if (maxTime <= 20) return 2
        if (maxTime <= 50) return 5
        if (maxTime <= 100) return 10
        return Math.ceil(maxTime / 10)
    }
    
    const timeStep = getTimeStep(maxTime)
    const timeMarkers = Array.from({ length: Math.floor(maxTime / timeStep) + 1 }, (_, i) => i * timeStep)

    // Colors for different processes (dark theme compatible)
    const processColors = [
        'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600',
        'bg-pink-600', 'bg-indigo-600', 'bg-red-600', 'bg-teal-600',
        'bg-orange-600', 'bg-cyan-600', 'bg-violet-600', 'bg-lime-600'
    ]

    const getProcessColor = (processId: number): string => {
        const index = uniqueProcesses.indexOf(processId)
        return processColors[index % processColors.length]
    }

    const getTypeColor = (type: string): string => {
        switch (type?.toLowerCase()) {
            case 'context_switch':
                return 'bg-slate-500'
            case 'idle':
                return 'bg-slate-300 dark:bg-slate-600'
            case 'execution':
            default:
                return ''
        }
    }

    const getQueueLabel = (queueKey: number | string | null): string => {
        if (queueKey === null || queueKey === 'main') return 'CPU Queue'
        return `Queue ${queueKey}`
    }

    const getQueueDescription = (queueKey: number | string | null): string => {
        if (queueKey === null || queueKey === 'main') return 'Main execution queue'
        if (queueKey === 0) return 'Priority level 0 (Highest priority)'
        if (queueKey === 1) return 'Priority level 1 (Medium priority)'
        if (queueKey === 2) return 'Priority level 2 (Lowest priority)'
        return `Priority level ${queueKey}`
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-foreground">
                    {title}
                    <div className="text-sm text-muted-foreground">
                        Total Time: {totalTime.toFixed(1)} units
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Scrollable container for the chart */}
                    <div className="overflow-x-auto overflow-y-hidden">
                        <div style={{ minWidth: `${chartWidth}px` }} className="space-y-6">
                            {/* Time scale */}
                            <div className="relative">
                                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                    <span>Time: 0</span>
                                    <span>{maxTime.toFixed(1)}</span>
                                </div>
                                <div className="relative h-8 bg-muted/30 rounded border border-border">
                                    {/* Time markers with proper spacing */}
                                    {timeMarkers.map((time) => (
                                        <div
                                            key={time}
                                            className="absolute top-0 bottom-0 w-px bg-border"
                                            style={{ left: `${(time / maxTime) * 100}%` }}
                                        >
                                            <div className="absolute -top-5 -left-4 text-xs text-muted-foreground min-w-8 text-center">
                                                {time}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Add final time marker if needed */}
                                    {!timeMarkers.includes(maxTime) && (
                                        <div
                                            className="absolute top-0 bottom-0 w-px bg-border"
                                            style={{ left: '100%' }}
                                        >
                                            <div className="absolute -top-5 -left-4 text-xs text-muted-foreground min-w-8 text-center">
                                                {Math.ceil(maxTime)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Queue-wise Gantt bars */}
                            <div className="space-y-6">
                                {sortedQueues.map((queueKey) => {
                                    const queueData = queueMap.get(queueKey)!
                                    
                                    return (
                                        <div key={String(queueKey)} className="space-y-3">
                                            {/* Queue Header */}
                                            <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                                                <Badge 
                                                    variant={queueKey === null || queueKey === 'main' ? 'default' : 'secondary'} 
                                                    className="min-w-[100px] justify-center"
                                                >
                                                    {getQueueLabel(queueKey)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {getQueueDescription(queueKey)}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                    {queueData.length} time slice{queueData.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Queue Timeline */}
                                            <div className="relative">
                                                <div className="relative h-12 bg-muted/20 rounded border border-border/30">
                                                    {queueData.map((entry, index) => {
                                                        const leftPosition = (entry.start_time / maxTime) * 100
                                                        const width = (entry.duration / maxTime) * 100
                                                        const baseColor = getProcessColor(entry.process_id)
                                                        const typeColor = getTypeColor(entry.type || '')
                                                        const colorClass = typeColor || baseColor

                                                        return (
                                                            <div
                                                                key={`${String(queueKey)}-${index}`}
                                                                className={`absolute top-1 bottom-1 ${colorClass} rounded flex items-center justify-center text-white text-xs font-medium shadow-sm transition-all hover:opacity-90 cursor-pointer border border-white/20`}
                                                                style={{
                                                                    left: `${leftPosition}%`,
                                                                    width: `${Math.max(width, 0.5)}%`, // Minimum width for visibility
                                                                    zIndex: queueData.length - index // Later processes on top
                                                                }}
                                                                title={`Process ${entry.process_id}: ${entry.start_time.toFixed(1)} - ${entry.end_time.toFixed(1)} (Duration: ${entry.duration.toFixed(1)}) - ${getQueueLabel(queueKey)}`}
                                                            >
                                                                {width > 3 && ( // Only show text if bar is wide enough
                                                                    <span className="truncate px-1 text-xs font-bold">
                                                                        P{entry.process_id}
                                                                        {entry.type === 'context_switch' && ' (CS)'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Queue process details */}
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {queueData.map((entry, index) => (
                                                        <div
                                                            key={`${String(queueKey)}-detail-${index}`}
                                                            className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/30"
                                                        >
                                                            P{entry.process_id}: {entry.start_time.toFixed(1)}-{entry.end_time.toFixed(1)}
                                                            {entry.type === 'context_switch' && ' (CS)'}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Scroll hint */}
                    {chartWidth > 600 && (
                        <div className="text-xs text-muted-foreground text-center py-2 border border-border/50 rounded bg-muted/20">
                            💡 Scroll horizontally to view the complete timeline
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t border-border">
                        <div className="text-sm font-medium mb-3 text-foreground">Process Legend:</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {uniqueProcesses.map(processId => (
                                <div key={processId} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 ${getProcessColor(processId)} rounded shadow-sm`}></div>
                                    <span className="text-sm text-foreground">Process {processId}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-500 rounded shadow-sm"></div>
                                <span className="text-sm text-foreground">Context Switch</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded border border-border shadow-sm"></div>
                                <span className="text-sm text-foreground">Idle</span>
                            </div>
                        </div>
                    </div>

                    {/* Overall Summary */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-muted/30 p-3 rounded border border-border">
                                <div className="font-medium text-foreground">Total Processes</div>
                                <div className="text-muted-foreground text-lg font-mono">{uniqueProcesses.length}</div>
                            </div>
                            <div className="bg-muted/30 p-3 rounded border border-border">
                                <div className="font-medium text-foreground">Total Queues</div>
                                <div className="text-muted-foreground text-lg font-mono">{sortedQueues.length}</div>
                            </div>
                            <div className="bg-muted/30 p-3 rounded border border-border">
                                <div className="font-medium text-foreground">Start Time</div>
                                <div className="text-muted-foreground text-lg font-mono">{minTime.toFixed(1)}</div>
                            </div>
                            <div className="bg-muted/30 p-3 rounded border border-border">
                                <div className="font-medium text-foreground">End Time</div>
                                <div className="text-muted-foreground text-lg font-mono">{maxTime.toFixed(1)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default GanttChart