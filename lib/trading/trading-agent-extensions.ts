// Consolidating trading-agent-extension.ts, trading-agent-integration.ts, and trading-agent-factory.ts
import { TradingAgent } from "./trading-agent"
import { HistoricalDataService } from "../data/historical-data-service"
import { BacktestingEngine } from "./backtesting-engine"
import { HierarchicalCache } from "../data/hierarchical-cache"
import { RateLimitManager } from "../data/rate-limit-manager"
import { IncrementalDataFetcher } from "../data/incremental-data-fetcher"
import type { MarketData, Timeframe, StrategyConfig, BacktestResult, MarketRegime } from "../core/types"

// Export the BacktestingEngine to make it available to the EnhancedTradingAgent
export { BacktestingEngine }

// Factory function to create the appropriate trading agent
export function createTradingAgent(
  exchangeId = "binance",
  apiKey?: string,
  secret?: string,
  accountBalance = 10000,
  useEnhanced = true,
): TradingAgent | EnhancedTradingAgent {
  if (useEnhanced) {
    return new EnhancedTradingAgent(exchangeId, apiKey, secret, accountBalance)
  } else {
    return new TradingAgent(exchangeId, apiKey, secret, accountBalance)
  }
}

// Export function to create EnhancedTradingAgent
export function createEnhancedTradingAgent(
  exchangeId = "binance",
  apiKey?: string,
  secret?: string,
  accountBalance = 10000,
): EnhancedTradingAgent {
  return new EnhancedTradingAgent(exchangeId, apiKey, secret, accountBalance)
}

// Extend the TradingAgent class with historical data capabilities
export class EnhancedTradingAgent extends TradingAgent {
  private historicalDataService: HistoricalDataService
  private useHistoricalData = false
  private historicalDateRange: { startDate: Date; endDate: Date }

