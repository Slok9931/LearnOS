import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Trash2, 
  Play, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Settings, 
  Clock, 
  BarChart3,
  ChevronRight,
  ChevronDown,
  Copy,
  Shuffle,
  Info
} from 'lucide-react'
import { GanttChart } from '@/components/charts/GanttChart'
import { MetricsChart } from '@/components/charts/MetricsChart'
import schedulingApi, { handleApiError } from '@/services/api'
import { Process, SchedulingRequest, SchedulingResult } from '@/types/scheduling'

interface MLFQConfig {
  num_queues: number
  time_quantums: number[]
  aging_threshold: number
  boost_interval: number
  priority_boost: boolean
  feedback_mechanism: 'time' | 'io' | 'both'
}

export default function CPUScheduling() {
  const [processes, setProcesses] = useState<Process[]>([
    { id: 1, arrival_time: 0, burst_time: 5, priority: 1 }
  ])
  
  // Basic algorithm parameters
  const [timeQuantum, setTimeQuantum] = useState(2)
  const [contextSwitchCost, setContextSwitchCost] = useState(0.5)
  const [preemptive, setPreemptive] = useState(false)
  
  // MLFQ Configuration
  const [mlfqConfig, setMlfqConfig] = useState<MLFQConfig>({
    num_queues: 3,
    time_quantums: [2, 4, 8],
    aging_threshold: 10,
    boost_interval: 100,
    priority_boost: true,
    feedback_mechanism: 'time'
  })
  
  // Round Robin variations
  const [rrVariation, setRrVariation] = useState<'standard' | 'weighted' | 'deficit'>('standard')
  const [processWeights, setProcessWeights] = useState<{[key: number]: number}>({})
  
  // Priority scheduling options
  const [priorityType, setPriorityType] = useState<'fixed' | 'dynamic'>('fixed')
  const [priorityInversion, setPriorityInversion] = useState(false)
  
  const [results, setResults] = useState<SchedulingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAlgorithm, setActiveAlgorithm] = useState('fcfs')
  const [serverStatus, setServerStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [processListExpanded, setProcessListExpanded] = useState(true)
  const [advancedConfigExpanded, setAdvancedConfigExpanded] = useState(true)

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth()
  }, [])

  // Update process weights when processes change
  useEffect(() => {
    const weights: {[key: number]: number} = {}
    processes.forEach(p => {
      if (!(p.id in processWeights)) {
        weights[p.id] = 1
      } else {
        weights[p.id] = processWeights[p.id]
      }
    })
    setProcessWeights(weights)
  }, [processes])

  // Update MLFQ time quantums when number of queues changes
  useEffect(() => {
    const newQuantums = Array.from({ length: mlfqConfig.num_queues }, (_, i) => 
      i < mlfqConfig.time_quantums.length ? mlfqConfig.time_quantums[i] : Math.pow(2, i + 1)
    )
    setMlfqConfig(prev => ({ ...prev, time_quantums: newQuantums }))
  }, [mlfqConfig.num_queues])

  const checkServerHealth = async () => {
    try {
      setServerStatus('checking')
      const health = await schedulingApi.healthCheck()
      setServerStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy')

      if (health.status === 'healthy') {
        setError(null)
        const connectionTest = await schedulingApi.testConnection()
        if (!connectionTest.success) {
          setError(connectionTest.message)
        }
      }
    } catch (error) {
      console.error('Health check error:', error)
      setServerStatus('unhealthy')
      setError('Unable to connect to server. Please ensure the server is running on http://localhost:5000')
    }
  }

  const addProcess = () => {
    const newId = Math.max(...processes.map(p => p.id), 0) + 1
    setProcesses([...processes, { id: newId, arrival_time: 0, burst_time: 1, priority: 1 }])
  }

  const addSampleProcesses = () => {
    const sampleProcesses: Process[] = [
      { id: 1, arrival_time: 0, burst_time: 6, priority: 1 },
      { id: 2, arrival_time: 1, burst_time: 8, priority: 2 },
      { id: 3, arrival_time: 2, burst_time: 7, priority: 0 },
      { id: 4, arrival_time: 3, burst_time: 3, priority: 3 },
      { id: 5, arrival_time: 4, burst_time: 4, priority: 1 }
    ]
    setProcesses(sampleProcesses)
  }

  const shuffleProcesses = () => {
    const shuffled = [...processes].map(p => ({
      ...p,
      arrival_time: Math.floor(Math.random() * 5),
      burst_time: Math.floor(Math.random() * 10) + 1,
      priority: Math.floor(Math.random() * 4)
    }))
    setProcesses(shuffled)
  }

  const removeProcess = (id: number) => {
    if (processes.length > 1) {
      setProcesses(processes.filter(p => p.id !== id))
    }
  }

  const updateProcess = (id: number, field: keyof Process, value: number) => {
    setProcesses(processes.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const updateMLFQQuantum = (index: number, value: number) => {
    const newQuantums = [...mlfqConfig.time_quantums]
    newQuantums[index] = value
    setMlfqConfig(prev => ({ ...prev, time_quantums: newQuantums }))
  }

  const validateProcesses = (): boolean => {
    for (const process of processes) {
      if (process.burst_time <= 0) {
        setError(`Process ${process.id}: Burst time must be greater than 0`)
        return false
      }
      if (process.arrival_time < 0) {
        setError(`Process ${process.id}: Arrival time cannot be negative`)
        return false
      }
      if ((activeAlgorithm === 'priority' || activeAlgorithm === 'mlfq') && (!process.priority || process.priority < 0)) {
        setError(`Process ${process.id}: Priority must be specified and non-negative for ${activeAlgorithm} scheduling`)
        return false
      }
    }
    return true
  }

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
      const request: SchedulingRequest = {
        processes: processes.map(p => ({
          ...p,
          priority: p.priority || 0
        })),
        context_switch_cost: contextSwitchCost,
      }

      // Algorithm-specific configurations
      if (algorithm === 'round-robin') {
        if (timeQuantum <= 0) {
          setError('Time quantum must be greater than 0 for Round Robin scheduling')
          setLoading(false)
          return
        }
        request.time_quantum = timeQuantum
        
        // Add Round Robin variation support
        if (rrVariation === 'weighted') {
          request.process_weights = processWeights
        }
        request.rr_variation = rrVariation
      }

      if (algorithm === 'sjf' || algorithm === 'priority') {
        request.preemptive = preemptive
        
        // Add priority-specific options
        if (algorithm === 'priority') {
          request.priority_type = priorityType
          request.priority_inversion_handling = priorityInversion
        }
      }

      if (algorithm === 'mlfq') {
        if (mlfqConfig.time_quantums.some(q => q <= 0)) {
          setError('All time quantums must be greater than 0 for MLFQ scheduling')
          setLoading(false)
          return
        }
        request.mlfq_config = {
          ...mlfqConfig,
          // Ensure all MLFQ config is properly sent
          num_queues: mlfqConfig.num_queues,
          time_quantums: mlfqConfig.time_quantums,
          aging_threshold: mlfqConfig.aging_threshold,
          boost_interval: mlfqConfig.boost_interval,
          priority_boost: mlfqConfig.priority_boost,
          feedback_mechanism: mlfqConfig.feedback_mechanism
        }
      }

      let result: SchedulingResult
      switch (algorithm) {
        case 'fcfs':
          result = await schedulingApi.fcfs(request)
          break
        case 'sjf':
          result = await schedulingApi.sjf(request)
          break
        case 'priority':
          result = await schedulingApi.priority(request)
          break
        case 'round-robin':
          result = await schedulingApi.roundRobin(request)
          break
        case 'mlfq':
          result = await schedulingApi.mlfq(request)
          break
        default:
          throw new Error(`Algorithm ${algorithm} not implemented`)
      }

      if (result.success) {
        if (!result.data) {
          setError('No data received from server')
          return
        }

        if (!result.data.processes || result.data.processes.length === 0) {
          setError('No process data received from server')
          return
        }

        setResults(result)
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
              CPU Scheduling Simulator
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Simulate and visualize different CPU scheduling algorithms with comprehensive configuration options
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
          {/* Configuration Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-foreground">Process Configuration</CardTitle>
                    <CardDescription>Set up processes and their properties</CardDescription>
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
                          Process {process.id}
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
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor={`arrival-${process.id}`} className="text-xs text-muted-foreground">
                              Arrival Time
                            </Label>
                            <Input
                              id={`arrival-${process.id}`}
                              type="number"
                              min="0"
                              value={process.arrival_time}
                              onChange={(e) => updateProcess(process.id, 'arrival_time', parseInt(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`burst-${process.id}`} className="text-xs text-muted-foreground">
                              Burst Time
                            </Label>
                            <Input
                              id={`burst-${process.id}`}
                              type="number"
                              min="1"
                              value={process.burst_time}
                              onChange={(e) => updateProcess(process.id, 'burst_time', parseInt(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        {(activeAlgorithm === 'priority' || activeAlgorithm === 'mlfq') && (
                          <div>
                            <Label htmlFor={`priority-${process.id}`} className="text-xs text-muted-foreground">
                              Priority (1 = highest)
                            </Label>
                            <Input
                              id={`priority-${process.id}`}
                              type="number"
                              min="0"
                              value={process.priority || 1}
                              onChange={(e) => updateProcess(process.id, 'priority', parseInt(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}

                        {(activeAlgorithm === 'round-robin' && rrVariation === 'weighted') && (
                          <div>
                            <Label htmlFor={`weight-${process.id}`} className="text-xs text-muted-foreground">
                              Weight
                            </Label>
                            <Input
                              id={`weight-${process.id}`}
                              type="number"
                              min="1"
                              value={processWeights[process.id] || 1}
                              onChange={(e) => setProcessWeights(prev => ({
                                ...prev,
                                [process.id]: parseInt(e.target.value) || 1
                              }))}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
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
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-foreground">Algorithm Configuration</CardTitle>
                    <CardDescription>Configure algorithm-specific parameters</CardDescription>
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
                <TabsList className="grid w-full grid-cols-5 bg-muted">
                  <TabsTrigger value="fcfs" className="text-xs sm:text-sm">FCFS</TabsTrigger>
                  <TabsTrigger value="sjf" className="text-xs sm:text-sm">SJF</TabsTrigger>
                  <TabsTrigger value="priority" className="text-xs sm:text-sm">Priority</TabsTrigger>
                  <TabsTrigger value="round-robin" className="text-xs sm:text-sm">Round Robin</TabsTrigger>
                  <TabsTrigger value="mlfq" className="text-xs sm:text-sm">MLFQ</TabsTrigger>
                </TabsList>

                {/* FCFS Configuration */}
                <TabsContent value="fcfs" className="mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-foreground">First Come First Served (FCFS)</h3>
                        <p className="text-sm text-muted-foreground">Non-preemptive algorithm that executes processes in order of arrival</p>
                      </div>
                      {advancedConfigExpanded && (
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          <div>
                            <Label className="text-sm font-medium text-foreground">Context Switch Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={contextSwitchCost}
                              onChange={(e) => setContextSwitchCost(parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* SJF Configuration */}
                <TabsContent value="sjf" className="mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-foreground">Shortest Job First (SJF)</h3>
                        <p className="text-sm text-muted-foreground">Executes the process with the shortest burst time first</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="sjf-preemptive"
                            checked={preemptive}
                            onCheckedChange={setPreemptive}
                          />
                          <Label htmlFor="sjf-preemptive" className="text-sm">
                            Preemptive (SRTF - Shortest Remaining Time First)
                          </Label>
                        </div>
                        {advancedConfigExpanded && (
                          <div>
                            <Label className="text-sm font-medium text-foreground">Context Switch Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={contextSwitchCost}
                              onChange={(e) => setContextSwitchCost(parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Priority Configuration */}
                <TabsContent value="priority" className="mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-foreground">Priority Scheduling</h3>
                        <p className="text-sm text-muted-foreground">Executes processes based on priority levels (0 = highest priority)</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="priority-preemptive"
                            checked={preemptive}
                            onCheckedChange={setPreemptive}
                          />
                          <Label htmlFor="priority-preemptive" className="text-sm">
                            Preemptive Priority Scheduling
                          </Label>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Priority Type</Label>
                          <select
                            value={priorityType}
                            onChange={(e) => setPriorityType(e.target.value as 'fixed' | 'dynamic')}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md text-sm"
                          >
                            <option value="fixed">Fixed Priority</option>
                            <option value="dynamic">Dynamic Priority</option>
                          </select>
                        </div>
                      </div>
                      {advancedConfigExpanded && (
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="priority-inversion"
                              checked={priorityInversion}
                              onCheckedChange={setPriorityInversion}
                            />
                            <Label htmlFor="priority-inversion" className="text-sm">
                              Priority Inversion Handling
                            </Label>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-foreground">Context Switch Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={contextSwitchCost}
                              onChange={(e) => setContextSwitchCost(parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Round Robin Configuration */}
                <TabsContent value="round-robin" className="mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-foreground">Round Robin Scheduling</h3>
                        <p className="text-sm text-muted-foreground">Each process gets equal time slices in cyclic order</p>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Time Quantum</Label>
                          <Input
                            type="number"
                            min="1"
                            value={timeQuantum}
                            onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Round Robin Variation</Label>
                          <select
                            value={rrVariation}
                            onChange={(e) => setRrVariation(e.target.value as 'standard' | 'weighted' | 'deficit')}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md text-sm"
                          >
                            <option value="standard">Standard Round Robin</option>
                            <option value="weighted">Weighted Round Robin</option>
                            <option value="deficit">Deficit Round Robin</option>
                          </select>
                        </div>
                        {advancedConfigExpanded && (
                          <div>
                            <Label className="text-sm font-medium text-foreground">Context Switch Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={contextSwitchCost}
                              onChange={(e) => setContextSwitchCost(parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                      {rrVariation !== 'standard' && (
                        <div className="pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-blue-400" />
                            <span className="text-sm text-muted-foreground">
                              {rrVariation === 'weighted' 
                                ? 'Set process weights in the process configuration above'
                                : 'Deficit counter maintains fairness across different burst times'
                              }
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* MLFQ Configuration */}
                <TabsContent value="mlfq" className="mt-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-foreground">Multi-Level Feedback Queue (MLFQ)</h3>
                        <p className="text-sm text-muted-foreground">Dynamic priority queues with feedback mechanisms</p>
                      </div>
                      
                      {/* Basic MLFQ Settings */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Number of Queues</Label>
                          <Input
                            type="number"
                            min="2"
                            max="10"
                            value={mlfqConfig.num_queues}
                            onChange={(e) => setMlfqConfig(prev => ({
                              ...prev,
                              num_queues: parseInt(e.target.value) || 2
                            }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Feedback Mechanism</Label>
                          <select
                            value={mlfqConfig.feedback_mechanism}
                            onChange={(e) => setMlfqConfig(prev => ({
                              ...prev,
                              feedback_mechanism: e.target.value as 'time' | 'io' | 'both'
                            }))}
                            className="w-full mt-1 p-2 bg-background border border-border rounded-md text-sm"
                          >
                            <option value="time">Time-based Feedback</option>
                            <option value="io">I/O-based Feedback</option>
                            <option value="both">Combined Feedback</option>
                          </select>
                        </div>
                      </div>

                      {/* Time Quantums for Each Queue */}
                      <div>
                        <Label className="text-sm font-medium text-foreground mb-2 block">
                          Time Quantum for Each Queue
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                          {mlfqConfig.time_quantums.map((quantum, index) => (
                            <div key={index} className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Queue {index}</Label>
                              <Input
                                type="number"
                                min="1"
                                value={quantum}
                                onChange={(e) => updateMLFQQuantum(index, parseInt(e.target.value) || 1)}
                                className="h-8 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Advanced MLFQ Settings */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-foreground">Aging Threshold</Label>
                          <Input
                            type="number"
                            min="1"
                            value={mlfqConfig.aging_threshold}
                            onChange={(e) => setMlfqConfig(prev => ({
                              ...prev,
                              aging_threshold: parseInt(e.target.value) || 1
                            }))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Time units before promoting to higher priority queue
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-foreground">Priority Boost Interval</Label>
                          <Input
                            type="number"
                            min="0"
                            value={mlfqConfig.boost_interval}
                            onChange={(e) => setMlfqConfig(prev => ({
                              ...prev,
                              boost_interval: parseInt(e.target.value) || 0
                            }))}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Interval to boost all processes to highest queue (0 = disabled)
                          </p>
                        </div>
                      </div>

                      {advancedConfigExpanded && (
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="mlfq-priority-boost"
                              checked={mlfqConfig.priority_boost}
                              onCheckedChange={(checked) => setMlfqConfig(prev => ({
                                ...prev,
                                priority_boost: checked
                              }))}
                            />
                            <Label htmlFor="mlfq-priority-boost" className="text-sm">
                              Enable Priority Boosting
                            </Label>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-foreground">Context Switch Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={contextSwitchCost}
                              onChange={(e) => setContextSwitchCost(parseFloat(e.target.value) || 0)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Run Button for Each Algorithm */}
                {['fcfs', 'sjf', 'priority', 'round-robin', 'mlfq'].map((algorithm) => (
                  <TabsContent key={`${algorithm}-run`} value={algorithm}>
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={() => runAlgorithm(algorithm)}
                        disabled={loading || serverStatus !== 'healthy'}
                        className="flex items-center gap-2 min-w-[160px]"
                        size="lg"
                      >
                        <Play className="w-4 h-4" />
                        {loading ? 'Running Simulation...' : `Run ${algorithm.toUpperCase().replace('-', ' ')} Simulation`}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Results Section */}
          {results && results.success && results.data && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  {activeAlgorithm.toUpperCase().replace('-', ' ')} Results
                </h2>
              </div>

              {/* Gantt Chart */}
              <GanttChart
                data={results.data.schedule || []}
                title="Execution Timeline"
              />

              {/* Metrics Chart */}
              <MetricsChart
                processes={results.data.processes || []}
                metrics={results.data.metrics}
                title="Performance Analysis"
              />
            </div>
          )}

          {/* Empty State */}
          {!results && (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Ready to Simulate</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Configure your processes and algorithm parameters above, then run the simulation. 
                  The Gantt chart and performance metrics will appear here.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">Configure Processes</Badge>
                  <Badge variant="outline">Set Algorithm Parameters</Badge>
                  <Badge variant="outline">Run Simulation</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function getAlgorithmDescription(algorithm: string): string {
  const descriptions = {
    'fcfs': 'Processes executed in order of arrival',
    'sjf': 'Shortest burst time executes first',
    'priority': 'Executes based on priority levels (0 = highest)',
    'round-robin': 'Equal time slices in cyclic order',
    'mlfq': 'Dynamic multi-level priority queues'
  }
  return descriptions[algorithm as keyof typeof descriptions] || ''
}