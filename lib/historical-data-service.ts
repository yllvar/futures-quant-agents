import type { MarketData, Timeframe } from "./types"

export class HistoricalDataService {
  private huggingfaceDatasetId = "Yllvar/qubit-historical-data"
  private cache: Map<string, MarketData[]> = new Map()

  async fetchHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    market: "Spot" | "Futures" = "Spot",
    startDate?: Date,
    endDate?: Date,
  ): Promise<MarketData[]> {
    // Create a cache key
    const cacheKey = `${symbol}-${timeframe}-${market}-${startDate ? startDate.toISOString() : "null"}-${endDate ? endDate.toISOString() : "null"}`

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    try {
      // Format symbol to match dataset (lowercase, no slash)
      const formattedSymbol = symbol.toLowerCase().replace("/", "")

      // Generate mock data for testing since the actual dataset might not be accessible
      console.log(`Generating mock historical data for ${symbol} (${timeframe})`)
      const mockData = this.generateMockHistoricalData(symbol, timeframe, startDate, endDate)

      // Cache the mock data
      this.cache.set(cacheKey, mockData)

      return mockData
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error)
      return []
    }
  }

  // Add a method to generate mock historical data
  private generateMockHistoricalData(
    symbol: string,
    timeframe: Timeframe,
    startDate?: Date,
    endDate?: Date,
  ): MarketData[] {
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

    // Determine interval in milliseconds based on timeframe
    let intervalMs: number
    switch (timeframe) {
      case "1m":
        intervalMs = 60 * 1000
        break
      case "5m":
        intervalMs = 5 * 60 * 1000
        break
      case "15m":
        intervalMs = 15 * 60 * 1000
        break
      case "30m":
        intervalMs = 30 * 60 * 1000
        break
      case "1h":
        intervalMs = 60 * 60 * 1000
        break
      case "4h":
        intervalMs = 4 * 60 * 60 * 1000
        break
      case "1d":
        intervalMs = 24 * 60 * 60 * 1000
        break
      case "1w":
        intervalMs = 7 * 24 * 60 * 60 * 1000
        break
      default:
        intervalMs = 60 * 60 * 1000 // Default to 1h
    }

    // Generate different price ranges based on the symbol
    let basePrice = 100
    let volatility = 1

    if (symbol.startsWith("BTC")) {
      basePrice = 60000 + Math.random() * 5000
      volatility = 1000
    } else if (symbol.startsWith("ETH")) {
      basePrice = 3000 + Math.random() * 300
      volatility = 50
    } else if (symbol.startsWith("SOL")) {
      basePrice = 120 + Math.random() * 10
      volatility = 3
    } else if (symbol.startsWith("ADA")) {
      basePrice = 0.5 + Math.random() * 0.1
      volatility = 0.02
    } else if (symbol.startsWith("XRP")) {
      basePrice = 0.6 + Math.random() * 0.1
      volatility = 0.03
    }

    // Calculate number of data points
    const totalTime = end.getTime() - start.getTime()
    const numPoints = Math.floor(totalTime / intervalMs)

    // Generate data points
    const data: MarketData[] = []
    let price = basePrice

    for (let i = 0; i < numPoints; i++) {
      const timestamp = start.getTime() + i * intervalMs

      // Generate price movement
      const change = (Math.random() - 0.5) * volatility * 0.02
      const open = price
      price = price * (1 + change)
      const close = price

      // High is the max of open and close, plus a random amount
      const high = Math.max(open, close) * (1 + Math.random() * 0.01)

      // Low is the min of open and close, minus a random amount
      const low = Math.min(open, close) * (1 - Math.random() * 0.01)

      // Generate volume
      const volume = Math.random() * 1000000 * (basePrice / 100)

      data.push({
        symbol,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        timeframe,
      })
    }

    return data
  }

  clearCache() {
    this.cache.clear()
  }
}
