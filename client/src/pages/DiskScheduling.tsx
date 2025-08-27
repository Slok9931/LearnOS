import React from 'react'
import { Box, Typography, Card, CardContent, Alert } from '@mui/material'
import { Storage, Construction } from '@mui/icons-material'

export default function DiskScheduling() {
    return (
        <Box>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'hsl(var(--foreground))', mb: 1 }}>
                    Disk Scheduling
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Simulate disk scheduling algorithms and optimize seek time
                </Typography>
            </Box>

            <Alert
                severity="info"
                icon={<Construction />}
                sx={{
                    mb: 4,
                    bgcolor: 'hsl(var(--warning) / 0.1)',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--warning) / 0.3)',
                    '& .MuiAlert-icon': {
                        color: 'hsl(var(--warning))'
                    }
                }}
            >
                This section is currently under development. Disk scheduling algorithms will be available soon.
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
                        <Storage sx={{ color: 'hsl(var(--primary))', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            FCFS & SSTF
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            First Come First Serve and Shortest Seek Time First algorithms.
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
                        <Storage sx={{ color: 'hsl(var(--accent))', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            SCAN & C-SCAN
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Elevator algorithms that scan disk heads in one direction.
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
                        <Storage sx={{ color: 'hsl(var(--success))', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            LOOK & C-LOOK
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Optimized versions of SCAN that don't go to disk ends.
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    )
}