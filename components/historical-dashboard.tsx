"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, TrendingUp, Activity, BarChart3 } from "lucide-react"
import { ApexChart } from "@/components/ui/apex-chart"
import { StrategyComparison } from "@/components/strategy-comparison"
import { MarketRegimeAnalysis } from "@/components/market-regime-analysis"
import { TimeframeSelector } from "@/components/timeframe-selector"
import type { MarketData, Timeframe, StrategyConfig } from "@/lib/types"
import type { EnhancedTradingAgent } from "@/lib/trading-agent-extension"

interface HistoricalDashboardProps {
  tradingAgent: EnhancedTradingAgent
  strategies: StrategyConfig[]
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

export function HistoricalDashboard({ tradingAgent, strategies, dateRange }: HistoricalDashboardProps) {
  const [symbol, setSymbol] = useState("BTC/USDT")
  const [timeframe, setTimeframe] = useState<Timeframe>("1d")
  const [historicalData, setHistoricalData] = useState<MarketData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("price-analysis")
  const [marketRegimes, setMarketRegimes] = useState<{ timestamp: number; regime: string }[]>([])
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([strategies[0]?.id || ""])

  // Fetch historical data
  const fetchHistoricalData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await tradingAgent.getHistoricalMarketData(symbol, timeframe, dateRange.startDate, dateRange.endDate)

      if (data.length === 0) {
        setError(`No historical data available for ${symbol} in the selected date range`)
      } else {
        setHistoricalData(data)
        // Detect market regimes
        detectMarketRegimes(data)
      }
    } catch (err) {
      console.error("Error fetching historical data:", err)
      setError(`Error fetching historical data: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Detect market regimes based on historical data
  const detectMarketRegimes = (data: MarketData[]) => {
    // This is a simplified implementation - in a real app, you'd use more sophisticated algorithms
    const regimes: { timestamp: number; regime: string }[] = []
    const windowSize = 20 // Look at 20 candles for regime detection

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i)

      // Calculate volatility
      const closes = window.map((d) => d.close)
      const returns = []
      for (let j = 1; j < closes.length; j++) {
        returns.push((closes[j] - closes[j - 1]) / closes[j - 1])
      }

      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
      const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)

      // Calculate trend strength
      const firstPrice = window[0].close
      const lastPrice = window[window.length - 1].close
      const trendStrength = Math.abs((lastPrice - firstPrice) / firstPrice)

      // Determine regime
      let regime: string
      if (volatility > 0.03) {
        // High volatility
        regime = "VOLATILE"
      } else if (trendStrength > 0.1) {
        // Strong trend
        regime = lastPrice > firstPrice ? "UPTREND" : "DOWNTREND"
      } else {
        regime = "RANGING"
      }

      regimes.push({
        timestamp: data[i].timestamp,
        regime,
      })
    }

    setMarketRegimes(regimes)
  }

  // Toggle strategy selection
  const toggleStrategy = (strategyId: string) => {
    setSelectedStrategies((prev) => {
      if (prev.includes(strategyId)) {
        return prev.filter((id) => id !== strategyId)
      } else {
        return [...prev, strategyId]
      }
    })
  }

  // Load data when component mounts or parameters change
  useEffect(() => {
    fetchHistoricalData()
  }, [symbol, timeframe, dateRange])

  // Format data for ApexCharts
  const chartData = historicalData.map((candle) => ({
    x: new Date(candle.timestamp),
    y: [candle.open, candle.high, candle.low, candle.close],
  }))

  // Add market regime overlay to chart
  const regimeOverlay = marketRegimes.map((r) => ({
    x: new Date(r.timestamp),
    y: historicalData.find((d) => d.timestamp === r.timestamp)?.high || 0,
    regime: r.regime,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
              <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
              <SelectItem value="ADA/USDT">ADA/USDT</SelectItem>
              <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
            </SelectContent>
          </Select>

          <TimeframeSelector
            selectedTimeframe={timeframe}
            onTimeframeChange={setTimeframe}
            availableTimeframes={["1h", "4h", "1d", "1w"]}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchHistoricalData} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>

          <div className="text-sm text-muted-foreground">
            {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="price-analysis">
            <TrendingUp className="mr-2 h-4 w-4" />
            Price Analysis
          </TabsTrigger>
          <TabsTrigger value="market-regimes">
            <Activity className="mr-2 h-4 w-4" />
            Market Regimes
          </TabsTrigger>
          <TabsTrigger value="strategy-comparison">
            <BarChart3 className="mr-2 h-4 w-4" />
            Strategy Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price-analysis">
          <Card>
            <CardHeader>
              <CardTitle>Historical Price Analysis</CardTitle>
              <CardDescription>
                Historical price data for {symbol} on {timeframe} timeframe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px]">
                {historicalData.length > 0 ? (
                  <ApexChart type="candlestick" height={500} data={historicalData} timeframe={timeframe} />
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">{isLoading ? "Loading data..." : "No data available"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market-regimes">
          <MarketRegimeAnalysis
            historicalData={historicalData}
            marketRegimes={marketRegimes}
            symbol={symbol}
            timeframe={timeframe}
          />
        </TabsContent>

        <TabsContent value="strategy-comparison">
          <StrategyComparison
            tradingAgent={tradingAgent}
            historicalData={historicalData}
            strategies={strategies.filter((s) => selectedStrategies.includes(s.id))}
            symbol={symbol}
            timeframe={timeframe}
            dateRange={dateRange}
            onToggleStrategy={toggleStrategy}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
