"use client"

import { useEffect, useState } from "react"
import { ApexChart } from "@/components/ui/apex-chart"
import { generateCandlestickData } from "@/lib/generate-data"
import type { MarketData, Timeframe } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface PriceChartProps {
  symbol: string
  marketData?: MarketData[]
  timeframe?: Timeframe
}

export function PriceChart({ symbol, marketData = [], timeframe = "1h" }: PriceChartProps) {
  const [data, setData] = useState<MarketData[]>([])
  const [isUsingRealData, setIsUsingRealData] = useState(false)
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick")
  const [showIndicators, setShowIndicators] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  // Dummy indicator data
  const [indicators, setIndicators] = useState<any>(null)

  // Convert MarketData to chart-compatible format
  useEffect(() => {
    if (marketData && marketData.length > 0) {
      const formattedData = marketData.map((candle) => ({
        ...candle,
        timestamp: new Date(candle.timestamp).getTime(),
      }))

      // Generate some simple indicator data for demonstration
      if (formattedData.length > 20) {
        // Simple moving averages
        const sma20 = formattedData.map((_, i, arr) => {
          if (i < 19) return arr[i].close
          return arr.slice(i - 19, i + 1).reduce((sum, d) => sum + d.close, 0) / 20
        })

        const sma50 = formattedData.map((_, i, arr) => {
          if (i < 49) return arr[i].close
          return arr.slice(i - 49, i + 1).reduce((sum, d) => sum + d.close, 0) / 50
        })

        // Simple Bollinger Bands
        const period = 20
        const stdDevFactor = 2
        const upperBand = formattedData.map((_, i, arr) => {
          if (i < period - 1) return arr[i].close
          const slice = arr.slice(i - (period - 1), i + 1)
          const mean = slice.reduce((sum, d) => sum + d.close, 0) / period
          const squaredDiffs = slice.map((d) => Math.pow(d.close - mean, 2))
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period
          const stdDev = Math.sqrt(variance)
          return mean + stdDev * stdDevFactor
        })

        const lowerBand = formattedData.map((_, i, arr) => {
          if (i < period - 1) return arr[i].close
          const slice = arr.slice(i - (period - 1), i + 1)
          const mean = slice.reduce((sum, d) => sum + d.close, 0) / period
          const squaredDiffs = slice.map((d) => Math.pow(d.close - mean, 2))
          const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period
          const stdDev = Math.sqrt(variance)
          return mean - stdDev * stdDevFactor
        })

        setIndicators({ sma20, sma50, upperBand, lowerBand })
      }

      setData(formattedData)
      setIsUsingRealData(true)
    } else {
      // Fallback to generated data if no market data is provided
      const mockData = generateCandlestickData(50).map((d) => ({
        symbol,
        timestamp: new Date(d.time).getTime(),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: Math.random() * 1000000,
        timeframe: timeframe,
      }))

      setData(mockData)
      setIsUsingRealData(false)
    }
  }, [marketData, symbol, timeframe])

  // Format timeframe for display
  const formatTimeframe = (tf: Timeframe): string => {
    switch (tf) {
      case "1m":
        return "1 Minute"
      case "5m":
        return "5 Minutes"
      case "15m":
        return "15 Minutes"
      case "30m":
        return "30 Minutes"
      case "1h":
        return "1 Hour"
      case "4h":
        return "4 Hours"
      case "1d":
        return "1 Day"
      case "1w":
        return "1 Week"
      default:
        return tf
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex space-x-2">
        <div className="flex bg-background/80 backdrop-blur-sm rounded border border-border p-1">
          <button
            className={`px-2 py-1 text-xs rounded ${chartType === "candlestick" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setChartType("candlestick")}
          >
            Candles
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${chartType === "line" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setChartType("line")}
          >
            Line
          </button>
          <button
            className={`px-2 py-1 text-xs rounded ${chartType === "area" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            onClick={() => setChartType("area")}
          >
            Area
          </button>
        </div>

        <button
          className={`px-2 py-1 text-xs rounded border border-border ${showIndicators ? "bg-primary text-primary-foreground" : "bg-background/80 hover:bg-muted"}`}
          onClick={() => setShowIndicators(!showIndicators)}
        >
          Indicators
        </button>
      </div>

      <div className="h-[300px] w-full">
        <ApexChart
          data={data}
          type={chartType}
          height={300}
          theme={theme}
          indicators={showIndicators ? indicators : undefined}
          timeframe={timeframe}
        />
      </div>

      {!isUsingRealData && (
        <div className="text-xs text-center text-amber-500 mt-1">
          Using simulated data. Connect to exchange for real-time data.
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20">
          {symbol}
        </Badge>
        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20">
          {formatTimeframe(timeframe)}
        </Badge>
      </div>
    </div>
  )
}
