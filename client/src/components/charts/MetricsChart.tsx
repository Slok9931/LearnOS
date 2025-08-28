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
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
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
        return maxValue > 0 ? Math.max((value / maxValue) * 100, 1) : 0 // Minimum height of 1%
    }

    return (
        <div className="space-y-6">
            {/* Summary Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle>{title} - Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {(metrics.average_waiting_time || 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-blue-800">Avg Waiting Time</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {(metrics.average_turnaround_time || 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-green-800">Avg Turnaround Time</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {(metrics.cpu_utilization || 0).toFixed(1)}%
                            </div>
                            <div className="text-sm text-purple-800">CPU Utilization</div>
                        </div>
                        {metrics.throughput !== undefined && (
                            <div className="text-center p-4 bg-orange-50 rounded-lg">
                                <div className="text-2xl font-bold text-orange-600">
                                    {metrics.throughput.toFixed(2)}
                                </div>
                                <div className="text-sm text-orange-800">Throughput</div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Process Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Chart */}
                        <div className="relative">
                            <div className="flex items-end justify-center gap-8 h-64 pb-8">
                                {chartData.map((data, index) => (
                                    <div key={data.process_id} className="flex flex-col items-center gap-2">
                                        <div className="flex items-end gap-1 h-48">
                                            {/* Waiting Time Bar */}
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className="w-6 bg-blue-500 rounded-t min-h-[2px]"
                                                    style={{ height: `${getBarHeight(data.waiting_time)}%` }}
                                                    title={`Waiting Time: ${data.waiting_time.toFixed(2)}`}
                                                ></div>
                                                <div className="text-xs text-blue-600 mt-1">
                                                    WT
                                                </div>
                                            </div>

                                            {/* Turnaround Time Bar */}
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className="w-6 bg-green-500 rounded-t min-h-[2px]"
                                                    style={{ height: `${getBarHeight(data.turnaround_time)}%` }}
                                                    title={`Turnaround Time: ${data.turnaround_time.toFixed(2)}`}
                                                ></div>
                                                <div className="text-xs text-green-600 mt-1">
                                                    TT
                                                </div>
                                            </div>

                                            {/* Burst Time Bar */}
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className="w-6 bg-purple-500 rounded-t min-h-[2px]"
                                                    style={{ height: `${getBarHeight(data.burst_time)}%` }}
                                                    title={`Burst Time: ${data.burst_time.toFixed(2)}`}
                                                ></div>
                                                <div className="text-xs text-purple-600 mt-1">
                                                    BT
                                                </div>
                                            </div>
                                        </div>

                                        {/* Process Label */}
                                        <Badge variant="outline">P{data.process_id}</Badge>
                                    </div>
                                ))}
                            </div>

                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-muted-foreground">
                                <span>{maxValue.toFixed(1)}</span>
                                <span>{(maxValue * 0.75).toFixed(1)}</span>
                                <span>{(maxValue * 0.5).toFixed(1)}</span>
                                <span>{(maxValue * 0.25).toFixed(1)}</span>
                                <span>0</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex justify-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                <span className="text-sm">Waiting Time (WT)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-500 rounded"></div>
                                <span className="text-sm">Turnaround Time (TT)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                                <span className="text-sm">Burst Time (BT)</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Process Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detailed Process Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Process</th>
                                    <th className="text-right p-2">Arrival Time</th>
                                    <th className="text-right p-2">Burst Time</th>
                                    <th className="text-right p-2">Waiting Time</th>
                                    <th className="text-right p-2">Turnaround Time</th>
                                    <th className="text-right p-2">Completion Time</th>
                                    {processes.some(p => p.priority !== undefined) && (
                                        <th className="text-right p-2">Priority</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {processes.map((process, index) => (
                                    <tr key={process.pid} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                                        <td className="p-2">
                                            <Badge variant="outline">P{process.pid}</Badge>
                                        </td>
                                        <td className="text-right p-2">{(process.arrival_time || 0).toFixed(1)}</td>
                                        <td className="text-right p-2">{(process.burst_time || 0).toFixed(1)}</td>
                                        <td className="text-right p-2 text-blue-600 font-medium">
                                            {(process.waiting_time || 0).toFixed(2)}
                                        </td>
                                        <td className="text-right p-2 text-green-600 font-medium">
                                            {(process.turnaround_time || 0).toFixed(2)}
                                        </td>
                                        <td className="text-right p-2">{(process.completion_time || 0).toFixed(1)}</td>
                                        {processes.some(p => p.priority !== undefined) && (
                                            <td className="text-right p-2">
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