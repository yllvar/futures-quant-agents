import type { MarketData } from "./types"

export interface FeatureSet {
  timestamp: number
  features: Record<string, number>
  label?: number
}

export class FeatureEngineering {
  /**
   * Extract features from market data for machine learning
   */
  public extractFeatures(
    marketData: MarketData[],
    options: {
      window: number
      includeLabels: boolean
      labelType: "nextReturn" | "nextDirection" | "volatility"
      labelHorizon: number
    } = {
      window: 14,
      includeLabels: true,
      labelType: "nextDirection",
      labelHorizon: 5,
    },
  ): FeatureSet[] {
    if (marketData.length < options.window + options.labelHorizon) {
      throw new Error(
        `Not enough data points for feature extraction. Need at least ${
          options.window + options.labelHorizon
        }, got ${marketData.length}`,
      )
    }

    const featureSets: FeatureSet[] = []

    // Process each data point that has enough history
    for (let i = options.window; i < marketData.length - (options.includeLabels ? options.labelHorizon : 0); i++) {
      const windowData = marketData.slice(i - options.window, i)
      const currentCandle = marketData[i]
      const features: Record<string, number> = {}

      // Price-based features
      features.close = currentCandle.close
      features.open = currentCandle.open
      features.high = currentCandle.high
      features.low = currentCandle.low
      features.volume = currentCandle.volume

      // Technical indicators as features
      features.rsi = this.calculateRSI(windowData)
      features.macd = this.calculateMACD(windowData)
      features.bollingerWidth = this.calculateBollingerBandWidth(windowData)
      features.atr = this.calculateATR(windowData)

      // Price patterns
      features.priceRange = (currentCandle.high - currentCandle.low) / currentCandle.low
      features.bodySize = Math.abs(currentCandle.close - currentCandle.open) / currentCandle.open
      features.upperShadow =
        (currentCandle.high - Math.max(currentCandle.open, currentCandle.close)) / currentCandle.open
      features.lowerShadow =
        (Math.min(currentCandle.open, currentCandle.close) - currentCandle.low) / currentCandle.open

      // Momentum features
      features.momentum5 = this.calculateMomentum(windowData, 5)
      features.momentum10 = this.calculateMomentum(windowData, 10)

      // Volatility features
      features.volatility = this.calculateVolatility(windowData)

      // Volume features
      features.volumeChange = this.calculateVolumeChange(windowData)
      features.volumeMA = this.calculateVolumeMA(windowData)

      // Trend features
      features.sma20 = this.calculateSMA(windowData, 20)
      features.ema20 = this.calculateEMA(windowData, 20)
      features.trendStrength = this.calculateTrendStrength(windowData)

      // Create feature set
      const featureSet: FeatureSet = {
        timestamp: currentCandle.timestamp,
        features,
      }

      // Add label if requested
      if (options.includeLabels) {
        featureSet.label = this.createLabel(marketData, i, options.labelType, options.labelHorizon)
      }

      featureSets.push(featureSet)
    }

    return featureSets
  }

  /**
   * Create label for supervised learning
   */
  private createLabel(
    marketData: MarketData[],
    currentIndex: number,
    labelType: "nextReturn" | "nextDirection" | "volatility",
    horizon: number,
  ): number {
    if (currentIndex + horizon >= marketData.length) {
      throw new Error("Not enough data to create label")
    }

    const currentPrice = marketData[currentIndex].close
    const futurePrice = marketData[currentIndex + horizon].close

    switch (labelType) {
      case "nextReturn":
        // Percentage return
        return (futurePrice - currentPrice) / currentPrice

      case "nextDirection":
        // Binary classification: 1 for up, 0 for down
        return futurePrice > currentPrice ? 1 : 0

      case "volatility":
        // Volatility over the horizon period
        const pricesInHorizon = marketData.slice(currentIndex, currentIndex + horizon + 1).map((d) => d.close)
        return this.calculateVolatility({ close: pricesInHorizon } as any)

      default:
        throw new Error(`Unsupported label type: ${labelType}`)
    }
  }

  /**
   * Calculate Relative Strength Index (RSI)
   */
  private calculateRSI(data: MarketData[], period = 14): number {
    if (data.length < period + 1) {
      return 50 // Default value if not enough data
    }

    let gains = 0
    let losses = 0

    // Calculate average gains and losses
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close
      if (change >= 0) {
        gains += change
      } else {
        losses -= change
      }
    }

    const avgGain = gains / period
    const avgLoss = losses / period

    if (avgLoss === 0) {
      return 100 // No losses, RSI is 100
    }

    const rs = avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   */
  private calculateMACD(data: MarketData[]): number {
    const closes = data.map((d) => d.close)
    const ema12 = this.calculateEMAFromPrices(closes, 12)
    const ema26 = this.calculateEMAFromPrices(closes, 26)
    return ema12 - ema26
  }

