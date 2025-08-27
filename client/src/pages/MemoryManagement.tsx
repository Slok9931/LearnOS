import React from 'react'
import { Box, Typography, Card, CardContent, Alert } from '@mui/material'
import { Memory, Construction } from '@mui/icons-material'

export default function MemoryManagement() {
    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'hsl(var(--foreground))', mb: 1 }}>
                    Memory Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Simulate memory allocation and management algorithms
                </Typography>
            </Box>

            <Alert
                severity="info"
                icon={<Construction />}
                sx={{
                    mb: 4,
                    bgcolor: 'hsl(var(--accent) / 0.1)',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--accent) / 0.3)',
                    '& .MuiAlert-icon': {
                        color: 'hsl(var(--accent))'
                    }
                }}
            >
                This section is currently under development. Memory management algorithms will be available soon.
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                <Card
                    elevation={0}
                    sx={{
                        bgcolor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        opacity: 0.7
                    }}
                >
                    <CardContent>
                        <Memory sx={{ color: 'hsl(var(--primary))', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            Paging
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Simulate page replacement algorithms including FIFO, LRU, and Optimal.
                        </Typography>
                    </CardContent>
                </Card>

                <Card
                    elevation={0}
                    sx={{
                        bgcolor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        opacity: 0.7
                    }}
                >
                    <CardContent>
                        <Memory sx={{ color: 'hsl(var(--accent))', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            Segmentation
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Visualize segment allocation, deallocation, and fragmentation.
                        </Typography>
                    </CardContent>
                </Card>

                <Card
                    elevation={0}
                    sx={{
                        bgcolor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        opacity: 0.7
                    }}
                >
                    <CardContent>
                        <Memory sx={{ color: 'hsl(var(--success))', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            Virtual Memory
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Simulate virtual memory management and address translation.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    )
}