import type { MarketData, StrategyConfig, MarketRegime, Timeframe } from "./types"
import { IndicatorService } from "./indicators"
// Add import for LocalStorageService at the top of the file
import { LocalStorageService } from "./storage"

export class StrategyEngine {
  // Update the StrategyEngine class properties to include storage
  private storage: LocalStorageService
  private indicatorService: IndicatorService
  public predefinedStrategies: StrategyConfig[]

  // Update the constructor to initialize storage and load strategies
  constructor() {
    this.storage = new LocalStorageService()
    this.indicatorService = new IndicatorService()

    // Load strategies from storage or use defaults
    this.predefinedStrategies = this.loadStrategies()
  }

  public async analyzeInstrument(
    symbol: string,
    marketData: MarketData[],
    timeframe: Timeframe,
  ): Promise<StrategyConfig[]> {
    // 1. Market Regime Detection
    const marketRegime = this.detectMarketRegime(marketData)

    // 2. Select appropriate strategies
    const suitableStrategies = this.getStrategiesForRegime(marketRegime)

    // 3. Validate strategies on recent data
    const validatedStrategies = await this.validateStrategies(symbol, marketData, timeframe, suitableStrategies)

    return validatedStrategies
  }

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

  // Update updateStrategy to save changes
  public updateStrategy(id: string, updates: Partial<StrategyConfig>): void {
    const index = this.predefinedStrategies.findIndex((s) => s.id === id)
    if (index !== -1) {
      this.predefinedStrategies[index] = {
        ...this.predefinedStrategies[index],
        ...updates,
      }

      // Save to storage
      this.saveStrategies()
    }
  }

  // Update createStrategy to save changes
  public createStrategy(name = "New Strategy"): StrategyConfig {
    const newStrategy: StrategyConfig = {
      id: `strategy-${Date.now()}`,
      name: name,
      style: "TREND",
      riskPerTrade: 0.01,
      takeProfitRatio: 2.0,
      stopLossType: "atr",
      indicators: {
        primary: ["ema20", "sma50"],
        confirmation: ["adx", "volume"],
      },
      suitableRegimes: ["TRENDING"],
    }

    this.predefinedStrategies.push(newStrategy)

    // Save to storage
    this.saveStrategies()

    return newStrategy
  }

  // Update deleteStrategy to save changes
  public deleteStrategy(id: string): boolean {
    const initialLength = this.predefinedStrategies.length
    this.predefinedStrategies = this.predefinedStrategies.filter((s) => s.id !== id)

    // Save to storage if a strategy was deleted
    if (this.predefinedStrategies.length < initialLength) {
      this.saveStrategies()
      return true
    }

    return false
  }

  // Add getter for strategies
  public getStrategies(): StrategyConfig[] {
    return [...this.predefinedStrategies]
  }

  // Add a method to reset strategies to defaults
  public resetStrategiesToDefaults(): void {
    this.predefinedStrategies = this.initializeStrategies()
    this.saveStrategies()
  }

  // Add a method to clear storage data
  public clearStorageData(): void {
    this.storage.removeItem("strategies")
    this.predefinedStrategies = this.initializeStrategies()
    console.log("Strategy engine storage data cleared")
  }

  // Add methods for loading and saving strategies
  private loadStrategies(): StrategyConfig[] {
    return this.storage.getItem<StrategyConfig[]>("strategies", this.initializeStrategies())
  }

  private saveStrategies(): void {
    this.storage.saveItem("strategies", this.predefinedStrategies)
  }

  private calculateVolatility(closes: number[]): number {
    if (closes.length < 20) return 0

    const returns = []
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
    }

    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length

