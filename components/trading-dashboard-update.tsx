"use client"

import { enhanceTradingAgent, createTradingAgent, type EnhancedTradingAgent } from "@/lib/trading-agent-integration"
import { useMemo } from "react"

interface Props {
  apiKey: string
  apiSecret: string
  useHistoricalData: boolean
  historicalDateRange: { startDate: Date; endDate: Date }
}

function TradingDashboardUpdate({ apiKey, apiSecret, useHistoricalData, historicalDateRange }: Props) {
  const tradingAgent = useMemo(() => {
    const agent = createTradingAgent(
      "binance",
      process.env.NEXT_PUBLIC_EXCHANGE_API_KEY || apiKey,
      process.env.NEXT_PUBLIC_EXCHANGE_SECRET || apiSecret,
      10000,
      true, // Use enhanced agent
    ) as EnhancedTradingAgent

    // Apply our optimizations
    enhanceTradingAgent(agent)

    // Set historical data mode
    agent.setUseHistoricalData(useHistoricalData)
    agent.setHistoricalDateRange(historicalDateRange.startDate, historicalDateRange.endDate)

    return agent
  }, [apiKey, apiSecret, useHistoricalData, historicalDateRange])

  return null // Replace with actual component UI
}

export default TradingDashboardUpdate
