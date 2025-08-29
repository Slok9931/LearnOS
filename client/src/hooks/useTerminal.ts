import { useState, useCallback, useRef, useEffect } from "react";
import { Process, TrapTableEntry, SystemCall } from "@/types/terminal";
import terminalApi from "@/services/terminalApi";

export interface TerminalHistory {
  command: string;
  output: string;
  timestamp: number;
  error?: string;
}

export const useTerminal = () => {
  const [history, setHistory] = useState<TerminalHistory[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [trapTable, setTrapTable] = useState<TrapTableEntry[]>([]);
  const [systemCalls, setSystemCalls] = useState<SystemCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  const addToHistory = useCallback(
    (command: string, output: string, error?: string) => {
      const timestamp = Date.now();
      setHistory((prev) => [...prev, { command, output, timestamp, error }]);
      setTimeout(scrollToBottom, 100);
    },
    [scrollToBottom]
  );

  const clearTerminal = useCallback(() => {
    setHistory([]);
  }, []);

  const executeCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;

      const trimmedCommand = command.trim();

      // Handle clear command locally
      if (trimmedCommand === "clear") {
        clearTerminal();
        setCurrentCommand("");
        return;
      }

      setIsLoading(true);
      const [cmd, ...args] = trimmedCommand.split(" ");

      try {
        const response = await terminalApi.executeCommand(cmd, args);

        addToHistory(trimmedCommand, response.output, response.error);
        setProcesses(response.processes || []);

        if (response.trap_info?.trap_table) {
          setTrapTable(response.trap_info.trap_table);
        }

        if (response.trap_info?.recent_calls) {
          setSystemCalls(response.trap_info.recent_calls);
        }

        // Add to command history
        setCommandHistory((prev) => {
          const newHistory = [
            trimmedCommand,
            ...prev.filter((h) => h !== trimmedCommand),
          ];
          return newHistory.slice(0, 50); // Keep last 50 commands
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        addToHistory(trimmedCommand, "", errorMessage);
      } finally {
        setIsLoading(false);
        setHistoryIndex(-1);
        setCurrentCommand("");

        // Auto-focus the input after command execution
        setTimeout(() => {
          const inputElement = document.querySelector(
            'input[type="text"]'
          ) as HTMLInputElement;
          if (inputElement) {
            inputElement.focus();
          }
        }, 100);
      }
    },
    [addToHistory, clearTerminal]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        executeCommand(currentCommand);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex] || "");
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex] || "");
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setCurrentCommand("");
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        // Basic tab completion for common commands
        const commonCommands = [
          "help",
          "ps",
          "top",
          "htop",
          "fork",
          "kill",
          "wait",
          "trap",
          "clear",
          "reset",
          "pstree",
          "jobs",
          "bg",
          "fg",
          "nohup",
          "disown",
          "uptime",
          "free",
          "df",
          "du",
          "lscpu",
          "lsof",
          "netstat",
          "whoami",
          "id",
          "uname",
          "env",
          "history",
          "alias",
          "unalias",
          "which",
          "whereis",
        ];
        const matches = commonCommands.filter((cmd) =>
          cmd.startsWith(currentCommand)
        );
        if (matches.length === 1) {
          setCurrentCommand(matches[0] + " ");
        }
      } else if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        setCurrentCommand("");
        setIsLoading(false);
      } else if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        clearTerminal();
      }
    },
    [
      currentCommand,
      executeCommand,
      historyIndex,
      commandHistory,
      clearTerminal,
    ]
  );

  const resetSystem = useCallback(async () => {
    try {
      setIsLoading(true);
      await terminalApi.resetSystem();
      setHistory([]);
      setProcesses([]);
      setSystemCalls([]);
      addToHistory("system", "System reset successfully", undefined);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to reset system";
      addToHistory("system", "", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [processesRes, trapTableRes] = await Promise.all([
          terminalApi.getProcesses(),
          terminalApi.getTrapTable(),
        ]);

        setProcesses(processesRes.processes || []);
        setTrapTable(trapTableRes.trap_table || []);

        addToHistory(
          "system",
          'OS Terminal initialized. Type "help" for available commands.',
          undefined
        );
      } catch (error) {
        addToHistory("system", "", "Failed to initialize terminal");
      }
    };

    loadInitialData();
  }, [addToHistory]);

  return {
    history,
    currentCommand,
    setCurrentCommand,
    processes,
    trapTable,
    systemCalls,
    isLoading,
    terminalRef,
    handleKeyDown,
    executeCommand,
    clearTerminal,
    resetSystem,
  };
};