  /**
   * Calculate Bollinger Band Width
   */
  private calculateBollingerBandWidth(data: MarketData[], period = 20, multiplier = 2): number {
    const closes = data.map((d) => d.close)
    const sma = this.calculateSMAFromPrices(closes, period)

    // Calculate standard deviation
    let sumSquaredDiff = 0
    for (const close of closes.slice(-period)) {
      sumSquaredDiff += Math.pow(close - sma, 2)
    }
    const stdDev = Math.sqrt(sumSquaredDiff / period)

    // Calculate band width
    const upperBand = sma + multiplier * stdDev
    const lowerBand = sma - multiplier * stdDev

    return (upperBand - lowerBand) / sma
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(data: MarketData[], period = 14): number {
    if (data.length < 2) return 0

    const trValues: number[] = []

    // Calculate True Range values
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high
      const low = data[i].low
      const prevClose = data[i - 1].close

      const tr1 = high - low
      const tr2 = Math.abs(high - prevClose)
      const tr3 = Math.abs(low - prevClose)

      trValues.push(Math.max(tr1, tr2, tr3))
    }

    // Calculate ATR as average of TR values
    return trValues.reduce((sum, tr) => sum + tr, 0) / trValues.length
  }

  /**
   * Calculate momentum over a period
   */
  private calculateMomentum(data: MarketData[], period: number): number {
    if (data.length <= period) return 0

    const currentPrice = data[data.length - 1].close
    const pastPrice = data[data.length - 1 - period].close

    return (currentPrice - pastPrice) / pastPrice
  }

  /**
   * Calculate price volatility
   */
  private calculateVolatility(data: MarketData[] | { close: number[] }): number {
    let prices: number[]

    if (Array.isArray(data) && "close" in data[0]) {
      prices = (data as MarketData[]).map((d) => d.close)
    } else {
      prices = (data as { close: number[] }).close
    }

    if (prices.length < 2) return 0

    // Calculate returns
    const returns: number[] = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length

    return Math.sqrt(variance)
  }

  /**
   * Calculate volume change
   */
  private calculateVolumeChange(data: MarketData[]): number {
    if (data.length < 2) return 0

    const currentVolume = data[data.length - 1].volume
    const prevVolume = data[data.length - 2].volume

    return (currentVolume - prevVolume) / prevVolume
  }

  /**
   * Calculate volume moving average
   */
  private calculateVolumeMA(data: MarketData[], period = 10): number {
    if (data.length < period) return 0

    const volumes = data.slice(-period).map((d) => d.volume)
    return volumes.reduce((sum, vol) => sum + vol, 0) / period
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  private calculateSMA(data: MarketData[], period: number): number {
    const prices = data.map((d) => d.close)
    return this.calculateSMAFromPrices(prices, period)
  }

  /**
   * Calculate SMA from price array
   */
  private calculateSMAFromPrices(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]

    const sum = prices.slice(-period).reduce((sum, price) => sum + price, 0)
    return sum / period
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  private calculateEMA(data: MarketData[], period: number): number {
    const prices = data.map((d) => d.close)
    return this.calculateEMAFromPrices(prices, period)
  }

  /**
   * Calculate EMA from price array
   */
  private calculateEMAFromPrices(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1]

    const k = 2 / (period + 1)

    // Start with SMA
    let ema = this.calculateSMAFromPrices(prices.slice(0, period), period)

    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * k + ema
    }

    return ema
  }

  /**
   * Calculate trend strength
   */
  private calculateTrendStrength(data: MarketData[]): number {
    if (data.length < 14) return 0

    const closes = data.map((d) => d.close)
    const sma = this.calculateSMAFromPrices(closes, 14)
    const currentPrice = closes[closes.length - 1]

    // Simple trend strength measure
    return Math.abs(currentPrice - sma) / sma
  }

  /**
   * Normalize features to have zero mean and unit variance
   */
  public normalizeFeatures(featureSets: FeatureSet[]): FeatureSet[] {
    if (featureSets.length === 0) return []

    // Get all feature names
    const featureNames = Object.keys(featureSets[0].features)

    // Calculate mean and standard deviation for each feature
    const stats: Record<string, { mean: number; std: number }> = {}

    for (const feature of featureNames) {
      const values = featureSets.map((fs) => fs.features[feature])
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length

      const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
      const std = Math.sqrt(variance)

      stats[feature] = { mean, std: std === 0 ? 1 : std }
    }

    // Normalize features
    return featureSets.map((fs) => {
      const normalizedFeatures: Record<string, number> = {}

      for (const feature of featureNames) {
        normalizedFeatures[feature] = (fs.features[feature] - stats[feature].mean) / stats[feature].std
      }

      return {
        timestamp: fs.timestamp,
        features: normalizedFeatures,
        label: fs.label,
      }
    })
  }
}
