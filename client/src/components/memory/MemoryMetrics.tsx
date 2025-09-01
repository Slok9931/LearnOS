import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
    MemoryStick,
    PieChart,
    Clock,
    Activity,
    HardDrive,
    Zap
} from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryMetricsProps {
    results: MemoryResult
}

const MemoryMetrics: React.FC<MemoryMetricsProps> = ({ results }) => {
    if (!results.metrics) {
        return (
            <Card className="border-green-200/50">
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No metrics data available</p>
                </CardContent>
            </Card>
        )
    }

    const metrics = results.metrics

    const formatBytes = (bytes: number) => {
        if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`
        }
        return `${bytes} B`
    }

    const formatPercentage = (value: number) => `${value.toFixed(1)}%`

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Memory Utilization */}
            <Card className="border-green-200/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <MemoryStick className="h-5 w-5" />
                        Memory Utilization
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span>Total Memory</span>
                            <span className="font-mono">{formatBytes(metrics.total_memory)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Allocated</span>
                            <span className="font-mono text-green-600">{formatBytes(metrics.allocated_memory)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Free</span>
                            <span className="font-mono text-gray-600">{formatBytes(metrics.free_memory)}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Utilization</span>
                            <span className="font-medium text-green-700">{formatPercentage(metrics.memory_utilization)}</span>
                        </div>
                        <Progress
                            value={metrics.memory_utilization}
                            className="h-2 bg-green-100"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Fragmentation */}
            <Card className="border-green-200/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <PieChart className="h-5 w-5" />
                        Fragmentation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">External</span>
                            <Badge variant="outline" className="border-orange-200 text-orange-700">
                                {formatPercentage(metrics.external_fragmentation)}
                            </Badge>
                        </div>
                        <Progress
                            value={metrics.external_fragmentation}
                            className="h-2 bg-orange-100"
                        />

                        <div className="flex justify-between items-center">
                            <span className="text-sm">Internal</span>
                            <Badge variant="outline" className="border-blue-200 text-blue-700">
                                {formatPercentage(metrics.internal_fragmentation)}
                            </Badge>
                        </div>
                        <Progress
                            value={metrics.internal_fragmentation}
                            className="h-2 bg-blue-100"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Allocation Performance */}
            <Card className="border-green-200/50">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <Activity className="h-5 w-5" />
                        Allocation Performance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-700">{metrics.successful_allocations}</div>
                            <div className="text-xs text-muted-foreground">Successful</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                            <div className="text-lg font-bold text-red-700">{metrics.failed_allocations}</div>
                            <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span>Avg Allocation Time</span>
                        <span className="font-mono">{metrics.average_allocation_time.toFixed(2)}ms</span>
                    </div>
                </CardContent>
            </Card>

            {/* Paging Metrics (if available) */}
            {(metrics.page_faults !== undefined || metrics.page_hits !== undefined) && (
                <Card className="border-green-200/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                            <HardDrive className="h-5 w-5" />
                            Paging Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="text-center p-2 bg-green-50 rounded">
                                <div className="text-lg font-bold text-green-700">{metrics.page_hits || 0}</div>
                                <div className="text-xs text-muted-foreground">Page Hits</div>
                            </div>
                            <div className="text-center p-2 bg-orange-50 rounded">
                                <div className="text-lg font-bold text-orange-700">{metrics.page_faults || 0}</div>
                                <div className="text-xs text-muted-foreground">Page Faults</div>
                            </div>
                        </div>

                        {metrics.hit_ratio !== undefined && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Hit Ratio</span>
                                    <span className="font-medium text-green-700">{formatPercentage(metrics.hit_ratio)}</span>
                                </div>
                                <Progress
                                    value={metrics.hit_ratio}
                                    className="h-2 bg-green-100"
                                />
                            </div>
                        )}

                        {(metrics.swap_ins !== undefined || metrics.swap_outs !== undefined) && (
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="flex justify-between">
                                    <span>Swap Ins:</span>
                                    <span className="font-mono">{metrics.swap_ins || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Swap Outs:</span>
                                    <span className="font-mono">{metrics.swap_outs || 0}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Algorithm Statistics */}
            <Card className="border-green-200/50 md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <Zap className="h-5 w-5" />
                        Algorithm Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span>Algorithm</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                            {results.algorithm}
                        </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                        {results.statistics && Object.entries(results.statistics).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                                <span className="font-mono">{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default MemoryMetrics