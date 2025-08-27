import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProcessResult {
  id: number;
  arrival_time: number;
  burst_time: number;
  waiting_time: number;
  turnaround_time: number;
  completion_time: number;
  priority?: number;
}

interface ResultsTableProps {
  data: ProcessResult[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Process Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No results data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Process ID</TableHead>
              <TableHead>Arrival Time</TableHead>
              <TableHead>Burst Time</TableHead>
              <TableHead>Waiting Time</TableHead>
              <TableHead>Turnaround Time</TableHead>
              <TableHead>Completion Time</TableHead>
              {data.some(p => p.priority !== undefined) && (
                <TableHead>Priority</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((process) => (
              <TableRow key={process.id}>
                <TableCell className="font-medium">P{process.id}</TableCell>
                <TableCell>{process.arrival_time}</TableCell>
                <TableCell>{process.burst_time}</TableCell>
                <TableCell>{process.waiting_time}</TableCell>
                <TableCell>{process.turnaround_time}</TableCell>
                <TableCell>{process.completion_time}</TableCell>
                {process.priority !== undefined && (
                  <TableCell>{process.priority}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}