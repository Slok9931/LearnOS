import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Plus,
    Trash2,
    Play,
    MemoryStick,
    AlertCircle,
    Wifi,
    WifiOff,
    Settings,
    HardDrive,
    Layers,
    Grid3X3,
    Database,
    ChevronRight,
    ChevronDown,
    Copy,
    Shuffle,
    Info,
    BookOpen
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
        { id: 1, name: 'Process A', size: 100, arrival_time: 0, priority: 1 }
    ])

    const [activeAlgorithm, setActiveAlgorithm] = useState('linear')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [results, setResults] = useState<MemoryResult | null>(null)
    const [serverStatus, setServerStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')
    const [processListExpanded, setProcessListExpanded] = useState(true)
    const [advancedConfigExpanded, setAdvancedConfigExpanded] = useState(true)
    const [showExplanation, setShowExplanation] = useState(true)

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
        checkServerHealth()
    }, [])

    const checkServerHealth = async () => {
        try {
            setServerStatus('checking')
            const health = await memoryApi.healthCheck()
            // Fix: Access the correct status from the response structure
            setServerStatus(health.data.status === 'healthy' ? 'healthy' : 'unhealthy')
            
            if (health.data.status === 'healthy') {
                setError(null)
            }
        } catch (error) {
            console.error('Health check error:', error)
            setServerStatus('unhealthy')
            setError('Unable to connect to server. Please ensure the server is running on http://localhost:5000')
        }
    }

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

    const addSampleProcesses = () => {
        const sampleProcesses: MemoryProcess[] = [
            { id: 1, name: 'Process A', size: 100, arrival_time: 0, priority: 1 },
            { id: 2, name: 'Process B', size: 200, arrival_time: 1, priority: 2 },
            { id: 3, name: 'Process C', size: 150, arrival_time: 2, priority: 1 },
            { id: 4, name: 'Process D', size: 80, arrival_time: 3, priority: 3 },
            { id: 5, name: 'Process E', size: 120, arrival_time: 4, priority: 2 }
        ]
        setProcesses(sampleProcesses)
    }

    const shuffleProcesses = () => {
        const shuffled = [...processes].map(p => ({
            ...p,
            size: Math.floor(Math.random() * 200) + 50,
            arrival_time: Math.floor(Math.random() * 5),
            priority: Math.floor(Math.random() * 3) + 1
        }))
        setProcesses(shuffled)
    }

    const removeProcess = (id: number) => {
        if (processes.length > 1) {
            setProcesses(processes.filter(p => p.id !== id))
        }
    }

    const updateProcess = (id: number, field: keyof MemoryProcess, value: any) => {
        setProcesses(processes.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ))
    }

    // Validation
    const validateProcesses = (): boolean => {
        for (const process of processes) {
            if (process.size <= 0) {
                setError(`Process ${process.name}: Size must be greater than 0`)
                return false
            }
            if (process.arrival_time < 0) {
                setError(`Process ${process.name}: Arrival time cannot be negative`)
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
    const runAlgorithm = async (algorithm: string) => {
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
                algorithm_type: algorithm as any,
                simulation_time: 100.0
            }

            let result: any
            switch (algorithm) {
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
                    throw new Error(`Algorithm ${algorithm} not implemented`)
            }

            if (result.success && result.data) {
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

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto p-4 sm:p-6 space-y-6">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                            Memory Management Simulator
                        </h1>
                        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
                            Simulate and visualize different memory allocation algorithms with detailed analysis
                        </p>
                    </div>

                    {/* Server Status */}
                    <div className="flex items-center justify-center gap-2">
                        {serverStatus === 'checking' && (
                            <Badge variant="outline" className="gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                Checking server...
                            </Badge>
                        )}
                        {serverStatus === 'healthy' && (
                            <Badge variant="outline" className="gap-2 text-green-400 border-green-500/30 bg-green-500/10">
                                <Wifi className="w-4 h-4" />
                                Server Online
                            </Badge>
                        )}
                        {serverStatus === 'unhealthy' && (
                            <Badge variant="destructive" className="gap-2">
                                <WifiOff className="w-4 h-4" />
                                Server Offline
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={checkServerHealth}
                                    className="h-4 p-1 ml-2 text-white hover:bg-white/20"
                                >
                                    Retry
                                </Button>
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Error Alerts */}
                {error && (
                    <Alert variant="destructive" className="animate-fadeIn">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {serverStatus === 'unhealthy' && (
                    <Alert className="border-amber-500/30 bg-amber-500/10">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <AlertDescription className="text-amber-200">
                            The backend server is not running. Please start it by running:
                            <code className="block mt-2 p-2 bg-muted rounded text-sm text-foreground">
                                cd /Users/sloktulsyan/Desktop/LearnOS/server && python3 run.py
                            </code>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Content */}
                <div className="space-y-6">
                    {/* Process Configuration Section */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="h-5 w-5 text-primary" />
                                    <div>
                                        <CardTitle className="text-foreground">Process Configuration</CardTitle>
                                        <CardDescription className='ml-3'>Set up processes and their memory requirements</CardDescription>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setProcessListExpanded(!processListExpanded)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {processListExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        
                        {processListExpanded && (
                            <CardContent className="space-y-6">
                                {/* Process Controls */}
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={addProcess} size="sm" className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Add Process
                                    </Button>
                                    <Button onClick={addSampleProcesses} variant="outline" size="sm" className="flex items-center gap-2">
                                        <Copy className="w-4 h-4" />
                                        Load Sample
                                    </Button>
                                    <Button onClick={shuffleProcesses} variant="outline" size="sm" className="flex items-center gap-2">
                                        <Shuffle className="w-4 h-4" />
                                        Randomize
                                    </Button>
                                    <Badge variant="secondary" className="ml-auto">
                                        {processes.length} Process{processes.length !== 1 ? 'es' : ''}
                                    </Badge>
                                </div>

                                {/* Process List - Responsive Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                    {processes.map((process) => (
                                        <Card key={process.id} className="p-4 bg-muted/30 border-border/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge variant="outline" className="border-primary/30 text-primary">
                                                    {process.name}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeProcess(process.id)}
                                                    disabled={processes.length === 1}
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <Label htmlFor={`name-${process.id}`} className="text-xs text-muted-foreground">
                                                        Process Name
                                                    </Label>
                                                    <Input
                                                        id={`name-${process.id}`}
                                                        value={process.name}
                                                        onChange={(e) => updateProcess(process.id, 'name', e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label htmlFor={`size-${process.id}`} className="text-xs text-muted-foreground">
                                                            Size (KB)
                                                        </Label>
                                                        <Input
                                                            id={`size-${process.id}`}
                                                            type="number"
                                                            min="1"
                                                            value={process.size}
                                                            onChange={(e) => updateProcess(process.id, 'size', parseInt(e.target.value) || 1)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`arrival-${process.id}`} className="text-xs text-muted-foreground">
                                                            Arrival Time
                                                        </Label>
                                                        <Input
                                                            id={`arrival-${process.id}`}
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={process.arrival_time}
                                                            onChange={(e) => updateProcess(process.id, 'arrival_time', parseFloat(e.target.value) || 0)}
                                                            className="h-8 text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor={`priority-${process.id}`} className="text-xs text-muted-foreground">
                                                        Priority (1 = highest)
                                                    </Label>
                                                    <Input
                                                        id={`priority-${process.id}`}
                                                        type="number"
                                                        min="1"
                                                        value={process.priority}
                                                        onChange={(e) => updateProcess(process.id, 'priority', parseInt(e.target.value) || 1)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Algorithm Configuration */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Settings className="h-5 w-5 text-primary" />
                                    <div>
                                        <CardTitle className="text-foreground">Algorithm Configuration</CardTitle>
                                        <CardDescription className='ml-3'>Configure memory management algorithm parameters</CardDescription>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAdvancedConfigExpanded(!advancedConfigExpanded)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {advancedConfigExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-6">
                            {/* Algorithm Selection */}
                            <Tabs value={activeAlgorithm} onValueChange={setActiveAlgorithm} className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-muted">
                                    <TabsTrigger value="linear" className="text-xs sm:text-sm">Linear</TabsTrigger>
                                    <TabsTrigger value="segmentation" className="text-xs sm:text-sm">Segmentation</TabsTrigger>
                                    <TabsTrigger value="paging" className="text-xs sm:text-sm">Paging</TabsTrigger>
                                    <TabsTrigger value="multi_level_paging" className="text-xs sm:text-sm">Multi-Level</TabsTrigger>
                                </TabsList>

                                {/* Linear Allocation Configuration */}
                                <TabsContent value="linear" className="mt-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-medium text-foreground flex items-center gap-2">
                                                    <MemoryStick className="h-4 w-4" />
                                                    Linear/Contiguous Allocation
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Contiguous memory allocation using different fit strategies</p>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Total Memory (KB)</Label>
                                                    <Input
                                                        type="number"
                                                        min="64"
                                                        value={linearConfig.total_memory}
                                                        onChange={(e) => setLinearConfig({ ...linearConfig, total_memory: parseInt(e.target.value) || 1024 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">OS Reserved (KB)</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={linearConfig.os_reserved}
                                                        onChange={(e) => setLinearConfig({ ...linearConfig, os_reserved: parseInt(e.target.value) || 64 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-foreground">Allocation Method</Label>
                                                <Select
                                                    value={linearConfig.allocation_method}
                                                    onValueChange={(value: any) => setLinearConfig({ ...linearConfig, allocation_method: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
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
                                            {advancedConfigExpanded && (
                                                <div className="pt-4 border-t border-border/50">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch
                                                            id="compaction"
                                                            checked={linearConfig.enable_compaction}
                                                            onCheckedChange={(checked) => setLinearConfig({ ...linearConfig, enable_compaction: checked })}
                                                        />
                                                        <Label htmlFor="compaction" className="text-sm">
                                                            Enable Memory Compaction
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Segmentation Configuration */}
                                <TabsContent value="segmentation" className="mt-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-medium text-foreground flex items-center gap-2">
                                                    <Layers className="h-4 w-4" />
                                                    Segmentation
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Logical segmentation with variable-sized segments</p>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Total Memory (KB)</Label>
                                                    <Input
                                                        type="number"
                                                        min="64"
                                                        value={segmentationConfig.total_memory}
                                                        onChange={(e) => setSegmentationConfig({ ...segmentationConfig, total_memory: parseInt(e.target.value) || 1024 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Max Segments per Process</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={segmentationConfig.max_segments_per_process}
                                                        onChange={(e) => setSegmentationConfig({ ...segmentationConfig, max_segments_per_process: parseInt(e.target.value) || 4 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Segment Table Size</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={segmentationConfig.segment_table_size}
                                                        onChange={(e) => setSegmentationConfig({ ...segmentationConfig, segment_table_size: parseInt(e.target.value) || 16 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            {advancedConfigExpanded && (
                                                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch
                                                            id="protection"
                                                            checked={segmentationConfig.enable_protection}
                                                            onCheckedChange={(checked) => setSegmentationConfig({ ...segmentationConfig, enable_protection: checked })}
                                                        />
                                                        <Label htmlFor="protection" className="text-sm">
                                                            Enable Memory Protection
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Switch
                                                            id="sharing"
                                                            checked={segmentationConfig.enable_sharing}
                                                            onCheckedChange={(checked) => setSegmentationConfig({ ...segmentationConfig, enable_sharing: checked })}
                                                        />
                                                        <Label htmlFor="sharing" className="text-sm">
                                                            Enable Segment Sharing
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Paging Configuration */}
                                <TabsContent value="paging" className="mt-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-medium text-foreground flex items-center gap-2">
                                                    <Grid3X3 className="h-4 w-4" />
                                                    Paging
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Fixed-size paging with virtual memory support</p>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Total Memory (KB)</Label>
                                                    <Input
                                                        type="number"
                                                        min="64"
                                                        value={pagingConfig.total_memory}
                                                        onChange={(e) => setPagingConfig({ ...pagingConfig, total_memory: parseInt(e.target.value) || 1024 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Page Size (KB)</Label>
                                                    <Select
                                                        value={pagingConfig.page_size.toString()}
                                                        onValueChange={(value) => setPagingConfig({ ...pagingConfig, page_size: parseInt(value) })}
                                                    >
                                                        <SelectTrigger className="mt-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">1 KB</SelectItem>
                                                            <SelectItem value="2">2 KB</SelectItem>
                                                            <SelectItem value="4">4 KB</SelectItem>
                                                            <SelectItem value="8">8 KB</SelectItem>
                                                            <SelectItem value="16">16 KB</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Max Pages per Process</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={pagingConfig.max_pages_per_process}
                                                        onChange={(e) => setPagingConfig({ ...pagingConfig, max_pages_per_process: parseInt(e.target.value) || 16 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-foreground">Page Replacement Algorithm</Label>
                                                <Select
                                                    value={pagingConfig.replacement_algorithm}
                                                    onValueChange={(value: any) => setPagingConfig({ ...pagingConfig, replacement_algorithm: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                                                        <SelectItem value="lru">LRU (Least Recently Used)</SelectItem>
                                                        <SelectItem value="lfu">LFU (Least Frequently Used)</SelectItem>
                                                        <SelectItem value="optimal">Optimal</SelectItem>
                                                        <SelectItem value="clock">Clock Algorithm</SelectItem>
                                                        <SelectItem value="second_chance">Second Chance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {advancedConfigExpanded && (
                                                <div className="space-y-4 pt-4 border-t border-border/50">
                                                    <div className="grid md:grid-cols-2 gap-4">
                                                        <div className="flex items-center space-x-2">
                                                            <Switch
                                                                id="virtual-memory"
                                                                checked={pagingConfig.enable_virtual_memory}
                                                                onCheckedChange={(checked) => setPagingConfig({ ...pagingConfig, enable_virtual_memory: checked })}
                                                            />
                                                            <Label htmlFor="virtual-memory" className="text-sm">
                                                                Enable Virtual Memory
                                                            </Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Switch
                                                                id="tlb"
                                                                checked={pagingConfig.tlb_enabled}
                                                                onCheckedChange={(checked) => setPagingConfig({ ...pagingConfig, tlb_enabled: checked })}
                                                            />
                                                            <Label htmlFor="tlb" className="text-sm">
                                                                Enable TLB (Translation Lookaside Buffer)
                                                            </Label>
                                                        </div>
                                                    </div>
                                                    {pagingConfig.tlb_enabled && (
                                                        <div>
                                                            <Label className="text-sm font-medium text-foreground">TLB Size</Label>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                max="64"
                                                                value={pagingConfig.tlb_size}
                                                                onChange={(e) => setPagingConfig({ ...pagingConfig, tlb_size: parseInt(e.target.value) || 4 })}
                                                                className="mt-1"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Multi-Level Paging Configuration */}
                                <TabsContent value="multi_level_paging" className="mt-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="font-medium text-foreground flex items-center gap-2">
                                                    <HardDrive className="h-4 w-4" />
                                                    Multi-Level Paging
                                                </h3>
                                                <p className="text-sm text-muted-foreground">Hierarchical paging with demand loading for large address spaces</p>
                                            </div>
                                            <div className="grid md:grid-cols-4 gap-4">
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Total Memory (KB)</Label>
                                                    <Input
                                                        type="number"
                                                        min="64"
                                                        value={multiLevelPagingConfig.total_memory}
                                                        onChange={(e) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, total_memory: parseInt(e.target.value) || 1024 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Page Size (KB)</Label>
                                                    <Select
                                                        value={multiLevelPagingConfig.page_size.toString()}
                                                        onValueChange={(value) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, page_size: parseInt(value) })}
                                                    >
                                                        <SelectTrigger className="mt-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">1 KB</SelectItem>
                                                            <SelectItem value="2">2 KB</SelectItem>
                                                            <SelectItem value="4">4 KB</SelectItem>
                                                            <SelectItem value="8">8 KB</SelectItem>
                                                            <SelectItem value="16">16 KB</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium text-foreground">Page Table Levels</Label>
                                                    <Select
                                                        value={multiLevelPagingConfig.levels.toString()}
                                                        onValueChange={(value) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, levels: parseInt(value) })}
                                                    >
                                                        <SelectTrigger className="mt-1">
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
                                                    <Label className="text-sm font-medium text-foreground">Working Set Size</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={multiLevelPagingConfig.working_set_size}
                                                        onChange={(e) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, working_set_size: parseInt(e.target.value) || 8 })}
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-foreground">Page Replacement Algorithm</Label>
                                                <Select
                                                    value={multiLevelPagingConfig.replacement_algorithm}
                                                    onValueChange={(value: any) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, replacement_algorithm: value })}
                                                >
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                                                        <SelectItem value="lru">LRU (Least Recently Used)</SelectItem>
                                                        <SelectItem value="lfu">LFU (Least Frequently Used)</SelectItem>
                                                        <SelectItem value="optimal">Optimal</SelectItem>
                                                        <SelectItem value="clock">Clock Algorithm</SelectItem>
                                                        <SelectItem value="second_chance">Second Chance</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {advancedConfigExpanded && (
                                                <div className="pt-4 border-t border-border/50">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch
                                                            id="demand-paging"
                                                            checked={multiLevelPagingConfig.enable_demand_paging}
                                                            onCheckedChange={(checked) => setMultiLevelPagingConfig({ ...multiLevelPagingConfig, enable_demand_paging: checked })}
                                                        />
                                                        <Label htmlFor="demand-paging" className="text-sm">
                                                            Enable Demand Paging
                                                        </Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Run Button for Each Algorithm */}
                                {['linear', 'segmentation', 'paging', 'multi_level_paging'].map((algorithm) => (
                                    <TabsContent key={`${algorithm}-run`} value={algorithm}>
                                        <div className="flex justify-center pt-4">
                                            <Button
                                                onClick={() => runAlgorithm(algorithm)}
                                                disabled={loading || serverStatus !== 'healthy'}
                                                className="flex items-center gap-2 min-w-[160px]"
                                                size="lg"
                                            >
                                                <Play className="w-4 h-4" />
                                                {loading ? 'Running Simulation...' : `Run ${algorithm.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Simulation`}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Results Section */}
                    {results && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MemoryStick className="h-5 w-5 text-primary" />
                                    <h2 className="text-xl font-semibold text-foreground">
                                        {activeAlgorithm.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Results
                                    </h2>
                                </div>
                                
                                {/* Toggle Explanation */}
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <Switch
                                        id="show-explanation"
                                        checked={showExplanation}
                                        onCheckedChange={setShowExplanation}
                                    />
                                    <Label htmlFor="show-explanation" className="text-sm">
                                        Step-by-step explanation
                                    </Label>
                                </div>
                            </div>

                            {/* Results Tabs */}
                            <Tabs defaultValue="visualization" className="space-y-6">
                                <TabsList className="grid w-full grid-cols-3 bg-muted">
                                    <TabsTrigger value="visualization">Memory Visualization</TabsTrigger>
                                    <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
                                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
                        </div>
                    )}

                    {/* Empty State */}
                    {!results && (
                        <Card className="bg-card border-border border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <MemoryStick className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">Ready to Simulate</h3>
                                <p className="text-muted-foreground mb-4 max-w-md">
                                    Configure your processes and memory management algorithm parameters above, then run the simulation. 
                                    The memory layout, performance metrics, and step-by-step explanation will appear here.
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    <Badge variant="outline">Configure Processes</Badge>
                                    <Badge variant="outline">Set Algorithm Parameters</Badge>
                                    <Badge variant="outline">Run Simulation</Badge>
                                    <Badge variant="outline">Analyze Results</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}