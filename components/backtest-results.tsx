"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { BacktestResult, Trade } from "@/lib/types"

interface BacktestResultsProps {
  result: BacktestResult | null
  isLoading?: boolean
}

export function BacktestResults({ result, isLoading = false }: BacktestResultsProps) {
  const [selectedTab, setSelectedTab] = useState("summary")

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Backtest Results</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Running backtest...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!result) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Backtest Results</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Run a backtest to see results</p>
        </CardContent>
      </Card>
    )
  }

  // Format dates
  const startDate = new Date(result.startTime).toLocaleDateString()
  const endDate = new Date(result.endTime).toLocaleDateString()

  // Prepare data for equity chart
  const equityChartData = result.equity.map((value, index) => ({
    day: index,
    equity: value,
    drawdown: result.drawdowns[index],
  }))

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Backtest Results: {result.strategyName}</CardTitle>
          <Badge
            variant="outline"
            className={
              result.totalPnL > 0
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-red-500/10 text-red-500 border-red-500/20"
            }
          >
            {result.totalPnL > 0 ? "Profitable" : "Unprofitable"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="equity">Equity Curve</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Strategy</div>
                <div className="text-2xl font-bold">{result.strategyName}</div>
                <div className="text-xs text-muted-foreground">
                  {result.symbol} ({result.timeframe})
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Period</div>
                <div className="text-lg">
                  {startDate} - {endDate}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((result.endTime - result.startTime) / (1000 * 60 * 60 * 24))} days (
                  {Math.round((result.endTime - result.startTime) / (1000 * 60 * 60))} hours)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Initial Capital</div>
                <div className="text-lg font-semibold">${result.initialCapital.toLocaleString()}</div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Final Capital</div>
                <div className="text-lg font-semibold">${result.finalCapital.toLocaleString()}</div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Total P&L</div>
                <div className={`text-lg font-semibold ${result.totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {result.totalPnL >= 0 ? "+" : ""}${result.totalPnL.toLocaleString()}
                </div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Return</div>
                <div
                  className={`text-lg font-semibold ${
                    result.totalPnLPercentage >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {result.totalPnLPercentage >= 0 ? "+" : ""}
                  {result.totalPnLPercentage.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Win Rate</div>
                <div className="text-lg font-semibold">{(result.winRate * 100).toFixed(1)}%</div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Profit Factor</div>
                <div className="text-lg font-semibold">{result.profitFactor.toFixed(2)}</div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Max Drawdown</div>
                <div className="text-lg font-semibold text-amber-500">{result.maxDrawdown.toFixed(2)}%</div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                <div className="text-lg font-semibold">{result.sharpeRatio.toFixed(2)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Total Trades</div>
                <div className="text-lg font-semibold">{result.trades.length}</div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Winning Trades</div>
                <div className="text-lg font-semibold text-emerald-500">
                  {result.trades.filter((t) => t.pnl > 0).length}
                </div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Losing Trades</div>
                <div className="text-lg font-semibold text-red-500">
                  {result.trades.filter((t) => t.pnl <= 0).length}
                </div>
              </div>

              <div className="p-3 border rounded-md">
                <div className="text-xs text-muted-foreground">Avg. Trade</div>
                <div
                  className={`text-lg font-semibold ${
                    result.totalPnL / result.trades.length >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  ${(result.totalPnL / result.trades.length).toFixed(2)}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="equity">
            <div className="h-[400px] w-full">
              <ChartContainer
                config={{
                  equity: {
                    label: "Equity",
                    color: "hsl(var(--chart-1))",
                  },
                  drawdown: {
                    label: "Drawdown",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="equity"
                      stroke="var(--color-equity)"
                      name="Equity"
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="drawdown"
                      stroke="var(--color-drawdown)"
                      name="Drawdown %"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </TabsContent>

          <TabsContent value="trades">
            <div className="h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.trades.map((trade: Trade, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            trade.type === "long"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {trade.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono">${trade.entryPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(trade.entryTime).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono">${trade.exitPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(trade.exitTime).toLocaleString()}</div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-mono ${trade.pnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </div>
                        <div className={`text-xs ${trade.pnlPercentage >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {trade.pnlPercentage >= 0 ? "+" : ""}
                          {trade.pnlPercentage.toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell>{trade.exitReason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Performance Metrics</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Win Rate</TableCell>
                      <TableCell>{(result.winRate * 100).toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Profit Factor</TableCell>
                      <TableCell>{result.profitFactor.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Sharpe Ratio</TableCell>
                      <TableCell>{result.sharpeRatio.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Max Drawdown</TableCell>
                      <TableCell>{result.maxDrawdown.toFixed(2)}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Average Win</TableCell>
                      <TableCell>${result.averageWin.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Average Loss</TableCell>
                      <TableCell>${Math.abs(result.averageLoss).toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Risk-Reward Ratio</TableCell>
                      <TableCell>
                        {(Math.abs(result.averageLoss) > 0
                          ? result.averageWin / Math.abs(result.averageLoss)
                          : 0
                        ).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Trade Statistics</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Total Trades</TableCell>
                      <TableCell>{result.trades.length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Winning Trades</TableCell>
                      <TableCell>{result.trades.filter((t) => t.pnl > 0).length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Losing Trades</TableCell>
                      <TableCell>{result.trades.filter((t) => t.pnl <= 0).length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Long Trades</TableCell>
                      <TableCell>{result.trades.filter((t) => t.type === "long").length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Short Trades</TableCell>
                      <TableCell>{result.trades.filter((t) => t.type === "short").length}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Avg. Trade Duration</TableCell>
                      <TableCell>
                        {Math.round(
                          result.trades.reduce((sum, t) => sum + (t.exitTime - t.entryTime), 0) /
                            result.trades.length /
                            (1000 * 60 * 60),
                        )}{" "}
                        hours
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
