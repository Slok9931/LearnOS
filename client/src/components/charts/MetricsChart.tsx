import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProcessResult, SchedulingMetrics, MetricsChartData } from '@/types/scheduling'

interface MetricsChartProps {
    processes: ProcessResult[]
    metrics: SchedulingMetrics | undefined
    title?: string
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
    processes,
    metrics,
    title = "Performance Metrics"
}) => {
    if (!processes || processes.length === 0 || !metrics) {
        return (
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        {!metrics ? 'No metrics data available' : 'No process data available'}
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Transform data for chart rendering
    const chartData: MetricsChartData[] = processes.map(process => ({
        process_id: process.pid,
        waiting_time: process.waiting_time || 0,
        turnaround_time: process.turnaround_time || 0,
        burst_time: process.burst_time || 0
    }))

    // Calculate max values for scaling
    const maxWaitingTime = Math.max(...chartData.map(d => d.waiting_time), 0)
    const maxTurnaroundTime = Math.max(...chartData.map(d => d.turnaround_time), 0)
    const maxBurstTime = Math.max(...chartData.map(d => d.burst_time), 0)
    const maxValue = Math.max(maxWaitingTime, maxTurnaroundTime, maxBurstTime, 1) // Ensure minimum of 1

    const getBarHeight = (value: number): number => {
        return maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0 // Minimum height of 2%
    }

    // Generate Y-axis scale values
    const yAxisValues = [
        maxValue,
        maxValue * 0.75,
        maxValue * 0.5,
        maxValue * 0.25,
        0
    ]

    return (
        <div className="space-y-6">
            {/* Summary Metrics */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">{title} - Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <div className="text-2xl font-bold text-blue-400">
                                {(metrics.average_waiting_time || 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-blue-300">Avg Waiting Time</div>
                        </div>
                        <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <div className="text-2xl font-bold text-emerald-400">
                                {(metrics.average_turnaround_time || 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-emerald-300">Avg Turnaround Time</div>
                        </div>
                        <div className="text-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                            <div className="text-2xl font-bold text-purple-400">
                                {(metrics.cpu_utilization || 0).toFixed(1)}%
                            </div>
                            <div className="text-sm text-purple-300">CPU Utilization</div>
                        </div>
                        {metrics.throughput !== undefined && (
                            <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="text-2xl font-bold text-amber-400">
                                    {metrics.throughput.toFixed(2)}
                                </div>
                                <div className="text-sm text-amber-300">Throughput</div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">Process Comparison Chart</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Chart Container */}
                        <div className="relative overflow-x-auto">
                            <div 
                                className="flex items-end justify-center gap-4 sm:gap-6 md:gap-8 h-80 pb-12 px-4"
                                style={{ minWidth: `${chartData.length * 120}px` }}
                            >
                                {/* Y-axis grid lines and labels */}
                                <div className="absolute left-0 top-0 bottom-12 w-full">
                                    {yAxisValues.map((value, index) => (
                                        <div
                                            key={index}
                                            className="absolute w-full border-t border-border/30"
                                            style={{ 
                                                bottom: `${12 + (index / (yAxisValues.length - 1)) * (320 - 48)}px` 
                                            }}
                                        >
                                            <span className="absolute -left-12 -top-2 text-xs text-muted-foreground">
                                                {value.toFixed(1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Process bars */}
                                {chartData.map((data, index) => (
                                    <div key={data.process_id} className="flex flex-col items-center gap-3 relative z-10">
                                        <div className="flex items-end gap-1 h-64">
                                            {/* Waiting Time Bar */}
                                            <div className="flex flex-col items-center group">
                                                <div className="relative">
                                                    <div
                                                        className="w-5 sm:w-6 bg-blue-500 hover:bg-blue-400 rounded-t transition-colors duration-200 cursor-pointer"
                                                        style={{ 
                                                            height: `${Math.max(getBarHeight(data.waiting_time), 8)}px`,
                                                            minHeight: '4px'
                                                        }}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background border border-border rounded text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                                                        WT: {data.waiting_time.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-blue-400 mt-1 font-medium">
                                                    WT
                                                </div>
                                            </div>

                                            {/* Turnaround Time Bar */}
                                            <div className="flex flex-col items-center group">
                                                <div className="relative">
                                                    <div
                                                        className="w-5 sm:w-6 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-colors duration-200 cursor-pointer"
                                                        style={{ 
                                                            height: `${Math.max(getBarHeight(data.turnaround_time), 8)}px`,
                                                            minHeight: '4px'
                                                        }}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background border border-border rounded text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                                                        TT: {data.turnaround_time.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-emerald-400 mt-1 font-medium">
                                                    TT
                                                </div>
                                            </div>

                                            {/* Burst Time Bar */}
                                            <div className="flex flex-col items-center group">
                                                <div className="relative">
                                                    <div
                                                        className="w-5 sm:w-6 bg-purple-500 hover:bg-purple-400 rounded-t transition-colors duration-200 cursor-pointer"
                                                        style={{ 
                                                            height: `${Math.max(getBarHeight(data.burst_time), 8)}px`,
                                                            minHeight: '4px'
                                                        }}
                                                    />
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background border border-border rounded text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
                                                        BT: {data.burst_time.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-purple-400 mt-1 font-medium">
                                                    BT
                                                </div>
                                            </div>
                                        </div>

                                        {/* Process Label */}
                                        <Badge variant="outline" className="border-border text-foreground bg-muted/50">
                                            P{data.process_id}
                                        </Badge>

                                        {/* Values display */}
                                        <div className="text-xs text-muted-foreground text-center space-y-1">
                                            <div>WT: {data.waiting_time.toFixed(1)}</div>
                                            <div>TT: {data.turnaround_time.toFixed(1)}</div>
                                            <div>BT: {data.burst_time.toFixed(1)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scroll hint for mobile */}
                        {chartData.length > 4 && (
                            <div className="text-xs text-muted-foreground text-center py-2 border border-border/50 rounded bg-muted/20 sm:hidden">
                                💡 Scroll horizontally to view all processes
                            </div>
                        )}

                        {/* Legend */}
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 pt-4 border-t border-border">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500 rounded shadow-sm"></div>
                                <span className="text-sm text-foreground">Waiting Time (WT)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-emerald-500 rounded shadow-sm"></div>
                                <span className="text-sm text-foreground">Turnaround Time (TT)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-purple-500 rounded shadow-sm"></div>
                                <span className="text-sm text-foreground">Burst Time (BT)</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Process Table */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground">Detailed Process Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 text-foreground font-medium">Process</th>
                                    <th className="text-right p-3 text-foreground font-medium">Arrival Time</th>
                                    <th className="text-right p-3 text-foreground font-medium">Burst Time</th>
                                    <th className="text-right p-3 text-foreground font-medium">Waiting Time</th>
                                    <th className="text-right p-3 text-foreground font-medium">Turnaround Time</th>
                                    <th className="text-right p-3 text-foreground font-medium">Completion Time</th>
                                    {processes.some(p => p.priority !== undefined) && (
                                        <th className="text-right p-3 text-foreground font-medium">Priority</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {processes.map((process, index) => (
                                    <tr 
                                        key={process.pid} 
                                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                            index % 2 === 0 ? 'bg-muted/10' : ''
                                        }`}
                                    >
                                        <td className="p-3">
                                            <Badge variant="outline" className="border-border text-foreground">
                                                P{process.pid}
                                            </Badge>
                                        </td>
                                        <td className="text-right p-3 text-muted-foreground font-mono">
                                            {(process.arrival_time || 0).toFixed(1)}
                                        </td>
                                        <td className="text-right p-3 text-muted-foreground font-mono">
                                            {(process.burst_time || 0).toFixed(1)}
                                        </td>
                                        <td className="text-right p-3 text-blue-400 font-medium font-mono">
                                            {(process.waiting_time || 0).toFixed(2)}
                                        </td>
                                        <td className="text-right p-3 text-emerald-400 font-medium font-mono">
                                            {(process.turnaround_time || 0).toFixed(2)}
                                        </td>
                                        <td className="text-right p-3 text-muted-foreground font-mono">
                                            {(process.completion_time || 0).toFixed(1)}
                                        </td>
                                        {processes.some(p => p.priority !== undefined) && (
                                            <td className="text-right p-3 text-muted-foreground font-mono">
                                                {process.priority !== undefined ? process.priority : '-'}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default MetricsChart