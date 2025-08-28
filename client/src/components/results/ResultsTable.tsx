import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProcessResult } from '@/types/scheduling'

interface ResultsTableProps {
  data: ProcessResult[]
  title?: string
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  data,
  title = "Process Results"
}) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No process data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const haspriorities = data.some(process => process.priority !== undefined && process.priority !== null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Process</th>
                <th className="text-right py-3 px-4 font-semibold">Arrival Time</th>
                <th className="text-right py-3 px-4 font-semibold">Burst Time</th>
                <th className="text-right py-3 px-4 font-semibold">Waiting Time</th>
                <th className="text-right py-3 px-4 font-semibold">Turnaround Time</th>
                <th className="text-right py-3 px-4 font-semibold">Completion Time</th>
                {haspriorities && (
                  <th className="text-right py-3 px-4 font-semibold">Priority</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((process, index) => (
                <tr
                  key={process.pid}
                  className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    }`}
                >
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="font-medium">
                      P{process.pid}
                    </Badge>
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {process.arrival_time.toFixed(1)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {process.burst_time.toFixed(1)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-blue-600 font-medium">
                    {process.waiting_time.toFixed(2)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono text-green-600 font-medium">
                    {process.turnaround_time.toFixed(2)}
                  </td>
                  <td className="text-right py-3 px-4 font-mono">
                    {process.completion_time.toFixed(1)}
                  </td>
                  {haspriorities && (
                    <td className="text-right py-3 px-4 font-mono">
                      {process.priority !== undefined && process.priority !== null
                        ? process.priority
                        : '-'
                      }
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        <div className="mt-4 pt-4 border-t bg-gray-50 rounded p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Total Processes</div>
              <div className="text-lg font-bold">{data.length}</div>
            </div>
            <div>
              <div className="font-medium text-blue-700">Avg Waiting Time</div>
              <div className="text-lg font-bold text-blue-600">
                {(data.reduce((sum, p) => sum + p.waiting_time, 0) / data.length).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="font-medium text-green-700">Avg Turnaround Time</div>
              <div className="text-lg font-bold text-green-600">
                {(data.reduce((sum, p) => sum + p.turnaround_time, 0) / data.length).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ResultsTable