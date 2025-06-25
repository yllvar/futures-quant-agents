"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import type { MarketData, Timeframe, StrategyConfig, BacktestResult } from "@/lib/types"
import type { EnhancedTradingAgent } from "@/lib/trading-agent-extension"

interface StrategyComparisonProps {
  tradingAgent: EnhancedTradingAgent
  historicalData: MarketData[]
  strategies: StrategyConfig[]
  symbol: string
  timeframe: Timeframe
  dateRange: {
    startDate: Date
    endDate: Date
  }
  onToggleStrategy: (strategyId: string) => void
}

export function StrategyComparison({
  tradingAgent,
  historicalData,
  strategies,
  symbol,
  timeframe,
  dateRange,
  onToggleStrategy,
}: StrategyComparisonProps) {
  const [backtestResults, setBacktestResults] = useState<Record<string, BacktestResult>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableStrategies, setAvailableStrategies] = useState<StrategyConfig[]>([])

  // Run backtests for selected strategies
  const runBacktests = async () => {
    if (historicalData.length === 0) {
      setError("No historical data available for backtesting")
      return
    }

    setIsLoading(true)
    setError(null)
    const results: Record<string, BacktestResult> = {}

    try {
      for (const strategy of strategies) {
        const result = await tradingAgent.runHistoricalBacktest(
          symbol,
          timeframe,
          strategy,
          dateRange.startDate,
          dateRange.endDate,
        )
        results[strategy.id] = result
      }

      setBacktestResults(results)
    } catch (err) {
      console.error("Error running backtests:", err)
      setError(`Error running backtests: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load available strategies
  useEffect(() => {
    setAvailableStrategies(tradingAgent.strategyEngine.getStrategies())
  }, [tradingAgent])

  // Run backtests when strategies or data changes
  useEffect(() => {
    if (strategies.length > 0 && historicalData.length > 0) {
      runBacktests()
    }
  }, [strategies, historicalData])

  // Prepare data for equity chart
  const prepareEquityChartData = () => {
    if (Object.keys(backtestResults).length === 0) return []

    // Find the longest equity array
    let maxLength = 0
    for (const result of Object.values(backtestResults)) {
      maxLength = Math.max(maxLength, result.equity.length)
    }

    // Create chart data
    const chartData = []
    for (let i = 0; i < maxLength; i++) {
      const dataPoint: any = { day: i }

      for (const strategyId in backtestResults) {
        const strategy = strategies.find((s) => s.id === strategyId)
        if (strategy && backtestResults[strategyId].equity[i] !== undefined) {
          dataPoint[strategy.name] = backtestResults[strategyId].equity[i]
        }
      }

      chartData.push(dataPoint)
    }

    return chartData
  }

  const equityChartData = prepareEquityChartData()

  // Generate random colors for strategies
  const getStrategyColor = (index: number) => {
    const colors = [
      "#3b82f6", // blue
      "#ef4444", // red
      "#10b981", // green
      "#f59e0b", // amber
      "#8b5cf6", // violet
      "#ec4899", // pink
      "#06b6d4", // cyan
      "#f97316", // orange
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategy Selection</CardTitle>
          <CardDescription>Select strategies to compare</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availableStrategies.map((strategy, index) => (
              <div key={strategy.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`strategy-${strategy.id}`}
                  checked={strategies.some((s) => s.id === strategy.id)}
                  onCheckedChange={() => onToggleStrategy(strategy.id)}
                />
                <label
                  htmlFor={`strategy-${strategy.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {strategy.name}
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button onClick={runBacktests} disabled={isLoading || strategies.length === 0}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Backtests...
                </>
              ) : (
                "Run Backtests"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {Object.keys(backtestResults).length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Equity Curves</CardTitle>
              <CardDescription>Performance comparison of selected strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {strategies.map((strategy, index) => (
                      <Line
                        key={strategy.id}
                        type="monotone"
                        dataKey={strategy.name}
                        stroke={getStrategyColor(index)}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Key metrics for each strategy</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Total Return</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>Profit Factor</TableHead>
                    <TableHead>Sharpe Ratio</TableHead>
                    <TableHead>Max Drawdown</TableHead>
                    <TableHead>Total Trades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strategies.map((strategy, index) => {
                    const result = backtestResults[strategy.id]
                    if (!result) return null

                    return (
                      <TableRow key={strategy.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getStrategyColor(index) }}
                            />
                            {strategy.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={result.totalPnLPercentage >= 0 ? "outline" : "destructive"}
                            className={
                              result.totalPnLPercentage >= 0
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : ""
                            }
                          >
                            {result.totalPnLPercentage >= 0 ? "+" : ""}
                            {result.totalPnLPercentage.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{(result.winRate * 100).toFixed(1)}%</TableCell>
                        <TableCell>{result.profitFactor.toFixed(2)}</TableCell>
                        <TableCell>{result.sharpeRatio.toFixed(2)}</TableCell>
                        <TableCell>{result.maxDrawdown.toFixed(2)}%</TableCell>
                        <TableCell>{result.trades.length}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
