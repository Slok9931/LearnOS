import React from 'react'
import {
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Box,
    Chip,
    FormControlLabel,
    Switch,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    IconButton,
} from '@mui/material'
import { ExpandMore, Add, Delete } from '@mui/icons-material'
import type{ SchedulingAlgorithm, AlgorithmOption, MLFQConfig } from '@/types/scheduling'

interface AlgorithmConfigProps {
    selectedAlgorithm: SchedulingAlgorithm
    onAlgorithmChange: (algorithm: SchedulingAlgorithm) => void
    timeQuantum: number
    onTimeQuantumChange: (quantum: number) => void
    contextSwitchCost: number
    onContextSwitchCostChange: (cost: number) => void
    isPreemptive: boolean
    onPreemptiveChange: (preemptive: boolean) => void
    mlfqConfig: MLFQConfig
    onMLFQConfigChange: (config: MLFQConfig) => void
}

const algorithmOptions: AlgorithmOption[] = [
    {
        value: 'FCFS',
        label: 'First Come First Serve (FCFS)',
        description: 'Non-preemptive algorithm that processes jobs in order of arrival',
    },
    {
        value: 'SJF',
        label: 'Shortest Job First (SJF)',
        description: 'Selects the process with the smallest execution time',
        supportsPreemptive: true,
    },
    {
        value: 'Priority',
        label: 'Priority Scheduling',
        description: 'Processes are scheduled based on priority levels',
        requiresPriority: true,
        supportsPreemptive: true,
    },
    {
        value: 'RoundRobin',
        label: 'Round Robin (RR)',
        description: 'Time-sharing algorithm with fixed time quantum',
        requiresQuantum: true,
    },
    {
        value: 'MLFQ',
        label: 'Multi-Level Feedback Queue (MLFQ)',
        description: 'Multiple priority queues with different time quantums and aging',
        requiresMLFQConfig: true,
    },
]

