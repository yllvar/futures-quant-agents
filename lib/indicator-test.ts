import { IndicatorService } from "./indicators"
import type { MarketData, StrategyConfig } from "./types"

export async function testIndicators(marketData: MarketData[], strategy: StrategyConfig): Promise<string> {
  const indicatorService = new IndicatorService()

  console.time("Indicator calculation")
  const indicators = indicatorService.calculateIndicators(marketData, strategy)
  console.timeEnd("Indicator calculation")

  // Format the indicators for display
  const formattedIndicators = indicatorService.formatIndicators(indicators)

  return `
    Calculated indicators for ${marketData[0].symbol} (${marketData.length} data points):
    
    ${formattedIndicators}
  `
}

export function generateIndicatorSummary(indicators: any): string {
  let summary = ""

  // Price action summary
  if (indicators.price && indicators.priceChange) {
    summary += `Price: $${indicators.price.toFixed(2)} (${indicators.priceChange > 0 ? "+" : ""}${indicators.priceChange.toFixed(2)}%)\n`
  }

  // Trend indicators
  if (indicators.ema20 && indicators.sma50) {
    const trendDirection = indicators.ema20 > indicators.sma50 ? "bullish" : "bearish"
    summary += `Trend: ${trendDirection} (EMA20 ${indicators.ema20 > indicators.sma50 ? "above" : "below"} SMA50)\n`
  }

  // Momentum indicators
  if (indicators.rsi) {
    let rsiCondition = "neutral"
    if (indicators.rsi > 70) rsiCondition = "overbought"
    else if (indicators.rsi < 30) rsiCondition = "oversold"
    summary += `RSI: ${indicators.rsi.toFixed(2)} (${rsiCondition})\n`
  }

  // Volatility indicators
  if (indicators.bollinger) {
    const width = ((indicators.bollinger.upper - indicators.bollinger.lower) / indicators.bollinger.middle) * 100
    summary += `Volatility: ${indicators.volatility.toFixed(2)}% (Bollinger width: ${width.toFixed(2)}%)\n`
  }

  return summary
}
