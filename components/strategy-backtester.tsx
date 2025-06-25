"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BacktestForm } from "@/components/backtest-form"
import { BacktestResults } from "@/components/backtest-results"
import type { TradingAgent } from "@/lib/trading-agent"
import { StrategyEngine } from "@/lib/strategy-engine"
import type { BacktestResult, StrategyConfig } from "@/lib/types"

interface StrategyBacktesterProps {
  tradingAgent: TradingAgent
}

export function StrategyBacktester({ tradingAgent }: StrategyBacktesterProps) {
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [availableStrategies, setAvailableStrategies] = useState<StrategyConfig[]>([])

  // Load available strategies
  useEffect(() => {
    const strategyEngine = new StrategyEngine()
    const strategies = strategyEngine["predefinedStrategies"] || []
    setAvailableStrategies(strategies)
  }, [])

  const handleBacktestComplete = (result: BacktestResult) => {
    setBacktestResult(result)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Strategy Backtester</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BacktestForm
              tradingAgent={tradingAgent}
              onBacktestComplete={handleBacktestComplete}
              availableStrategies={availableStrategies}
            />
            <BacktestResults result={backtestResult} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
