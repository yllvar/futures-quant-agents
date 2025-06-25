import type { MarketData, Timeframe } from "./types"
import type { HierarchicalCache } from "./hierarchical-cache"
import type { RateLimitManager } from "./rate-limit-manager"

/**
 * Fetches market data incrementally to minimize API calls
 */
export class IncrementalDataFetcher {
  private cache: HierarchicalCache
  private rateLimiter: RateLimitManager

  constructor(cache: HierarchicalCache, rateLimiter: RateLimitManager) {
    this.cache = cache
    this.rateLimiter = rateLimiter
  }

  /**
   * Fetch market data incrementally, only getting new candles since last fetch
   */
  async fetchIncrementalData(symbol: string, timeframe: Timeframe): Promise<MarketData[]> {
    const cacheKey = `${symbol}-${timeframe}`

    // Get cached data
    const cachedData = await this.cache.get<MarketData[]>(cacheKey, timeframe, async () => {
      // Initial fetch if no cached data
      return this.fetchFullData(symbol, timeframe)
    })

    // If we have cached data, only fetch the newest candles
    if (cachedData && cachedData.length > 0) {
      const lastTimestamp = cachedData[cachedData.length - 1].timestamp

      // Fetch only newer data
      const newData = await this.fetchDataSince(symbol, timeframe, lastTimestamp)

      if (newData.length > 0) {
        // Merge with existing data, removing any overlapping candles
        const mergedData = [...cachedData]

        // Remove any candles that might overlap with new data
        const firstNewTimestamp = newData[0].timestamp
        const lastExistingIndex = mergedData.findIndex((d) => d.timestamp >= firstNewTimestamp)

        if (lastExistingIndex !== -1) {
          mergedData.splice(lastExistingIndex)
        }

        // Add new data
        mergedData.push(...newData)

        // Update cache
        this.cache.update(cacheKey, timeframe, mergedData)

        return mergedData
      }

      return cachedData
    }

    // If no cached data, fetch full dataset
    return this.fetchFullData(symbol, timeframe)
  }

  /**
   * Fetch full historical data for a symbol and timeframe
   */
  private async fetchFullData(symbol: string, timeframe: Timeframe, limit = 500): Promise<MarketData[]> {
    const formattedSymbol = symbol.replace("/", "")
    const interval = this.convertTimeframeToInterval(timeframe)

    return this.rateLimiter.executeRequest("klines", { symbol: formattedSymbol, interval, limit }, async () => {
      const url = `https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${limit}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Transform to MarketData format
      return data.map((candle: any) => ({
        symbol,
        timestamp: candle[0],
        open: Number.parseFloat(candle[1]),
        high: Number.parseFloat(candle[2]),
        low: Number.parseFloat(candle[3]),
        close: Number.parseFloat(candle[4]),
        volume: Number.parseFloat(candle[5]),
        timeframe,
      }))
    })
  }

  /**
   * Fetch data since a specific timestamp
   */
  private async fetchDataSince(symbol: string, timeframe: Timeframe, startTime: number): Promise<MarketData[]> {
    const formattedSymbol = symbol.replace("/", "")
    const interval = this.convertTimeframeToInterval(timeframe)

    return this.rateLimiter.executeRequest("klines", { symbol: formattedSymbol, interval, startTime }, async () => {
      const url = `https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=${interval}&startTime=${startTime + 1}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Transform to MarketData format
      return data.map((candle: any) => ({
        symbol,
        timestamp: candle[0],
        open: Number.parseFloat(candle[1]),
        high: Number.parseFloat(candle[2]),
        low: Number.parseFloat(candle[3]),
        close: Number.parseFloat(candle[4]),
        volume: Number.parseFloat(candle[5]),
        timeframe,
      }))
    })
  }

  /**
   * Convert timeframe to Binance interval format
   */
  private convertTimeframeToInterval(timeframe: Timeframe): string {
    // Binance's interval format matches our timeframe format
    return timeframe
  }
}
