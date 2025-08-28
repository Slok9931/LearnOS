import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Shuffle
} from 'lucide-react'
import { GanttChart } from '@/components/charts/GanttChart'
import { MetricsChart } from '@/components/charts/MetricsChart'
import schedulingApi, { handleApiError } from '@/services/api'
import { Process, SchedulingRequest, SchedulingResult } from '@/types/scheduling'

export default function CPUScheduling() {
  const [processes, setProcesses] = useState<Process[]>([
    { id: 1, arrival_time: 0, burst_time: 5, priority: 1 }
  ])
  const [timeQuantum, setTimeQuantum] = useState(2)
  const [results, setResults] = useState<SchedulingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeAlgorithm, setActiveAlgorithm] = useState('fcfs')
  const [serverStatus, setServerStatus] = useState<'checking' | 'healthy' | 'unhealthy'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [processListExpanded, setProcessListExpanded] = useState(true)

  // Check server health on component mount
  useEffect(() => {
    checkServerHealth()
  }, [])

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
          priority: p.priority || 0,
        })),
        context_switch_cost: 0.5,
      }

      if (algorithm === 'round-robin') {
        if (timeQuantum <= 0) {
          setError('Time quantum must be greater than 0 for Round Robin scheduling')
          setLoading(false)
          return
        }
        request.time_quantum = timeQuantum
      }

      if (algorithm === 'sjf' || algorithm === 'priority') {
        request.preemptive = false
      }

      if (algorithm === 'mlfq') {
        request.mlfq_config = {
          num_queues: 3,
          time_quantums: [2, 4, 8],
          aging_threshold: 10,
          boost_interval: 100
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
              Simulate and visualize different CPU scheduling algorithms with interactive charts and performance metrics
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
                    <CardTitle className="text-foreground">Configuration</CardTitle>
                    <CardDescription>Set up processes and algorithm parameters</CardDescription>
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
                              Priority (0 = highest)
                            </Label>
                            <Input
                              id={`priority-${process.id}`}
                              type="number"
                              min="0"
                              value={process.priority || 0}
                              onChange={(e) => updateProcess(process.id, 'priority', parseInt(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Algorithm Configuration */}
                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  {/* Time Quantum Setting */}
                  {activeAlgorithm === 'round-robin' && (
                    <div className="space-y-2 flex flex-col items-start">
                      <Label htmlFor="time-quantum" className="text-sm font-medium text-foreground">
                        Time Quantum
                      </Label>
                      <Input
                        id="time-quantum"
                        type="number"
                        min="1"
                        value={timeQuantum}
                        onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)}
                        className="max-w-32"
                      />
                    </div>
                  )}

                  {/* Algorithm Info */}
                  <div className="space-y-2 flex flex-col items-end">
                    <Label className="text-sm font-medium text-foreground">Current Algorithm</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {activeAlgorithm.toUpperCase().replace('-', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getAlgorithmDescription(activeAlgorithm)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Algorithm Selection and Simulation */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-foreground">Algorithm Selection</CardTitle>
                  <CardDescription>Choose and run different scheduling algorithms</CardDescription>
                </div>
              </div>
              
              <Tabs value={activeAlgorithm} onValueChange={setActiveAlgorithm} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-muted">
                  <TabsTrigger value="fcfs" className="text-xs sm:text-sm">FCFS</TabsTrigger>
                  <TabsTrigger value="sjf" className="text-xs sm:text-sm">SJF</TabsTrigger>
                  <TabsTrigger value="priority" className="text-xs sm:text-sm">Priority</TabsTrigger>
                  <TabsTrigger value="round-robin" className="text-xs sm:text-sm">Round Robin</TabsTrigger>
                  <TabsTrigger value="mlfq" className="text-xs sm:text-sm">MLFQ</TabsTrigger>
                </TabsList>

                {['fcfs', 'sjf', 'priority', 'round-robin', 'mlfq'].map((algorithm) => (
                  <TabsContent key={algorithm} value={algorithm} className="mt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="space-y-1">
                        <h3 className="font-medium text-foreground capitalize">
                          {algorithm.replace('-', ' ')} Scheduling
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getAlgorithmDescription(algorithm)}
                        </p>
                      </div>
                      <Button
                        onClick={() => runAlgorithm(algorithm)}
                        disabled={loading || serverStatus !== 'healthy'}
                        className="flex items-center gap-2 min-w-[140px]"
                        size="lg"
                      >
                        <Play className="w-4 h-4" />
                        {loading ? 'Running...' : 'Run Simulation'}
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardHeader>
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
                  Configure your processes above and select an algorithm to run the simulation. 
                  The Gantt chart and performance metrics will appear here.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="outline">Configure Processes</Badge>
                  <Badge variant="outline">Select Algorithm</Badge>
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