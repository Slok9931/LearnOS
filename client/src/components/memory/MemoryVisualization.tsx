import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MemoryResult } from '@/types/memory'

interface MemoryVisualizationProps {
  results: MemoryResult
}

const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({ results }) => {
  const [selectedBlock, setSelectedBlock] = useState<any>(null)

  if (!results.visualization?.memory_map) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No visualization data available</p>
        </CardContent>
      </Card>
    )
  }

  const memoryMap = results.visualization.memory_map
  const totalMemory = results.metrics.total_memory

  const getBlockColor = (block: any) => {
    if (block.allocated === false || block.type === 'free') {
      return 'bg-gray-200 hover:bg-gray-300'
    }
    if (block.process_name === 'OS' || block.process_id === -1) {
      return 'bg-red-200 hover:bg-red-300'
    }
    
    // Generate color based on process ID
    const colors = [
      'bg-blue-200 hover:bg-blue-300',
      'bg-green-200 hover:bg-green-300',
      'bg-yellow-200 hover:bg-yellow-300',
      'bg-purple-200 hover:bg-purple-300',
      'bg-pink-200 hover:bg-pink-300',
      'bg-indigo-200 hover:bg-indigo-300',
    ]
    return colors[(block.process_id || 0) % colors.length]
  }

  const formatAddress = (addr: number) => `0x${addr.toString(16).toUpperCase().padStart(4, '0')}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Memory Map Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Memory Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Address 0x0000</span>
              <span>Address {formatAddress(totalMemory - 1)}</span>
            </div>
            <div className="relative bg-gray-900 rounded-lg">
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
                    className={`absolute h-4 rounded-l transition-all ${getBlockColor(block)}`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      zIndex: block.allocated ? 10 : 1,
                    }}
                    onClick={() => setSelectedBlock(block)}
                  >
                    {block.allocated && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {block.process_name || `P${block.process_id}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Block Details */}
      {selectedBlock && (
        <Card>
          <CardHeader>
            <CardTitle>Block Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start Address:</span>
                <span className="ml-2">{formatAddress(selectedBlock.start)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End Address:</span>
                <span className="ml-2">{formatAddress(selectedBlock.end || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Size:</span>
                <span className="ml-2">{(selectedBlock.size / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge className={selectedBlock.allocated ? "bg-green-600" : "bg-gray-600"}>
                  {selectedBlock.allocated ? 'Allocated' : 'Free'}
                </Badge>
              </div>
              {selectedBlock.process_name && (
                <div>
                  <span className="text-muted-foreground">Process:</span>
                  <span className="ml-2">{selectedBlock.process_name}</span>
                </div>
              )}
              {selectedBlock.segment_type && (
                <div>
                  <span className="text-muted-foreground">Segment Type:</span>
                  <span className="ml-2">{selectedBlock.segment_type}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MemoryVisualization