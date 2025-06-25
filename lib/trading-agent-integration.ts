import type { MarketData, Timeframe } from "./types"
import { incrementalDataFetcher } from "./data-optimization"

/**
 * Extension methods for the TradingAgent class to use optimized data fetching
 */
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
