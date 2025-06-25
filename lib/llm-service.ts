import type { MarketData, StrategyConfig, TradingSignalResult, Timeframe } from "./types"
import { testAllHuggingFaceProviders, testDeepSeekConnection } from "./llm-clients"

// Mock LLM Implementation (for testing purposes)
class MockLLMImplementation {
  async generateAnalysis(
    marketContext: string,
    currentSignal: string,
    currentRationale: string,
  ): Promise<{ signal: string; confidence: number; rationale: string; chainOfThought: string }> {
    // Simulate LLM analysis with predefined or random outputs
    // This is a placeholder; replace with actual mock logic

    // Generate mock chain-of-thought reasoning
    const chainOfThought = `
Step 1: Analyzing price action
- Current price: $120.45
- 24h change: +2.3%
- Price is above SMA20 (118.20) and SMA50 (115.80)

Step 2: Evaluating technical indicators
- RSI: 62 (moderately bullish, not overbought)
- MACD: Positive and above signal line (bullish)
- Volume: 20% above average (confirming price movement)

Step 3: Considering market regime
- Current regime: TRENDING
- Volatility: Moderate (2.1%)
- Trend strength: Strong (ADX: 28)

Step 4: Checking multi-timeframe alignment
- 1h: Bullish (price above key MAs)
- 4h: Bullish (recent breakout)
- 1d: Neutral (consolidating)

Step 5: Weighing risk factors
- Support at $118.00 (2% below current price)
- Resistance at $125.00 (3.8% above current price)
- Risk-reward ratio: 1.9 (favorable)

Step 6: Making final decision
- Technical indicators are bullish
- Price action confirms uptrend
- Multi-timeframe analysis mostly aligned
- Risk-reward ratio is favorable
- Confidence: ${(Math.random() * 0.3 + 0.65).toFixed(2)} (moderate to high)
    `

    return {
      signal: currentSignal, // Or a random signal
      confidence: 0.75, // Or a random confidence level
      rationale: `[MOCK] ${currentRationale}`,
      chainOfThought: chainOfThought,
    }
  }
}

// Factory function to create MockLLMImplementation
function createMockLLMImplementation(): MockLLMImplementation {
  return new MockLLMImplementation()
}

export class LLMService {
  // Generate trading signal using LLM with multi-timeframe context
  public async generateTradingSignalWithMultiTimeframe(
    symbol: string,
    data: MarketData[],
    strategy: StrategyConfig,
    multiTimeframeData: Record<Timeframe, MarketData[]>,
    huggingFaceApiKey: string,
    deepSeekApiKey: string,
    useMockImplementation = true, // Change default to true
  ): Promise<TradingSignalResult> {
    try {
      // Always use mock implementation
      const mockImpl = createMockLLMImplementation()

      // Prepare market context
      const marketContext = this.prepareMarketContext(symbol, data, multiTimeframeData)

      // Get current signal and rationale
      const currentSignal = this.determineCurrentSignal(data, strategy)
      const currentRationale = this.generateSignalRationale(data, strategy, currentSignal)

      // Use mock implementation
      const mockResult = await mockImpl.generateAnalysis(marketContext, currentSignal, currentRationale)

      return {
        symbol,
        signal: mockResult.signal as "LONG" | "SHORT" | "NEUTRAL",
        confidence: mockResult.confidence,
        rationale: mockResult.rationale,
        chainOfThought: mockResult.chainOfThought,
        timestamp: Date.now(),
        provider: "mock-provider",
        entry: this.calculateEntryPrice(data),
        stopLoss: this.calculateStopLoss(data, mockResult.signal as "LONG" | "SHORT" | "NEUTRAL"),
        takeProfit: this.calculateTakeProfit(data, mockResult.signal as "LONG" | "SHORT" | "NEUTRAL"),
      }
    } catch (error) {
      console.error("All LLM analysis methods failed:", error)

      // If all LLM methods fail, generate a basic signal
      return this.generateBasicSignal(symbol, data, strategy)
    }
  }

  // Test connections to LLM providers
  public async testConnections(
    huggingFaceApiKey: string,
    deepSeekApiKey: string,
  ): Promise<{
    huggingface: { success: boolean; latency: number; provider: string; error?: string }
    deepseek: { success: boolean; latency: number; error?: string }
  }> {
    const [hfResult, dsResult] = await Promise.all([
      testAllHuggingFaceProviders(huggingFaceApiKey).catch((error) => ({
        success: false,
        latency: 0,
        provider: "unknown",
        error: error instanceof Error ? error.message : "Unknown error",
      })),
      testDeepSeekConnection(deepSeekApiKey).catch((error) => ({
        success: false,
        latency: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })),
    ])

    return {
      huggingface: hfResult,
      deepseek: dsResult,
    }
  }

