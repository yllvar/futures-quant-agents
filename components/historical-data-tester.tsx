"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import type { MarketData, Timeframe } from "@/lib/types"
import type { EnhancedTradingAgent } from "@/lib/trading-agent-extension"

interface HistoricalDataTesterProps {
  tradingAgent?: EnhancedTradingAgent
  symbol?: string
  timeframe?: Timeframe
  useHistoricalData?: boolean
  dateRange?: {
    startDate: Date
    endDate: Date
  }
}

export function HistoricalDataTester({
  tradingAgent,
  symbol = "BTC/USDT",
  timeframe = "1h",
  useHistoricalData = false,
  dateRange = {
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  },
}: HistoricalDataTesterProps) {
  const [historicalData, setHistoricalData] = useState<MarketData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("raw-data")

  const fetchHistoricalData = async () => {
    if (!tradingAgent) {
      setError("Trading agent not initialized")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use the enhanced trading agent to get historical data
      const data = await tradingAgent.getHistoricalMarketData(symbol, timeframe, dateRange.startDate, dateRange.endDate)

      if (data.length === 0) {
        setError("No historical data found for the selected parameters")
      } else {
        setHistoricalData(data)
      }
    } catch (err) {
      console.error("Error fetching historical data:", err)
      setError(`Error fetching historical data for ${symbol}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate summary statistics
  const calculateSummary = () => {
    if (historicalData.length === 0) return null

    const prices = historicalData.map((d) => d.close)
    const volumes = historicalData.map((d) => d.volume)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0)
    const avgVolume = totalVolume / volumes.length

    // Calculate price change
    const firstPrice = historicalData[0].close
    const lastPrice = historicalData[historicalData.length - 1].close
    const priceChange = lastPrice - firstPrice
    const priceChangePercent = (priceChange / firstPrice) * 100

    // Calculate volatility (standard deviation of price changes)
    const priceChanges = []
    for (let i = 1; i < historicalData.length; i++) {
      priceChanges.push((historicalData[i].close - historicalData[i - 1].close) / historicalData[i - 1].close)
    }
    const avgPriceChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length
    const volatility = Math.sqrt(
      priceChanges.reduce((sum, change) => sum + Math.pow(change - avgPriceChange, 2), 0) / priceChanges.length,
    )

    return {
      dataPoints: historicalData.length,
      startDate: new Date(historicalData[0].timestamp).toLocaleDateString(),
      endDate: new Date(historicalData[historicalData.length - 1].timestamp).toLocaleDateString(),
      minPrice,
      maxPrice,
      avgPrice,
      totalVolume,
      avgVolume,
      priceChange,
      priceChangePercent,
      volatility,
    }
  }

  const summary = calculateSummary()

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  // Format number for display
  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Historical Data Viewer</span>
          <Button variant="outline" size="sm" onClick={fetchHistoricalData} disabled={isLoading || !useHistoricalData}>
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          {useHistoricalData
            ? `Viewing historical data for ${symbol} (${timeframe}) from ${dateRange.startDate.toLocaleDateString()} to ${dateRange.endDate.toLocaleDateString()}`
            : "Switch to historical data mode to view historical data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!useHistoricalData ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">Historical data mode is disabled</p>
          </div>
        ) : historicalData.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="raw-data">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Open</TableHead>
                      <TableHead>High</TableHead>
                      <TableHead>Low</TableHead>
                      <TableHead>Close</TableHead>
                      <TableHead>Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalData.map((data, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(data.timestamp)}</TableCell>
                        <TableCell>{formatNumber(data.open)}</TableCell>
                        <TableCell>{formatNumber(data.high)}</TableCell>
                        <TableCell>{formatNumber(data.low)}</TableCell>
                        <TableCell>{formatNumber(data.close)}</TableCell>
                        <TableCell>{formatNumber(data.volume, 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="summary">
              {summary ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Points:</span>
                      <span>{summary.dataPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Date:</span>
                      <span>{summary.startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span>{summary.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min Price:</span>
                      <span>{formatNumber(summary.minPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Price:</span>
                      <span>{formatNumber(summary.maxPrice)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Price:</span>
                      <span>{formatNumber(summary.avgPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Volume:</span>
                      <span>{formatNumber(summary.totalVolume, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Volume:</span>
                      <span>{formatNumber(summary.avgVolume, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price Change:</span>
                      <span className={summary.priceChange >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {formatNumber(summary.priceChange)} ({formatNumber(summary.priceChangePercent)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volatility:</span>
                      <span>{formatNumber(summary.volatility * 100)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground">Click "Refresh Data" to load historical data</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
