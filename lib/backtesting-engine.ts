import type { MarketData, StrategyConfig, TradeSignal, BacktestResult, Trade } from "./types"
import { IndicatorService } from "./indicators"

export class BacktestingEngine {
  private indicatorService: IndicatorService

  constructor() {
    this.indicatorService = new IndicatorService()
  }

  /**
   * Run a backtest for a given strategy on historical market data
   */
  public async runBacktest(
    marketData: MarketData[],
    strategy: StrategyConfig,
    initialCapital = 10000,
  ): Promise<BacktestResult> {
    if (marketData.length < 50) {
      throw new Error("Not enough data for backtesting. Need at least 50 candles.")
    }

    console.time("Backtest execution")

    // Initialize backtest state
    const trades: Trade[] = []
    let capital = initialCapital
    let position: "long" | "short" | null = null
    let entryPrice = 0
    let entryTime = 0
    let positionSize = 0
    let stopLoss = 0
    let takeProfit = 0
    const equity: number[] = [capital]
    const drawdowns: number[] = [0]
    let maxEquity = capital
    let maxDrawdown = 0

    // Process each candle (starting from enough data to calculate indicators)
    for (let i = 50; i < marketData.length; i++) {
      // Get current and previous candles
      const currentCandle = marketData[i]
      const previousCandles = marketData.slice(0, i + 1)

      // Calculate indicators for this candle
      const indicators = this.indicatorService.calculateIndicators(previousCandles, strategy)

      // Generate signal based on strategy
      const signal = this.generateSignal(currentCandle, indicators, strategy)

      // Process the signal
      if (position === null) {
        // No position - check for entry signals
        if (signal === "LONG" || signal === "SHORT") {
          // Calculate position size based on risk per trade
          const riskAmount = capital * strategy.riskPerTrade
          const atrValue = indicators.atr || currentCandle.high - currentCandle.low

          // Calculate stop loss and take profit levels
          let stopLossPrice: number
          if (signal === "LONG") {
            stopLossPrice = currentCandle.close - atrValue * 2
            takeProfit = currentCandle.close + atrValue * 2 * strategy.takeProfitRatio
          } else {
            stopLossPrice = currentCandle.close + atrValue * 2
            takeProfit = currentCandle.close - atrValue * 2 * strategy.takeProfitRatio
          }

          // Calculate position size based on risk
          const riskPerUnit = Math.abs(currentCandle.close - stopLossPrice)
          positionSize = riskAmount / riskPerUnit

          // Enter position
          position = signal === "LONG" ? "long" : "short"
          entryPrice = currentCandle.close
          entryTime = currentCandle.timestamp
          stopLoss = stopLossPrice
        }
      } else {
        // Already in a position - check for exit conditions
        const currentPrice = currentCandle.close
        let exitReason = ""
        let pnl = 0

        // Check stop loss
        if ((position === "long" && currentPrice <= stopLoss) || (position === "short" && currentPrice >= stopLoss)) {
          // Stop loss hit
          pnl = position === "long" ? stopLoss - entryPrice : entryPrice - stopLoss
          exitReason = "Stop Loss"
        }
        // Check take profit
        else if (
          (position === "long" && currentPrice >= takeProfit) ||
          (position === "short" && currentPrice <= takeProfit)
        ) {
          // Take profit hit
          pnl = position === "long" ? takeProfit - entryPrice : entryPrice - takeProfit
          exitReason = "Take Profit"
        }
        // Check for exit signal
        else if ((position === "long" && signal === "SHORT") || (position === "short" && signal === "LONG")) {
          // Exit on opposite signal
          pnl = position === "long" ? currentPrice - entryPrice : entryPrice - currentPrice
          exitReason = "Signal Reversal"
        }

        // If we have an exit reason, close the position
        if (exitReason) {
          const pnlAmount = pnl * positionSize
          capital += pnlAmount

          // Record the trade
          trades.push({
            entryTime,
            entryPrice,
            exitTime: currentCandle.timestamp,
            exitPrice:
              position === "long"
                ? exitReason === "Stop Loss"
                  ? stopLoss
                  : exitReason === "Take Profit"
                    ? takeProfit
                    : currentPrice
                : exitReason === "Stop Loss"
                  ? stopLoss
                  : exitReason === "Take Profit"
                    ? takeProfit
                    : currentPrice,
            type: position,
            pnl: pnlAmount,
            pnlPercentage: (pnlAmount / (entryPrice * positionSize)) * 100,
            exitReason,
          })

          // Reset position
          position = null
          entryPrice = 0
          entryTime = 0
          positionSize = 0
          stopLoss = 0
          takeProfit = 0
        }
      }

      // Update equity curve and drawdown
      equity.push(capital)
      maxEquity = Math.max(maxEquity, capital)
      const currentDrawdown = ((maxEquity - capital) / maxEquity) * 100
      drawdowns.push(currentDrawdown)
      maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
    }

    // Close any open position at the end of the backtest
    if (position !== null) {
      const lastCandle = marketData[marketData.length - 1]
      const pnl = position === "long" ? lastCandle.close - entryPrice : entryPrice - lastCandle.close
      const pnlAmount = pnl * positionSize
      capital += pnlAmount

      trades.push({
        entryTime,
        entryPrice,
        exitTime: lastCandle.timestamp,
        exitPrice: lastCandle.close,
        type: position,
        pnl: pnlAmount,
        pnlPercentage: (pnlAmount / (entryPrice * positionSize)) * 100,
        exitReason: "End of Test",
      })
    }

    console.timeEnd("Backtest execution")

    // Calculate performance metrics
    const winningTrades = trades.filter((t) => t.pnl > 0)
    const losingTrades = trades.filter((t) => t.pnl <= 0)

    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0)
    const winRate = winningTrades.length / trades.length
    const averageWin =
      winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + trade.pnl, 0) / winningTrades.length : 0
    const averageLoss =
      losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + trade.pnl, 0) / losingTrades.length : 0
    const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0

    // Calculate Sharpe ratio (simplified)
    const returns = []
    for (let i = 1; i < equity.length; i++) {
      returns.push((equity[i] - equity[i - 1]) / equity[i - 1])
    }
    const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const stdDeviation = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length,
    )
    const sharpeRatio = stdDeviation !== 0 ? (averageReturn / stdDeviation) * Math.sqrt(252) : 0

    return {
      initialCapital,
      finalCapital: capital,
      totalPnL,
      totalPnLPercentage: (totalPnL / initialCapital) * 100,
      trades,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      equity,
      drawdowns,
      strategyId: strategy.id,
      strategyName: strategy.name,
      startTime: marketData[0].timestamp,
      endTime: marketData[marketData.length - 1].timestamp,
      symbol: marketData[0].symbol,
      timeframe: marketData[0].timeframe,
    }
  }

  /**
   * Generate a trading signal based on strategy rules and indicators
   */
  private generateSignal(candle: MarketData, indicators: any, strategy: StrategyConfig): TradeSignal {
    // Different signal generation logic based on strategy style
    switch (strategy.style) {
      case "TREND":
        return this.generateTrendSignal(candle, indicators)
      case "MEAN_REVERSION":
        return this.generateMeanReversionSignal(candle, indicators)
      case "BREAKOUT":
        return this.generateBreakoutSignal(candle, indicators)
      default:
        return "NEUTRAL"
    }
  }

  private generateTrendSignal(candle: MarketData, indicators: any): TradeSignal {
    // Simple trend following strategy based on moving averages and MACD
    if (indicators.ema20 && indicators.sma50 && indicators.macd) {
      // Long signal: EMA20 > SMA50 and MACD histogram > 0
      if (indicators.ema20 > indicators.sma50 && indicators.macd.histogram > 0 && indicators.adx > 25) {
        return "LONG"
      }

      // Short signal: EMA20 < SMA50 and MACD histogram < 0
      if (indicators.ema20 < indicators.sma50 && indicators.macd.histogram < 0 && indicators.adx > 25) {
        return "SHORT"
      }
    }

    return "NEUTRAL"
  }

  private generateMeanReversionSignal(candle: MarketData, indicators: any): TradeSignal {
    // Mean reversion strategy based on RSI and Bollinger Bands
    if (indicators.rsi && indicators.bollinger) {
      // Long signal: RSI < 30 and price near lower Bollinger Band
      if (indicators.rsi < 30 && candle.close < indicators.bollinger.lower * 1.01) {
        return "LONG"
      }

      // Short signal: RSI > 70 and price near upper Bollinger Band
      if (indicators.rsi > 70 && candle.close > indicators.bollinger.upper * 0.99) {
        return "SHORT"
      }
    }

    return "NEUTRAL"
  }

  private generateBreakoutSignal(candle: MarketData, indicators: any): TradeSignal {
    // Breakout strategy based on Donchian Channels and volume
    if (indicators.donchian && indicators.volumeChange) {
      // Long signal: Price breaks above upper Donchian Channel with increased volume
      if (candle.close > indicators.donchian.upper && indicators.volumeChange > 20) {
        return "LONG"
      }

      // Short signal: Price breaks below lower Donchian Channel with increased volume
      if (candle.close < indicators.donchian.lower && indicators.volumeChange > 20) {
        return "SHORT"
      }
    }

    return "NEUTRAL"
  }
}
