import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Terminal as TerminalIcon, 
  Minimize2,
  Maximize2,
  RotateCcw
} from 'lucide-react'
import { useTerminal } from '@/hooks/useTerminal'

export const Terminal: React.FC = () => {
  const {
    history,
    currentCommand,
    setCurrentCommand,
    isLoading,
    handleKeyDown,
    resetSystem
  } = useTerminal()

  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Auto-focus input and scroll to bottom
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Focus input when terminal is clicked
  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  // Fullscreen logic
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      // Enter fullscreen
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        elem.requestFullscreen()
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen()
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen()
      }
      setIsFullScreen(true)
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
      setIsFullScreen(false)
    }
  }

  // Listen for fullscreen change to sync state
  useEffect(() => {
    const handleChange = () => {
      const isFs = !!document.fullscreenElement
      setIsFullScreen(isFs)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className={`mx-auto transition-all duration-300 ${
      isFullScreen 
        ? 'fixed inset-0 z-50 w-full h-full' 
        : 'w-full'
    }`}>
      {/* Terminal Window */}
      <Card className={`bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden transition-all duration-300 ${
        isFullScreen ? 'h-full rounded-none' : ''
      }`}>
        {/* Terminal Header */}
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-green-400" />
              <span className="text-gray-300 text-sm font-medium">
                OS Virtualization Terminal {isFullScreen && '(Full Screen)'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSystem}
              className="h-6 w-6 p-0 text-gray-400 hover:text-orange-400 hover:bg-gray-700"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullScreen}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-300 hover:bg-gray-700"
            >
              {isFullScreen ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {/* Terminal Content */}
          <div 
            ref={terminalRef}
            className={`bg-black text-green-400 font-mono text-sm overflow-auto cursor-text transition-all duration-300 ${
              isFullScreen ? 'h-[calc(100vh-120px)]' : 'h-[500px]'
            }`}
            onClick={handleTerminalClick}
          >
            <div className="p-4 space-y-1">
              {/* Welcome Message */}
              {history.length === 0 && (
                <div className="mb-4 text-green-300">
                  <div>LearnOS Terminal v1.0.0</div>
                  <div>Copyright (c) 2025 LearnOS Project</div>
                  <div className="mt-2 text-gray-400">
                    Type 'help' to see available commands.
                  </div>
                  <div className="mt-1 border-b border-gray-800 pb-2"></div>
                </div>
              )}

              {/* Command History */}
              {history.map((entry, index) => (
                <div key={index} className="mb-2">
                  {/* Command Input Line */}
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-1">user@learnOS:</span>
                    <span className="text-blue-300 mr-1">~$</span>
                    <span className="text-white">{entry.command}</span>
                    <span className="text-gray-600 text-xs ml-auto">
                      [{formatTimestamp(entry.timestamp)}]
                    </span>
                  </div>
                  
                  {/* Command Output */}
                  {(entry.output || entry.error) && (
                    <div className="mt-1 ml-0">
                      {entry.error ? (
                        <div className="text-red-400 whitespace-pre-wrap text-start">
                          {entry.error}
                        </div>
                      ) : (
                        <div className="text-gray-300 whitespace-pre-wrap text-start">
                          {entry.output}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Current Command Input */}
              <div className="flex items-center">
                <span className="text-blue-400 mr-1">user@learnOS:</span>
                <span className="text-blue-300 mr-1">~$</span>
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent border-none outline-none text-white caret-green-400"
                    disabled={isLoading}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {isLoading && (
                    <span className="absolute top-0 text-yellow-400">
                      {currentCommand && <span className="invisible">{currentCommand}</span>}
                      <span className="animate-spin">⟳</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Footer with Quick Commands */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Quick commands:</span>
                <button 
                  onClick={() => setCurrentCommand('help')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  help
                </button>
                <span>|</span>
                <button 
                  onClick={() => setCurrentCommand('ps')}
                  className="text-green-400 hover:text-green-300 underline"
                >
                  ps
                </button>
                <span>|</span>
                <button 
                  onClick={() => setCurrentCommand('ls')}
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  ls
                </button>
                <span>|</span>
                <button 
                  onClick={() => setCurrentCommand('fork test')}
                  className="text-yellow-400 hover:text-yellow-300 underline"
                >
                  fork
                </button>
                <span>|</span>
                <button 
                  onClick={() => setCurrentCommand('trap')}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  trap
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Press Tab for completion • Ctrl+C to interrupt</span>
                {isFullScreen && (
                  <>
                    <span>•</span>
                    <span>Click minimize to exit full screen</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Terminal