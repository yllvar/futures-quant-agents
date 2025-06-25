"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Check, Trash2 } from "lucide-react"
import type { StrategyConfig, MarketRegime } from "@/lib/types"

interface StrategyConfigProps {
  strategies: StrategyConfig[]
  onUpdateStrategy: (id: string, updates: Partial<StrategyConfig>) => void
  onDeleteStrategy?: (id: string) => void
  onCreateStrategy?: () => void
}

export function StrategyConfigPanel({
  strategies,
  onUpdateStrategy,
  onDeleteStrategy,
  onCreateStrategy,
}: StrategyConfigProps) {
  const [activeTab, setActiveTab] = useState(strategies[0]?.id || "")
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({})

  const handleChange = (id: string, field: keyof StrategyConfig, value: any) => {
    onUpdateStrategy(id, { [field]: value })

    // Show saved indicator
    setSavedStates({ ...savedStates, [id]: true })

    // Hide saved indicator after 2 seconds
    setTimeout(() => {
      setSavedStates((prev) => ({ ...prev, [id]: false }))
    }, 2000)
  }

  const handleMarketRegimeToggle = (id: string, regime: MarketRegime) => {
    const strategy = strategies.find((s) => s.id === id)
    if (!strategy) return

    const currentRegimes = strategy.suitableRegimes
    let newRegimes: MarketRegime[]

    if (currentRegimes.includes(regime)) {
      // Remove regime if it's the last one, don't remove
      if (currentRegimes.length > 1) {
        newRegimes = currentRegimes.filter((r) => r !== regime)
      } else {
        newRegimes = currentRegimes
      }
    } else {
      // Add regime
      newRegimes = [...currentRegimes, regime]
    }

    onUpdateStrategy(id, { suitableRegimes: newRegimes })

    // Show saved indicator
    setSavedStates({ ...savedStates, [id]: true })

    // Hide saved indicator after 2 seconds
    setTimeout(() => {
      setSavedStates((prev) => ({ ...prev, [id]: false }))
    }, 2000)
  }

  const handleIndicatorToggle = (id: string, indicator: string, type: "primary" | "confirmation") => {
    const strategy = strategies.find((s) => s.id === id)
    if (!strategy) return

    const currentIndicators = strategy.indicators[type]
    let newIndicators: string[]

    if (currentIndicators.includes(indicator)) {
      // Remove indicator if it's not the last one
      if (currentIndicators.length > 1) {
        newIndicators = currentIndicators.filter((i) => i !== indicator)
      } else {
        newIndicators = currentIndicators
      }
    } else {
      // Add indicator
      newIndicators = [...currentIndicators, indicator]
    }

    onUpdateStrategy(id, {
      indicators: {
        ...strategy.indicators,
        [type]: newIndicators,
      },
    })

    // Show saved indicator
    setSavedStates({ ...savedStates, [id]: true })

    // Hide saved indicator after 2 seconds
    setTimeout(() => {
      setSavedStates((prev) => ({ ...prev, [id]: false }))
    }, 2000)
  }

  // Available indicators for selection
  const availableIndicators = [
    "sma20",
    "sma50",
    "ema20",
    "macd",
    "rsi",
    "bollinger",
    "adx",
    "volume",
    "stochastic",
    "atr",
    "donchian",
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Strategy Configuration</CardTitle>
        {onCreateStrategy && (
          <Button size="sm" onClick={onCreateStrategy}>
            Create New Strategy
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {strategies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No strategies available. Create a new strategy to get started.
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className="grid"
              style={{ gridTemplateColumns: `repeat(${Math.min(strategies.length, 4)}, 1fr)` }}
            >
              {strategies.map((strategy) => (
                <TabsTrigger key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {strategies.map((strategy) => (
              <TabsContent key={strategy.id} value={strategy.id} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{strategy.name} Settings</h3>
                  <div className="flex items-center gap-2">
                    {savedStates[strategy.id] && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        <Check size={14} className="mr-1" /> Saved
                      </Badge>
                    )}
                    {onDeleteStrategy && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteStrategy(strategy.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 size={16} className="mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${strategy.id}-name`}>Strategy Name</Label>
                      <Input
                        id={`${strategy.id}-name`}
                        value={strategy.name}
                        onChange={(e) => handleChange(strategy.id, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${strategy.id}-style`}>Trading Style</Label>
                      <Select
                        value={strategy.style}
                        onValueChange={(value) => handleChange(strategy.id, "style", value)}
                      >
                        <SelectTrigger id={`${strategy.id}-style`}>
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TREND">Trend Following</SelectItem>
                          <SelectItem value="MEAN_REVERSION">Mean Reversion</SelectItem>
                          <SelectItem value="BREAKOUT">Breakout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${strategy.id}-risk`}>Risk Per Trade (%)</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          id={`${strategy.id}-risk`}
                          min={0.1}
                          max={5}
                          step={0.1}
                          value={[strategy.riskPerTrade * 100]}
                          onValueChange={(value) => handleChange(strategy.id, "riskPerTrade", value[0] / 100)}
                        />
                        <span className="w-12 text-right">{(strategy.riskPerTrade * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${strategy.id}-rr`}>Risk/Reward Ratio</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          id={`${strategy.id}-rr`}
                          min={0.5}
                          max={5}
                          step={0.1}
                          value={[strategy.takeProfitRatio]}
                          onValueChange={(value) => handleChange(strategy.id, "takeProfitRatio", value[0])}
                        />
                        <span className="w-12 text-right">{strategy.takeProfitRatio.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${strategy.id}-stop`}>Stop Loss Type</Label>
                      <Select
                        value={strategy.stopLossType}
                        onValueChange={(value) => handleChange(strategy.id, "stopLossType", value)}
                      >
                        <SelectTrigger id={`${strategy.id}-stop`}>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="atr">ATR-based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Suitable Market Regimes</Label>
                    <div className="flex flex-wrap gap-2">
                      {["TRENDING", "RANGING", "VOLATILE"].map((regime) => (
                        <Badge
                          key={regime}
                          variant={strategy.suitableRegimes.includes(regime as MarketRegime) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleMarketRegimeToggle(strategy.id, regime as MarketRegime)}
                        >
                          {regime}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Primary Indicators</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableIndicators.map((indicator) => (
                          <div key={indicator} className="flex items-center space-x-2">
                            <Switch
                              id={`${strategy.id}-primary-${indicator}`}
                              checked={strategy.indicators.primary.includes(indicator)}
                              onCheckedChange={() => handleIndicatorToggle(strategy.id, indicator, "primary")}
                            />
                            <Label htmlFor={`${strategy.id}-primary-${indicator}`}>{indicator}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Confirmation Indicators</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableIndicators.map((indicator) => (
                          <div key={indicator} className="flex items-center space-x-2">
                            <Switch
                              id={`${strategy.id}-confirmation-${indicator}`}
                              checked={strategy.indicators.confirmation.includes(indicator)}
                              onCheckedChange={() => handleIndicatorToggle(strategy.id, indicator, "confirmation")}
                            />
                            <Label htmlFor={`${strategy.id}-confirmation-${indicator}`}>{indicator}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {strategy.backTestResult && (
                    <div className="mt-4 p-4 bg-muted rounded-md">
                      <h4 className="font-medium mb-2">Backtest Results</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Win Rate</p>
                          <p className="text-lg font-semibold">{(strategy.backTestResult.winRate * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expectancy</p>
                          <p className="text-lg font-semibold">{strategy.backTestResult.expectancy.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Trades</p>
                          <p className="text-lg font-semibold">{strategy.backTestResult.trades}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Win/Loss</p>
                          <p className="text-lg font-semibold">
                            {(strategy.backTestResult.avgWin / strategy.backTestResult.avgLoss).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
