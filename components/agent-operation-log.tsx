"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AgentOperationLogProps {
  isAgentRunning: boolean
  toggleAgent: () => void
  currentSymbol: string
  currentStrategy?: string
  marketRegime?: string | null
  isLoading?: boolean
}

interface LogEntry {
  id: number
  timestamp: Date
  message: string
  type: "info" | "success" | "error" | "warning"
}

export function AgentOperationLog({
  isAgentRunning,
  toggleAgent,
  currentSymbol,
  currentStrategy,
  marketRegime,
  isLoading = false,
}: AgentOperationLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [cycleCount, setCycleCount] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Generate sample log entries
  useEffect(() => {
    if (!isAgentRunning) return

    const interval = setInterval(() => {
      const newCycleCount = cycleCount + 1
      setCycleCount(newCycleCount)

      const newLogs: LogEntry[] = [
        {
          id: Date.now(),
          timestamp: new Date(),
          message: `Starting analysis cycle #${newCycleCount} for ${currentSymbol}`,
          type: "info",
        },
        {
          id: Date.now() + 1,
          timestamp: new Date(Date.now() + 500),
          message: `Fetched market data for ${currentSymbol} from Binance`,
          type: "success",
        },
        {
          id: Date.now() + 2,
          timestamp: new Date(Date.now() + 1000),
          message: `Detected market regime: ${marketRegime || "RANGING"}`,
          type: "info",
        },
        {
          id: Date.now() + 3,
          timestamp: new Date(Date.now() + 1500),
          message: `Selected strategy: ${currentStrategy || "Mean Reversion"}`,
          type: "info",
        },
      ]

      // Occasionally add an error or warning
      if (Math.random() > 0.7) {
        if (Math.random() > 0.5) {
          newLogs.push({
            id: Date.now() + 4,
            timestamp: new Date(Date.now() + 2000),
            message: "Warning: HuggingFace API response delayed, using DeepSeek fallback",
            type: "warning",
          })
        } else {
          newLogs.push({
            id: Date.now() + 4,
            timestamp: new Date(Date.now() + 2000),
            message: "Error: Rate limit exceeded on Binance API, retrying in 10s",
            type: "error",
          })
        }
      }

      // Add signal generation log
      const signals = ["LONG", "SHORT", "NEUTRAL"]
      const randomSignal = signals[Math.floor(Math.random() * signals.length)]
      const confidence = (Math.random() * 30 + 60).toFixed(1)

      newLogs.push({
        id: Date.now() + 5,
        timestamp: new Date(Date.now() + 2500),
        message: `Generated ${randomSignal} signal with ${confidence}% confidence`,
        type: "success",
      })

      // Add cycle completion log
      newLogs.push({
        id: Date.now() + 6,
        timestamp: new Date(Date.now() + 3000),
        message: `Cycle #${newCycleCount} completed in ${(Math.random() * 2 + 1).toFixed(2)}s`,
        type: "info",
      })

      setLogs((prev) => [...newLogs, ...prev].slice(0, 100)) // Keep only the last 100 logs
    }, 10000) // New cycle every 10 seconds

    return () => clearInterval(interval)
  }, [isAgentRunning, cycleCount, currentSymbol, currentStrategy, marketRegime])

  // Scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0
    }
  }, [logs])

  // Render loading overlay
  const renderLoadingOverlay = () => {
    if (!isLoading || !isAgentRunning) return null

    return (
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-2 text-sm">Processing market data...</span>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full relative">
      {renderLoadingOverlay()}
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Agent Operation & Cycle Log</CardTitle>
        <div className="flex items-center gap-2">
          {isAgentRunning ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active
              </span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              <span className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Stopped
              </span>
            </Badge>
          )}
          <Button
            variant={isAgentRunning ? "destructive" : "default"}
            size="sm"
            onClick={toggleAgent}
            disabled={isLoading}
          >
            {isAgentRunning ? (
              <>
                <Pause size={16} className="mr-1" /> Stop Agent
              </>
            ) : (
              <>
                <Play size={16} className="mr-1" /> Start Agent
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]" ref={scrollAreaRef}>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-sm border-l-2 pl-2 py-1 hover:bg-muted/50 rounded-sm transition-colors"
                style={{
                  borderLeftColor:
                    log.type === "error"
                      ? "rgb(239, 68, 68)"
                      : log.type === "warning"
                        ? "rgb(245, 158, 11)"
                        : log.type === "success"
                          ? "rgb(34, 197, 94)"
                          : "rgb(148, 163, 184)",
                }}
              >
                <div className="mt-0.5">
                  {log.type === "error" && <AlertCircle size={16} className="text-red-500" />}
                  {log.type === "warning" && <AlertCircle size={16} className="text-amber-500" />}
                  {log.type === "success" && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {log.type === "info" && <span className="inline-block w-4 h-4 rounded-full bg-slate-400"></span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span>{log.message}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
