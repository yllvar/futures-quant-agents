"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TradingAgent } from "@/lib/trading-agent"
import type { Position } from "@/lib/types"
import { ChartContainer } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface PerformanceMetricsProps {
  tradingAgent: TradingAgent
}

export function PerformanceMetrics({ tradingAgent }: PerformanceMetricsProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [metrics, setMetrics] = useState({
    totalTrades: 0,
    winRate: 0,
    avgProfit: 0,
    avgLoss: 0,
    profitFactor: 0,
    netPnl: 0,
    pnlPercentage: 0,
    maxDrawdown: 0,
  })
  const [equityData, setEquityData] = useState<{ date: string; equity: number }[]>([])

  useEffect(() => {
    // Get position history
    const history = tradingAgent.getPositionHistory()
    setPositions(history)

    // Calculate metrics
    if (history.length > 0) {
      const wins = history.filter((p) => (p.pnl || 0) > 0)
      const losses = history.filter((p) => (p.pnl || 0) <= 0)

      const totalProfit = wins.reduce((sum, p) => sum + (p.pnl || 0), 0)
      const totalLoss = Math.abs(losses.reduce((sum, p) => sum + (p.pnl || 0), 0))
      const initialBalance = 10000 // Assuming initial balance
      const netPnl = totalProfit - totalLoss

      // Generate equity curve data
      const equityCurve: { date: string; equity: number }[] = []
      let runningEquity = initialBalance

      // Sort positions by timestamp
      const sortedPositions = [...history].sort((a, b) => a.timestamp - b.timestamp)

      sortedPositions.forEach((position) => {
        if (position.closedAt && position.pnl) {
          runningEquity += position.pnl
          equityCurve.push({
            date: new Date(position.closedAt).toLocaleDateString(),
            equity: runningEquity,
          })
        }
      })

      // Calculate max drawdown
      let peak = initialBalance
      let maxDrawdown = 0

      equityCurve.forEach((point) => {
        if (point.equity > peak) {
          peak = point.equity
        }

        const drawdown = ((peak - point.equity) / peak) * 100
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      })

      setEquityData(equityCurve)

      setMetrics({
        totalTrades: history.length,
        winRate: (wins.length / history.length) * 100,
        avgProfit: wins.length > 0 ? totalProfit / wins.length : 0,
        avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
        profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
        netPnl: netPnl,
        pnlPercentage: (netPnl / initialBalance) * 100,
        maxDrawdown: maxDrawdown,
      })
    }
  }, [tradingAgent])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{metrics.totalTrades}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Net P&L</p>
            <p className={`text-2xl font-bold ${metrics.netPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              ${metrics.netPnl.toFixed(2)} ({metrics.pnlPercentage.toFixed(2)}%)
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <p className="text-2xl font-bold text-amber-500">{metrics.maxDrawdown.toFixed(2)}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Profit</p>
            <p className="text-2xl font-bold text-emerald-500">${metrics.avgProfit.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg Loss</p>
            <p className="text-2xl font-bold text-red-500">${metrics.avgLoss.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Profit Factor</p>
            <p className="text-2xl font-bold">{metrics.profitFactor.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Risk-Reward Ratio</p>
            <p className="text-2xl font-bold">
              {metrics.avgLoss > 0 ? (metrics.avgProfit / metrics.avgLoss).toFixed(2) : "N/A"}
            </p>
          </div>
        </div>

        {/* Equity Curve Chart */}
        {equityData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Equity Curve</h3>
            <div className="h-[200px]">
              <ChartContainer
                config={{
                  equity: {
                    label: "Equity",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      stroke="var(--color-equity)"
                      name="Equity"
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        )}

        {/* Trade history table */}
        {positions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Recent Trades</h3>
            <div className="border rounded-md overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Symbol</th>
                    <th className="p-2 text-left">Side</th>
                    <th className="p-2 text-left">Entry</th>
                    <th className="p-2 text-left">Exit</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-right">P&L</th>
                    <th className="p-2 text-right">P&L %</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.slice(0, 10).map((position) => (
                    <tr key={position.id} className="border-t hover:bg-muted/50">
                      <td className="p-2">{position.symbol}</td>
                      <td className="p-2">
                        <Badge
                          variant="outline"
                          className={
                            position.side === "LONG"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {position.side}
                        </Badge>
                      </td>
                      <td className="p-2">${position.entryPrice.toFixed(2)}</td>
                      <td className="p-2">${position.closedPrice?.toFixed(2) || "-"}</td>
                      <td className="p-2">
                        {position.closedAt ? new Date(position.closedAt).toLocaleDateString() : "-"}
                      </td>
                      <td
                        className={`p-2 text-right ${(position.pnl || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}
                      >
                        {position.pnl !== undefined
                          ? `${position.pnl >= 0 ? "+" : ""}$${position.pnl.toFixed(2)}`
                          : "-"}
                      </td>
                      <td
                        className={`p-2 text-right ${
                          (position.pnlPercentage || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {position.pnlPercentage !== undefined
                          ? `${position.pnlPercentage >= 0 ? "+" : ""}${position.pnlPercentage.toFixed(2)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {positions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No trading history available. Start the trading agent to begin tracking performance.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
