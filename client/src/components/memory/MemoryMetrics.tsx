import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    MemoryStick,
    PieChart,
    Clock,
    Activity,
    HardDrive,
    Zap,
    TrendingUp,
    TrendingDown
} from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryMetricsProps {
    results: MemoryResult
}

const MemoryMetrics: React.FC<MemoryMetricsProps> = ({ results }) => {
    if (!results.metrics) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Metrics Available</h3>
                    <p className="text-muted-foreground">Performance metrics are not available for this simulation</p>
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

    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 80) return 'text-red-600'
        if (utilization >= 60) return 'text-yellow-600'
        return 'text-green-600'
    }

    const getFragmentationSeverity = (fragmentation: number) => {
        if (fragmentation >= 30) return { color: 'text-red-600', severity: 'High' }
        if (fragmentation >= 15) return { color: 'text-yellow-600', severity: 'Medium' }
        return { color: 'text-green-600', severity: 'Low' }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Memory Utilization */}
            <Card className="bg-card border-border">
                <CardHeader className="border-b border-border/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <MemoryStick className="h-5 w-5 text-primary" />
                        Memory Utilization
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Memory</span>
                            <span className="font-mono text-foreground font-medium">{formatBytes(metrics.total_memory)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Allocated</span>
                            <span className="font-mono text-green-600 font-medium">{formatBytes(metrics.allocated_memory)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Free</span>
                            <span className="font-mono text-muted-foreground font-medium">{formatBytes(metrics.free_memory)}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-foreground">Utilization Rate</span>
                            <span className={`font-medium ${getUtilizationColor(metrics.memory_utilization)}`}>
                                {formatPercentage(metrics.memory_utilization)}
                            </span>
                        </div>
                        <Progress
                            value={metrics.memory_utilization}
                            className="h-3 bg-muted"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Fragmentation Analysis */}
            <Card className="bg-card border-border">
                <CardHeader className="border-b border-border/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <PieChart className="h-5 w-5 text-primary" />
                        Fragmentation Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">External Fragmentation</span>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={`${getFragmentationSeverity(metrics.external_fragmentation).color} border-current`}
                                    >
                                        {getFragmentationSeverity(metrics.external_fragmentation).severity}
                                    </Badge>
                                    <span className="font-mono text-sm text-foreground">
                                        {formatPercentage(metrics.external_fragmentation)}
                                    </span>
                                </div>
                            </div>
                            <Progress
                                value={metrics.external_fragmentation}
                                className="h-2 bg-muted"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-muted-foreground">Internal Fragmentation</span>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={`${getFragmentationSeverity(metrics.internal_fragmentation).color} border-current`}
                                    >
                                        {getFragmentationSeverity(metrics.internal_fragmentation).severity}
                                    </Badge>
                                    <span className="font-mono text-sm text-foreground">
                                        {formatPercentage(metrics.internal_fragmentation)}
                                    </span>
                                </div>
                            </div>
                            <Progress
                                value={metrics.internal_fragmentation}
                                className="h-2 bg-muted"
                            />
                        </div>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                            Lower fragmentation indicates more efficient memory usage
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Allocation Performance */}
            <Card className="bg-card border-border">
                <CardHeader className="border-b border-border/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Activity className="h-5 w-5 text-primary" />
                        Allocation Performance
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-2xl font-bold text-green-700">{metrics.successful_allocations}</span>
                            </div>
                            <div className="text-xs text-green-600">Successful</div>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingDown className="h-4 w-4 text-red-600" />
                                <span className="text-2xl font-bold text-red-700">{metrics.failed_allocations}</span>
                            </div>
                            <div className="text-xs text-red-600">Failed</div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className="font-medium text-green-600">
                                {((metrics.successful_allocations / (metrics.successful_allocations + metrics.failed_allocations)) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Avg Allocation Time</span>
                            <span className="font-mono text-foreground">{metrics.average_allocation_time.toFixed(2)}ms</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Paging Statistics (if available) */}
            {(metrics.page_faults !== undefined || metrics.page_hits !== undefined) && (
                <Card className="bg-card border-border">
                    <CardHeader className="border-b border-border/50 pb-3">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <HardDrive className="h-5 w-5 text-primary" />
                            Paging Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <div className="text-2xl font-bold text-blue-700">{metrics.page_hits || 0}</div>
                                <div className="text-xs text-blue-600">Page Hits</div>
                            </div>
                            <div className="text-center p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                                <div className="text-2xl font-bold text-orange-700">{metrics.page_faults || 0}</div>
                                <div className="text-xs text-orange-600">Page Faults</div>
                            </div>
                        </div>

                        {metrics.hit_ratio !== undefined && (
                            <>
                                <Separator />
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-foreground">Hit Ratio</span>
                                        <span className="font-medium text-blue-600">{formatPercentage(metrics.hit_ratio)}</span>
                                    </div>
                                    <Progress
                                        value={metrics.hit_ratio}
                                        className="h-2 bg-muted"
                                    />
                                </div>
                            </>
                        )}

                        {(metrics.swap_ins !== undefined || metrics.swap_outs !== undefined) && (
                            <>
                                <Separator />
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Swap Ins:</span>
                                        <span className="font-mono text-foreground">{metrics.swap_ins || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Swap Outs:</span>
                                        <span className="font-mono text-foreground">{metrics.swap_outs || 0}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Algorithm Information */}
            <Card className="bg-card border-border md:col-span-2 lg:col-span-1">
                <CardHeader className="border-b border-border/50 pb-3">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Zap className="h-5 w-5 text-primary" />
                        Algorithm Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Algorithm</span>
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                            {results.algorithm?.toUpperCase() || 'Unknown'}
                        </Badge>
                    </div>

                    {results.statistics && Object.keys(results.statistics).length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-foreground">Statistics</h4>
                                <div className="space-y-1">
                                    {Object.entries(results.statistics).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground capitalize">
                                                {key.replace(/_/g, ' ')}:
                                            </span>
                                            <span className="font-mono text-foreground">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">
                            Algorithm-specific performance metrics and configuration details
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default MemoryMetrics