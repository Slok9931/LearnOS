import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  BookOpen,
  Clock,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Zap,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { ScheduleEntry, ProcessResult, SchedulingResult } from '@/types/scheduling'

interface ExplanationStep {
  time: number
  event: string
  description: string
  details: string[]
  processId?: number
  queueLevel?: number
  reason: string
  type: 'execution' | 'context_switch' | 'arrival' | 'completion' | 'demotion' | 'promotion' | 'boost'
}

interface ExplanationPanelProps {
  results: SchedulingResult
  algorithm: string
  processes: any[]
  algorithmConfig?: any
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  results,
  algorithm,
  processes,
  algorithmConfig
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showDetails, setShowDetails] = useState(true)

  // Generate explanation steps from results
  const generateExplanationSteps = (): ExplanationStep[] => {
    const steps: ExplanationStep[] = []
    const schedule = results.data?.schedule || []
    const processResults = results.data?.processes || []
    
    // Add initial setup step
    steps.push({
      time: 0,
      event: `${algorithm.toUpperCase()} Algorithm Started`,
      description: `Initializing ${algorithm.toUpperCase()} scheduling algorithm`,
      details: [
        `Total processes: ${processes.length}`,
        algorithm === 'round-robin' ? `Time quantum: ${algorithmConfig?.timeQuantum || 2}` : '',
        algorithm === 'mlfq' ? `Number of queues: ${algorithmConfig?.mlfqConfig?.num_queues || 3}` : '',
        algorithm === 'mlfq' ? `Time quantums: [${algorithmConfig?.mlfqConfig?.time_quantums?.join(', ') || '2, 4, 8'}]` : '',
        'All processes start in ready state'
      ].filter(Boolean),
      reason: getAlgorithmDescription(algorithm),
      type: 'arrival'
    })

    // Process arrivals
    processes.forEach(process => {
      if (process.arrival_time > 0) {
        steps.push({
          time: process.arrival_time,
          event: `Process P${process.id} Arrives`,
          description: `Process P${process.id} enters the system`,
          details: [
            `Arrival time: ${process.arrival_time}`,
            `Burst time: ${process.burst_time}`,
            `Priority: ${process.priority || 0}`,
            algorithm === 'mlfq' ? 'Added to highest priority queue (Q0)' : 'Added to ready queue'
          ],
          processId: process.id,
          queueLevel: algorithm === 'mlfq' ? 0 : undefined,
          reason: 'New processes always start at highest priority level',
          type: 'arrival'
        })
      }
    })

    // Process schedule events
    schedule.forEach((entry, index) => {
      if (entry.type === 'execution') {
        const process = processes.find(p => p.id === entry.process_id)
        const processResult = processResults.find(p => p.pid === entry.process_id)
        const executionTime = entry.end_time - entry.start_time
        const isFirstRun = !steps.some(s => s.processId === entry.process_id && s.type === 'execution')
        
        steps.push({
          time: entry.start_time,
          event: `Process P${entry.process_id} Executing`,
          description: `P${entry.process_id} runs ${isFirstRun ? '(first time)' : '(continued)'}`,
          details: [
            `Execution time: ${executionTime} units`,
            `Queue: ${entry.queue_level !== undefined ? `Q${entry.queue_level}` : 'Ready Queue'}`,
            `Remaining time: ${processResult ? (processResult.burst_time - (entry.end_time - process.arrival_time) + processResult.waiting_time).toFixed(1) : 'Unknown'}`,
            isFirstRun ? `Response time: ${(entry.start_time - process.arrival_time).toFixed(1)}` : '',
            getExecutionReason(algorithm, entry, index, schedule, algorithmConfig)
          ].filter(Boolean),
          processId: entry.process_id,
          queueLevel: entry.queue_level,
          reason: getExecutionReason(algorithm, entry, index, schedule, algorithmConfig),
          type: 'execution'
        })

        // Check for completion
        if (processResult && Math.abs(entry.end_time - processResult.completion_time) < 0.1) {
          steps.push({
            time: entry.end_time,
            event: `Process P${entry.process_id} Completed`,
            description: `P${entry.process_id} finishes execution`,
            details: [
              `Total turnaround time: ${processResult.turnaround_time.toFixed(2)}`,
              `Total waiting time: ${processResult.waiting_time.toFixed(2)}`,
              'Process removed from system'
            ],
            processId: entry.process_id,
            reason: 'Process has completed all its required CPU time',
            type: 'completion'
          })
        } else {
          // Check for demotion/preemption
          const nextEntry = schedule[index + 1]
          if (nextEntry && nextEntry.process_id !== entry.process_id) {
            if (algorithm === 'mlfq' && entry.queue_level !== undefined) {
              const timeQuantum = algorithmConfig?.mlfqConfig?.time_quantums?.[entry.queue_level] || 2
              if (executionTime >= timeQuantum) {
                steps.push({
                  time: entry.end_time,
                  event: `Process P${entry.process_id} Demoted`,
                  description: `P${entry.process_id} moved to lower priority queue`,
                  details: [
                    `Used full time quantum: ${timeQuantum}`,
                    `Moved from Q${entry.queue_level} to Q${Math.min((entry.queue_level || 0) + 1, (algorithmConfig?.mlfqConfig?.num_queues || 3) - 1)}`,
                    'Lower priority queues have longer time quantums',
                    'Process will run less frequently'
                  ],
                  processId: entry.process_id,
                  queueLevel: entry.queue_level,
                  reason: 'Process used its full time quantum, indicating it needs more CPU time',
                  type: 'demotion'
                })
              }
            } else if (algorithm === 'round-robin') {
              steps.push({
                time: entry.end_time,
                event: `Process P${entry.process_id} Preempted`,
                description: `P${entry.process_id} time quantum expired`,
                details: [
                  `Time quantum: ${algorithmConfig?.timeQuantum || 2}`,
                  'Process moved to end of ready queue',
                  'Next process gets CPU time'
                ],
                processId: entry.process_id,
                reason: 'Round Robin ensures fair CPU sharing through time slicing',
                type: 'demotion'
              })
            }
          }
        }
      } else if (entry.type === 'context_switch') {
        steps.push({
          time: entry.start_time,
          event: 'Context Switch',
          description: `Switching between processes`,
          details: [
            `Context switch cost: ${(entry.end_time - entry.start_time).toFixed(1)} units`,
            'CPU saves current process state',
            'CPU loads next process state',
            'No useful work done during this time'
          ],
          reason: 'Context switches are necessary but add overhead to the system',
          type: 'context_switch'
        })
      }
    })

    // Add MLFQ specific events (priority boost, aging)
    if (algorithm === 'mlfq' && algorithmConfig?.mlfqConfig) {
      const boostInterval = algorithmConfig.mlfqConfig.boost_interval
      if (boostInterval > 0) {
        const totalTime = Math.max(...schedule.map(s => s.end_time))
        for (let time = boostInterval; time < totalTime; time += boostInterval) {
          steps.push({
            time: time,
            event: 'Priority Boost',
            description: 'All processes moved to highest priority queue',
            details: [
              'Prevents starvation of lower priority processes',
              'All processes moved to Q0',
              `Occurs every ${boostInterval} time units`,
              'Aging mechanism reset'
            ],
            reason: 'Priority boost prevents starvation and ensures fairness',
            type: 'boost'
          })
        }
      }
    }

    // Sort steps by time
    return steps.sort((a, b) => {
      if (a.time === b.time) {
        const typeOrder = ['arrival', 'boost', 'promotion', 'execution', 'demotion', 'completion', 'context_switch']
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
      }
      return a.time - b.time
    })
  }

  const explanationSteps = generateExplanationSteps()

  // Auto-play functionality
  React.useEffect(() => {
    if (autoPlay && currentStep < explanationSteps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1)
      }, 2000)
      return () => clearTimeout(timer)
    } else if (autoPlay && currentStep >= explanationSteps.length - 1) {
      setAutoPlay(false)
    }
  }, [autoPlay, currentStep, explanationSteps.length])

  const currentStepData = explanationSteps[currentStep]

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'execution': return <Play className="w-4 h-4 text-green-400" />
      case 'completion': return <CheckCircle className="w-4 h-4 text-blue-400" />
      case 'demotion': return <ArrowDown className="w-4 h-4 text-orange-400" />
      case 'promotion': return <ArrowUp className="w-4 h-4 text-purple-400" />
      case 'boost': return <Zap className="w-4 h-4 text-yellow-400" />
      case 'context_switch': return <ArrowRight className="w-4 h-4 text-gray-400" />
      case 'arrival': return <Clock className="w-4 h-4 text-cyan-400" />
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStepColor = (type: string) => {
    switch (type) {
      case 'execution': return 'bg-green-500/10 border-green-500/30'
      case 'completion': return 'bg-blue-500/10 border-blue-500/30'
      case 'demotion': return 'bg-orange-500/10 border-orange-500/30'
      case 'promotion': return 'bg-purple-500/10 border-purple-500/30'
      case 'boost': return 'bg-yellow-500/10 border-yellow-500/30'
      case 'context_switch': return 'bg-gray-500/10 border-gray-500/30'
      case 'arrival': return 'bg-cyan-500/10 border-cyan-500/30'
      default: return 'bg-muted/30 border-border'
    }
  }

  if (!currentStepData) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No explanation data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-foreground">Step-by-Step Explanation</CardTitle>
              < CardDescription className='ml-3'>
                Understanding {algorithm.toUpperCase()} scheduling decisions
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Step {currentStep + 1} of {explanationSteps.length}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(0)}
            disabled={currentStep === 0}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant={autoPlay ? "destructive" : "default"}
            size="sm"
            onClick={() => setAutoPlay(!autoPlay)}
            disabled={currentStep >= explanationSteps.length - 1}
          >
            {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStep(Math.min(explanationSteps.length - 1, currentStep + 1))}
            disabled={currentStep >= explanationSteps.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Current Step */}
        <div className={`p-4 rounded-lg border ${getStepColor(currentStepData.type)}`}>
          <div className="flex items-start gap-3">
            {getStepIcon(currentStepData.type)}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{currentStepData.event}</h3>
                <Badge variant="secondary">
                  Time: {currentStepData.time}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {currentStepData.description}
              </p>

              {showDetails && (
                <div className="space-y-2">
                  <Separator />
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-foreground uppercase tracking-wide">
                      Details:
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {currentStepData.details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="text-xs font-medium text-foreground uppercase tracking-wide mb-1">
                      Why this happened:
                    </h4>
                    <p className="text-xs text-muted-foreground italic">
                      {currentStepData.reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(((currentStep + 1) / explanationSteps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / explanationSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Timeline Overview */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <ScrollArea className="h-32 w-full border border-border rounded-md p-2">
            <div className="space-y-1">
              {explanationSteps.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${
                    index === currentStep 
                      ? 'bg-primary/20 text-primary' 
                      : index < currentStep 
                        ? 'text-muted-foreground hover:bg-muted/50' 
                        : 'text-muted-foreground/50 hover:bg-muted/30'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  {getStepIcon(step.type)}
                  <span className="flex-1">{step.event}</span>
                  <Badge variant="outline" className="text-xs">
                    T{step.time}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}

function getAlgorithmDescription(algorithm: string): string {
  const descriptions = {
    'fcfs': 'First Come First Served - processes are executed in the order they arrive',
    'sjf': 'Shortest Job First - the process with the smallest burst time is selected next',
    'priority': 'Priority Scheduling - processes are executed based on their priority values',
    'round-robin': 'Round Robin - each process gets a fixed time slice in circular order',
    'mlfq': 'Multi-Level Feedback Queue - uses multiple priority queues with feedback mechanisms'
  }
  return descriptions[algorithm as keyof typeof descriptions] || 'Unknown algorithm'
}

function getExecutionReason(algorithm: string, entry: ScheduleEntry, index: number, schedule: ScheduleEntry[], config: any): string {
  switch (algorithm) {
    case 'fcfs':
      return 'Selected because it arrived earliest among waiting processes'
    case 'sjf':
      return 'Selected because it has the shortest remaining burst time'
    case 'priority':
      return 'Selected because it has the highest priority among waiting processes'
    case 'round-robin':
      return 'Selected by round-robin rotation - each process gets equal time'
    case 'mlfq':
      return `Selected from Queue ${entry.queue_level || 0} - highest priority queue with waiting processes`
    default:
      return 'Selected by algorithm logic'
  }
}

export default ExplanationPanel