    return Math.sqrt(variance) * 100
  }

  private calculateTrendStrength(closes: number[]): number {
    // Simplified trend strength calculation
    // In a real implementation, use ADX or similar indicator

    const period = 14
    if (closes.length < period * 2) return 0

    const upMoves = []
    const downMoves = []

    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1]
      upMoves.push(diff > 0 ? diff : 0)
      downMoves.push(diff < 0 ? Math.abs(diff) : 0)
    }

    const avgUp = upMoves.slice(-period).reduce((sum, val) => sum + val, 0) / period
    const avgDown = downMoves.slice(-period).reduce((sum, val) => sum + val, 0) / period

    if (avgDown === 0) return 100

    const rs = avgUp / avgDown
    const rsi = 100 - 100 / (1 + rs)

    // Convert RSI to a trend strength measure (higher when away from 50)
    return Math.abs(rsi - 50) * 2
  }

  private calculateVolumeTrend(volumes: number[]): number {
    if (volumes.length < 20) return 0

    const recentAvg = volumes.slice(-5).reduce((sum, val) => sum + val, 0) / 5
    const previousAvg = volumes.slice(-20, -5).reduce((sum, val) => sum + val, 0) / 15

    return ((recentAvg - previousAvg) / previousAvg) * 100
  }

  private getStrategiesForRegime(regime: MarketRegime): StrategyConfig[] {
    return this.predefinedStrategies.filter((strategy) => strategy.suitableRegimes.includes(regime))
  }

  private async validateStrategies(
    symbol: string,
    marketData: MarketData[],
    timeframe: Timeframe,
    strategies: StrategyConfig[],
  ): Promise<StrategyConfig[]> {
    if (marketData.length < 100) {
      return strategies // Not enough data for validation
    }

    const validatedStrategies: StrategyConfig[] = []

    for (const strategy of strategies) {
      // Simple backtest
      const backTestResult = await this.backtest(strategy, marketData)

      // Only include strategies with positive expectancy
      if (backTestResult.expectancy > 0) {
        validatedStrategies.push({
          ...strategy,
          backTestResult, // Add backtest metrics to strategy
        })
      }
    }

    // Sort by expectancy
    return validatedStrategies.sort((a, b) => (b.backTestResult?.expectancy || 0) - (a.backTestResult?.expectancy || 0))
  }

  private async backtest(strategy: StrategyConfig, marketData: MarketData[]) {
    // Split data into training and testing periods
    const trainingData = marketData.slice(0, Math.floor(marketData.length * 0.7))
    const testingData = marketData.slice(Math.floor(marketData.length * 0.7))

    let wins = 0
    let losses = 0
    let totalProfit = 0
    let totalLoss = 0

    // Simulate trading based on strategy
    for (let i = 50; i < testingData.length - 1; i++) {
      const dataSlice = testingData.slice(0, i)
      const indicators = this.indicatorService.calculateIndicators(dataSlice, strategy)

      // Generate signal based on strategy type
      const signal = this.generateSignalFromIndicators(strategy, indicators)

      // Check if signal was profitable in next candle
      if (signal === "LONG" && testingData[i + 1].close > testingData[i].close) {
        wins++
        totalProfit += (testingData[i + 1].close - testingData[i].close) / testingData[i].close
      } else if (signal === "SHORT" && testingData[i + 1].close < testingData[i].close) {
        wins++
        totalProfit += (testingData[i].close - testingData[i + 1].close) / testingData[i].close
      } else if (signal !== "NEUTRAL") {
        losses++
        totalLoss += Math.abs((testingData[i + 1].close - testingData[i].close) / testingData[i].close)
      }
    }

    const winRate = wins / (wins + losses) || 0
    const avgWin = wins > 0 ? totalProfit / wins : 0
    const avgLoss = losses > 0 ? totalLoss / losses : 0
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss

    return {
      winRate,
      expectancy,
      trades: wins + losses,
      avgWin,
      avgLoss,
    }
  }

  private generateSignalFromIndicators(strategy: StrategyConfig, indicators: any): "LONG" | "SHORT" | "NEUTRAL" {
    // Simple signal generation based on strategy type
    if (strategy.style === "TREND") {
      // Example: EMA crossover
      if (indicators.ema20 > indicators.sma50) return "LONG"
      if (indicators.ema20 < indicators.sma50) return "SHORT"
    } else if (strategy.style === "MEAN_REVERSION") {
      // Example: RSI oversold/overbought
      if (indicators.rsi < 30) return "LONG"
      if (indicators.rsi > 70) return "SHORT"
    } else if (strategy.style === "BREAKOUT") {
      // Example: Price breaks upper/lower band
      const price = indicators.price
      if (price > indicators.donchian?.upper) return "LONG"
      if (price < indicators.donchian?.lower) return "SHORT"
    }

    return "NEUTRAL"
  }

  private initializeStrategies(): StrategyConfig[] {
    return [
      {
        id: "trend-following",
        name: "Trend Following",
        style: "TREND",
        riskPerTrade: 0.01,
        takeProfitRatio: 2.0,
        stopLossType: "atr",
        indicators: {
          primary: ["ema20", "sma50", "macd"],
          confirmation: ["adx", "volume"],
        },
        suitableRegimes: ["TRENDING"],
      },
      {
        id: "mean-reversion",
        name: "Mean Reversion",
        style: "MEAN_REVERSION",
        riskPerTrade: 0.01,
        takeProfitRatio: 1.5,
        stopLossType: "percentage",
        indicators: {
          primary: ["rsi", "bollinger"],
          confirmation: ["stochastic", "volume"],
        },
        suitableRegimes: ["RANGING"],
      },
      {
        id: "breakout",
        name: "Breakout",
        style: "BREAKOUT",
        riskPerTrade: 0.015,
        takeProfitRatio: 2.5,
        stopLossType: "atr",
        indicators: {
          primary: ["donchian", "atr"],
          confirmation: ["volume", "adx"],
        },
        suitableRegimes: ["VOLATILE", "TRENDING"],
      },
      {
        id: "volatility-trend",
        name: "Volatility Trend",
        style: "TREND",
        riskPerTrade: 0.02,
        takeProfitRatio: 1.8,
        stopLossType: "atr",
        indicators: {
          primary: ["ema20", "atr"],
          confirmation: ["macd", "volume"],
        },
        suitableRegimes: ["VOLATILE"],
      },
    ]
  }
}
