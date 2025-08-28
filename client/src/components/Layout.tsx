import React, { ReactNode } from 'react'
import { Cpu, HardDrive, MemoryStick, Home, Github, Monitor } from 'lucide-react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navigationItems = [
    {
        label: 'Home',
        path: '/',
        icon: Home,
        description: 'Simulate various CPU scheduling algorithms'
    },
    {
        label: 'CPU Scheduling',
        path: '/cpu-scheduling',
        icon: Cpu,
        description: 'Simulate various CPU scheduling algorithms'
    },
    {
        label: 'Memory Management',
        path: '/memory-management',
        icon: MemoryStick,
        description: 'Coming Soon: Memory allocation algorithms',
        disabled: true
    },
    {
        label: 'Disk Scheduling',
        path: '/disk-scheduling',
        icon: HardDrive,
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
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="bg-card border-b border-border shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <Link to="/" className="flex items-center space-x-2">
                                <Monitor className="h-8 w-8 text-primary" />
                                <span className="text-xl font-bold text-foreground">LearnOS</span>
                            </Link>
                        </div>
                        
                        <div className="hidden md:block">
                            <div className="flex items-center space-x-1">
                                {navigationItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.label}
                                            to={item.path}
                                            className={cn(
                                                'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                                location.pathname === item.path
                                                  ? 'bg-primary text-primary-foreground'
                                                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        <a
                          href="https://github.com/Slok9931/LearnOS"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Github className="h-5 w-5" />
                        </a>
                    </div>
                </div>

                {/* Mobile navigation */}
                <div className="md:hidden border-t border-border">
                  <div className="px-2 pt-2 pb-3 space-y-1">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={item.path}
                          className={cn(
                            'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                            location.pathname === item.path
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="min-h-[calc(100vh-4rem)]">
              {children}
              <Outlet />
            </main>
        </div>
    )
}