  // Prepare market context for LLM
  private prepareMarketContext(
    symbol: string,
    data: MarketData[],
    multiTimeframeData: Record<Timeframe, MarketData[]>,
  ): string {
    if (data.length === 0) {
      return `No market data available for ${symbol}.`
    }

    // Get the latest candle
    const latestCandle = data[data.length - 1]
    const timeframe = latestCandle.timeframe

    // Calculate some basic indicators
    const sma20 = this.calculateSMA(data, 20)
    const sma50 = this.calculateSMA(data, 50)
    const rsi = this.calculateRSI(data, 14)
    const macd = this.calculateMACD(data)

    // Calculate price change
    const priceChange24h = this.calculatePriceChange(data, 24)

    // Prepare multi-timeframe context
    let multiTimeframeContext = ""
    Object.entries(multiTimeframeData).forEach(([tf, tfData]) => {
      if (tfData.length > 0 && tf !== timeframe) {
        const tfLatest = tfData[tfData.length - 1]
        const tfSma20 = this.calculateSMA(tfData, 20)
        const tfRsi = this.calculateRSI(tfData, 14)

        multiTimeframeContext += `
${tf} Timeframe:
- Price: ${tfLatest.close.toFixed(2)}
- SMA20: ${tfSma20.toFixed(2)} (${tfLatest.close > tfSma20 ? "Above" : "Below"})
- RSI: ${tfRsi.toFixed(2)} (${tfRsi > 70 ? "Overbought" : tfRsi < 30 ? "Oversold" : "Neutral"})
`
      }
    })

    // Build the context
    return `
Symbol: ${symbol}
Timeframe: ${timeframe}
Current Price: ${latestCandle.close.toFixed(2)}
24h Change: ${priceChange24h.toFixed(2)}%
Volume: ${latestCandle.volume.toFixed(2)}

Technical Indicators:
- SMA20: ${sma20.toFixed(2)} (${latestCandle.close > sma20 ? "Above" : "Below"})
- SMA50: ${sma50.toFixed(2)} (${latestCandle.close > sma50 ? "Above" : "Below"})
- RSI(14): ${rsi.toFixed(2)} (${rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral"})
- MACD: ${macd.macd.toFixed(4)} (${macd.macd > 0 ? "Positive" : "Negative"})
- MACD Signal: ${macd.signal.toFixed(4)}
- MACD Histogram: ${macd.histogram.toFixed(4)} (${macd.histogram > 0 ? "Bullish" : "Bearish"})

${multiTimeframeContext}

Recent Price Action:
${this.describePriceAction(data)}
`
  }

  // Calculate Simple Moving Average
  private calculateSMA(data: MarketData[], period: number): number {
    if (data.length < period) return 0

    const prices = data.slice(-period).map((d) => d.close)
    const sum = prices.reduce((a, b) => a + b, 0)
    return sum / period
  }

  // Calculate RSI
  private calculateRSI(data: MarketData[], period: number): number {
    if (data.length < period + 1) return 50

    const closes = data.map((d) => d.close)
    const changes = []

    for (let i = 1; i < closes.length; i++) {
      changes.push(closes[i] - closes[i - 1])
    }

    const changesForPeriod = changes.slice(-period)
    let gains = 0
    let losses = 0

    changesForPeriod.forEach((change) => {
      if (change > 0) {
        gains += change
      } else {
        losses -= change
      }
    })

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  // Calculate MACD
  private calculateMACD(
    data: MarketData[],
    fastPeriod = 12,
    slowPeriod = 26,
    signalPeriod = 9,
  ): { macd: number; signal: number; histogram: number } {
    if (data.length < slowPeriod + signalPeriod) {
      return { macd: 0, signal: 0, histogram: 0 }
    }

    const closes = data.map((d) => d.close)
    const ema12 = this.calculateEMA(closes, fastPeriod)
    const ema26 = this.calculateEMA(closes, slowPeriod)
    const macdLine = ema12 - ema26

    // Calculate signal line (EMA of MACD line)
    const macdValues = []
    for (let i = 0; i < signalPeriod; i++) {
      const ema12 = this.calculateEMA(closes.slice(0, closes.length - signalPeriod + i), fastPeriod)
      const ema26 = this.calculateEMA(closes.slice(0, closes.length - signalPeriod + i), slowPeriod)
      macdValues.push(ema12 - ema26)
    }
    macdValues.push(macdLine)

    const signalLine = this.calculateEMA(macdValues, signalPeriod)
    const histogram = macdLine - signalLine

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram,
    }
  }

