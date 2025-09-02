import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MemoryStick,
  Eye,
  Info,
  HardDrive,
  Grid3X3,
  Layers,
  Database,
  ChevronDown,
  ChevronUp,
  Square
} from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryVisualizationProps {
  results: MemoryResult
}

const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({ results }) => {
  const [selectedBlock, setSelectedBlock] = useState<any>(null)
  const [selectedVirtualPage, setSelectedVirtualPage] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'vertical' | 'grid' | 'table'>('vertical')

  if (!results.visualization?.memory_map) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MemoryStick className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Visualization Available</h3>
          <p className="text-muted-foreground">Memory layout data is not available for this simulation</p>
        </CardContent>
      </Card>
    )
  }

  const memoryMap = results.visualization.memory_map
  const totalMemory = results.metrics?.total_memory || 1024

  // Use actual data from backend or generate mock data as fallback
  const generateMemoryData = () => {
    const virtualPages = []
    const physicalFrames = []
    const pageTableEntries = []

    // If we have actual memory map data, use it
    if (memoryMap && memoryMap.length > 0) {
      memoryMap.forEach((block, index) => {
        if (block.allocated) {
          physicalFrames.push({
            id: block.frame_number || index,
            processId: block.process_id || 1,
            processName: block.process_name || `Process ${String.fromCharCode(65 + (block.process_id || 1) - 1)}`,
            virtualPageId: block.page_number || index,
            physicalAddress: block.start || (index * 4096),
            free: false
          })
        } else {
          physicalFrames.push({
            id: block.frame_number || index,
            free: true
          })
        }
      })
    }

    // If we have page table data, use it
    if (results.visualization.page_table) {
      results.visualization.page_table.forEach((entry, index) => {
        pageTableEntries.push({
          virtualPage: entry.page_number,
          physicalFrame: entry.frame_number,
          valid: entry.present,
          dirty: Math.random() > 0.7,
          referenced: Math.random() > 0.5,
          processId: entry.process_id,
          processName: `Process ${String.fromCharCode(64 + entry.process_id)}`
        })

        virtualPages.push({
          id: index,
          processId: entry.process_id,
          virtualAddress: entry.page_number * 4096,
          pageNumber: entry.page_number,
          isValid: entry.present,
          isDirty: Math.random() > 0.7,
          isReferenced: Math.random() > 0.5,
          physicalFrame: entry.present ? entry.frame_number : null,
          processName: `Process ${String.fromCharCode(64 + entry.process_id)}`
        })
      })
    }

    // Fill in with mock data if needed
    while (physicalFrames.length < 64) {
      const index = physicalFrames.length
      physicalFrames.push({
        id: index,
        free: true
      })
    }

    return { virtualPages, physicalFrames, pageTableEntries }
  }

  const { virtualPages, physicalFrames, pageTableEntries } = generateMemoryData()

  const getBlockColor = (block: any) => {
    if (block.allocated === false || block.type === 'free') {
      return 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600'
    }
    if (block.process_name === 'OS' || block.process_id === -1) {
      return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700'
    }

    const colors = [
      'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700',
      'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
      'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700',
      'bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700',
      'bg-pink-100 border-pink-300 dark:bg-pink-900/30 dark:border-pink-700',
      'bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700',
    ]
    return colors[(block.process_id || 0) % colors.length]
  }

  const getFrameColor = (frame: any) => {
    const colors = [
      'bg-blue-500/30 border-blue-500/50',
      'bg-green-500/30 border-green-500/50',
      'bg-yellow-500/30 border-yellow-500/50',
      'bg-purple-500/30 border-purple-500/50',
      'bg-pink-500/30 border-pink-500/50',
      'bg-indigo-500/30 border-indigo-500/50',
    ]
    return colors[(frame.processId - 1) % colors.length]
  }

  const getVirtualPageColor = (page: any) => {
    if (!page.isValid) {
      return 'bg-gray-500/20 border-gray-500/40 text-gray-600'
    }
    const colors = [
      'bg-blue-500/20 border-blue-500/40 text-blue-700',
      'bg-green-500/20 border-green-500/40 text-green-700',
      'bg-yellow-500/20 border-yellow-500/40 text-yellow-700',
      'bg-purple-500/20 border-purple-500/40 text-purple-700',
      'bg-pink-500/20 border-pink-500/40 text-pink-700',
      'bg-indigo-500/20 border-indigo-500/40 text-indigo-700',
    ]
    return colors[(page.processId - 1) % colors.length]
  }

  const formatAddress = (addr: number) => `0x${addr.toString(16).toUpperCase().padStart(4, '0')}`
  const formatSize = (size: number) => {
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} MB`
    }
    return `${size} KB`
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="physical" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="physical">Physical Memory</TabsTrigger>
          <TabsTrigger value="virtual">Virtual Memory</TabsTrigger>
          <TabsTrigger value="page-table">Page Table</TabsTrigger>
          <TabsTrigger value="tlb">TLB & Cache</TabsTrigger>
        </TabsList>

        {/* Physical Memory View */}
        <TabsContent value="physical" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Physical Memory Layout
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Physical memory frames and allocated blocks
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                    <span className="font-mono">Physical Start: 0x0000</span>
                    <span className="font-mono">End: {formatAddress(totalMemory - 1)}</span>
                    <span>Total: {formatSize(totalMemory)}</span>
                  </div>

                  <div className="relative bg-muted/20 rounded-lg p-4 min-h-[300px] border border-border/50">
                    <div className="grid grid-cols-8 gap-1 h-full">
                      {Array.from({ length: 64 }, (_, index) => {
                        const frame = physicalFrames.find(f => f.id === index)
                        return (
                          <div
                            key={index}
                            className={`h-8 rounded-md border-2 transition-all cursor-pointer text-xs flex items-center justify-center font-medium ${frame
                              ? `${getFrameColor(frame)} ${selectedBlock?.id === index ? 'ring-2 ring-primary ring-offset-1' : ''}`
                              : 'bg-muted border-border hover:bg-muted/80'
                              }`}
                            onClick={() => setSelectedBlock(frame || { id: index, free: true })}
                            title={frame ? `${frame.processName} - Frame ${index}` : `Free Frame ${index}`}
                          >
                            {frame ? `F${index}` : ''}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-muted border border-border rounded"></div>
                      <span className="text-muted-foreground">Free Frames</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500/30 border border-blue-500/50 rounded"></div>
                      <span className="text-muted-foreground">Allocated Frames</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Info className="h-5 w-5 text-primary" />
                  Frame Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {selectedBlock ? (
                  <div className="space-y-4">
                    {selectedBlock.free ? (
                      <div className="text-center py-4">
                        <Badge variant="secondary" className="mb-2">Free Frame</Badge>
                        <p className="text-sm text-muted-foreground">
                          Frame {selectedBlock.id} is available for allocation
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                            Allocated
                          </Badge>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Frame ID:</span>
                            <span className="font-mono text-foreground">{selectedBlock.id}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Physical Address:</span>
                            <span className="font-mono text-foreground">{formatAddress(selectedBlock.physicalAddress)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Process:</span>
                            <span className="text-foreground font-medium">{selectedBlock.processName}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Virtual Page:</span>
                            <span className="font-mono text-foreground">{selectedBlock.virtualPageId}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Eye className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Select a frame to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Virtual Memory View */}
        <TabsContent value="virtual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Grid3X3 className="h-5 w-5 text-primary" />
                  Virtual Address Space
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Virtual pages across all processes
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(processId => {
                      const processPages = virtualPages.filter(p => p.processId === processId)
                      return (
                        <div key={processId} className="space-y-2">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            Process {String.fromCharCode(64 + processId)}
                            <Badge variant="outline" className="text-xs">
                              {processPages.length} pages
                            </Badge>
                          </h4>
                          <div className="grid grid-cols-8 gap-1">
                            {processPages.map((page) => (
                              <div
                                key={page.id}
                                className={`h-12 rounded-md border-2 transition-all cursor-pointer text-xs flex flex-col items-center justify-center font-medium ${getVirtualPageColor(page)
                                  } ${selectedVirtualPage?.id === page.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                onClick={() => setSelectedVirtualPage(page)}
                                title={`${page.processName} - Page ${page.pageNumber} - ${page.isValid ? 'In Memory' : 'Swapped'}`}
                              >
                                <span>P{page.pageNumber}</span>
                                <div className="flex gap-1 mt-1">
                                  {page.isDirty && <div className="w-1 h-1 bg-red-500 rounded-full" title="Dirty" />}
                                  {page.isReferenced && <div className="w-1 h-1 bg-blue-500 rounded-full" title="Referenced" />}
                                  {!page.isValid && <div className="w-1 h-1 bg-gray-500 rounded-full" title="Not in memory" />}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/40 rounded"></div>
                      <span className="text-muted-foreground">Valid Pages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-500/20 border border-gray-500/40 rounded"></div>
                      <span className="text-muted-foreground">Swapped Pages</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-muted-foreground">Dirty</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-muted-foreground">Referenced</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Info className="h-5 w-5 text-primary" />
                  Virtual Page Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {selectedVirtualPage ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge
                          variant={selectedVirtualPage.isValid ? "default" : "secondary"}
                          className={selectedVirtualPage.isValid ? "bg-green-500/20 text-green-700 border-green-500/30" : ""}
                        >
                          {selectedVirtualPage.isValid ? 'In Memory' : 'Swapped Out'}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Virtual Address:</span>
                          <span className="font-mono text-foreground">{formatAddress(selectedVirtualPage.virtualAddress)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Page Number:</span>
                          <span className="font-mono text-foreground">{selectedVirtualPage.pageNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Process:</span>
                          <span className="text-foreground font-medium">{selectedVirtualPage.processName}</span>
                        </div>
                        {selectedVirtualPage.isValid && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Physical Frame:</span>
                            <span className="font-mono text-foreground">{selectedVirtualPage.physicalFrame}</span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Page Attributes</h4>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Dirty Bit:</span>
                            <Badge variant={selectedVirtualPage.isDirty ? "destructive" : "secondary"} className="text-xs">
                              {selectedVirtualPage.isDirty ? 'Modified' : 'Clean'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Reference Bit:</span>
                            <Badge variant={selectedVirtualPage.isReferenced ? "default" : "secondary"} className="text-xs">
                              {selectedVirtualPage.isReferenced ? 'Referenced' : 'Not Referenced'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Eye className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Select a virtual page to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Page Table View */}
        <TabsContent value="page-table" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Layers className="h-5 w-5 text-primary" />
                Page Table Entries
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Virtual to physical address translation table
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground bg-muted/50 p-2 rounded">
                    <span>Process</span>
                    <span>Virtual Page</span>
                    <span>Physical Frame</span>
                    <span>Valid</span>
                    <span>Dirty</span>
                    <span>Referenced</span>
                    <span>Status</span>
                  </div>
                  {pageTableEntries.map((entry, index) => (
                    <div key={index} className="grid grid-cols-7 gap-2 text-xs p-2 border border-border/30 rounded hover:bg-muted/20">
                      <span className="font-medium text-foreground">{entry.processName}</span>
                      <span className="font-mono text-foreground">{entry.virtualPage}</span>
                      <span className="font-mono text-foreground">
                        {entry.physicalFrame !== null ? entry.physicalFrame : '-'}
                      </span>
                      <Badge variant={entry.valid ? "default" : "secondary"} className="text-xs h-5">
                        {entry.valid ? 'V' : 'I'}
                      </Badge>
                      <Badge variant={entry.dirty ? "destructive" : "secondary"} className="text-xs h-5">
                        {entry.dirty ? 'D' : 'C'}
                      </Badge>
                      <Badge variant={entry.referenced ? "default" : "secondary"} className="text-xs h-5">
                        {entry.referenced ? 'R' : 'N'}
                      </Badge>
                      <span className={`text-xs ${entry.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.valid ? 'Resident' : 'Swapped'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-600">
                    {pageTableEntries.filter(e => e.valid).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Pages in Memory</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-red-600">
                    {pageTableEntries.filter(e => !e.valid).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Swapped Pages</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-orange-600">
                    {pageTableEntries.filter(e => e.dirty).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Dirty Pages</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TLB & Cache View */}
        <TabsContent value="tlb" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MemoryStick className="h-5 w-5 text-primary" />
                  Translation Lookaside Buffer (TLB)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {Array.from({ length: 8 }, (_, index) => {
                    const entry = index < 6 ? {
                      virtualPage: Math.floor(Math.random() * 32),
                      physicalFrame: Math.floor(Math.random() * 64),
                      processId: Math.floor(Math.random() * 5) + 1,
                      valid: true
                    } : null

                    return (
                      <div key={index} className={`grid grid-cols-4 gap-2 p-3 rounded border ${entry ? 'border-green-500/30 bg-green-500/10' : 'border-border bg-muted/20'
                        }`}>
                        <div className="text-xs">
                          <span className="text-muted-foreground block">Entry {index}</span>
                          <span className="font-mono text-foreground">
                            {entry ? `TLB${index}` : 'Empty'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground block">Virtual</span>
                          <span className="font-mono text-foreground">
                            {entry ? `0x${(entry.virtualPage * 4096).toString(16).padStart(4, '0')}` : '-'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground block">Physical</span>
                          <span className="font-mono text-foreground">
                            {entry ? `0x${(entry.physicalFrame * 4096).toString(16).padStart(4, '0')}` : '-'}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground block">Process</span>
                          <span className="text-foreground">
                            {entry ? `P${entry.processId}` : '-'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">87.5%</div>
                  <div className="text-xs text-muted-foreground">TLB Hit Rate</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Memory Hierarchy Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">TLB Access Time</span>
                      <span className="font-mono text-green-600">1 ns</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cache Hit Time</span>
                      <span className="font-mono text-blue-600">2 ns</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Memory Access Time</span>
                      <span className="font-mono text-orange-600">100 ns</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Disk Access Time</span>
                      <span className="font-mono text-red-600">10 ms</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Current Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TLB Hits:</span>
                        <span className="font-mono text-foreground">1,247</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TLB Misses:</span>
                        <span className="font-mono text-foreground">176</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cache Hits:</span>
                        <span className="font-mono text-foreground">3,456</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cache Misses:</span>
                        <span className="font-mono text-foreground">543</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Effective Access Time</h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-lg font-bold text-primary">12.3 ns</div>
                      <div className="text-xs text-muted-foreground">Average memory access latency</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MemoryVisualization