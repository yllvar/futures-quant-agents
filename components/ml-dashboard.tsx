"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, BrainCircuit, Database } from "lucide-react"
import { ModelEvaluationDashboard } from "@/components/model-evaluation-dashboard"
import { TimeframeSelector } from "@/components/timeframe-selector"
import { MLService } from "@/lib/ml-service"
import type { MarketData, Timeframe } from "@/lib/types"
import type { EnhancedTradingAgent } from "@/lib/trading-agent-extension"
import dynamic from "next/dynamic"

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface MLDashboardProps {
  tradingAgent: EnhancedTradingAgent
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

export function MLDashboard({ tradingAgent, dateRange }: MLDashboardProps) {
  const [symbol, setSymbol] = useState("BTC/USDT")
  const [timeframe, setTimeframe] = useState<Timeframe>("1d")
  const [historicalData, setHistoricalData] = useState<MarketData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mlService] = useState(() => new MLService())

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
      }
    } catch (err) {
      console.error("Error fetching historical data:", err)
      setError(`Error fetching historical data: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when component mounts or parameters change
  useEffect(() => {
    fetchHistoricalData()
  }, [symbol, timeframe, dateRange])

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

      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">
            <Database className="mr-2 h-4 w-4" />
            Data Overview
          </TabsTrigger>
          <TabsTrigger value="models">
            <BrainCircuit className="mr-2 h-4 w-4" />
            ML Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dataset Overview</CardTitle>
              <CardDescription>Historical data available for machine learning</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{historicalData.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          {historicalData.length > 0 ? (
                            <>
                              {new Date(historicalData[0].timestamp).toLocaleDateString()} -{" "}
                              {new Date(historicalData[historicalData.length - 1].timestamp).toLocaleDateString()}
                            </>
                          ) : (
                            "No data available"
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="py-2">
                        <CardTitle className="text-sm font-medium">Price Range</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          {historicalData.length > 0 ? (
                            <>
                              Low: {Math.min(...historicalData.map((d) => d.low)).toFixed(2)} - High:{" "}
                              {Math.max(...historicalData.map((d) => d.high)).toFixed(2)}
                            </>
                          ) : (
                            "No data available"
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="h-[300px]">
                    {historicalData.length > 0 ? (
                      <ApexChart
                        type="line"
                        height={300}
                        series={[
                          {
                            name: "Close Price",
                            data: historicalData.map((d) => ({
                              x: new Date(d.timestamp),
                              y: d.close,
                            })),
                          },
                        ]}
                        options={{
                          chart: {
                            type: "line",
                            zoom: {
                              enabled: true,
                            },
                          },
                          stroke: {
                            curve: "smooth",
                            width: 2,
                          },
                          markers: {
                            size: 0,
                          },
                          xaxis: {
                            type: "datetime",
                          },
                          tooltip: {
                            shared: true,
                            intersect: false,
                          },
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted/20 rounded-md">
                        <p className="text-muted-foreground">No data available</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          {historicalData.length > 0 ? (
            <ModelEvaluationDashboard marketData={historicalData} mlService={mlService} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="flex justify-center">
                  <p className="text-muted-foreground">
                    {isLoading ? "Loading data..." : "No historical data available for model training"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