  constructor(exchangeId = "binance", apiKey?: string, secret?: string, accountBalance = 10000) {
    super(exchangeId, apiKey, secret, accountBalance)
    this.historicalDataService = new HistoricalDataService()

    // Default date range (last 90 days)
    this.historicalDateRange = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }
  }

  // Toggle between real-time and historical data
  public setUseHistoricalData(useHistorical: boolean): void {
    this.useHistoricalData = useHistorical
    console.log(`Data source set to: ${useHistorical ? "Historical" : "Real-time"}`)
  }

  // Set the date range for historical data
  public setHistoricalDateRange(startDate: Date, endDate: Date): void {
    this.historicalDateRange = { startDate, endDate }
    console.log(`Historical date range set: ${startDate.toDateString()} to ${endDate.toDateString()}`)
  }

  // Override the getMarketData method to use historical data when enabled
  public async getMarketData(symbol: string, timeframe: Timeframe, limit?: number): Promise<MarketData[]> {
    if (this.useHistoricalData) {
      return this.getHistoricalMarketData(symbol, timeframe, limit)
    }

    // Call the original method for real-time data
    return super.getMarketData(symbol, timeframe, limit)
  }

  // Method to get historical market data
  public async getHistoricalMarketData(
    symbol: string,
    timeframe: Timeframe,
    startDateOrLimit?: Date | number,
    endDate?: Date,
  ): Promise<MarketData[]> {
    // Check if first parameter is a number (limit) or Date (startDate)
    if (typeof startDateOrLimit === "number") {
      // It's a limit
      const data = await this.historicalDataService.fetchHistoricalData(
        symbol,
        timeframe,
        "Spot",
        this.historicalDateRange.startDate,
        this.historicalDateRange.endDate,
      )

      // Apply limit
      return data.slice(-startDateOrLimit)
    } else {
      // It's a startDate
      return this.historicalDataService.fetchHistoricalData(
        symbol,
        timeframe,
        "Spot",
        startDateOrLimit || this.historicalDateRange.startDate,
        endDate || this.historicalDateRange.endDate,
      )
    }
  }

  // Run backtest with historical data
  public async runHistoricalBacktest(
    symbol: string,
    timeframe: Timeframe,
    strategy: StrategyConfig,
    startDate?: Date,
    endDate?: Date,
  ): Promise<BacktestResult> {
    const historicalData = await this.historicalDataService.fetchHistoricalData(
      symbol,
      timeframe,
      "Spot",
      startDate || this.historicalDateRange.startDate,
      endDate || this.historicalDateRange.endDate,
    )

    if (historicalData.length < 50) {
      throw new Error(
        `Not enough historical data for backtesting ${symbol}. Found ${historicalData.length} data points, need at least 50.`,
      )
    }

    // Use the backtesting engine with historical data
    const backtestingEngine = new BacktestingEngine()
    return backtestingEngine.runBacktest(historicalData, strategy)
  }

  // Enhanced market regime detection
  public detectMarketRegime(marketData: MarketData[]): MarketRegime {
    if (marketData.length < 50) return "RANGING" // Default if not enough data

    const closes = marketData.map((d) => d.close)
    const volumes = marketData.map((d) => d.volume)

    // Calculate volatility
    const volatility = this.calculateVolatility(closes)

    // Calculate trend strength (simplified ADX-like measure)
    const trendStrength = this.calculateTrendStrength(closes)

    // Calculate volume trend
    const volumeTrend = this.calculateVolumeTrend(volumes)

    // Determine market regime based on indicators
    if (trendStrength > 25 && volatility < 2.5) {
      return "TRENDING"
    } else if (volatility > 3.5 || (volumeTrend > 20 && volatility > 2)) {
      return "VOLATILE"
    } else {
      return "RANGING"
    }
  }

  // Detect market regimes for a time series
  public detectMarketRegimeTimeSeries(
    marketData: MarketData[],
    windowSize = 20,
  ): { timestamp: number; regime: MarketRegime }[] {
    if (marketData.length < windowSize) {
      return []
    }

    const regimeChanges: { timestamp: number; regime: MarketRegime }[] = []

    // Sliding window approach to detect regime changes
    for (let i = windowSize; i < marketData.length; i++) {
      const windowData = marketData.slice(i - windowSize, i)
      const regime = this.detectMarketRegime(windowData)

      // Add regime data point
      regimeChanges.push({
        timestamp: marketData[i].timestamp,
        regime: regime,
      })
    }

    return regimeChanges
  }

  // Compare multiple strategies on the same historical data
  public async compareStrategies(
    symbol: string,
    timeframe: Timeframe,
    strategies: StrategyConfig[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ strategy: StrategyConfig; result: BacktestResult }[]> {
    const historicalData = await this.historicalDataService.fetchHistoricalData(
      symbol,
      timeframe,
      "Spot",
      startDate || this.historicalDateRange.startDate,
      endDate || this.historicalDateRange.endDate,
    )

    if (historicalData.length < 50) {
      throw new Error(
        `Not enough historical data for strategy comparison on ${symbol}. Found ${historicalData.length} data points, need at least 50.`,
      )
    }

    const backtestingEngine = new BacktestingEngine()
    const results: { strategy: StrategyConfig; result: BacktestResult }[] = []

    // Run backtest for each strategy
    for (const strategy of strategies) {
      const result = backtestingEngine.runBacktest(historicalData, strategy)
      results.push({ strategy, result })
    }

    return results
  }

  // Calculate volatility (standard deviation of percentage changes)
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0

    // Calculate percentage changes
    const returns: number[] = []
    for (let i = 1; i < prices.length; i++) {
      returns.push(((prices[i] - prices[i - 1]) / prices[i - 1]) * 100)
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length
    const squaredDiffs = returns.map((val) => Math.pow(val - mean, 2))
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / returns.length

    return Math.sqrt(variance)
  }

  // Calculate trend strength (simplified ADX-like measure)
  private calculateTrendStrength(prices: number[]): number {
    if (prices.length < 14) return 0

    // Calculate directional movement
    let upMove = 0
    let downMove = 0

    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1]
      if (diff > 0) {
        upMove += diff
      } else {
        downMove += Math.abs(diff)
      }
    }

    // Calculate directional index
    const total = upMove + downMove
    if (total === 0) return 0

    const dirIndex = (Math.abs(upMove - downMove) / total) * 100
    return dirIndex
  }

  // Calculate volume trend (percentage change in average volume)
  private calculateVolumeTrend(volumes: number[]): number {
    if (volumes.length < 20) return 0

    const recentAvg = volumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10
    const previousAvg = volumes.slice(-20, -10).reduce((sum, vol) => sum + vol, 0) / 10

    if (previousAvg === 0) return 0
    return ((recentAvg - previousAvg) / previousAvg) * 100
  }

  // Analyze market structure
  public analyzeMarketStructure(marketData: MarketData[]): {
    swingHigh: number[]
    swingLow: number[]
    support: number[]
    resistance: number[]
  } {
    if (marketData.length < 50) {
      return {
        swingHigh: [],
        swingLow: [],
        support: [],
        resistance: [],
      }
    }

    const highs = marketData.map((d) => d.high)
    const lows = marketData.map((d) => d.low)

    // Find swing highs and lows (simplified algorithm)
    const swingHigh: number[] = []
    const swingLow: number[] = []

    // Look for local maxima and minima
    for (let i = 2; i < marketData.length - 2; i++) {
      // Swing high
      if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
        swingHigh.push(i)
      }

      // Swing low
      if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i + 2]) {
        swingLow.push(i)
      }
    }

    // Find support and resistance levels (simplified)
    const support: number[] = []
    const resistance: number[] = []

    // Use swing lows to identify support
    for (let i = 0; i < swingLow.length; i++) {
      const idx = swingLow[i]
      const level = lows[idx]

      // Check if this level is close to any existing support
      const isNearExisting = support.some((s) => Math.abs(s - level) / level < 0.01)

      if (!isNearExisting) {
        support.push(level)
      }
    }

    // Use swing highs to identify resistance
    for (let i = 0; i < swingHigh.length; i++) {
      const idx = swingHigh[i]
      const level = highs[idx]

      // Check if this level is close to any existing resistance
      const isNearExisting = resistance.some((r) => Math.abs(r - level) / level < 0.01)

      if (!isNearExisting) {
        resistance.push(level)
      }
    }

    return {
      swingHigh,
      swingLow,
      support,
      resistance,
    }
  }

  // Clear historical data cache
  public clearHistoricalCache(): void {
    this.historicalDataService.clearCache()
    console.log("Historical data cache cleared")
  }

  // Get information about current data source
  public getDataSourceInfo(): {
    type: "historical" | "real-time"
    dateRange?: { startDate: Date; endDate: Date }
  } {
    return {
      type: this.useHistoricalData ? "historical" : "real-time",
      dateRange: this.useHistoricalData ? this.historicalDateRange : undefined,
    }
  }
}

