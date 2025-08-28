import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Play, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { GanttChart } from '@/components/charts/GanttChart'
import { MetricsChart } from '@/components/charts/MetricsChart'
import { ResultsTable } from '@/components/results/ResultsTable'
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

  // Add better error handling and debugging in the runAlgorithm function
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

      // Add algorithm-specific parameters
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

      console.log('Sending request:', request)

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

      console.log('Received result:', result)

      if (result.success) {
        // Additional validation before setting results
        if (!result.data) {
          setError('No data received from server')
          return
        }

        if (!result.data.processes || result.data.processes.length === 0) {
          setError('No process data received from server')
          return
        }

        if (!result.data.schedule || result.data.schedule.length === 0) {
          console.warn('No schedule data received - Gantt chart will be empty')
        }

        if (!result.data.metrics) {
          console.warn('No metrics data received')
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">CPU Scheduling Algorithms</h1>
        <p className="text-muted-foreground">
          Simulate and visualize different CPU scheduling algorithms
        </p>

        {/* Server Status */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {serverStatus === 'checking' && (
            <Badge variant="outline" className="gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Checking server...
            </Badge>
          )}
          {serverStatus === 'healthy' && (
            <Badge variant="outline" className="gap-2 text-green-700 border-green-200">
              <Wifi className="w-4 h-4" />
              Server Online (Port 5000)
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
                className="h-4 p-1 ml-2"
              >
                Retry
              </Button>
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Server Offline Alert */}
      {serverStatus === 'unhealthy' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The backend server is not running. Please start it by running:
            <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
              cd /Users/sloktulsyan/Desktop/LearnOS/server && python3 run.py
            </code>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process Input Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Process Configuration
                <Button onClick={addProcess} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Add and configure processes for scheduling simulation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {processes.map((process) => (
                <Card key={process.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">Process {process.id}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProcess(process.id)}
                      disabled={processes.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`arrival-${process.id}`}>Arrival Time</Label>
                      <Input
                        id={`arrival-${process.id}`}
                        type="number"
                        min="0"
                        value={process.arrival_time}
                        onChange={(e) => updateProcess(process.id, 'arrival_time', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`burst-${process.id}`}>Burst Time</Label>
                      <Input
                        id={`burst-${process.id}`}
                        type="number"
                        min="1"
                        value={process.burst_time}
                        onChange={(e) => updateProcess(process.id, 'burst_time', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    {(activeAlgorithm === 'priority' || activeAlgorithm === 'mlfq') && (
                      <div>
                        <Label htmlFor={`priority-${process.id}`}>Priority (0 = highest)</Label>
                        <Input
                          id={`priority-${process.id}`}
                          type="number"
                          min="0"
                          value={process.priority || 0}
                          onChange={(e) => updateProcess(process.id, 'priority', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {activeAlgorithm === 'round-robin' && (
                <>
                  <Separator />
                  <div>
                    <Label htmlFor="time-quantum">Time Quantum</Label>
                    <Input
                      id="time-quantum"
                      type="number"
                      min="1"
                      value={timeQuantum}
                      onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Algorithm Selection and Results */}
        <div className="lg:col-span-2">
          <Tabs value={activeAlgorithm} onValueChange={setActiveAlgorithm}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="fcfs">FCFS</TabsTrigger>
              <TabsTrigger value="sjf">SJF</TabsTrigger>
              <TabsTrigger value="priority">Priority</TabsTrigger>
              <TabsTrigger value="round-robin">Round Robin</TabsTrigger>
              <TabsTrigger value="mlfq">MLFQ</TabsTrigger>
            </TabsList>

            {['fcfs', 'sjf', 'priority', 'round-robin', 'mlfq'].map((algorithm) => (
              <TabsContent key={algorithm} value={algorithm} className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="capitalize">
                          {algorithm.replace('-', ' ')} Scheduling
                        </CardTitle>
                        <CardDescription>
                          {getAlgorithmDescription(algorithm)}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => runAlgorithm(algorithm)}
                        disabled={loading || serverStatus !== 'healthy'}
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {loading ? 'Running...' : 'Run Simulation'}
                      </Button>
                    </div>
                  </CardHeader>

                  {results && results.success && (
                    <CardContent className="space-y-6">
                      {/* Quick Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {results.data?.metrics?.average_waiting_time?.toFixed(2) || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Waiting Time</div>
                        </Card>
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {results.data?.metrics?.average_turnaround_time?.toFixed(2) || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">Avg Turnaround Time</div>
                        </Card>
                        <Card className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {results.data?.metrics?.cpu_utilization?.toFixed(2) || 'N/A'}%
                          </div>
                          <div className="text-sm text-muted-foreground">CPU Utilization</div>
                        </Card>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* Results Section */}
      {results && results.success && results.data && (
        <div className="space-y-6">
          {/* Gantt Chart */}
          <GanttChart
            data={results.data.schedule || []}
            title={`${activeAlgorithm.toUpperCase().replace('-', ' ')} - Gantt Chart`}
          />

          {/* Metrics Chart */}
          <MetricsChart
            processes={results.data.processes || []}
            metrics={results.data.metrics}
            title={`${activeAlgorithm.toUpperCase().replace('-', ' ')} - Performance Metrics`}
          />

          {/* Results Table */}
          <ResultsTable
            data={results.data.processes || []}
            title={`${activeAlgorithm.toUpperCase().replace('-', ' ')} - Process Results`}
          />
        </div>
      )}
    </div>
  )
}

function getAlgorithmDescription(algorithm: string): string {
  const descriptions = {
    'fcfs': 'First Come First Serve - Processes are executed in order of arrival',
    'sjf': 'Shortest Job First - Process with shortest burst time executes first',
    'priority': 'Priority Scheduling - Processes execute based on priority levels (0 = highest priority)',
    'round-robin': 'Round Robin - Each process gets equal time slices in cyclic order',
    'mlfq': 'Multi-Level Feedback Queue - Dynamic priority-based scheduling with multiple queues'
  }
  return descriptions[algorithm as keyof typeof descriptions] || ''
}