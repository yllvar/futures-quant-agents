"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { BacktestingEngine } from "@/lib/backtesting-engine"
import type { TradingAgent } from "@/lib/trading-agent"
import type { BacktestResult, BacktestSettings, StrategyConfig } from "@/lib/types"

interface BacktestFormProps {
  tradingAgent: TradingAgent
  onBacktestComplete: (result: BacktestResult) => void
  availableStrategies: StrategyConfig[]
}

export function BacktestForm({ tradingAgent, onBacktestComplete, availableStrategies }: BacktestFormProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [settings, setSettings] = useState<BacktestSettings>({
    initialCapital: 10000,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
    endDate: new Date(),
    symbol: "BTC/USDT",
    timeframe: "1h",
    strategyId: availableStrategies.length > 0 ? availableStrategies[0].id : "",
  })
  const [availableSymbols] = useState(["SOL/USDT", "BTC/USDT", "ETH/USDT", "ADA/USDT", "XRP/USDT"])
  const [availableTimeframes] = useState(["1m", "5m", "15m", "30m", "1h", "4h", "1d"])

  const runBacktest = async () => {
    if (!tradingAgent || !settings.strategyId) return

    setIsRunning(true)
    try {
      // Get historical market data with date range
      const marketData = await tradingAgent.getHistoricalMarketData(
        settings.symbol,
        settings.timeframe as any,
        settings.startDate,
        settings.endDate,
      )

      if (marketData.length < 50) {
        throw new Error("Not enough data for backtesting. Need at least 50 candles.")
      }

      // Find the selected strategy
      const strategy = availableStrategies.find((s) => s.id === settings.strategyId)
      if (!strategy) {
        throw new Error("Strategy not found")
      }

      // Run backtest
      const backtestingEngine = new BacktestingEngine()
      const result = await backtestingEngine.runBacktest(marketData, strategy, settings.initialCapital)

      // Pass results to parent component
      onBacktestComplete(result)
    } catch (error) {
      console.error("Backtest error:", error)
      alert("Error running backtest. See console for details.")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Backtest Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Select
                value={settings.symbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
                disabled={isRunning}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select
                value={settings.timeframe}
                onValueChange={(value) => setSettings({ ...settings, timeframe: value as any })}
                disabled={isRunning}
              >
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {availableTimeframes.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !settings.startDate && "text-muted-foreground",
                    )}
                    disabled={isRunning}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {settings.startDate ? format(settings.startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={settings.startDate}
                    onSelect={(date) => date && setSettings({ ...settings, startDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !settings.endDate && "text-muted-foreground",
                    )}
                    disabled={isRunning}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {settings.endDate ? format(settings.endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={settings.endDate}
                    onSelect={(date) => date && setSettings({ ...settings, endDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strategy">Strategy</Label>
            <Select
              value={settings.strategyId}
              onValueChange={(value) => setSettings({ ...settings, strategyId: value })}
              disabled={isRunning || availableStrategies.length === 0}
            >
              <SelectTrigger id="strategy">
                <SelectValue placeholder="Select Strategy" />
              </SelectTrigger>
              <SelectContent>
                {availableStrategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialCapital">Initial Capital ($)</Label>
            <Input
              id="initialCapital"
              type="number"
              value={settings.initialCapital}
              onChange={(e) => setSettings({ ...settings, initialCapital: Number(e.target.value) })}
              disabled={isRunning}
            />
          </div>

          <Button onClick={runBacktest} disabled={isRunning || !settings.strategyId}>
            {isRunning ? "Running..." : "Run Backtest"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