// Extension methods for the TradingAgent class to use optimized data fetching
export function enhanceTradingAgent(tradingAgent: any) {
  // Store the original getMarketData method
  const originalGetMarketData = tradingAgent.getMarketData.bind(tradingAgent)

  // Override with optimized version
  tradingAgent.getMarketData = async (symbol: string, timeframe: Timeframe, limit?: number): Promise<MarketData[]> => {
    try {
      // Use incremental data fetcher
      const data = await incrementalDataFetcher.fetchIncrementalData(symbol, timeframe)

      // Apply limit if specified
      if (limit && data.length > limit) {
        return data.slice(-limit)
      }

      return data
    } catch (error) {
      console.error(`Error fetching market data with optimized fetcher: ${error}`)
      console.log("Falling back to original implementation")

      // Fall back to original implementation
      return originalGetMarketData(symbol, timeframe, limit)
    }
  }

  // Store the original refreshMarketData method
  const originalRefreshMarketData = tradingAgent.refreshMarketData.bind(tradingAgent)

  // Override with optimized version
  tradingAgent.refreshMarketData = async (symbol: string, timeframe: Timeframe): Promise<MarketData[]> => {
    try {
      // Force refresh by clearing the cache for this symbol/timeframe
      const cacheKey = `${symbol}-${timeframe}`

      // Use incremental data fetcher to get fresh data
      return await incrementalDataFetcher.fetchIncrementalData(symbol, timeframe)
    } catch (error) {
      console.error(`Error refreshing market data with optimized fetcher: ${error}`)
      console.log("Falling back to original implementation")

      // Fall back to original implementation
      return originalRefreshMarketData(symbol, timeframe)
    }
  }

  return tradingAgent
}

// Create singleton instances
const hierarchicalCache = new HierarchicalCache()
const rateLimitManager = new RateLimitManager()
const incrementalDataFetcher = new IncrementalDataFetcher(hierarchicalCache, rateLimitManager)

export { hierarchicalCache, rateLimitManager, incrementalDataFetcher }
