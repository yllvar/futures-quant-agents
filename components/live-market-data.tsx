"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react"
import { PriceChart } from "@/components/price-chart"
import { TechnicalIndicatorCard } from "@/components/technical-indicator-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimeframeSelector } from "@/components/timeframe-selector"
import type { TradingAgent } from "@/lib/trading-agent"
import type { MarketData, Timeframe } from "@/lib/types"

interface LiveMarketDataProps {
  symbol: string
  onSymbolChange: (symbol: string) => void
  timeframe: Timeframe
  onTimeframeChange: (timeframe: Timeframe) => void
  marketRegime?: string | null
  tradingAgent?: TradingAgent
  isLoading?: boolean
}

export function LiveMarketData({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  marketRegime,
  tradingAgent,
  isLoading = false,
}: LiveMarketDataProps) {
  const [price, setPrice] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([])
  const [availableTimeframes, setAvailableTimeframes] = useState<Timeframe[]>([])
  const [technicalIndicators, setTechnicalIndicators] = useState({
    sma20: 0,
    sma50: 0,
    rsi: 0,
    macd: 0,
  })
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [tickerData, setTickerData] = useState<{
    bid: number
    ask: number
    spread: number
  } | null>(null)

  // Get available symbols and timeframes from trading agent
  useEffect(() => {
    if (tradingAgent) {
      setAvailableSymbols(tradingAgent.getAvailableSymbols())
      setAvailableTimeframes(tradingAgent.getAvailableTimeframes())

      // Initialize WebSockets if available
      tradingAgent.initializeWebSockets([symbol])
    } else {
      setAvailableSymbols(["SOL/USDT", "BTC/USDT", "ETH/USDT", "ADA/USDT", "XRP/USDT"])
      setAvailableTimeframes(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"])
    }

    // Cleanup WebSockets on unmount
    return () => {
      if (tradingAgent) {
        tradingAgent.closeAllWebSockets()
      }
    }
  }, [tradingAgent, symbol])

  // Subscribe to real-time updates via WebSocket
  useEffect(() => {
    if (!tradingAgent) return

    // Check WebSocket connection status
    const checkWebSocketStatus = () => {
      setIsWebSocketConnected(tradingAgent.isWebSocketConnected(symbol))
    }

    checkWebSocketStatus()

    // Subscribe to real-time market data
    const unsubscribe = tradingAgent.subscribeToMarketData(symbol, (data) => {
      // Update price and other data
      setPrice(data.close)
      setLastUpdate(new Date())

      // Update market data (append new candle or update last candle)
      setMarketData((prevData) => {
        // If no previous data, just return the new data
        if (prevData.length === 0) return [data]

        // Check if this is an update to the last candle
        const lastCandle = prevData[prevData.length - 1]
        if (lastCandle.timestamp === data.timestamp && lastCandle.timeframe === data.timeframe) {
          // Update the last candle
          const updatedData = [...prevData]
          updatedData[updatedData.length - 1] = data
          return updatedData
        } else {
          // Add as a new candle
          return [...prevData, data]
        }
      })

      // Update WebSocket connection status
      setIsWebSocketConnected(true)
    })

    // Set up interval to check WebSocket status
    const statusInterval = setInterval(checkWebSocketStatus, 5000)

    // Cleanup
    return () => {
      unsubscribe()
      clearInterval(statusInterval)
    }
  }, [tradingAgent, symbol])

  // Fetch ticker data periodically
  useEffect(() => {
    if (!tradingAgent) return

    const fetchTickerData = async () => {
      try {
        const ticker = await tradingAgent.getTicker(symbol)

        setTickerData({
          bid: ticker.bid,
          ask: ticker.ask,
          spread: ((ticker.ask - ticker.bid) / ticker.bid) * 100,
        })

        // Update price and change if not already set by WebSocket
        if (!price) setPrice(ticker.last)
        if (!change) setChange(ticker.changePercent24h)
        if (!volume) setVolume(ticker.volume)
      } catch (error) {
        console.error("Error fetching ticker data:", error)
      }
    }

    // Fetch immediately
    fetchTickerData()

    // Then fetch periodically
    const interval = setInterval(fetchTickerData, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [tradingAgent, symbol, price, change, volume])

  // Fetch market data when component mounts or symbol/timeframe changes
  const fetchMarketData = useCallback(async () => {
    if (!tradingAgent) return

    setIsDataLoading(true)
    try {
      const data = await tradingAgent.getMarketData(symbol, timeframe)
      setMarketData(data)

      if (data.length > 0) {
        const latestCandle = data[data.length - 1]
        setPrice(latestCandle.close)

        // Calculate 24h change
        if (data.length > 24) {
          const previousCandle = data[data.length - 25] // 24 hours ago for hourly data
          const changePercent = ((latestCandle.close - previousCandle.close) / previousCandle.close) * 100
          setChange(Number.parseFloat(changePercent.toFixed(2)))
        }

        // Set volume (in millions)
        setVolume(latestCandle.volume)

        // Calculate some basic indicators
        if (data.length >= 50) {
          // Simple moving averages
          const sma20 = data.slice(-20).reduce((sum, d) => sum + d.close, 0) / 20
          const sma50 = data.slice(-50).reduce((sum, d) => sum + d.close, 0) / 50

          // Simple RSI (14-period)
          const rsi = calculateSimpleRSI(data.slice(-15).map((d) => d.close))

          // Simple MACD
          const ema12 = calculateEMA(
            data.map((d) => d.close),
            12,
          )
          const ema26 = calculateEMA(
            data.map((d) => d.close),
            26,
          )
          const macd = ema12 - ema26

          setTechnicalIndicators({
            sma20,
            sma50,
            rsi,
            macd,
          })
        }

        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching market data:", error)
    } finally {
      setIsDataLoading(false)
    }
  }, [tradingAgent, symbol, timeframe])

  // Calculate a simple RSI
  const calculateSimpleRSI = (prices: number[]): number => {
    if (prices.length < 14) return 50

    let gains = 0
    let losses = 0

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change >= 0) {
        gains += change
      } else {
        losses -= change
      }
    }

    const avgGain = gains / (prices.length - 1)
    const avgLoss = losses / (prices.length - 1)

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  // Calculate EMA
  const calculateEMA = (prices: number[], period: number): number => {
    const k = 2 / (period + 1)
    let ema = prices[0]

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k)
    }

    return ema
  }

  // Fetch data when component mounts or symbol/timeframe changes
  useEffect(() => {
    fetchMarketData()

    // Set up interval to fetch data periodically if WebSocket is not connected
    const interval = setInterval(() => {
      if (!isWebSocketConnected) {
        fetchMarketData()
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [symbol, timeframe, tradingAgent, fetchMarketData, isWebSocketConnected])

  // Format price display based on the symbol
  const formatPrice = (price: number | null): string => {
    if (price === null) return "0.00"

    if (symbol.startsWith("BTC")) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else if (symbol.startsWith("ETH")) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else if (symbol.startsWith("SOL")) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    } else if (symbol.startsWith("ADA") || symbol.startsWith("XRP")) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    }

    return price.toFixed(2)
  }

  // Render loading overlay
  const renderLoadingOverlay = () => {
    if (!isLoading) return null

    return (
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="mt-2 text-sm">Analyzing market data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Live Market Data</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={symbol} onValueChange={onSymbolChange} disabled={isLoading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((sym) => (
                    <SelectItem key={sym} value={sym}>
                      {sym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {marketRegime && (
                <Badge
                  variant="outline"
                  className={`font-mono ${
                    marketRegime === "TRENDING"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : marketRegime === "RANGING"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  }`}
                >
                  {marketRegime}
                </Badge>
              )}

              {/* WebSocket connection status */}
              <Badge
                variant="outline"
                className={`font-mono ${
                  isWebSocketConnected
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}
              >
                {isWebSocketConnected ? (
                  <>
                    <Wifi size={14} className="mr-1" /> Live
                  </>
                ) : (
                  <>
                    <WifiOff size={14} className="mr-1" /> Polling
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {renderLoadingOverlay()}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Last Price</span>
              <div className="flex items-center gap-2">
                {isDataLoading && !price ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                ) : (
                  <>
                    <span className="text-2xl font-bold">${formatPrice(price)}</span>
                    {change !== null &&
                      (change >= 0 ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          <ArrowUpRight size={14} className="mr-1" />+{change}%
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          <ArrowDownRight size={14} className="mr-1" />
                          {change}%
                        </Badge>
                      ))}
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">24h Change</span>
              <div className="flex items-center gap-2">
                {isDataLoading && change === null ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                ) : (
                  <span className={`text-2xl font-bold ${change && change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {change !== null ? `${change >= 0 ? "+" : ""}${change}%` : "N/A"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Volume</span>
              <div className="flex items-center gap-2">
                {isDataLoading && volume === null ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                ) : (
                  <>
                    <span className="text-2xl font-bold">
                      ${volume ? (volume > 1000000 ? (volume / 1000000).toFixed(2) + "M" : volume.toFixed(2)) : "0.00"}
                    </span>
                    <Activity size={18} className="text-muted-foreground" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bid/Ask information */}
          {tickerData && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-2 border rounded-md">
                <div className="text-xs text-muted-foreground">Bid</div>
                <div className="text-sm font-semibold">${formatPrice(tickerData.bid)}</div>
              </div>
              <div className="p-2 border rounded-md">
                <div className="text-xs text-muted-foreground">Ask</div>
                <div className="text-sm font-semibold">${formatPrice(tickerData.ask)}</div>
              </div>
              <div className="p-2 border rounded-md">
                <div className="text-xs text-muted-foreground">Spread</div>
                <div className="text-sm font-semibold">{tickerData.spread.toFixed(4)}%</div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <TimeframeSelector
              selectedTimeframe={timeframe}
              onTimeframeChange={onTimeframeChange}
              availableTimeframes={availableTimeframes}
            />
          </div>

          <PriceChart symbol={symbol} marketData={marketData} timeframe={timeframe} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <TechnicalIndicatorCard
              title="SMA20"
              value={technicalIndicators.sma20}
              icon={<TrendingUp size={16} />}
              trend={technicalIndicators.sma20 > (price || 0) ? "down" : "up"}
              prefix={symbol.startsWith("ADA") || symbol.startsWith("XRP") ? "$" : "$"}
            />
            <TechnicalIndicatorCard
              title="SMA50"
              value={technicalIndicators.sma50}
              icon={<TrendingDown size={16} />}
              trend={technicalIndicators.sma50 > (price || 0) ? "down" : "up"}
              prefix={symbol.startsWith("ADA") || symbol.startsWith("XRP") ? "$" : "$"}
            />
            <TechnicalIndicatorCard
              title="RSI14"
              value={technicalIndicators.rsi}
              icon={<Activity size={16} />}
              trend={technicalIndicators.rsi > 70 ? "up" : technicalIndicators.rsi < 30 ? "down" : "neutral"}
              suffix=""
              prefix=""
            />
            <TechnicalIndicatorCard
              title="MACD"
              value={technicalIndicators.macd}
              icon={<BarChart2 size={16} />}
              trend={technicalIndicators.macd > 0 ? "up" : "down"}
              prefix=""
            />
          </div>

          {lastUpdate && (
            <div className="text-xs text-right text-muted-foreground mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
              {isWebSocketConnected && " (live)"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
