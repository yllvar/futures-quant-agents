// Update the LLMConnectionMonitor component to handle mock implementation

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react"
import {
  type LLMConnectionState,
  initialConnectionState,
  testDeepSeekConnection,
  testAllHuggingFaceProviders,
} from "@/lib/llm-clients"
import { Progress } from "@/components/ui/progress"

interface LLMConnectionMonitorProps {
  huggingFaceApiKey?: string
  deepSeekApiKey?: string
  autoRefresh?: boolean
  refreshInterval?: number
  onProviderChange?: (provider: string) => void
  useMockImplementation?: boolean
}

export function LLMConnectionMonitor({
  huggingFaceApiKey = "",
  deepSeekApiKey = "",
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
  onProviderChange,
  useMockImplementation = false,
}: LLMConnectionMonitorProps) {
  const [connectionState, setConnectionState] = useState<LLMConnectionState>(initialConnectionState)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("nebius")

  const checkConnections = async () => {
    setIsRefreshing(true)

    if (useMockImplementation) {
      // If using mock implementation, simulate successful connections
      setConnectionState({
        huggingface: {
          status: "connected",
          provider: "mock-provider",
          lastChecked: new Date(),
          latency: 50,
          errorMessage: null,
          requestCount: connectionState.huggingface.requestCount + 1,
          successCount: connectionState.huggingface.successCount + 1,
        },
        deepseek: {
          status: "connected",
          lastChecked: new Date(),
          latency: 50,
          errorMessage: null,
          requestCount: connectionState.deepseek.requestCount + 1,
          successCount: connectionState.deepseek.successCount + 1,
        },
      })

      setIsRefreshing(false)
      return
    }

    // Check HuggingFace connection if API key is provided
    if (huggingFaceApiKey) {
      try {
        // Test all providers and use the first successful one
        const hfResult = await testAllHuggingFaceProviders(huggingFaceApiKey)

        if (hfResult.success && hfResult.provider !== selectedProvider) {
          setSelectedProvider(hfResult.provider)
          if (onProviderChange) {
            onProviderChange(hfResult.provider)
          }
        }

        setConnectionState((prev) => ({
          ...prev,
          huggingface: {
            ...prev.huggingface,
            status: hfResult.success ? "connected" : "error",
            provider: hfResult.provider || prev.huggingface.provider,
            lastChecked: new Date(),
            latency: hfResult.latency,
            errorMessage: hfResult.error || null,
            requestCount: prev.huggingface.requestCount + 1,
            successCount: hfResult.success ? prev.huggingface.successCount + 1 : prev.huggingface.successCount,
          },
        }))
      } catch (error) {
        setConnectionState((prev) => ({
          ...prev,
          huggingface: {
            ...prev.huggingface,
            status: "error",
            lastChecked: new Date(),
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            requestCount: prev.huggingface.requestCount + 1,
          },
        }))
      }
    }

    // Check DeepSeek connection if API key is provided
    if (deepSeekApiKey) {
      try {
        const dsResult = await testDeepSeekConnection(deepSeekApiKey)
        setConnectionState((prev) => ({
          ...prev,
          deepseek: {
            ...prev.deepseek,
            status: dsResult.success ? "connected" : "error",
            lastChecked: new Date(),
            latency: dsResult.latency,
            errorMessage: dsResult.error || null,
            requestCount: prev.deepseek.requestCount + 1,
            successCount: dsResult.success ? prev.deepseek.successCount + 1 : prev.deepseek.successCount,
          },
        }))
      } catch (error) {
        setConnectionState((prev) => ({
          ...prev,
          deepseek: {
            ...prev.deepseek,
            status: "error",
            lastChecked: new Date(),
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            requestCount: prev.deepseek.requestCount + 1,
          },
        }))
      }
    }

    setIsRefreshing(false)
  }

  // Initial connection check and auto-refresh
  useEffect(() => {
    checkConnections()

    if (autoRefresh) {
      const interval = setInterval(checkConnections, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [huggingFaceApiKey, deepSeekApiKey, autoRefresh, refreshInterval, useMockImplementation])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 size={14} className="mr-1" /> Connected
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle size={14} className="mr-1" /> Error
          </Badge>
        )
      case "standby":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <AlertCircle size={14} className="mr-1" /> Standby
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20">
            <XCircle size={14} className="mr-1" /> Disconnected
          </Badge>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">LLM Connection Monitor</CardTitle>
          <Button variant="outline" size="sm" onClick={checkConnections} disabled={isRefreshing} className="h-8 gap-1">
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* HuggingFace Connection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium">HuggingFace</span>
              {getStatusBadge(connectionState.huggingface.status)}
            </div>
            <span className="text-xs text-muted-foreground">
              {connectionState.huggingface.lastChecked
                ? `Last checked: ${connectionState.huggingface.lastChecked.toLocaleTimeString()}`
                : "Not checked yet"}
            </span>
          </div>

          {/* Show current provider */}
          <div className="flex justify-between text-xs">
            <span>Current Provider</span>
            <Badge variant="secondary" className="text-xs">
              {useMockImplementation ? "mock-provider" : connectionState.huggingface.provider || "nebius"}
            </Badge>
          </div>

          {connectionState.huggingface.latency && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Latency</span>
                <span>{connectionState.huggingface.latency}ms</span>
              </div>
              <Progress value={Math.min(100, connectionState.huggingface.latency / 20)} className="h-1" />
            </div>
          )}

          {connectionState.huggingface.errorMessage && !useMockImplementation && (
            <div className="text-xs text-red-500 bg-red-500/5 p-2 rounded border border-red-500/10">
              {connectionState.huggingface.errorMessage}
            </div>
          )}

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success Rate</span>
            <span>
              {connectionState.huggingface.requestCount > 0
                ? `${Math.round(
                    (connectionState.huggingface.successCount / connectionState.huggingface.requestCount) * 100,
                  )}% (${connectionState.huggingface.successCount}/${connectionState.huggingface.requestCount})`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* DeepSeek Connection */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium">DeepSeek API</span>
              {getStatusBadge(connectionState.deepseek.status)}
            </div>
            <span className="text-xs text-muted-foreground">
              {connectionState.deepseek.lastChecked
                ? `Last checked: ${connectionState.deepseek.lastChecked.toLocaleTimeString()}`
                : "Not checked yet"}
            </span>
          </div>

          {connectionState.deepseek.latency && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Latency</span>
                <span>{connectionState.deepseek.latency}ms</span>
              </div>
              <Progress value={Math.min(100, connectionState.deepseek.latency / 20)} className="h-1" />
            </div>
          )}

          {connectionState.deepseek.errorMessage && !useMockImplementation && (
            <div className="text-xs text-red-500 bg-red-500/5 p-2 rounded border border-red-500/10">
              {connectionState.deepseek.errorMessage}
            </div>
          )}

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success Rate</span>
            <span>
              {connectionState.deepseek.requestCount > 0
                ? `${Math.round(
                    (connectionState.deepseek.successCount / connectionState.deepseek.requestCount) * 100,
                  )}% (${connectionState.deepseek.successCount}/${connectionState.deepseek.requestCount})`
                : "N/A"}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          {useMockImplementation ? (
            <span className="text-emerald-500 font-medium">Using mock implementation - no API keys required</span>
          ) : autoRefresh ? (
            <span>Auto-refreshing every {refreshInterval / 1000} seconds</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
