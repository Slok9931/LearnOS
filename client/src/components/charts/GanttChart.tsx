import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Box, Typography, Paper } from '@mui/material'
import { GanttChartEntry } from '@/types/scheduling'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GanttChartProps {
    data: GanttChartEntry[]
    title?: string
    height?: number
}

export default function GanttChart({ data, title = 'Gantt Chart', height = 400 }: GanttChartProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)

    useEffect(() => {
        if (!chartRef.current || !data.length) return

        // Initialize chart
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current)
        }

        // Prepare data for ECharts
        const processes = Array.from(new Set(data.map(d => d.process)))
            .filter(p => p !== 'IDLE' && p !== 'CONTEXT_SWITCH' && p !== 'PRIORITY_BOOST')

        const categories = [...processes, 'SYSTEM']

        const chartData = data.map((entry, index) => {
            const category = entry.process.startsWith('P')
                ? entry.process
                : 'SYSTEM'

            return {
                name: entry.process,
                value: [
                    categories.indexOf(category),
                    entry.start,
                    entry.end,
                    entry.end - entry.start
                ],
                itemStyle: {
                    color: getProcessColor(entry.process, index)
                }
            }
        })

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: title,
                textStyle: {
                    color: 'hsl(var(--foreground))',
                    fontSize: 18,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                formatter: (params: any) => {
                    const data = params.data
                    return `
            <strong>${data.name}</strong><br/>
            Start: ${data.value[1]}<br/>
            End: ${data.value[2]}<br/>
            Duration: ${data.value[3].toFixed(2)}
          `
                },
                backgroundColor: 'hsl(var(--popover))',
                borderColor: 'hsl(var(--border))',
                textStyle: {
                    color: 'hsl(var(--popover-foreground))'
                }
            },
            grid: {
                left: '10%',
                right: '5%',
                top: '15%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: 'Time',
                nameLocation: 'middle',
                nameGap: 30,
                axisLabel: {
                    color: 'hsl(var(--muted-foreground))'
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))',
                        type: 'dashed'
                    }
                }
            },
            yAxis: {
                type: 'category',
                data: categories,
                axisLabel: {
                    color: 'hsl(var(--muted-foreground))'
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))'
                    }
                },
                splitLine: {
                    show: false
                }
            },
            series: [{
                type: 'custom',
                renderItem: (params: any, api: any) => {
                    const categoryIndex = api.value(0)
                    const start = api.coord([api.value(1), categoryIndex])
                    const end = api.coord([api.value(2), categoryIndex])
                    const height = api.size([0, 1])[1] * 0.6

                    return {
                        type: 'rect',
                        shape: {
                            x: start[0],
                            y: start[1] - height / 2,
                            width: end[0] - start[0],
                            height: height
                        },
                        style: {
                            fill: api.visual('color'),
                            stroke: 'hsl(var(--border))',
                            lineWidth: 1
                        }
                    }
                },
                data: chartData
            }]
        }

        chartInstance.current.setOption(option, true)

        // Handle resize
        const handleResize = () => {
            chartInstance.current?.resize()
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [data, title])

    useEffect(() => {
        return () => {
            if (chartInstance.current) {
                chartInstance.current.dispose()
                chartInstance.current = null
            }
        }
    }, [])

    const getProcessColor = (process: string, index: number): string => {
        if (process === 'IDLE') return 'hsl(var(--muted))'
        if (process === 'CONTEXT_SWITCH') return 'hsl(var(--warning))'
        if (process === 'PRIORITY_BOOST') return 'hsl(var(--accent))'

        // Generate colors for processes
        const colors = [
            'hsl(var(--primary))',
            'hsl(var(--success))',
            'hsl(var(--accent))',
            'hsl(199, 89%, 68%)', // primary-glow
            'hsl(142, 76%, 56%)', // success lighter
            'hsl(173, 58%, 59%)', // accent lighter
            'hsl(199, 89%, 38%)', // primary darker
            'hsl(142, 76%, 26%)', // success darker
        ]

        const processNumber = parseInt(process.replace('P', '')) || 0
        return colors[processNumber % colors.length]
    }

    if (!data || data.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Gantt Chart</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        No scheduling data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    const maxTime = Math.max(...data.map(item => item.end))
    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gantt Chart</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Timeline */}
                    <div className="relative">
                        <div className="flex h-16 border rounded-lg overflow-hidden">
                            {data.map((item, index) => {
                                const width = ((item.end - item.start) / maxTime) * 100
                                const left = (item.start / maxTime) * 100
                                const processNumber = parseInt(item.process.replace('P', '')) || 0
                                const colorIndex = (processNumber - 1) % colors.length

                                return (
                                    <div
                                        key={index}
                                        className={`absolute h-full ${colors[colorIndex]} flex items-center justify-center text-white font-semibold border-r border-white`}
                                        style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                        }}
                                    >
                                        {item.process}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Time markers */}
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                            {Array.from({ length: Math.min(maxTime + 1, 11) }, (_, i) => {
                                const time = (i * maxTime) / Math.min(maxTime, 10)
                                return (
                                    <span key={i} className="text-center">
                                        {Math.round(time)}
                                    </span>
                                )
                            })}
                        </div>
                    </div>

                    {Array.from(new Set(data.map(item => item.process))).map(process => {
                        const processNumber = parseInt(process.replace('P', '')) || 0
                        const colorIndex = (processNumber - 1) % colors.length
                        return (
                            <div key={process} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded ${colors[colorIndex]}`}></div>
                                <span className="text-sm">{process}</span>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}