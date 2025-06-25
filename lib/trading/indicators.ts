// Merging lib/indicators.ts and lib/indicator-test.ts
import type { MarketData, StrategyConfig } from "../core/types"
import { SMA, EMA, RSI, BollingerBands, ADX, MACD, Stochastic, ATR } from "technicalindicators"

export class IndicatorService {
  calculateIndicators(data: MarketData[], strategy: StrategyConfig): any {
    if (data.length < 50) {
      console.warn("Not enough data points for reliable indicator calculation")
      return { price: data.length > 0 ? data[data.length - 1].close : 0 }
    }

    const closes = data.map((d) => d.close)
    const highs = data.map((d) => d.high)
    const lows = data.map((d) => d.low)
    const volumes = data.map((d) => d.volume)

    const indicators: any = {}

    // Common indicators for all strategies
    indicators.price = closes[closes.length - 1]
    indicators.priceChange = this.calculatePriceChange(closes)
    indicators.volatility = this.calculateVolatility(closes)

    // Trend-following indicators
    if (strategy.style === "TREND") {
      indicators.sma50 = this.calculateSMA(closes, 50)
      indicators.ema20 = this.calculateEMA(closes, 20)
      indicators.adx = this.calculateADX(highs, lows, closes, 14)
      indicators.macd = this.calculateMACD(closes)
    }

    // Mean-reversion indicators
    if (strategy.style === "MEAN_REVERSION") {
      indicators.bollinger = this.calculateBollingerBands(closes, 20, 2)
      indicators.rsi = this.calculateRSI(closes, 14)
      indicators.stochastic = this.calculateStochastic(highs, lows, closes, 14, 3)
    }

    // Breakout indicators
    if (strategy.style === "BREAKOUT") {
      indicators.atr = this.calculateATR(highs, lows, closes, 14)
      indicators.donchian = this.calculateDonchianChannels(highs, lows, 20)
      indicators.volumeChange = this.calculateVolumeChange(volumes)
    }

    return indicators
  }

  formatIndicators(indicators: any): string {
    let result = ""

    for (const [key, value] of Object.entries(indicators)) {
      if (typeof value === "object") {
        result += `- ${key}:\n`
        for (const [subKey, subValue] of Object.entries(value)) {
          result += `  - ${subKey}: ${this.formatNumber(subValue)}\n`
        }
      } else {
        result += `- ${key}: ${this.formatNumber(value)}\n`
      }
    }

    return result
  }

  private formatNumber(value: any): string {
    if (typeof value === "number") {
      return value.toFixed(2)
    }
    return String(value)
  }

  private calculatePriceChange(closes: number[]): number {
    if (closes.length < 2) return 0
    const oldPrice = closes[closes.length - 25] // ~24h ago for hourly data
    const newPrice = closes[closes.length - 1]
    return ((newPrice - oldPrice) / oldPrice) * 100
  }

  private calculateVolatility(closes: number[]): number {
    if (closes.length < 20) return 0
    const returns = []
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
    }

    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * 100 * Math.sqrt(24) // Annualized volatility
  }

  // Technical indicators using the library
  private calculateSMA(values: number[], period: number): number {
    try {
      const result = SMA.calculate({ period, values })
      return result.length > 0 ? result[result.length - 1] : 0
    } catch (error) {
      console.error("Error calculating SMA:", error)
      return 0
    }
  }

  private calculateEMA(values: number[], period: number): number {
    try {
      const result = EMA.calculate({ period, values })
      return result.length > 0 ? result[result.length - 1] : 0
    } catch (error) {
      console.error("Error calculating EMA:", error)
      return 0
    }
  }

  private calculateRSI(values: number[], period: number): number {
    try {
      const result = RSI.calculate({ period, values })
      return result.length > 0 ? result[result.length - 1] : 50
    } catch (error) {
      console.error("Error calculating RSI:", error)
      return 50 // Default to neutral
    }
  }

  private calculateMACD(values: number[]): { line: number; signal: number; histogram: number } {
    try {
      const result = MACD.calculate({
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        values,
      })

      if (result.length > 0) {
        const latest = result[result.length - 1]
        return {
          line: latest.MACD,
          signal: latest.signal,
          histogram: latest.histogram,
        }
      }
    } catch (error) {
      console.error("Error calculating MACD:", error)
    }

    // Default values if calculation fails
    return { line: 0, signal: 0, histogram: 0 }
  }

  private calculateBollingerBands(
    values: number[],
    period: number,
    stdDev: number,
  ): { upper: number; middle: number; lower: number } {
    try {
      const result = BollingerBands.calculate({
        period,
        values,
        stdDev,
      })

      if (result.length > 0) {
        const latest = result[result.length - 1]
        return {
          upper: latest.upper,
          middle: latest.middle,
          lower: latest.lower,
        }
      }
    } catch (error) {
      console.error("Error calculating Bollinger Bands:", error)
    }

    // Default values if calculation fails
    const avg = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
    return {
      upper: avg * 1.02,
      middle: avg,
      lower: avg * 0.98,
    }
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    try {
      const result = ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period,
      })
      return result.length > 0 ? result[result.length - 1] : 0
    } catch (error) {
      console.error("Error calculating ATR:", error)
      return 0
    }
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
    try {
      const result = ADX.calculate({
        high: highs,
        low: lows,
        close: closes,
        period,
      })
      return result.length > 0 ? result[result.length - 1] : 0
    } catch (error) {
      console.error("Error calculating ADX:", error)
      return 0
    }
  }

  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
    signalPeriod: number,
  ): { k: number; d: number } {
    try {
      const result = Stochastic.calculate({
        high: highs,
        low: lows,
        close: closes,
        period,
        signalPeriod,
      })

      if (result.length > 0) {
        const latest = result[result.length - 1]
        return {
          k: latest.k,
          d: latest.d,
        }
      }
    } catch (error) {
      console.error("Error calculating Stochastic:", error)
    }

    // Default values if calculation fails
    return { k: 50, d: 50 }
  }

  private calculateDonchianChannels(
    highs: number[],
    lows: number[],
    period: number,
  ): { upper: number; middle: number; lower: number } {
    if (highs.length < period || lows.length < period) {
      return { upper: 0, middle: 0, lower: 0 }
    }

    try {
      const highsSlice = highs.slice(-period)
      const lowsSlice = lows.slice(-period)

      const upper = Math.max(...highsSlice)
      const lower = Math.min(...lowsSlice)
      const middle = (upper + lower) / 2

      return { upper, middle, lower }
    } catch (error) {
      console.error("Error calculating Donchian Channels:", error)
      return { upper: 0, middle: 0, lower: 0 }
    }
  }

  private calculateVolumeChange(volumes: number[]): number {
    if (volumes.length < 20) return 0

    try {
      const recentAvg = this.calculateSMA(volumes.slice(-5), 5)
      const previousAvg = this.calculateSMA(volumes.slice(-20, -5), 15)

      return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
    } catch (error) {
      console.error("Error calculating Volume Change:", error)
      return 0
    }
  }
}

// Added from indicator-test.ts
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
