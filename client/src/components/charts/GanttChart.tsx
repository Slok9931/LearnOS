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
    const uniqueProcesses = [...new Set(chartData.map(d => d.process_id))].sort((a, b) => a - b)

    // Colors for different processes
    const processColors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
        'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
    ]

    const getProcessColor = (processId: number): string => {
        const index = uniqueProcesses.indexOf(processId)
        return processColors[index % processColors.length]
    }

    const getTypeColor = (type: string): string => {
        switch (type?.toLowerCase()) {
            case 'context_switch':
                return 'bg-gray-400'
            case 'idle':
                return 'bg-gray-200'
            case 'execution':
            default:
                return ''
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    {title}
                    <div className="text-sm text-muted-foreground">
                        Total Time: {totalTime.toFixed(1)} units
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Time scale */}
                    <div className="relative">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                            <span>Time: 0</span>
                            <span>{maxTime.toFixed(1)}</span>
                        </div>
                        <div className="relative h-8 bg-gray-100 rounded">
                            {/* Time markers */}
                            {Array.from({ length: Math.ceil(maxTime) + 1 }, (_, i) => (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 w-px bg-gray-300"
                                    style={{ left: `${(i / maxTime) * 100}%` }}
                                >
                                    <div className="absolute -top-4 -left-2 text-xs text-muted-foreground">
                                        {i}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gantt bars */}
                    <div className="space-y-3">
                        {chartData.map((entry, index) => {
                            const leftPosition = (entry.start_time / maxTime) * 100
                            const width = (entry.duration / maxTime) * 100
                            const baseColor = getProcessColor(entry.process_id)
                            const typeColor = getTypeColor(entry.type || '')
                            const colorClass = typeColor || baseColor

                            return (
                                <div key={index} className="relative">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="min-w-[80px] justify-center">
                                            P{entry.process_id}
                                        </Badge>
                                        <div className="flex-1 relative h-8 bg-gray-100 rounded">
                                            <div
                                                className={`absolute top-0 bottom-0 ${colorClass} rounded flex items-center justify-center text-white text-xs font-medium shadow-sm`}
                                                style={{
                                                    left: `${leftPosition}%`,
                                                    width: `${Math.max(width, 2)}%` // Minimum width for visibility
                                                }}
                                                title={`Process ${entry.process_id}: ${entry.start_time} - ${entry.end_time} (${entry.duration.toFixed(1)})`}
                                            >
                                                {entry.duration >= 1 && (
                                                    <span>
                                                        {entry.type === 'context_switch' ? 'CS' : entry.duration.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground min-w-[100px]">
                                            {entry.start_time.toFixed(1)} - {entry.end_time.toFixed(1)}
                                            {entry.queue_level !== undefined && (
                                                <div className="text-xs">Queue {entry.queue_level}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Legend:</div>
                        <div className="flex flex-wrap gap-3">
                            {uniqueProcesses.map(processId => (
                                <div key={processId} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 ${getProcessColor(processId)} rounded`}></div>
                                    <span className="text-sm">Process {processId}</span>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                                <span className="text-sm">Context Switch</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                                <span className="text-sm">Idle</span>
                            </div>
                        </div>
                    </div>

                    {/* Summary statistics */}
                    <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="font-medium">Processes</div>
                                <div className="text-muted-foreground">{uniqueProcesses.length}</div>
                            </div>
                            <div>
                                <div className="font-medium">Time Slices</div>
                                <div className="text-muted-foreground">{chartData.length}</div>
                            </div>
                            <div>
                                <div className="font-medium">Start Time</div>
                                <div className="text-muted-foreground">{minTime.toFixed(1)}</div>
                            </div>
                            <div>
                                <div className="font-medium">End Time</div>
                                <div className="text-muted-foreground">{maxTime.toFixed(1)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default GanttChart