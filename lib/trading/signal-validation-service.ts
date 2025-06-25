import type { TradingSignalResult, StrategyConfig, MarketData, MarketRegime } from "../core/types"
import { IndicatorService } from "./indicators"

export interface ValidationResult {
  isValid: boolean
  reasons: string[]
  score: number
}

export class SignalValidationService {
  private indicatorService: IndicatorService

  constructor() {
    this.indicatorService = new IndicatorService()
  }

  /**
   * Validate a trading signal against strategy requirements and market conditions
   */
  public validateSignal(
    signal: TradingSignalResult,
    strategy: StrategyConfig,
    marketData: MarketData[],
    marketRegime: MarketRegime,
  ): ValidationResult {
    // Skip validation for NEUTRAL signals
    if (signal.signal === "NEUTRAL") {
      return {
        isValid: true,
        reasons: [],
        score: 1.0,
      }
    }

    const reasons: string[] = []
    let validationScore = 1.0

    // 1. Check signal confidence against threshold
    const confidenceThreshold = 0.75
    if (signal.confidence < confidenceThreshold) {
      reasons.push(
        `Signal confidence (${(signal.confidence * 100).toFixed(0)}%) below threshold (${confidenceThreshold * 100}%)`,
      )
      validationScore *= signal.confidence / confidenceThreshold
    }

    // 2. Check if strategy type matches market regime
    if (strategy.style === "TREND" && marketRegime !== "TRENDING") {
      reasons.push(`Trend strategy used in ${marketRegime} market`)
      validationScore *= 0.8
    } else if (strategy.style === "MEAN_REVERSION" && marketRegime !== "RANGING") {
      reasons.push(`Mean reversion strategy used in ${marketRegime} market`)
      validationScore *= 0.8
    } else if (strategy.style === "BREAKOUT" && marketRegime !== "VOLATILE") {
      reasons.push(`Breakout strategy used in non-volatile market`)
      validationScore *= 0.9
    }

    // 3. Check technical indicators for confirmation
    if (marketData.length >= 50) {
      const indicators = this.indicatorService.calculateIndicators(marketData, strategy)

      // Validate based on strategy type
      if (strategy.style === "TREND") {
        if (signal.signal === "LONG" && !(indicators.ema20 > indicators.sma50)) {
          reasons.push("EMA20 not above SMA50 for LONG signal")
          validationScore *= 0.7
        } else if (signal.signal === "SHORT" && !(indicators.ema20 < indicators.sma50)) {
          reasons.push("EMA20 not below SMA50 for SHORT signal")
          validationScore *= 0.7
        }
      } else if (strategy.style === "MEAN_REVERSION") {
        if (signal.signal === "LONG" && !(indicators.rsi < 40)) {
          reasons.push("RSI not oversold for LONG signal")
          validationScore *= 0.7
        } else if (signal.signal === "SHORT" && !(indicators.rsi > 60)) {
          reasons.push("RSI not overbought for SHORT signal")
          validationScore *= 0.7
        }
      }
    }

    // 4. Check for stop loss and take profit levels
    if (!signal.stopLoss || !signal.takeProfit) {
      reasons.push("Missing stop loss or take profit levels")
      validationScore *= 0.9
    }

    // Final validation decision
    const isValid = validationScore >= 0.6 && reasons.length <= 2

    return {
      isValid,
      reasons,
      score: validationScore,
    }
  }
}
