"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import dynamic from "next/dynamic"
import type { MarketData, Timeframe } from "@/lib/types"
import type { TradingAgent } from "@/lib/trading-agent"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface MultiTimeframeAnalysisProps {
  symbol: string
  tradingAgent: TradingAgent
  primaryTimeframe: Timeframe
  onTimeframeChange?: (timeframe: Timeframe) => void
}

export function MultiTimeframeAnalysis({
  symbol,
  tradingAgent,
  primaryTimeframe,
  onTimeframeChange,
}: MultiTimeframeAnalysisProps) {
  const [multiTimeframeData, setMultiTimeframeData] = useState<Record<Timeframe, MarketData[]>>({} as any)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<Timeframe>(primaryTimeframe)
  const [analysisResults, setAnalysisResults] = useState<Record<Timeframe, any>>({} as any)

  // Get additional timeframes based on the primary timeframe
  const additionalTimeframes = getAdditionalTimeframes(primaryTimeframe)
  const allTimeframes = [primaryTimeframe, ...additionalTimeframes]

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const data = await tradingAgent.getMultiTimeframeData(symbol, allTimeframes)
        setMultiTimeframeData(data)

        // Generate analysis for each timeframe
        const analysis: Record<Timeframe, any> = {} as Record<Timeframe, any>

        for (const timeframe of allTimeframes) {
          if (data[timeframe] && data[timeframe].length > 0) {
            analysis[timeframe] = generateTimeframeAnalysis(data[timeframe])
          }
        }

        setAnalysisResults(analysis)
      } catch (error) {
        console.error("Error fetching multi-timeframe data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up interval to refresh data
    const intervalId = setInterval(fetchData, 60000) // Refresh every minute

    return () => clearInterval(intervalId)
  }, [symbol, primaryTimeframe, tradingAgent])

  // Handle tab change
  const handleTabChange = (value: string) => {
    const timeframe = value as Timeframe
    setActiveTab(timeframe)
    if (onTimeframeChange) {
      onTimeframeChange(timeframe)
    }
  }

  // Generate analysis for a timeframe
  const generateTimeframeAnalysis = (data: MarketData[]) => {
    if (data.length < 20) return null

    // Calculate some basic indicators
    const closes = data.map((d) => d.close)
    const volumes = data.map((d) => d.volume)
    const timestamps = data.map((d) => new Date(d.timestamp))

    // Calculate SMA20
    const sma20 = calculateSMA(closes, 20)

    // Calculate SMA50
    const sma50 = calculateSMA(closes, 50)

    // Calculate RSI
    const rsi = calculateRSI(closes)

    // Calculate MACD
    const macd = calculateMACD(closes)

    // Calculate Bollinger Bands
    const bollinger = calculateBollingerBands(closes)

    // Calculate price change
    const priceChange = ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100

    // Determine trend
    let trend = "neutral"
    if (sma20 > sma50) trend = "bullish"
    else if (sma20 < sma50) trend = "bearish"

    // Determine momentum
    let momentum = "neutral"
    if (rsi > 70) momentum = "overbought"
    else if (rsi < 30) momentum = "oversold"

    // Determine volatility
    const volatility = calculateVolatility(closes)
    let volatilityLevel = "medium"
    if (volatility > 3) volatilityLevel = "high"
    else if (volatility < 1) volatilityLevel = "low"

    return {
      trend,
      momentum,
      volatilityLevel,
      priceChange,
      sma20,
      sma50,
      rsi,
      macd,
      bollinger,
      closes,
      volumes,
      timestamps,
      volatility,
    }
  }

  // Helper functions for indicators
  const calculateSMA = (values: number[], period: number) => {
    if (values.length < period) return 0
    return values.slice(-period).reduce((sum, val) => sum + val, 0) / period
  }

  const calculateRSI = (values: number[], period = 14) => {
    if (values.length < period + 1) return 50

    let gains = 0
    let losses = 0

    for (let i = 1; i < period + 1; i++) {
      const change = values[values.length - i] - values[values.length - i - 1]
      if (change >= 0) gains += change
      else losses -= change
    }

    if (losses === 0) return 100

    const rs = gains / losses
    return 100 - 100 / (1 + rs)
  }

  const calculateMACD = (values: number[]) => {
    const ema12 = calculateEMA(values, 12)
    const ema26 = calculateEMA(values, 26)
    return ema12 - ema26
  }

  const calculateEMA = (values: number[], period: number) => {
    if (values.length < period) return values[values.length - 1] || 0

    const k = 2 / (period + 1)
    let ema = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period

    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k)
    }

    return ema
  }

  const calculateBollingerBands = (values: number[], period = 20, stdDev = 2) => {
    if (values.length < period) return { upper: 0, middle: 0, lower: 0 }

    const sma = calculateSMA(values, period)
    const recentValues = values.slice(-period)

    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period
    const std = Math.sqrt(variance)

    return {
      upper: sma + stdDev * std,
      middle: sma,
      lower: sma - stdDev * std,
    }
  }

  const calculateVolatility = (values: number[]) => {
    if (values.length < 20) return 0

    const returns = []
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1])
    }

    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length

    return Math.sqrt(variance) * 100
  }

  // Create Plotly visualization for a timeframe
  const createPlotlyVisualization = (timeframe: Timeframe) => {
    const analysis = analysisResults[timeframe]
    if (!analysis) return null

    // Create price and indicator traces
    const traces = [
      {
        x: analysis.timestamps,
        y: analysis.closes,
        type: "scatter",
        mode: "lines",
        name: "Price",
        line: { color: "#22c55e" },
      },
      {
        x: analysis.timestamps,
        y: Array(analysis.timestamps.length).fill(analysis.sma20),
        type: "scatter",
        mode: "lines",
        name: "SMA20",
        line: { color: "#3b82f6", dash: "dash" },
      },
      {
        x: analysis.timestamps,
        y: Array(analysis.timestamps.length).fill(analysis.sma50),
        type: "scatter",
        mode: "lines",
        name: "SMA50",
        line: { color: "#a855f7", dash: "dash" },
      },
    ]

    // Add Bollinger Bands
    if (analysis.bollinger) {
      traces.push({
        x: analysis.timestamps,
        y: Array(analysis.timestamps.length).fill(analysis.bollinger.upper),
        type: "scatter",
        mode: "lines",
        name: "Upper Band",
        line: { color: "#f97316", dash: "dot" },
      })

      traces.push({
        x: analysis.timestamps,
        y: Array(analysis.timestamps.length).fill(analysis.bollinger.lower),
        type: "scatter",
        mode: "lines",
        name: "Lower Band",
        line: { color: "#f97316", dash: "dot" },
      })
    }

    const layout = {
      title: `${symbol} ${timeframe} Analysis`,
      height: 400,
      margin: { l: 50, r: 50, b: 50, t: 50 },
      xaxis: { title: "Time" },
      yaxis: { title: "Price" },
      legend: { orientation: "h", y: -0.2 },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#e5e7eb" },
      autosize: true,
    }

    return { data: traces, layout }
  }

  // Render indicator card
  const renderIndicatorCard = (title: string, value: number | string, trend: "up" | "down" | "neutral" = "neutral") => {
    return (
      <div className="p-3 border rounded-md">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div
          className={`text-lg font-semibold ${
            trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : ""
          }`}
        >
          {typeof value === "number" ? value.toFixed(2) : value}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Multi-Timeframe Analysis: {symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={primaryTimeframe} value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            {allTimeframes.map((timeframe) => (
              <TabsTrigger key={timeframe} value={timeframe}>
                {timeframe}
              </TabsTrigger>
            ))}
          </TabsList>

          {allTimeframes.map((timeframe) => (
            <TabsContent key={timeframe} value={timeframe} className="mt-0">
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Loading {timeframe} data...</span>
                  </div>
                </div>
              ) : analysisResults[timeframe] ? (
                <div className="space-y-6">
                  {/* Summary section */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Market Summary</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={analysisResults[timeframe].trend === "bullish" ? "default" : "outline"}
                          className={analysisResults[timeframe].trend === "bullish" ? "bg-emerald-500" : ""}
                        >
                          Bullish
                        </Badge>
                        <Badge
                          variant={analysisResults[timeframe].trend === "bearish" ? "default" : "outline"}
                          className={analysisResults[timeframe].trend === "bearish" ? "bg-red-500" : ""}
                        >
                          Bearish
                        </Badge>
                        <Badge variant={analysisResults[timeframe].trend === "neutral" ? "default" : "outline"}>
                          Neutral
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {symbol} is showing a {analysisResults[timeframe].trend} trend on the {timeframe} timeframe with{" "}
                        {analysisResults[timeframe].momentum} momentum and {analysisResults[timeframe].volatilityLevel}{" "}
                        volatility.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Price Action</h3>
                      <div className="text-2xl font-bold">
                        <span
                          className={
                            analysisResults[timeframe].priceChange > 0
                              ? "text-emerald-500"
                              : analysisResults[timeframe].priceChange < 0
                                ? "text-red-500"
                                : ""
                          }
                        >
                          {analysisResults[timeframe].priceChange > 0 ? "+" : ""}
                          {analysisResults[timeframe].priceChange.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Price change over the {timeframe} period</p>
                    </div>
                  </div>

                  {/* Plotly visualization */}
                  <div className="h-[400px] w-full">
                    {createPlotlyVisualization(timeframe) && (
                      <Plot
                        data={createPlotlyVisualization(timeframe)!.data}
                        layout={createPlotlyVisualization(timeframe)!.layout}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler={true}
                      />
                    )}
                  </div>

                  {/* Indicators grid */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Technical Indicators</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {renderIndicatorCard("SMA20", analysisResults[timeframe].sma20)}
                      {renderIndicatorCard("SMA50", analysisResults[timeframe].sma50)}
                      {renderIndicatorCard(
                        "RSI",
                        analysisResults[timeframe].rsi,
                        analysisResults[timeframe].rsi > 70
                          ? "up"
                          : analysisResults[timeframe].rsi < 30
                            ? "down"
                            : "neutral",
                      )}
                      {renderIndicatorCard(
                        "MACD",
                        analysisResults[timeframe].macd,
                        analysisResults[timeframe].macd > 0 ? "up" : "down",
                      )}
                      {renderIndicatorCard("Volatility", analysisResults[timeframe].volatility + "%")}
                      {renderIndicatorCard(
                        "Bollinger Width",
                        ((analysisResults[timeframe].bollinger.upper - analysisResults[timeframe].bollinger.lower) /
                          analysisResults[timeframe].bollinger.middle) *
                          100 +
                          "%",
                      )}
                    </div>
                  </div>

                  {/* Analysis conclusion */}
                  <div className="p-4 bg-muted rounded-md">
                    <h3 className="text-sm font-medium mb-2">Analysis Conclusion</h3>
                    <p className="text-sm">
                      {analysisResults[timeframe].trend === "bullish" ? (
                        <>
                          The {timeframe} timeframe shows a{" "}
                          <span className="text-emerald-500 font-medium">bullish</span> trend with
                          {analysisResults[timeframe].rsi > 70 ? " overbought conditions" : " room for growth"}. Price
                          is {analysisResults[timeframe].sma20 > analysisResults[timeframe].sma50 ? "above" : "below"}{" "}
                          key moving averages, suggesting{" "}
                          {analysisResults[timeframe].sma20 > analysisResults[timeframe].sma50
                            ? "continued upward momentum"
                            : "potential resistance ahead"}
                          .
                        </>
                      ) : analysisResults[timeframe].trend === "bearish" ? (
                        <>
                          The {timeframe} timeframe shows a <span className="text-red-500 font-medium">bearish</span>{" "}
                          trend with
                          {analysisResults[timeframe].rsi < 30
                            ? " oversold conditions"
                            : " continued downward pressure"}
                          . Price is{" "}
                          {analysisResults[timeframe].sma20 < analysisResults[timeframe].sma50 ? "below" : "above"} key
                          moving averages, suggesting{" "}
                          {analysisResults[timeframe].sma20 < analysisResults[timeframe].sma50
                            ? "continued downward momentum"
                            : "potential support forming"}
                          .
                        </>
                      ) : (
                        <>
                          The {timeframe} timeframe shows a <span className="font-medium">neutral</span> trend with
                          sideways price action. Moving averages are converging, suggesting a potential breakout may
                          occur soon. Monitor volume for confirmation of the next directional move.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">No data available for {timeframe} timeframe</div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Helper function to get additional timeframes based on the primary timeframe
function getAdditionalTimeframes(timeframe: Timeframe): Timeframe[] {
  switch (timeframe) {
    case "1m":
      return ["5m", "15m", "1h"]
    case "5m":
      return ["15m", "1h", "4h"]
    case "15m":
      return ["1h", "4h", "1d"]
    case "30m":
      return ["1h", "4h", "1d"]
    case "1h":
      return ["4h", "1d", "1w"]
    case "4h":
      return ["1d", "1w", "1h"]
    case "1d":
      return ["1w", "4h", "1h"]
    case "1w":
      return ["1d", "4h", "1h"]
    default:
      return ["1h", "4h", "1d"]
  }
}
