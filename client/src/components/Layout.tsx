import React, { ReactNode } from 'react'
import { AppBar, Toolbar, Typography, Container, Box, Tabs, Tab, IconButton, Tooltip } from '@mui/material'
import { Computer, Memory, Storage, GitHub, Description } from '@mui/icons-material'
import { Link, useLocation, Outlet } from 'react-router-dom'

const navigationItems = [
    {
        label: 'CPU Scheduling',
        path: '/',
        icon: <Computer />,
        description: 'Simulate various CPU scheduling algorithms'
    },
    {
        label: 'Memory Management',
        path: '/memory',
        icon: <Memory />,
        description: 'Coming Soon: Memory allocation algorithms',
        disabled: true
    },
    {
        label: 'Disk Scheduling',
        path: '/disk',
        icon: <Storage />,
        description: 'Coming Soon: Disk scheduling algorithms',
        disabled: true
    }
]

interface LayoutProps {
    children: ReactNode
}

export default function Layout( { children }: LayoutProps ) {
    const location = useLocation()

    const currentTabIndex = navigationItems.findIndex(item =>
        item.path === location.pathname
    )

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'hsl(var(--background))' }}>
            {/* Header */}
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: 'hsl(var(--background))',
                    borderBottom: '1px solid hsl(var(--border))',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Computer sx={{ mr: 2, color: 'hsl(var(--primary))' }} />
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontWeight: 700,
                                background: 'var(--gradient-primary)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            OS Simulator
                        </Typography>
                    </Box>

                    {/* Navigation Tabs */}
                    <Tabs
                        value={currentTabIndex === -1 ? 0 : currentTabIndex}
                        sx={{
                            '& .MuiTab-root': {
                                color: 'hsl(var(--muted-foreground))',
                                textTransform: 'none',
                                minHeight: 48,
                                '&.Mui-selected': {
                                    color: 'hsl(var(--primary))',
                                }
                            },
                            '& .MuiTabs-indicator': {
                                backgroundColor: 'hsl(var(--primary))',
                            }
                        }}
                    >
                        {navigationItems.map((item, index) => (
                            <Tab
                                key={item.path}
                                component={Link}
                                to={item.path}
                                label={item.label}
                                icon={item.icon}
                                iconPosition="start"
                                disabled={item.disabled}
                                sx={{
                                    mx: 1,
                                    opacity: item.disabled ? 0.5 : 1,
                                    transition: 'var(--transition-smooth)'
                                }}
                            />
                        ))}
                    </Tabs>

                    <Box sx={{ ml: 2 }}>
                        <Tooltip title="View Documentation">
                            <IconButton
                                href="#"
                                sx={{
                                    color: 'hsl(var(--muted-foreground))',
                                    '&:hover': { color: 'hsl(var(--primary))' }
                                }}
                            >
                                <Description />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="View Source Code">
                            <IconButton
                                href="#"
                                sx={{
                                    color: 'hsl(var(--muted-foreground))',
                                    '&:hover': { color: 'hsl(var(--primary))' }
                                }}
                            >
                                <GitHub />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ py: 4 }}>
                {children}
                <Outlet />
            </Container>
        </Box>
    )
}