import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Plus,
    Trash2,
    Play,
    MemoryStick,
    Server,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Settings,
    HardDrive,
    Layers,
    Grid3X3,
    Database
} from 'lucide-react'

import MemoryVisualization from '@/components/memory/MemoryVisualization'
import MemoryMetrics from '@/components/memory/MemoryMetrics'
import MemoryTimeline from '@/components/memory/MemoryTimeline'

import { memoryApi, handleApiError } from '@/services/memoryApi'
import {
    MemoryProcess,
    MemoryRequest,
    MemoryResult,
    LinearAllocationConfig,
    SegmentationConfig,
    PagingConfig,
    MultiLevelPagingConfig
} from '@/types/memory'

export default function MemoryManagement() {
    // State management
    const [processes, setProcesses] = useState<MemoryProcess[]>([
        { id: 1, name: 'Process A', size: 100, arrival_time: 0, priority: 1 },
        { id: 2, name: 'Process B', size: 50, arrival_time: 1, priority: 2 },
        { id: 3, name: 'Process C', size: 75, arrival_time: 2, priority: 1 }
    ])

    const [activeAlgorithm, setActiveAlgorithm] = useState('linear')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [results, setResults] = useState<MemoryResult | null>(null)
    const [serverStatus, setServerStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')

    // Configuration states
    const [linearConfig, setLinearConfig] = useState<LinearAllocationConfig>({
        total_memory: 1024,
        allocation_method: 'first_fit',
        enable_compaction: true,
        os_reserved: 64
    })

    const [segmentationConfig, setSegmentationConfig] = useState<SegmentationConfig>({
        total_memory: 1024,
        max_segments_per_process: 4,
        enable_protection: true,
        enable_sharing: false,
        segment_table_size: 16
    })

    const [pagingConfig, setPagingConfig] = useState<PagingConfig>({
        total_memory: 1024,
        page_size: 4,
        enable_virtual_memory: true,
        replacement_algorithm: 'fifo',
        max_pages_per_process: 16,
        tlb_enabled: true,
        tlb_size: 4
    })

    const [multiLevelPagingConfig, setMultiLevelPagingConfig] = useState<MultiLevelPagingConfig>({
        total_memory: 1024,
        page_size: 4,
        levels: 2,
        enable_demand_paging: true,
        replacement_algorithm: 'lru',
        working_set_size: 8
    })

    // Check server health on mount
    useEffect(() => {
        const checkHealth = async () => {
            try {
                await memoryApi.healthCheck()
                setServerStatus('healthy')
            } catch (error) {
                setServerStatus('unhealthy')
            }
        }
        checkHealth()
    }, [])

    // Process management functions
    const addProcess = () => {
        const newId = Math.max(...processes.map(p => p.id), 0) + 1
        const newProcess: MemoryProcess = {
            id: newId,
            name: `Process ${String.fromCharCode(64 + newId)}`,
            size: 50,
            arrival_time: processes.length,
            priority: 1
        }
        setProcesses([...processes, newProcess])
    }

    const removeProcess = (id: number) => {
        if (processes.length > 1) {
            setProcesses(processes.filter(p => p.id !== id))
        } else {
            setError('At least one process is required')
        }
    }

    const updateProcess = (id: number, field: keyof MemoryProcess, value: any) => {
        setProcesses(processes.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ))
    }

    // Validation
    const validateProcesses = (): boolean => {
        if (processes.length === 0) {
            setError('At least one process is required')
            return false
        }

        for (const process of processes) {
            if (process.size <= 0) {
                setError(`Process ${process.name} must have a size greater than 0`)
                return false
            }
            if (process.arrival_time < 0) {
                setError(`Process ${process.name} must have a non-negative arrival time`)
                return false
            }
        }

        setError(null)
        return true
    }

    const getCurrentConfig = () => {
        switch (activeAlgorithm) {
            case 'linear':
                return linearConfig
            case 'segmentation':
                return segmentationConfig
            case 'paging':
                return pagingConfig
            case 'multi_level_paging':
                return multiLevelPagingConfig
            default:
                return linearConfig
        }
    }

    // Run algorithm
    const runAlgorithm = async () => {
        if (serverStatus !== 'healthy') {
            setError('Server is not available. Please start the backend server.')
            return
        }

        if (!validateProcesses()) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const request: MemoryRequest = {
                processes,
                config: getCurrentConfig(),
                algorithm_type: activeAlgorithm as any,
                simulation_time: 100.0
            }

            let result
            switch (activeAlgorithm) {
                case 'linear':
                    result = await memoryApi.linearAllocation(request)
                    break
                case 'segmentation':
                    result = await memoryApi.segmentation(request)
                    break
                case 'paging':
                    result = await memoryApi.paging(request)
                    break
                case 'multi_level_paging':
                    result = await memoryApi.multiLevelPaging(request)
                    break
                default:
                    throw new Error(`Algorithm ${activeAlgorithm} not implemented`)
            }

            if (result.success) {
                setResults(result.data)
                setError(null)
            } else {
                setError(result.message || 'Unknown error occurred')
            }
        } catch (error: any) {
            console.error('Error running algorithm:', error)
            setError(handleApiError(error))
        } finally {
            setLoading(false)
        }
    }

    const renderProcessForm = () => (
        <Card className="border-green-200/50">
            <CardHeader className="border-b border-green-200/50">
                <CardTitle className="flex items-center gap-2 text-green-800">
                    <Database className="h-5 w-5" />
                    Processes
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Define the processes to be allocated in memory
                </p>
            </CardHeader>
            <CardContent className="p-6">
                <ScrollArea className="h-64">
                    <div className="space-y-4">
                        {processes.map((process) => (
                            <div key={process.id} className="flex items-center gap-3 p-3 bg-green-50/30 rounded-lg border border-green-100">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
                                    <div>
                                        <Label htmlFor={`name-${process.id}`} className="text-xs">Name</Label>
                                        <Input
                                            id={`name-${process.id}`}
                                            value={process.name}
                                            onChange={(e) => updateProcess(process.id, 'name', e.target.value)}
                                            className="h-8 border-green-200 focus:border-green-300"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`size-${process.id}`} className="text-xs">Size (KB)</Label>
                                        <Input
                                            id={`size-${process.id}`}
                                            type="number"
                                            value={process.size}
                                            onChange={(e) => updateProcess(process.id, 'size', parseInt(e.target.value) || 0)}
                                            className="h-8 border-green-200 focus:border-green-300"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`arrival-${process.id}`} className="text-xs">Arrival Time</Label>
                                        <Input
                                            id={`arrival-${process.id}`}
                                            type="number"
                                            step="0.1"
                                            value={process.arrival_time}
                                            onChange={(e) => updateProcess(process.id, 'arrival_time', parseFloat(e.target.value) || 0)}
                                            className="h-8 border-green-200 focus:border-green-300"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`priority-${process.id}`} className="text-xs">Priority</Label>
                                        <Input
                                            id={`priority-${process.id}`}
                                            type="number"
                                            value={process.priority}
                                            onChange={(e) => updateProcess(process.id, 'priority', parseInt(e.target.value) || 1)}
                                            className="h-8 border-green-200 focus:border-green-300"
                                        />
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeProcess(process.id)}
                                    disabled={processes.length === 1}
                                    className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="mt-4 pt-4 border-t border-green-200/50">
                    <Button
                        onClick={addProcess}
                        variant="outline"
                        size="sm"
                        className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Process
                    </Button>
                </div>
            </CardContent>
        </Card>
    )

    const renderAlgorithmConfig = () => {
        const renderLinearConfig = () => (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="total-memory">Total Memory (KB)</Label>
                        <Input
                            id="total-memory"
                            type="number"
                            value={linearConfig.total_memory}
                            onChange={(e) => setLinearConfig({ ...linearConfig, total_memory: parseInt(e.target.value) || 1024 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                    <div>
                        <Label htmlFor="os-reserved">OS Reserved (KB)</Label>
                        <Input
                            id="os-reserved"
                            type="number"
                            value={linearConfig.os_reserved}
                            onChange={(e) => setLinearConfig({ ...linearConfig, os_reserved: parseInt(e.target.value) || 64 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="allocation-method">Allocation Method</Label>
                    <Select
                        value={linearConfig.allocation_method}
                        onValueChange={(value: any) => setLinearConfig({ ...linearConfig, allocation_method: value })}
                    >
                        <SelectTrigger className="border-green-200 focus:border-green-300">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="first_fit">First Fit</SelectItem>
                            <SelectItem value="best_fit">Best Fit</SelectItem>
                            <SelectItem value="worst_fit">Worst Fit</SelectItem>
                            <SelectItem value="next_fit">Next Fit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="compaction"
                        checked={linearConfig.enable_compaction}
                        onCheckedChange={(checked) => setLinearConfig({ ...linearConfig, enable_compaction: checked })}
                    />
                    <Label htmlFor="compaction">Enable Memory Compaction</Label>
                </div>
            </div>
        )

        const renderSegmentationConfig = () => (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="seg-total-memory">Total Memory (KB)</Label>
                        <Input
                            id="seg-total-memory"
                            type="number"
                            value={segmentationConfig.total_memory}
                            onChange={(e) => setSegmentationConfig({ ...segmentationConfig, total_memory: parseInt(e.target.value) || 1024 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                    <div>
                        <Label htmlFor="max-segments">Max Segments per Process</Label>
                        <Input
                            id="max-segments"
                            type="number"
                            value={segmentationConfig.max_segments_per_process}
                            onChange={(e) => setSegmentationConfig({ ...segmentationConfig, max_segments_per_process: parseInt(e.target.value) || 4 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="segment-table-size">Segment Table Size</Label>
                    <Input
                        id="segment-table-size"
                        type="number"
                        value={segmentationConfig.segment_table_size}
                        onChange={(e) => setSegmentationConfig({ ...segmentationConfig, segment_table_size: parseInt(e.target.value) || 16 })}
                        className="border-green-200 focus:border-green-300"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="protection"
                            checked={segmentationConfig.enable_protection}
                            onCheckedChange={(checked) => setSegmentationConfig({ ...segmentationConfig, enable_protection: checked })}
                        />
                        <Label htmlFor="protection">Enable Protection</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="sharing"
                            checked={segmentationConfig.enable_sharing}
                            onCheckedChange={(checked) => setSegmentationConfig({ ...segmentationConfig, enable_sharing: checked })}
                        />
                        <Label htmlFor="sharing">Enable Sharing</Label>
                    </div>
                </div>
            </div>
        )

        const renderPagingConfig = () => (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="page-total-memory">Total Memory (KB)</Label>
                        <Input
                            id="page-total-memory"
                            type="number"
                            value={pagingConfig.total_memory}
                            onChange={(e) => setPagingConfig({ ...pagingConfig, total_memory: parseInt(e.target.value) || 1024 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                    <div>
                        <Label htmlFor="page-size">Page Size (KB)</Label>
                        <Input
                            id="page-size"
                            type="number"
                            value={pagingConfig.page_size}
                            onChange={(e) => setPagingConfig({ ...pagingConfig, page_size: parseInt(e.target.value) || 4 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                    <div>
                        <Label htmlFor="max-pages">Max Pages per Process</Label>
                        <Input
                            id="max-pages"
                            type="number"
                            value={pagingConfig.max_pages_per_process}
                            onChange={(e) => setPagingConfig({ ...pagingConfig, max_pages_per_process: parseInt(e.target.value) || 16 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="replacement-algorithm">Page Replacement Algorithm</Label>
                    <Select
                        value={pagingConfig.replacement_algorithm}
                        onValueChange={(value: any) => setPagingConfig({ ...pagingConfig, replacement_algorithm: value })}
                    >
                        <SelectTrigger className="border-green-200 focus:border-green-300">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fifo">FIFO</SelectItem>
                            <SelectItem value="lru">LRU</SelectItem>
                            <SelectItem value="lfu">LFU</SelectItem>
                            <SelectItem value="optimal">Optimal</SelectItem>
                            <SelectItem value="clock">Clock</SelectItem>
                            <SelectItem value="second_chance">Second Chance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="virtual-memory"
                            checked={pagingConfig.enable_virtual_memory}
                            onCheckedChange={(checked) => setPagingConfig({ ...pagingConfig, enable_virtual_memory: checked })}
                        />
                        <Label htmlFor="virtual-memory">Enable Virtual Memory</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="tlb"
                            checked={pagingConfig.tlb_enabled}
                            onCheckedChange={(checked) => setPagingConfig({ ...pagingConfig, tlb_enabled: checked })}
                        />
                        <Label htmlFor="tlb">Enable TLB</Label>
                    </div>
                </div>

                {pagingConfig.tlb_enabled && (
                    <div>
                        <Label htmlFor="tlb-size">TLB Size</Label>
                        <Input
                            id="tlb-size"
                            type="number"
                            value={pagingConfig.tlb_size}
                            onChange={(e) => setPagingConfig({ ...pagingConfig, tlb_size: parseInt(e.target.value) || 4 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                )}
            </div>
        )

        const renderMultiLevelPagingConfig = () => (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Label htmlFor="ml-total-memory">Total Memory (KB)</Label>
                        <Input
                            id="ml-total-memory"
                            type="number"
                            value={multiLevelPagingConfig.total_memory}
                            onChange={(e) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, total_memory: parseInt(e.target.value) || 1024 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                    <div>
                        <Label htmlFor="ml-page-size">Page Size (KB)</Label>
                        <Input
                            id="ml-page-size"
                            type="number"
                            value={multiLevelPagingConfig.page_size}
                            onChange={(e) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, page_size: parseInt(e.target.value) || 4 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                    <div>
                        <Label htmlFor="levels">Levels</Label>
                        <Select
                            value={multiLevelPagingConfig.levels.toString()}
                            onValueChange={(value) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, levels: parseInt(value) })}
                        >
                            <SelectTrigger className="border-green-200 focus:border-green-300">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2">2 Levels</SelectItem>
                                <SelectItem value="3">3 Levels</SelectItem>
                                <SelectItem value="4">4 Levels</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="working-set">Working Set Size</Label>
                        <Input
                            id="working-set"
                            type="number"
                            value={multiLevelPagingConfig.working_set_size}
                            onChange={(e) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, working_set_size: parseInt(e.target.value) || 8 })}
                            className="border-green-200 focus:border-green-300"
                        />
                    </div>
                </div>

                <div>
                    <Label htmlFor="ml-replacement">Page Replacement Algorithm</Label>
                    <Select
                        value={multiLevelPagingConfig.replacement_algorithm}
                        onValueChange={(value: any) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, replacement_algorithm: value })}
                    >
                        <SelectTrigger className="border-green-200 focus:border-green-300">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="fifo">FIFO</SelectItem>
                            <SelectItem value="lru">LRU</SelectItem>
                            <SelectItem value="lfu">LFU</SelectItem>
                            <SelectItem value="optimal">Optimal</SelectItem>
                            <SelectItem value="clock">Clock</SelectItem>
                            <SelectItem value="second_chance">Second Chance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <Switch
                        id="demand-paging"
                        checked={multiLevelPagingConfig.enable_demand_paging}
                        onCheckedChange={(checked) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, enable_demand_paging: checked })}
                    />
                    <Label htmlFor="demand-paging">Enable Demand Paging</Label>
                </div>
            </div>
        )

        return (
            <Card className="border-green-200/50">
                <CardHeader className="border-b border-green-200/50">
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <Settings className="h-5 w-5" />
                        Algorithm Configuration
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Configure parameters for the selected memory management algorithm
                    </p>
                </CardHeader>
                <CardContent className="p-6">
                    {activeAlgorithm === 'linear' && renderLinearConfig()}
                    {activeAlgorithm === 'segmentation' && renderSegmentationConfig()}
                    {activeAlgorithm === 'paging' && renderPagingConfig()}
                    {activeAlgorithm === 'multi_level_paging' && renderMultiLevelPagingConfig()}
                </CardContent>
            </Card>
        )
    }

    const getAlgorithmDescription = (algorithm: string) => {
        const descriptions = {
            'linear': 'Contiguous memory allocation using different fit strategies (First, Best, Worst, Next Fit) with optional compaction.',
            'segmentation': 'Logical segmentation with variable-sized segments and memory protection mechanisms.',
            'paging': 'Fixed-size paging with virtual memory support and page replacement algorithms.',
            'multi_level_paging': 'Hierarchical paging with demand loading and working set management for large address spaces.'
        }
        return descriptions[algorithm as keyof typeof descriptions] || 'Unknown algorithm'
    }

    const getAlgorithmIcon = (algorithm: string) => {
        const icons = {
            'linear': <MemoryStick className="h-5 w-5" />,
            'segmentation': <Layers className="h-5 w-5" />,
            'paging': <Grid3X3 className="h-5 w-5" />,
            'multi_level_paging': <HardDrive className="h-5 w-5" />
        }
        return icons[algorithm as keyof typeof icons] || <MemoryStick className="h-5 w-5" />
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-green-800 flex items-center gap-3">
                                <MemoryStick className="h-8 w-8" />
                                Memory Management
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Simulate and visualize different memory allocation algorithms
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Badge variant={serverStatus === 'healthy' ? 'default' : 'destructive'} className="flex items-center gap-1">
                                {serverStatus === 'checking' ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : serverStatus === 'healthy' ? (
                                    <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                    <AlertCircle className="h-3 w-3" />
                                )}
                                {serverStatus === 'checking' ? 'Checking...' :
                                    serverStatus === 'healthy' ? 'Server Online' : 'Server Offline'}
                            </Badge>
                        </div>
                    </div>

                    {/* Algorithm Selection */}
                    <Card className="border-green-200/50">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { key: 'linear', name: 'Linear Allocation', icon: 'MemoryStick' },
                                    { key: 'segmentation', name: 'Segmentation', icon: 'Layers' },
                                    { key: 'paging', name: 'Paging', icon: 'Grid3X3' },
                                    { key: 'multi_level_paging', name: 'Multi-Level Paging', icon: 'HardDrive' }
                                ].map((alg) => (
                                    <button
                                        key={alg.key}
                                        onClick={() => setActiveAlgorithm(alg.key)}
                                        className={`p-4 rounded-lg border-2 transition-all text-left ${activeAlgorithm === alg.key
                                                ? 'border-green-500 bg-green-50 text-green-800'
                                                : 'border-green-200 hover:border-green-300 hover:bg-green-50/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {getAlgorithmIcon(alg.key)}
                                            <span className="font-medium">{alg.name}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {getAlgorithmDescription(alg.key)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Configuration */}
                    <div className="space-y-6">
                        {renderProcessForm()}
                        {renderAlgorithmConfig()}

                        {/* Run Button */}
                        <Card className="border-green-200/50">
                            <CardContent className="p-6">
                                <Button
                                    onClick={runAlgorithm}
                                    disabled={loading || serverStatus !== 'healthy'}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    size="lg"
                                >
                                    {loading ? (
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    ) : (
                                        <Play className="h-5 w-5 mr-2" />
                                    )}
                                    {loading ? 'Simulating...' : 'Run Simulation'}
                                </Button>

                                {error && (
                                    <Alert className="mt-4 border-red-200 bg-red-50">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-700">
                                            {error}
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel - Results */}
                    <div className="lg:col-span-2">
                        {results ? (
                            <Tabs defaultValue="visualization" className="space-y-6">
                                <TabsList className="grid w-full grid-cols-3 bg-green-50 border border-green-200">
                                    <TabsTrigger value="visualization" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                        Visualization
                                    </TabsTrigger>
                                    <TabsTrigger value="metrics" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                        Metrics
                                    </TabsTrigger>
                                    <TabsTrigger value="timeline" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                                        Timeline
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="visualization" className="space-y-6">
                                    <MemoryVisualization results={results} />
                                </TabsContent>

                                <TabsContent value="metrics" className="space-y-6">
                                    <MemoryMetrics results={results} />
                                </TabsContent>

                                <TabsContent value="timeline" className="space-y-6">
                                    <MemoryTimeline results={results} />
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <Card className="border-green-200/50">
                                <CardContent className="p-12 text-center">
                                    <Server className="h-12 w-12 mx-auto mb-4 text-green-300" />
                                    <h3 className="text-lg font-medium text-green-800 mb-2">
                                        Ready to Simulate
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Configure your processes and algorithm settings, then click "Run Simulation" to see the results.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}