export default function AlgorithmConfig({
    selectedAlgorithm,
    onAlgorithmChange,
    timeQuantum,
    onTimeQuantumChange,
    contextSwitchCost,
    onContextSwitchCostChange,
    isPreemptive,
    onPreemptiveChange,
    mlfqConfig,
    onMLFQConfigChange,
}: AlgorithmConfigProps) {
    const selectedOption = algorithmOptions.find(opt => opt.value === selectedAlgorithm)

    const addMLFQQueue = () => {
        const newConfig = {
            ...mlfqConfig,
            num_queues: mlfqConfig.num_queues + 1,
            time_quantums: [...mlfqConfig.time_quantums, 4]
        }
        onMLFQConfigChange(newConfig)
    }

    const removeMLFQQueue = (index: number) => {
        if (mlfqConfig.num_queues <= 1) return

        const newQuantums = mlfqConfig.time_quantums.filter((_, i) => i !== index)
        const newConfig = {
            ...mlfqConfig,
            num_queues: mlfqConfig.num_queues - 1,
            time_quantums: newQuantums
        }
        onMLFQConfigChange(newConfig)
    }

    const updateMLFQQuantum = (index: number, value: number) => {
        const newQuantums = [...mlfqConfig.time_quantums]
        newQuantums[index] = value
        onMLFQConfigChange({
            ...mlfqConfig,
            time_quantums: newQuantums
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
            <Typography variant="h6" sx={{ color: 'hsl(var(--foreground))', fontWeight: 600, mb: 3 }}>
                Algorithm Configuration
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Algorithm Selection */}
                <FormControl fullWidth>
                    <InputLabel>Scheduling Algorithm</InputLabel>
                    <Select
                        value={selectedAlgorithm}
                        label="Scheduling Algorithm"
                        onChange={(e) => onAlgorithmChange(e.target.value as SchedulingAlgorithm)}
                    >
                        {algorithmOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                <Box>
                                    <Typography variant="body1">{option.label}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {option.description}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        {option.requiresQuantum && (
                                            <Chip label="Requires Time Quantum" size="small" color="primary" />
                                        )}
                                        {option.requiresPriority && (
                                            <Chip label="Requires Priority" size="small" color="secondary" />
                                        )}
                                        {option.supportsPreemptive && (
                                            <Chip label="Supports Preemption" size="small" color="default" />
                                        )}
                                    </Box>
                                </Box>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Algorithm Description */}
                {selectedOption && (
                    <Box sx={{
                        p: 2,
                        bgcolor: 'hsl(var(--muted) / 0.5)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid hsl(var(--border))'
                    }}>
                        <Typography variant="body2" color="text.secondary">
                            {selectedOption.description}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {/* Context Switch Cost */}
                    <TextField
                        label="Context Switch Cost"
                        type="number"
                        value={contextSwitchCost}
                        onChange={(e) => onContextSwitchCostChange(parseFloat(e.target.value) || 0)}
                        InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                        sx={{ minWidth: 200 }}
                        helperText="Overhead time for process switching"
                    />

                    {/* Time Quantum for Round Robin */}
                    {selectedOption?.requiresQuantum && (
                        <TextField
                            label="Time Quantum"
                            type="number"
                            value={timeQuantum}
                            onChange={(e) => onTimeQuantumChange(parseFloat(e.target.value) || 1)}
                            InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                            sx={{ minWidth: 150 }}
                            helperText="Time slice for each process"
                            required
                        />
                    )}

                    {/* Preemptive Toggle */}
                    {selectedOption?.supportsPreemptive && (
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isPreemptive}
                                    onChange={(e) => onPreemptiveChange(e.target.checked)}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: 'hsl(var(--primary))',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: 'hsl(var(--primary))',
                                        },
                                    }}
                                />
                            }
                            label="Preemptive Mode"
                            sx={{ color: 'hsl(var(--foreground))' }}
                        />
                    )}
                </Box>

                {/* MLFQ Configuration */}
                {selectedOption?.requiresMLFQConfig && (
                    <Accordion
                        defaultExpanded
                        sx={{
                            bgcolor: 'hsl(var(--muted) / 0.3)',
                            '&:before': { display: 'none' }
                        }}
                    >
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                MLFQ Configuration
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Queue Configuration */}
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle2">
                                            Queues ({mlfqConfig.num_queues})
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<Add />}
                                            onClick={addMLFQQueue}
                                            sx={{ color: 'hsl(var(--primary))' }}
                                        >
                                            Add Queue
                                        </Button>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {mlfqConfig.time_quantums.map((quantum, index) => (
                                            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ minWidth: 80 }}>
                                                    Queue {index}:
                                                </Typography>
                                                <TextField
                                                    label={`Time Quantum`}
                                                    type="number"
                                                    size="small"
                                                    value={quantum}
                                                    onChange={(e) => updateMLFQQuantum(index, parseFloat(e.target.value) || 1)}
                                                    InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                                                    sx={{ minWidth: 120 }}
                                                />
                                                {index > 0 && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeMLFQQueue(index)}
                                                        sx={{ color: 'hsl(var(--destructive))' }}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>

                                {/* MLFQ Parameters */}
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <TextField
                                        label="Priority Boost Interval"
                                        type="number"
                                        value={mlfqConfig.boost_interval}
                                        onChange={(e) => onMLFQConfigChange({
                                            ...mlfqConfig,
                                            boost_interval: parseFloat(e.target.value) || 10
                                        })}
                                        InputProps={{ inputProps: { min: 1, step: 1 } }}
                                        sx={{ minWidth: 180 }}
                                        helperText="Time to boost all processes to top queue"
                                    />
                                    <TextField
                                        label="Aging Threshold"
                                        type="number"
                                        value={mlfqConfig.aging_threshold}
                                        onChange={(e) => onMLFQConfigChange({
                                            ...mlfqConfig,
                                            aging_threshold: parseFloat(e.target.value) || 5
                                        })}
                                        InputProps={{ inputProps: { min: 1, step: 1 } }}
                                        sx={{ minWidth: 150 }}
                                        helperText="Time before moving to higher priority"
                                    />
                                </Box>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                )}
            </Box>
        </Paper>
    )
}