import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Terminal as TerminalIcon,
  BookOpen,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Code,
  GitBranch,
  Activity
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Terminal from '@/components/terminal/Terminal'

const Index = () => {
    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-4 sm:p-6 space-y-12">
                {/* Hero Section */}
                <div className="text-center space-y-6 py-12">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm">
                            <Code className="h-4 w-4" />
                            Interactive Operating System Learning
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-green-400 to-purple-400 bg-clip-text text-transparent">
                            LearnOS
                        </h1>
                        <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            Master operating system concepts through hands-on simulations and interactive terminals
                        </p>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Dive deep into CPU scheduling, memory management, process virtualization, and more with our comprehensive learning platform designed for students and developers.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-8 pt-8">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">5+</div>
                            <div className="text-sm text-gray-400">Algorithms</div>
                        </div>
                        <div className="w-px h-8 bg-gray-700"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">15+</div>
                            <div className="text-sm text-gray-400">Commands</div>
                        </div>
                        <div className="w-px h-8 bg-gray-700"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">∞</div>
                            <div className="text-sm text-gray-400">Learning</div>
                        </div>
                    </div>
                </div>

                {/* Terminal Section */}
                <div className="space-y-8">
                    {/* Terminal Component */}
                    <Terminal />
                </div>

                {/* Learning Modules */}
                <div className="space-y-8">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-bold text-white">
                            Comprehensive Learning Modules
                        </h2>
                        <p className="text-gray-300 max-w-2xl mx-auto">
                            Explore specialized simulators for different aspects of operating systems
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* CPU Scheduling */}
                        <Card className="group hover:shadow-2xl transition-all duration-500 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-blue-900/20 hover:to-blue-800/10">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                                        <Cpu className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl text-white">CPU Scheduling</CardTitle>
                                        <CardDescription className="text-gray-400">
                                            Master process scheduling algorithms
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-gray-300 leading-relaxed">
                                    Dive deep into how the CPU scheduler manages processes. Visualize algorithms like FCFS, SJF, 
                                    Round Robin, Priority scheduling, and Multi-Level Feedback Queues with step-by-step explanations.
                                </p>
                                
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-gray-300">Featured Algorithms:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="px-3 py-2 bg-blue-500/10 text-blue-300 rounded-lg text-sm text-center">FCFS</span>
                                        <span className="px-3 py-2 bg-blue-500/10 text-blue-300 rounded-lg text-sm text-center">SJF</span>
                                        <span className="px-3 py-2 bg-blue-500/10 text-blue-300 rounded-lg text-sm text-center">Round Robin</span>
                                        <span className="px-3 py-2 bg-blue-500/10 text-blue-300 rounded-lg text-sm text-center">MLFQ</span>
                                    </div>
                                </div>

                                <Link to="/cpu-scheduling">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">
                                        Explore CPU Scheduling
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Memory Management */}
                        <Card className="group hover:shadow-2xl transition-all duration-500 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-green-900/20 hover:to-green-800/10">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-green-500/20 text-green-400 group-hover:bg-green-500/30 transition-colors">
                                        <MemoryStick className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl text-white">Memory Management</CardTitle>
                                        <CardDescription className="text-gray-400">
                                            Virtual memory and paging systems
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-gray-300 leading-relaxed">
                                    Understand how operating systems manage memory through virtual memory, paging, segmentation, 
                                    and various allocation strategies. See memory management in action.
                                </p>
                                
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-gray-300">Key Concepts:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="px-3 py-2 bg-green-500/10 text-green-300 rounded-lg text-sm text-center">Paging</span>
                                        <span className="px-3 py-2 bg-green-500/10 text-green-300 rounded-lg text-sm text-center">Virtual Memory</span>
                                        <span className="px-3 py-2 bg-green-500/10 text-green-300 rounded-lg text-sm text-center">Allocation</span>
                                        <span className="px-3 py-2 bg-green-500/10 text-green-300 rounded-lg text-sm text-center">Swapping</span>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10">
                                    Coming Soon
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Disk Scheduling */}
                        <Card className="group hover:shadow-2xl transition-all duration-500 border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-purple-900/20 hover:to-purple-800/10">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                                        <HardDrive className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl text-white">Disk Scheduling</CardTitle>
                                        <CardDescription className="text-gray-400">
                                            I/O optimization algorithms
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <p className="text-gray-300 leading-relaxed">
                                    Learn about disk scheduling algorithms that optimize seek time and improve I/O performance. 
                                    Compare different strategies and understand their trade-offs.
                                </p>
                                
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-gray-300">Algorithms:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="px-3 py-2 bg-purple-500/10 text-purple-300 rounded-lg text-sm text-center">FCFS</span>
                                        <span className="px-3 py-2 bg-purple-500/10 text-purple-300 rounded-lg text-sm text-center">SSTF</span>
                                        <span className="px-3 py-2 bg-purple-500/10 text-purple-300 rounded-lg text-sm text-center">SCAN</span>
                                        <span className="px-3 py-2 bg-purple-500/10 text-purple-300 rounded-lg text-sm text-center">C-SCAN</span>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                                    Coming Soon
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Index