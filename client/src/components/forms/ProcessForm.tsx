import React, { useState } from 'react'
import {
    Paper,
    Typography,
    TextField,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Alert,
} from '@mui/material'
import { Add, Delete, Clear } from '@mui/icons-material'
import { Process } from '@/types/scheduling'

interface ProcessFormProps {
    processes: Process[]
    onProcessesChange: (processes: Process[]) => void
    requiresPriority?: boolean
    title?: string
}

export default function ProcessForm({
    processes,
    onProcessesChange,
    requiresPriority = false,
    title = 'Process Configuration'
}: ProcessFormProps) {
    const [newProcess, setNewProcess] = useState<Partial<Process>>({
        pid: processes.length + 1,
        arrival_time: 0,
        burst_time: 1,
        priority: 0
    })

    const addProcess = () => {
        if (!newProcess.arrival_time && newProcess.arrival_time !== 0) return
        if (!newProcess.burst_time || newProcess.burst_time <= 0) return

        const process: Process = {
            pid: newProcess.pid || processes.length + 1,
            arrival_time: newProcess.arrival_time || 0,
            burst_time: newProcess.burst_time || 1,
            ...(requiresPriority && { priority: newProcess.priority || 0 })
        }

        onProcessesChange([...processes, process])

        // Reset form with next PID
        setNewProcess({
            pid: Math.max(...processes.map(p => p.pid), process.pid) + 1,
            arrival_time: 0,
            burst_time: 1,
            priority: 0
        })
    }

    const removeProcess = (pid: number) => {
        onProcessesChange(processes.filter(p => p.pid !== pid))
    }

    const clearAllProcesses = () => {
        onProcessesChange([])
        setNewProcess({
            pid: 1,
            arrival_time: 0,
            burst_time: 1,
            priority: 0
        })
    }

    const addSampleData = () => {
        const sampleProcesses: Process[] = requiresPriority
            ? [
                { pid: 1, arrival_time: 0, burst_time: 10, priority: 3 },
                { pid: 2, arrival_time: 0, burst_time: 1, priority: 1 },
                { pid: 3, arrival_time: 0, burst_time: 2, priority: 4 },
                { pid: 4, arrival_time: 0, burst_time: 1, priority: 5 },
                { pid: 5, arrival_time: 0, burst_time: 5, priority: 2 }
            ]
            : [
                { pid: 1, arrival_time: 0, burst_time: 10 },
                { pid: 2, arrival_time: 1, burst_time: 1 },
                { pid: 3, arrival_time: 2, burst_time: 2 },
                { pid: 4, arrival_time: 3, burst_time: 1 },
                { pid: 5, arrival_time: 4, burst_time: 5 }
            ]

        onProcessesChange(sampleProcesses)
        setNewProcess({
            pid: 6,
            arrival_time: 0,
            burst_time: 1,
            priority: 0
        })
    }

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                bgcolor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={addSampleData}
                        sx={{
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--muted-foreground))',
                            '&:hover': {
                                borderColor: 'hsl(var(--primary))',
                                bgcolor: 'hsl(var(--primary) / 0.1)'
                            }
                        }}
                    >
                        Load Sample
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearAllProcesses}
                        startIcon={<Clear />}
                        sx={{
                            borderColor: 'hsl(var(--border))',
                            color: 'hsl(var(--muted-foreground))',
                            '&:hover': {
                                borderColor: 'hsl(var(--destructive))',
                                bgcolor: 'hsl(var(--destructive) / 0.1)'
                            }
                        }}
                    >
                        Clear All
                    </Button>
                </Box>
            </Box>

            {/* Add Process Form */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'end' }}>
                <TextField
                    label="Process ID"
                    type="number"
                    size="small"
                    value={newProcess.pid || ''}
                    onChange={(e) => setNewProcess({ ...newProcess, pid: parseInt(e.target.value) || 0 })}
                    sx={{ minWidth: 100 }}
                    InputProps={{ inputProps: { min: 1 } }}
                />
                <TextField
                    label="Arrival Time"
                    type="number"
                    size="small"
                    value={newProcess.arrival_time || ''}
                    onChange={(e) => setNewProcess({ ...newProcess, arrival_time: parseFloat(e.target.value) || 0 })}
                    sx={{ minWidth: 120 }}
                    InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                />
                <TextField
                    label="Burst Time"
                    type="number"
                    size="small"
                    value={newProcess.burst_time || ''}
                    onChange={(e) => setNewProcess({ ...newProcess, burst_time: parseFloat(e.target.value) || 1 })}
                    sx={{ minWidth: 120 }}
                    InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                    required
                />
                {requiresPriority && (
                    <TextField
                        label="Priority"
                        type="number"
                        size="small"
                        value={newProcess.priority || ''}
                        onChange={(e) => setNewProcess({ ...newProcess, priority: parseInt(e.target.value) || 0 })}
                        sx={{ minWidth: 100 }}
                        InputProps={{ inputProps: { min: 0 } }}
                        helperText="Lower = Higher Priority"
                    />
                )}
                <Button
                    variant="contained"
                    onClick={addProcess}
                    startIcon={<Add />}
                    sx={{
                        bgcolor: 'hsl(var(--primary))',
                        color: 'hsl(var(--primary-foreground))',
                        '&:hover': {
                            bgcolor: 'hsl(var(--primary) / 0.9)'
                        }
                    }}
                >
                    Add
                </Button>
            </Box>

            {processes.length === 0 && (
                <Alert
                    severity="info"
                    sx={{
                        mb: 2,
                        bgcolor: 'hsl(var(--primary) / 0.1)',
                        color: 'hsl(var(--foreground))',
                        '& .MuiAlert-icon': {
                            color: 'hsl(var(--primary))'
                        }
                    }}
                >
                    Add processes to begin scheduling simulation. Use "Load Sample" for quick testing.
                </Alert>
            )}

            {/* Process Table */}
            {processes.length > 0 && (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                    Process ID
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                    Arrival Time
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                    Burst Time
                                </TableCell>
                                {requiresPriority && (
                                    <TableCell sx={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                        Priority
                                    </TableCell>
                                )}
                                <TableCell sx={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                    Action
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {processes.map((process) => (
                                <TableRow key={process.pid}>
                                    <TableCell sx={{ color: 'hsl(var(--foreground))' }}>
                                        P{process.pid}
                                    </TableCell>
                                    <TableCell sx={{ color: 'hsl(var(--foreground))' }}>
                                        {process.arrival_time}
                                    </TableCell>
                                    <TableCell sx={{ color: 'hsl(var(--foreground))' }}>
                                        {process.burst_time}
                                    </TableCell>
                                    {requiresPriority && (
                                        <TableCell sx={{ color: 'hsl(var(--foreground))' }}>
                                            {process.priority}
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => removeProcess(process.pid)}
                                            sx={{
                                                color: 'hsl(var(--destructive))',
                                                '&:hover': {
                                                    bgcolor: 'hsl(var(--destructive) / 0.1)'
                                                }
                                            }}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    )
}