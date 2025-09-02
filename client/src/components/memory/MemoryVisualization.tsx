import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MemoryStick, Eye, Info } from 'lucide-react'
import { MemoryResult } from '@/types/memory'

interface MemoryVisualizationProps {
  results: MemoryResult
}

const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({ results }) => {
  const [selectedBlock, setSelectedBlock] = useState<any>(null)

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
  const totalMemory = results.metrics.total_memory

  const getBlockColor = (block: any) => {
    if (block.allocated === false || block.type === 'free') {
      return 'bg-muted hover:bg-muted/80 border-border'
    }
    if (block.process_name === 'OS' || block.process_id === -1) {
      return 'bg-destructive/20 hover:bg-destructive/30 border-destructive/30'
    }
    
    // Generate consistent colors based on process ID
    const colors = [
      'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/40',
      'bg-green-500/20 hover:bg-green-500/30 border-green-500/40',
      'bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/40',
      'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40',
      'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/40',
      'bg-indigo-500/20 hover:bg-indigo-500/30 border-indigo-500/40',
    ]
    return colors[(block.process_id || 0) % colors.length]
  }

  const getTextColor = (block: any) => {
    if (block.allocated === false || block.type === 'free') {
      return 'text-muted-foreground'
    }
    if (block.process_name === 'OS' || block.process_id === -1) {
      return 'text-destructive'
    }
    
    const colors = [
      'text-blue-700',
      'text-green-700',
      'text-yellow-700',
      'text-purple-700',
      'text-pink-700',
      'text-indigo-700',
    ]
    return colors[(block.process_id || 0) % colors.length]
  }

  const formatAddress = (addr: number) => `0x${addr.toString(16).toUpperCase().padStart(4, '0')}`
  const formatSize = (size: number) => {
    if (size >= 1024) {
      return `${(size / 1024).toFixed(1)} MB`
    }
    return `${size} KB`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Memory Map Visualization */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MemoryStick className="h-5 w-5 text-primary" />
            Memory Layout Visualization
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on memory blocks to view details
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Address Range Info */}
            <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
              <span className="font-mono">Start: 0x0000</span>
              <span className="font-mono">End: {formatAddress(totalMemory - 1)}</span>
              <span>Total: {formatSize(totalMemory)}</span>
            </div>

            {/* Memory Map */}
            <div className="relative bg-muted/20 rounded-lg p-4 min-h-[200px] border border-border/50">
              <div className="grid gap-1 h-full">
                {memoryMap.map((block, index) => {
                  const blockStart = Math.min(block.start, block.end || 0)
                  const blockEnd = Math.max(block.start, block.end || 0)
                  const blockWidth = blockEnd - blockStart
                  const totalWidth = totalMemory

                  const left = (blockStart / totalWidth) * 100
                  const width = (blockWidth / totalWidth) * 100

                  return (
                    <div
                      key={index}
                      className={`absolute h-12 rounded-md border-2 transition-all cursor-pointer ${getBlockColor(block)} ${selectedBlock === block ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        top: `${(index % 5) * 60 + 20}px`,
                      }}
                      onClick={() => setSelectedBlock(block)}
                    >
                      <div className={`h-full flex items-center justify-center text-xs font-medium ${getTextColor(block)} px-2`}>
                        {block.allocated ? (
                          <span className="truncate">
                            {block.process_name || `P${block.process_id}`}
                          </span>
                        ) : (
                          <span>Free</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted border border-border rounded"></div>
                <span className="text-muted-foreground">Free Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-destructive/20 border border-destructive/30 rounded"></div>
                <span className="text-muted-foreground">OS Reserved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500/20 border border-blue-500/40 rounded"></div>
                <span className="text-muted-foreground">Allocated Processes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block Details Panel */}
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Info className="h-5 w-5 text-primary" />
            Block Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {selectedBlock ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge 
                    variant={selectedBlock.allocated ? "default" : "secondary"}
                    className={selectedBlock.allocated ? "bg-green-500/20 text-green-700 border-green-500/30" : ""}
                  >
                    {selectedBlock.allocated ? 'Allocated' : 'Free'}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Address:</span>
                    <span className="font-mono text-foreground">{formatAddress(selectedBlock.start)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">End Address:</span>
                    <span className="font-mono text-foreground">{formatAddress(selectedBlock.end || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-mono text-foreground">{formatSize(selectedBlock.size)}</span>
                  </div>
                </div>

                {selectedBlock.allocated && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {selectedBlock.process_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Process:</span>
                          <span className="text-foreground font-medium">{selectedBlock.process_name}</span>
                        </div>
                      )}
                      {selectedBlock.process_id !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Process ID:</span>
                          <span className="text-foreground">{selectedBlock.process_id}</span>
                        </div>
                      )}
                      {selectedBlock.segment_type && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Segment Type:</span>
                          <span className="text-foreground">{selectedBlock.segment_type}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Eye className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Select a memory block to view its details
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MemoryVisualization