"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { LiveMarketData } from "@/components/live-market-data"
import { TradingSignal } from "@/components/trading-signal"
import { AgentOperationLog } from "@/components/agent-operation-log"
import { TechnicalDetailsPanel } from "@/components/technical-details-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { StrategyBacktester } from "@/components/strategy-backtester"
import { MultiTimeframeAnalysis } from "@/components/multi-timeframe-analysis"
import { PerformanceMetrics } from "@/components/performance-metrics"
import { StrategyConfigPanel } from "@/components/strategy-config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Wifi, WifiOff, Key } from "lucide-react"
import type { TradingSignalResult, StrategyConfig, Timeframe } from "@/lib/types"
import { LocalStorageService } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

// Add these imports at the top of the file
import { DataSourceSelector } from "@/components/data-source-selector"
import { HistoricalDataTester } from "@/components/historical-data-tester"
import { HistoricalDashboard } from "@/components/historical-dashboard"
import { createTradingAgent } from "@/lib/trading-agent-factory"
import type { EnhancedTradingAgent } from "@/lib/trading-agent-extension"
import { createEnhancedTradingAgent } from "@/lib/trading-agent-factory"
import { LLMSettingsPanel } from "@/components/llm-settings-panel"

export function TradingDashboard() {
  // Add these state variables
  const [useHistoricalData, setUseHistoricalData] = useState(false)
  const [historicalDateRange, setHistoricalDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  })
  const [isAgentRunning, setIsAgentRunning] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Initialize from localStorage if available, otherwise default to "dark"
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("trading-dashboard-theme")
      return savedTheme === "light" ? "light" : "dark"
    }
    return "dark"
  })
  const [currentSymbol, setCurrentSymbol] = useState<string>(() => {
    // Initialize from localStorage if available, otherwise default to "SOL/USDT"
    if (typeof window !== "undefined") {
      const savedSymbol = localStorage.getItem("trading-dashboard-symbol")
      return savedSymbol || "SOL/USDT"
    }
    return "SOL/USDT"
  })
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>(() => {
    // Initialize from localStorage if available, otherwise default to "1h"
    if (typeof window !== "undefined") {
      const savedTimeframe = localStorage.getItem("trading-dashboard-timeframe")
      return (savedTimeframe as Timeframe) || "1h"
    }
    return "1h"
  })
  const [currentSignal, setCurrentSignal] = useState<TradingSignalResult | null>(null)
  const [currentStrategy, setCurrentStrategy] = useState<StrategyConfig | null>(null)
  const [marketRegime, setMarketRegime] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Initialize from localStorage if available, otherwise default to "dashboard"
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("trading-dashboard-tab")
      return savedTab || "dashboard"
    }
    return "dashboard"
  })
  const [symbolData, setSymbolData] = useState<
    Map<
      string,
      {
        signal: TradingSignalResult | null
        strategy: StrategyConfig | null
        marketRegime: string | null
      }
    >
  >(new Map())

  // Add state for strategies
  const [strategies, setStrategies] = useState<StrategyConfig[]>([])

  // Add state for loading and errors
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add state for API keys
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("trading-dashboard-api-key") || ""
    }
    return ""
  })
  const [apiSecret, setApiSecret] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("trading-dashboard-api-secret") || ""
    }
    return ""
  })
  const [isApiDialogOpen, setIsApiDialogOpen] = useState(false)
  const [isUsingRealData, setIsUsingRealData] = useState(false)
  const [webSocketStatus, setWebSocketStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected")

  // 6. Add a visual indicator to show when the next update will occur

  // Add this state at the top of the TradingDashboard component
  const [nextUpdateTime, setNextUpdateTime] = useState<Date | null>(null)
  const [timeUntilUpdate, setTimeUntilUpdate] = useState<number>(60)

  // Add this to the TradingDashboard component state
  const [signalValidation, setSignalValidation] = useState<{
    isValid: boolean
    reasons: string[]
    score: number
  } | null>(null)

  // Update the tradingAgent initialization to use our factory
  const tradingAgent = useMemo(() => {
    const agent = createTradingAgent(
      "binance",
      process.env.NEXT_PUBLIC_EXCHANGE_API_KEY || apiKey,
      process.env.NEXT_PUBLIC_EXCHANGE_SECRET || apiSecret,
      10000,
      true, // Use enhanced agent
    ) as EnhancedTradingAgent

    // Set historical data mode
    agent.setUseHistoricalData(useHistoricalData)
    agent.setHistoricalDateRange(historicalDateRange.startDate, historicalDateRange.endDate)

    return agent
  }, [apiKey, apiSecret, useHistoricalData, historicalDateRange])

  // Load strategies on mount
  useEffect(() => {
    setStrategies(tradingAgent.strategyEngine.getStrategies())
  }, [tradingAgent])

  // Get API keys from localStorage or environment variables
  const mockHuggingFaceApiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("trading-dashboard-hf-key") || process.env.HF_API_KEY || "hf_xxxxxxxxxxxxxxxxxxxx"
      : process.env.HF_API_KEY || "hf_xxxxxxxxxxxxxxxxxxxx"

  const mockDeepSeekApiKey =
    typeof window !== "undefined"
      ? localStorage.getItem("trading-dashboard-ds-key") || process.env.DEEPSEEK_API_KEY || "sk-xxxxxxxxxxxxxxxxxxxx"
      : process.env.DEEPSEEK_API_KEY || "sk-xxxxxxxxxxxxxxxxxxxx"

  // Add this to the TradingDashboard component
  const [useMockLLMImplementation, setUseMockLLMImplementation] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined") {
      return localStorage.getItem("trading-dashboard-use-mock-llm") !== "false" // Default to true
    }
    return true // Default to true
  })

  const toggleAgent = () => {
    setIsAgentRunning(!isAgentRunning)

    // Clear any previous errors when toggling agent
    if (!isAgentRunning) {
      setError(null)
    }

    // Initialize WebSockets when starting the agent
    if (!isAgentRunning && tradingAgent) {
      tradingAgent.initializeWebSockets([currentSymbol])
    }
  }

  // Handle symbol change
  const handleSymbolChange = (symbol: string) => {
    setCurrentSymbol(symbol)
    localStorage.setItem("trading-dashboard-symbol", symbol)

    // Clear any previous errors when changing symbol
    setError(null)

    // Update current signal and strategy from cache if available
    const cachedData = symbolData.get(symbol)
    if (cachedData) {
      setCurrentSignal(cachedData.signal)
      setCurrentStrategy(cachedData.strategy)
      setMarketRegime(cachedData.marketRegime)
    } else {
      // Reset if no cached data
      setCurrentSignal(null)
      setCurrentStrategy(null)
      setMarketRegime(null)
    }

    // Update WebSocket subscription
    if (tradingAgent && isAgentRunning) {
      tradingAgent.initializeWebSockets([symbol])
    }
  }

  // Handle timeframe change
  const handleTimeframeChange = (timeframe: Timeframe) => {
    setCurrentTimeframe(timeframe)
    localStorage.setItem("trading-dashboard-timeframe", timeframe)

    // Clear any previous errors when changing timeframe
    setError(null)

    // Reset signal and strategy when timeframe changes
    setCurrentSignal(null)
    setCurrentStrategy(null)
  }

  // Handle strategy updates
  const handleUpdateStrategy = (id: string, updates: Partial<StrategyConfig>) => {
    tradingAgent.strategyEngine.updateStrategy(id, updates)
    setStrategies(tradingAgent.strategyEngine.getStrategies())
  }

  // Handle strategy creation
  const handleCreateStrategy = () => {
    const newStrategy = tradingAgent.strategyEngine.createStrategy()
    setStrategies(tradingAgent.strategyEngine.getStrategies())
    setActiveTab("config") // Switch to config tab
  }

  // Handle strategy deletion
  const handleDeleteStrategy = (id: string) => {
    if (confirm("Are you sure you want to delete this strategy?")) {
      tradingAgent.strategyEngine.deleteStrategy(id)
      setStrategies(tradingAgent.strategyEngine.getStrategies())
    }
  }

  // Handle API key submission
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Save API keys to localStorage
    localStorage.setItem("trading-dashboard-api-key", apiKey)
    localStorage.setItem("trading-dashboard-api-secret", apiSecret)

    // Close the dialog
    setIsApiDialogOpen(false)

    // Reload the page to reinitialize the trading agent with new API keys
    window.location.reload()
  }

  // Check if exchange connection is working
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try to fetch a small amount of data to test the connection
        const testData = await tradingAgent.getMarketData(currentSymbol, currentTimeframe, 5)
        setIsConnected(testData.length > 0)
      } catch (error) {
        console.error("Exchange connection error:", error)
        setIsConnected(false)
      }
    }

    checkConnection()
  }, [tradingAgent, currentSymbol, currentTimeframe])

  // Check WebSocket status periodically
  useEffect(() => {
    if (!tradingAgent || !isAgentRunning) return

    const checkWebSocketStatus = () => {
      if (tradingAgent.isWebSocketConnected(currentSymbol)) {
        setWebSocketStatus("connected")
      } else {
        // Check if we're in the process of connecting
        const status = tradingAgent.getWebSocketStatus()[currentSymbol]
        if (status === "connecting") {
          setWebSocketStatus("connecting")
        } else {
          setWebSocketStatus("disconnected")
        }
      }
    }

    // Check immediately
    checkWebSocketStatus()

    // Then check periodically
    const interval = setInterval(checkWebSocketStatus, 5000)

    return () => clearInterval(interval)
  }, [tradingAgent, isAgentRunning, currentSymbol])

  // Run the trading agent when it's active
  useEffect(() => {
    if (!isAgentRunning) return

    const runAnalysis = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Analyze symbol with current data (don't force refresh)
        const result = await tradingAgent.analyzeSymbol(
          currentSymbol,
          currentTimeframe,
          mockHuggingFaceApiKey,
          mockDeepSeekApiKey,
          useMockLLMImplementation,
        )

        // Update current state
        setCurrentSignal(result.signal)
        setCurrentStrategy(result.strategy)
        setMarketRegime(result.marketRegime)

        // Generate validation result based on signal confidence and strategy
        if (result.signal && result.signal.signal !== "NEUTRAL") {
          const confidenceThreshold = 0.75
          const isValid = result.signal.confidence >= confidenceThreshold

          const reasons = []
          if (result.signal.confidence < confidenceThreshold) {
            reasons.push(`Signal confidence below threshold (${confidenceThreshold * 100}%)`)
          }

          // Add strategy-specific validation reasons
          if (result.strategy.style === "TREND" && result.marketRegime !== "TRENDING") {
            reasons.push(
              `Strategy type (${result.strategy.style}) doesn't match market regime (${result.marketRegime})`,
            )
          }

          if (result.signal.confidence < 0.6) {
            reasons.push("Insufficient technical confirmation")
          }

          setSignalValidation({
            isValid,
            reasons,
            score: result.signal.confidence,
          })
        } else {
          setSignalValidation(null)
        }

        // Cache the results for this symbol
        setSymbolData((prevData) => {
          const newData = new Map(prevData)
          newData.set(currentSymbol, {
            signal: result.signal,
            strategy: result.strategy,
            marketRegime: result.marketRegime,
          })
          return newData
        })
      } catch (error) {
        console.error("Error running trading agent:", error)
        setError(error instanceof Error ? error.message : "Unknown error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    // Run immediately
    runAnalysis()

    // Run consistently every 60 seconds for streamlined updates
    const interval = setInterval(runAnalysis, 60000)

    return () => clearInterval(interval)
  }, [
    isAgentRunning,
    currentSymbol,
    currentTimeframe,
    tradingAgent,
    mockHuggingFaceApiKey,
    mockDeepSeekApiKey,
    useMockLLMImplementation,
  ])

  // 5. Add a new useEffect to set up the synchronized data cycle when the agent is running

  // Add this new useEffect after the existing agent running effect
  useEffect(() => {
    if (!isAgentRunning) {
      setNextUpdateTime(null)
      return
    }

    // Set the next update time to 60 seconds from now
    const next = new Date(Date.now() + 60000)
    setNextUpdateTime(next)
    setTimeUntilUpdate(60)

    // Update the countdown every second
    const countdownInterval = setInterval(() => {
      const secondsLeft = Math.max(0, Math.floor((next.getTime() - Date.now()) / 1000))
      setTimeUntilUpdate(secondsLeft)

      // When we reach zero, set the next update time
      if (secondsLeft === 0) {
        const newNext = new Date(Date.now() + 60000)
        setNextUpdateTime(newNext)
        setTimeUntilUpdate(60)
      }
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [isAgentRunning, currentSignal]) // Reset on new signal

  // Add this new useEffect after the existing agent running effect
  useEffect(() => {
    if (!isAgentRunning || !tradingAgent) return

    console.log("Setting up synchronized 60-second data cycle")

    // Start the synchronized data cycle
    tradingAgent.synchronizeDataCycle(currentSymbol, currentTimeframe)

    return () => {
      // Clean up will happen automatically through the trading agent's internal management
      console.log("Cleaning up synchronized data cycle")
    }
  }, [isAgentRunning, currentSymbol, currentTimeframe, tradingAgent])

  // Render error message
  const renderError = () => {
    if (!error) return null

    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Add a method to clear all storage data
  const clearAllStorageData = () => {
    if (confirm("Are you sure you want to clear all saved data? This will reset all strategies and trading history.")) {
      const storage = new LocalStorageService()
      storage.clear()
      tradingAgent.clearStorageData()
      tradingAgent.strategyEngine.resetStrategiesToDefaults()

      // Reload strategies
      setStrategies(tradingAgent.strategyEngine.getStrategies())

      alert("All saved data has been cleared. The page will now reload.")
      window.location.reload()
    }
  }

  useEffect(() => {
    localStorage.setItem("trading-dashboard-theme", theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem("trading-dashboard-symbol", currentSymbol)
  }, [currentSymbol])

  useEffect(() => {
    localStorage.setItem("trading-dashboard-timeframe", currentTimeframe)
  }, [currentTimeframe])

  useEffect(() => {
    localStorage.setItem("trading-dashboard-tab", activeTab)
  }, [activeTab])

  // Add these handler functions
  const handleDataSourceChange = (useHistorical: boolean) => {
    setUseHistoricalData(useHistorical)
    tradingAgent.setUseHistoricalData(useHistorical)

    // Reset any active analysis when switching data sources
    setCurrentSignal(null)
    setCurrentStrategy(null)
    setMarketRegime(null)
  }

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setHistoricalDateRange({ startDate, endDate })
    tradingAgent.setHistoricalDateRange(startDate, endDate)

    // Reset any active analysis when changing date range
    setCurrentSignal(null)
    setCurrentStrategy(null)
    setMarketRegime(null)
  }

  // Toggle strategy selection for comparison
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])

  const handleToggleStrategy = (strategyId: string) => {
    setSelectedStrategies((prev) => {
      if (prev.includes(strategyId)) {
        return prev.filter((id) => id !== strategyId)
      } else {
        return [...prev, strategyId]
      }
    })
  }

  const [tradingAgent2] = useState(() => createEnhancedTradingAgent())
  const [selectedSymbol, setSelectedSymbol2] = useState("BTC/USDT")
  const [dateRange, setDateRange2] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  })

  // Sample strategies
  const strategies2 = [
    {
      id: "trend-following",
      name: "Trend Following",
      style: "TREND",
      riskPerTrade: 2,
      takeProfitRatio: 3,
      stopLossType: "atr",
      indicators: {
        primary: ["EMA", "MACD"],
        confirmation: ["RSI", "Volume"],
      },
      suitableRegimes: ["TRENDING"],
    },
    {
      id: "mean-reversion",
      name: "Mean Reversion",
      style: "MEAN_REVERSION",
      riskPerTrade: 1,
      takeProfitRatio: 2,
      stopLossType: "percentage",
      indicators: {
        primary: ["Bollinger Bands", "RSI"],
        confirmation: ["Stochastic", "Volume"],
      },
      suitableRegimes: ["RANGING"],
    },
    {
      id: "breakout",
      name: "Breakout",
      style: "BREAKOUT",
      riskPerTrade: 1.5,
      takeProfitRatio: 2.5,
      stopLossType: "atr",
      indicators: {
        primary: ["ATR", "Support/Resistance"],
        confirmation: ["Volume", "ADX"],
      },
      suitableRegimes: ["VOLATILE"],
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <Header />
          <div className="flex items-center gap-4">
            {/* WebSocket Status */}
            <Badge
              variant="outline"
              className={`font-mono ${
                webSocketStatus === "connected"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : webSocketStatus === "connecting"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
              }`}
            >
              {webSocketStatus === "connected" ? (
                <>
                  <Wifi size={14} className="mr-1" /> WebSocket Connected
                </>
              ) : webSocketStatus === "connecting" ? (
                <>
                  <Wifi size={14} className="mr-1 animate-pulse" /> Connecting...
                </>
              ) : (
                <>
                  <WifiOff size={14} className="mr-1" /> WebSocket Disconnected
                </>
              )}
            </Badge>

            {/* API Key Status */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApiDialogOpen(true)}
              className={`text-xs ${isUsingRealData ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}
            >
              <Key size={14} className="mr-1" />
              {isUsingRealData ? "API Connected" : "Set API Keys"}
            </Button>

            {/* Data Source Indicator */}
            {!isConnected && (
              <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                Using simulated data - check exchange credentials
              </div>
            )}

            <Button variant="outline" size="sm" onClick={clearAllStorageData} className="text-xs">
              Reset Data
            </Button>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>

        {renderError()}

        <div className="overflow-hidden">
          <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex flex-wrap gap-1 overflow-x-auto pb-1 justify-start sm:justify-center">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs sm:text-sm">
                Performance
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs sm:text-sm">
                Strategy Config
              </TabsTrigger>
              <TabsTrigger value="multi-timeframe" className="text-xs sm:text-sm">
                Multi-Timeframe
              </TabsTrigger>
              <TabsTrigger value="backtesting" className="text-xs sm:text-sm">
                Backtesting
              </TabsTrigger>
              <TabsTrigger value="historical" className="text-xs sm:text-sm">
                Historical Data
              </TabsTrigger>
              <TabsTrigger value="advanced-analysis" className="text-xs sm:text-sm">
                Advanced Analysis
              </TabsTrigger>
              <TabsTrigger value="llm-settings" className="text-xs sm:text-sm">
                LLM Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                  <LiveMarketData
                    symbol={currentSymbol}
                    onSymbolChange={handleSymbolChange}
                    timeframe={currentTimeframe}
                    onTimeframeChange={handleTimeframeChange}
                    marketRegime={marketRegime}
                    tradingAgent={tradingAgent}
                    isLoading={isLoading}
                  />
                </div>
                <div className="lg:col-span-1">
                  <TradingSignal
                    signal={currentSignal}
                    strategy={currentStrategy}
                    symbol={currentSymbol}
                    isLoading={isLoading}
                    timeUntilUpdate={timeUntilUpdate} // Add this prop
                    validationResult={signalValidation}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2">
                  <AgentOperationLog
                    isAgentRunning={isAgentRunning}
                    toggleAgent={toggleAgent}
                    currentSymbol={currentSymbol}
                    currentStrategy={currentStrategy?.name}
                    marketRegime={marketRegime}
                    isLoading={isLoading}
                    nextUpdateTime={nextUpdateTime}
                    timeUntilUpdate={timeUntilUpdate}
                  />
                </div>
                <div className="lg:col-span-1">
                  <TechnicalDetailsPanel
                    huggingFaceApiKey={mockHuggingFaceApiKey}
                    deepSeekApiKey={mockDeepSeekApiKey}
                    tradingAgent={tradingAgent}
                    currentSymbol={currentSymbol}
                    currentStrategy={currentStrategy}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance">
              <PerformanceMetrics tradingAgent={tradingAgent} />
            </TabsContent>

            <TabsContent value="config">
              <StrategyConfigPanel
                strategies={strategies}
                onUpdateStrategy={handleUpdateStrategy}
                onDeleteStrategy={handleDeleteStrategy}
                onCreateStrategy={handleCreateStrategy}
              />
            </TabsContent>

            <TabsContent value="multi-timeframe">
              <MultiTimeframeAnalysis
                symbol={currentSymbol}
                tradingAgent={tradingAgent}
                primaryTimeframe={currentTimeframe}
              />
            </TabsContent>

            <TabsContent value="backtesting">
              <StrategyBacktester tradingAgent={tradingAgent} />
            </TabsContent>

            <TabsContent value="historical">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-1">
                  <DataSourceSelector
                    onSourceChange={handleDataSourceChange}
                    onDateRangeChange={handleDateRangeChange}
                    isHistoricalEnabled={useHistoricalData}
                  />
                </div>
                <div className="lg:col-span-2">
                  <HistoricalDataTester
                    tradingAgent={tradingAgent}
                    symbol={currentSymbol}
                    timeframe={currentTimeframe}
                    useHistoricalData={useHistoricalData}
                    dateRange={historicalDateRange}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced-analysis">
              <div className="mb-6">
                <DataSourceSelector
                  onSourceChange={handleDataSourceChange}
                  onDateRangeChange={handleDateRangeChange}
                  isHistoricalEnabled={useHistoricalData}
                />
              </div>

              <HistoricalDashboard
                tradingAgent={tradingAgent}
                strategies={strategies}
                dateRange={historicalDateRange}
              />
            </TabsContent>
            <TabsContent value="llm-settings">
              <LLMSettingsPanel
                huggingFaceApiKey={mockHuggingFaceApiKey}
                deepSeekApiKey={mockDeepSeekApiKey}
                useMockImplementation={useMockLLMImplementation}
                onToggleMockImplementation={(useMock) => setUseMockLLMImplementation(useMock)}
                onSaveKeys={(hfKey, dsKey) => {
                  localStorage.setItem("trading-dashboard-hf-key", hfKey)
                  localStorage.setItem("trading-dashboard-ds-key", dsKey)
                  alert("API keys saved successfully. The page will reload to apply changes.")
                  window.location.reload()
                }}
                onModelChange={(provider, model) => {
                  localStorage.setItem("trading-dashboard-llm-provider", provider)
                  localStorage.setItem("trading-dashboard-llm-model", model)
                }}
                onTestConnection={async () => {
                  try {
                    const result = await tradingAgent.llmService.testConnections(
                      mockHuggingFaceApiKey,
                      mockDeepSeekApiKey,
                      useMockLLMImplementation,
                    )
                    if (!useMockLLMImplementation && !result.huggingface.success && !result.deepseek.success) {
                      throw new Error("Both HuggingFace and DeepSeek connections failed")
                    }
                    alert("Connection test successful!")
                  } catch (error) {
                    throw error
                  }
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* API Key Dialog */}
      <Dialog open={isApiDialogOpen} onOpenChange={setIsApiDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Exchange API Keys</DialogTitle>
            <DialogDescription>
              Enter your Binance API keys to connect to live market data. Your keys are stored locally in your browser.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApiKeySubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apiKey" className="text-right">
                  API Key
                </Label>
                <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apiSecret" className="text-right">
                  API Secret
                </Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
