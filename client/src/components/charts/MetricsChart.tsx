import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Box, Typography, Paper, Grid } from '@mui/material'
import { ProcessResult, CPUScheduleResponse } from '@/types/scheduling'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface Metrics {
    average_waiting_time: number
    average_turnaround_time: number
    cpu_utilization: number
    throughput?: number
}

interface MetricsChartProps {
    results: CPUScheduleResponse[]
    height?: number
}

export default function MetricsChart({ results, height = 400 }: MetricsChartProps) {
    const chartRef = useRef<HTMLDivElement>(null)
    const chartInstance = useRef<echarts.ECharts | null>(null)

    useEffect(() => {
        if (!chartRef.current || !results.length) return

        // Initialize chart
        if (!chartInstance.current) {
            chartInstance.current = echarts.init(chartRef.current)
        }

        const algorithms = results.map(r => r.algorithm)

        const option = {
            backgroundColor: 'transparent',
            title: {
                text: 'Algorithm Comparison',
                textStyle: {
                    color: 'hsl(var(--foreground))',
                    fontSize: 18,
                    fontWeight: 'bold'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                backgroundColor: 'hsl(var(--popover))',
                borderColor: 'hsl(var(--border))',
                textStyle: {
                    color: 'hsl(var(--popover-foreground))'
                }
            },
            legend: {
                data: ['Average Waiting Time', 'Average Turnaround Time', 'CPU Utilization'],
                textStyle: {
                    color: 'hsl(var(--foreground))'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: algorithms,
                axisLabel: {
                    color: 'hsl(var(--muted-foreground))',
                    rotate: algorithms.length > 3 ? 45 : 0
                },
                axisLine: {
                    lineStyle: {
                        color: 'hsl(var(--border))'
                    }
                }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Time',
                    position: 'left',
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
                {
                    type: 'value',
                    name: 'Utilization (%)',
                    position: 'right',
                    max: 100,
                    axisLabel: {
                        color: 'hsl(var(--muted-foreground))',
                        formatter: '{value}%'
                    },
                    axisLine: {
                        lineStyle: {
                            color: 'hsl(var(--border))'
                        }
                    },
                    splitLine: {
                        show: false
                    }
                }
            ],
            series: [
                {
                    name: 'Average Waiting Time',
                    type: 'bar',
                    data: results.map(r => r.avg_waiting_time),
                    itemStyle: {
                        color: 'hsl(var(--primary))'
                    }
                },
                {
                    name: 'Average Turnaround Time',
                    type: 'bar',
                    data: results.map(r => r.avg_turnaround_time),
                    itemStyle: {
                        color: 'hsl(var(--accent))'
                    }
                },
                {
                    name: 'CPU Utilization',
                    type: 'line',
                    yAxisIndex: 1,
                    data: results.map(r => r.cpu_utilization),
                    itemStyle: {
                        color: 'hsl(var(--success))'
                    },
                    lineStyle: {
                        width: 3
                    },
                    symbol: 'circle',
                    symbolSize: 8
                }
            ]
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
    }, [results])

    useEffect(() => {
        return () => {
            if (chartInstance.current) {
                chartInstance.current.dispose()
                chartInstance.current = null
            }
        }
    }, [])

    if (!results.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-8">
                        No metrics data available
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                bgcolor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
            }}
        >
            <div ref={chartRef} style={{ width: '100%', height: `${height}px` }} />
        </Paper>
    )
}