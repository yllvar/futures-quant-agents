"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"
import type { MarketData, Timeframe } from "@/lib/types"

interface MarketRegimeAnalysisProps {
  historicalData: MarketData[]
  marketRegimes: { timestamp: number; regime: string }[]
  symbol: string
  timeframe: Timeframe
}

export function MarketRegimeAnalysis({ historicalData, marketRegimes, symbol, timeframe }: MarketRegimeAnalysisProps) {
  const [activeTab, setActiveTab] = useState("visualization")

  // Prepare data for visualization
  const chartData = useMemo(() => {
    if (historicalData.length === 0 || marketRegimes.length === 0) return []

    return historicalData
      .map((candle) => {
        const regime = marketRegimes.find((r) => r.timestamp === candle.timestamp)?.regime || null
        return {
          timestamp: candle.timestamp,
          date: new Date(candle.timestamp).toLocaleDateString(),
          price: candle.close,
          regime,
        }
      })
      .filter((d) => d.regime !== null)
  }, [historicalData, marketRegimes])

  // Calculate regime statistics
  const regimeStats = useMemo(() => {
    if (marketRegimes.length === 0) return {}

    const stats: Record<string, { count: number; avgReturn: number; volatility: number }> = {}
    const regimeGroups: Record<string, { timestamps: number[]; returns: number[] }> = {}

    // Group by regime
    marketRegimes.forEach((r) => {
      if (!regimeGroups[r.regime]) {
        regimeGroups[r.regime] = { timestamps: [], returns: [] }
      }
      regimeGroups[r.regime].timestamps.push(r.timestamp)
    })

    // Calculate statistics for each regime
    for (const regime in regimeGroups) {
      const timestamps = regimeGroups[regime].timestamps
      const returns: number[] = []

      // Calculate returns for each period in this regime
      for (let i = 0; i < timestamps.length; i++) {
        const currentCandle = historicalData.find((d) => d.timestamp === timestamps[i])
        if (currentCandle && i > 0) {
          const prevCandle = historicalData.find((d) => d.timestamp === timestamps[i - 1])
          if (prevCandle) {
            const returnPct = (currentCandle.close - prevCandle.close) / prevCandle.close
            returns.push(returnPct)
          }
        }
      }

      // Calculate average return and volatility
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
      const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length)

      stats[regime] = {
        count: timestamps.length,
        avgReturn: avgReturn * 100, // Convert to percentage
        volatility: volatility * 100, // Convert to percentage
      }
    }

    return stats
  }, [marketRegimes, historicalData])

  // Find regime transitions
  const regimeTransitions = useMemo(() => {
    if (marketRegimes.length < 2) return []

    const transitions = []
    let currentRegime = marketRegimes[0].regime
    let currentStart = marketRegimes[0].timestamp

    for (let i = 1; i < marketRegimes.length; i++) {
      if (marketRegimes[i].regime !== currentRegime) {
        // Regime changed, record the transition
        transitions.push({
          from: currentRegime,
          to: marketRegimes[i].regime,
          startDate: new Date(currentStart).toLocaleDateString(),
          endDate: new Date(marketRegimes[i].timestamp).toLocaleDateString(),
          duration: Math.round((marketRegimes[i].timestamp - currentStart) / (1000 * 60 * 60 * 24)), // days
        })

        currentRegime = marketRegimes[i].regime
        currentStart = marketRegimes[i].timestamp
      }
    }

    return transitions
  }, [marketRegimes])

  // Get color for regime
  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case "UPTREND":
        return "#10b981" // green
      case "DOWNTREND":
        return "#ef4444" // red
      case "RANGING":
        return "#f59e0b" // amber
      case "VOLATILE":
        return "#8b5cf6" // violet
      default:
        return "#6b7280" // gray
    }
  }

  // Get badge variant for regime
  const getRegimeBadge = (regime: string) => {
    switch (regime) {
      case "UPTREND":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{regime}</Badge>
      case "DOWNTREND":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{regime}</Badge>
      case "RANGING":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">{regime}</Badge>
      case "VOLATILE":
        return <Badge className="bg-violet-500/10 text-violet-500 border-violet-500/20">{regime}</Badge>
      default:
        return <Badge variant="outline">{regime}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Market Regime Analysis</CardTitle>
          <CardDescription>
            Analysis of market regimes for {symbol} on {timeframe} timeframe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="transitions">Regime Transitions</TabsTrigger>
            </TabsList>

            <TabsContent value="visualization">
              <div className="h-[400px] mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [`${value.toFixed(2)}`, "Price"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={false} name="Price" />

                      {/* Add reference areas for different regimes */}
                      {regimeTransitions.map((transition, index) => {
                        const startIdx = chartData.findIndex(
                          (d) => new Date(d.timestamp).toLocaleDateString() === transition.startDate,
                        )
                        const endIdx = chartData.findIndex(
                          (d) => new Date(d.timestamp).toLocaleDateString() === transition.endDate,
                        )

                        if (startIdx >= 0 && endIdx >= 0) {
                          return (
                            <ReferenceLine
                              key={index}
                              x={chartData[startIdx].date}
                              stroke={getRegimeColor(transition.from)}
                              label={{ value: transition.from, position: "insideTopRight" }}
                            />
                          )
                        }
                        return null
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">No regime data available</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {Object.keys(regimeStats).map((regime) => (
                  <div key={regime} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRegimeColor(regime) }} />
                    <span className="text-sm">{regime}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="statistics">
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Regime</TableHead>
                    <TableHead>Occurrences</TableHead>
                    <TableHead>Avg. Daily Return</TableHead>
                    <TableHead>Volatility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(regimeStats).map(([regime, stats]) => (
                    <TableRow key={regime}>
                      <TableCell>{getRegimeBadge(regime)}</TableCell>
                      <TableCell>{stats.count}</TableCell>
                      <TableCell className={stats.avgReturn >= 0 ? "text-emerald-500" : "text-red-500"}>
                        {stats.avgReturn >= 0 ? "+" : ""}
                        {stats.avgReturn.toFixed(2)}%
                      </TableCell>
                      <TableCell>{stats.volatility.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="transitions">
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Duration (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regimeTransitions.map((transition, index) => (
                    <TableRow key={index}>
                      <TableCell>{getRegimeBadge(transition.from)}</TableCell>
                      <TableCell>{getRegimeBadge(transition.to)}</TableCell>
                      <TableCell>{transition.startDate}</TableCell>
                      <TableCell>{transition.endDate}</TableCell>
                      <TableCell>{transition.duration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