  // Calculate EMA
  private calculateEMA(prices: number[], period: number): number {
    const k = 2 / (period + 1)
    let ema = prices[0]

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k)
    }

    return ema
  }

  // Calculate price change over a period
  private calculatePriceChange(data: MarketData[], periods: number): number {
    if (data.length < periods) return 0

    const currentPrice = data[data.length - 1].close
    const pastPrice = data[data.length - periods].close
    return ((currentPrice - pastPrice) / pastPrice) * 100
  }

  // Describe recent price action
  private describePriceAction(data: MarketData[]): string {
    if (data.length < 5) return "Insufficient data for price action analysis."

    const recentCandles = data.slice(-5)
    let description = ""

    // Check for consecutive up/down candles
    let upCount = 0
    let downCount = 0
    for (let i = 0; i < recentCandles.length; i++) {
      if (recentCandles[i].close > recentCandles[i].open) {
        upCount++
        downCount = 0
      } else if (recentCandles[i].close < recentCandles[i].open) {
        downCount++
        upCount = 0
      }
    }

    if (upCount >= 3) {
      description += `- ${upCount} consecutive bullish candles\n`
    } else if (downCount >= 3) {
      description += `- ${downCount} consecutive bearish candles\n`
    }

    // Check for doji
    const lastCandle = recentCandles[recentCandles.length - 1]
    if (Math.abs(lastCandle.close - lastCandle.open) / lastCandle.open < 0.001) {
      description += "- Last candle is a doji, indicating indecision\n"
    }

    // Check for large candles
    const avgRange = recentCandles.reduce((sum, candle) => sum + (candle.high - candle.low), 0) / recentCandles.length
    if (lastCandle.high - lastCandle.low > avgRange * 1.5) {
      description += "- Last candle shows high volatility (large range)\n"
    }

    // Check for support/resistance
    const lastClose = lastCandle.close
    const recentHighs = Math.max(...recentCandles.map((c) => c.high))
    const recentLows = Math.min(...recentCandles.map((c) => c.low))

    if (Math.abs(lastClose - recentHighs) / lastClose < 0.01) {
      description += "- Price is testing recent highs\n"
    } else if (Math.abs(lastClose - recentLows) / lastClose < 0.01) {
      description += "- Price is testing recent lows\n"
    }

    return description || "No significant price action patterns detected."
  }

  // Determine current signal based on strategy
  private determineCurrentSignal(data: MarketData[], strategy: StrategyConfig): string {
    if (data.length < 50) return "NEUTRAL"

    const latestCandle = data[data.length - 1]
    const sma20 = this.calculateSMA(data, 20)
    const sma50 = this.calculateSMA(data, 50)
    const rsi = this.calculateRSI(data, 14)
    const macd = this.calculateMACD(data)

    // Simple trend following strategy
    if (strategy.type === "trend_following") {
      if (latestCandle.close > sma20 && sma20 > sma50 && macd.histogram > 0) {
        return "LONG"
      } else if (latestCandle.close < sma20 && sma20 < sma50 && macd.histogram < 0) {
        return "SHORT"
      }
    }
    // Mean reversion strategy
    else if (strategy.type === "mean_reversion") {
      if (rsi < 30 && latestCandle.close < sma20) {
        return "LONG"
      } else if (rsi > 70 && latestCandle.close > sma20) {
        return "SHORT"
      }
    }
    // Breakout strategy
    else if (strategy.type === "breakout") {
      const recentHigh = Math.max(...data.slice(-20, -1).map((d) => d.high))
      const recentLow = Math.min(...data.slice(-20, -1).map((d) => d.low))

      if (latestCandle.close > recentHigh) {
        return "LONG"
      } else if (latestCandle.close < recentLow) {
        return "SHORT"
      }
    }

    return "NEUTRAL"
  }

  // Generate rationale for the signal
  private generateSignalRationale(data: MarketData[], strategy: StrategyConfig, signal: string): string {
    if (data.length < 50) return "Insufficient data for analysis."

    const latestCandle = data[data.length - 1]
    const sma20 = this.calculateSMA(data, 20)
    const sma50 = this.calculateSMA(data, 50)
    const rsi = this.calculateRSI(data, 14)
    const macd = this.calculateMACD(data)

    let rationale = ""

    if (signal === "LONG") {
      if (strategy.type === "trend_following") {
        rationale = `LONG signal based on trend following strategy. Price (${latestCandle.close.toFixed(
          2,
        )}) is above SMA20 (${sma20.toFixed(2)}) and SMA20 is above SMA50 (${sma50.toFixed(
          2,
        )}). MACD histogram is positive at ${macd.histogram.toFixed(4)}, indicating bullish momentum.`
      } else if (strategy.type === "mean_reversion") {
        rationale = `LONG signal based on mean reversion strategy. RSI is oversold at ${rsi.toFixed(
          2,
        )} and price (${latestCandle.close.toFixed(2)}) is below SMA20 (${sma20.toFixed(
          2,
        )}), suggesting a potential bounce.`
      } else if (strategy.type === "breakout") {
        const recentHigh = Math.max(...data.slice(-20, -1).map((d) => d.high))
        rationale = `LONG signal based on breakout strategy. Price (${latestCandle.close.toFixed(
          2,
        )}) has broken above recent high of ${recentHigh.toFixed(2)}, suggesting a potential uptrend.`
      }
    } else if (signal === "SHORT") {
      if (strategy.type === "trend_following") {
        rationale = `SHORT signal based on trend following strategy. Price (${latestCandle.close.toFixed(
          2,
        )}) is below SMA20 (${sma20.toFixed(2)}) and SMA20 is below SMA50 (${sma50.toFixed(
          2,
        )}). MACD histogram is negative at ${macd.histogram.toFixed(4)}, indicating bearish momentum.`
      } else if (strategy.type === "mean_reversion") {
        rationale = `SHORT signal based on mean reversion strategy. RSI is overbought at ${rsi.toFixed(
          2,
        )} and price (${latestCandle.close.toFixed(2)}) is above SMA20 (${sma20.toFixed(
          2,
        )}), suggesting a potential pullback.`
      } else if (strategy.type === "breakout") {
        const recentLow = Math.min(...data.slice(-20, -1).map((d) => d.low))
        rationale = `SHORT signal based on breakout strategy. Price (${latestCandle.close.toFixed(
          2,
        )}) has broken below recent low of ${recentLow.toFixed(2)}, suggesting a potential downtrend.`
      }
    } else {
      rationale = `NEUTRAL signal. Current market conditions do not meet the criteria for either a LONG or SHORT position based on the ${strategy.type} strategy.`
    }

    return rationale
  }

  // Generate a basic signal when LLM fails
  private generateBasicSignal(symbol: string, data: MarketData[], strategy: StrategyConfig): TradingSignalResult {
    const signal = this.determineCurrentSignal(data, strategy)
    const rationale = this.generateSignalRationale(data, strategy, signal)

    return {
      symbol,
      signal: signal as "LONG" | "SHORT" | "NEUTRAL",
      confidence: 0.5, // Medium confidence since this is a fallback
      rationale: `[FALLBACK] ${rationale}`,
      timestamp: Date.now(),
      provider: "fallback",
      entry: this.calculateEntryPrice(data),
      stopLoss: this.calculateStopLoss(data, signal as "LONG" | "SHORT" | "NEUTRAL"),
      takeProfit: this.calculateTakeProfit(data, signal as "LONG" | "SHORT" | "NEUTRAL"),
    }
  }

  // Calculate entry price
  private calculateEntryPrice(data: MarketData[]): number {
    if (data.length === 0) return 0
    return data[data.length - 1].close
  }

  // Calculate stop loss
  private calculateStopLoss(data: MarketData[], signal: "LONG" | "SHORT" | "NEUTRAL"): number {
    if (data.length < 20 || signal === "NEUTRAL") return 0

    const latestCandle = data[data.length - 1]
    const recentLow = Math.min(...data.slice(-20).map((d) => d.low))
    const recentHigh = Math.max(...data.slice(-20).map((d) => d.high))

    // Calculate ATR (Average True Range) for dynamic stop loss
    const atr = this.calculateATR(data, 14)

    if (signal === "LONG") {
      // For long positions, stop loss is below recent low or a multiple of ATR below entry
      return Math.min(recentLow, latestCandle.close - 2 * atr)
    } else if (signal === "SHORT") {
      // For short positions, stop loss is above recent high or a multiple of ATR above entry
      return Math.max(recentHigh, latestCandle.close + 2 * atr)
    }

    return 0
  }

  // Calculate take profit
  private calculateTakeProfit(data: MarketData[], signal: "LONG" | "SHORT" | "NEUTRAL"): number {
    if (data.length < 20 || signal === "NEUTRAL") return 0

    const latestCandle = data[data.length - 1]
    const stopLoss = this.calculateStopLoss(data, signal)
    const riskAmount = Math.abs(latestCandle.close - stopLoss)

    // Use a risk:reward ratio of 1:2
    if (signal === "LONG") {
      return latestCandle.close + 2 * riskAmount
    } else if (signal === "SHORT") {
      return latestCandle.close - 2 * riskAmount
    }

    return 0
  }

  // Calculate ATR (Average True Range)
  private calculateATR(data: MarketData[], period: number): number {
    if (data.length < period + 1) return 0

    const trueRanges = []

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high
      const low = data[i].low
      const prevClose = data[i - 1].close

      // True Range is the greatest of:
      // 1. Current High - Current Low
      // 2. |Current High - Previous Close|
      // 3. |Current Low - Previous Close|
      const tr1 = high - low
      const tr2 = Math.abs(high - prevClose)
      const tr3 = Math.abs(low - prevClose)
      const tr = Math.max(tr1, tr2, tr3)

      trueRanges.push(tr)
    }

    // Calculate simple moving average of true ranges
    const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period
    return atr
  }
}
