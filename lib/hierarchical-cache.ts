import type { Timeframe } from "./types"

/**
 * A hierarchical caching system that respects the natural update frequency of different timeframes
 */
export class HierarchicalCache {
  private cache: Map<string, any> = new Map()
  private expirationTimes: Map<string, number> = new Map()

  /**
   * Get dynamic expiration time based on timeframe
   */
  private getExpirationTime(timeframe: Timeframe): number {
    switch (timeframe) {
      case "1m":
        return 60 * 1000 // 1 minute
      case "5m":
        return 5 * 60 * 1000 // 5 minutes
      case "15m":
        return 10 * 60 * 1000 // 10 minutes
      case "30m":
        return 15 * 60 * 1000 // 15 minutes
      case "1h":
        return 30 * 60 * 1000 // 30 minutes
      case "4h":
        return 2 * 60 * 60 * 1000 // 2 hours
      case "1d":
        return 6 * 60 * 60 * 1000 // 6 hours
      case "1w":
        return 24 * 60 * 60 * 1000 // 24 hours
      default:
        return 60 * 1000
    }
  }

  /**
   * Get data with automatic refresh if needed
   * @param key Cache key
   * @param timeframe Timeframe for determining expiration
   * @param fetchFn Function to fetch fresh data if cache is expired
   * @returns Promise resolving to the data
   */
  async get<T>(key: string, timeframe: Timeframe, fetchFn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const expiration = this.expirationTimes.get(key) || 0

    // Return cached data if not expired
    if (this.cache.has(key) && now < expiration) {
      return this.cache.get(key)
    }

    // Otherwise fetch fresh data
    try {
      const data = await fetchFn()
      this.cache.set(key, data)
      this.expirationTimes.set(key, now + this.getExpirationTime(timeframe))
      return data
    } catch (error) {
      // If fetch fails but we have cached data, return it even if expired
      if (this.cache.has(key)) {
        console.warn(`Failed to refresh ${key}, using expired cache data`)
        return this.cache.get(key)
      }
      throw error
    }
  }

  /**
   * Manually update cache (e.g., from WebSocket updates)
   * @param key Cache key
   * @param timeframe Timeframe for determining expiration
   * @param data Data to cache
   */
  update<T>(key: string, timeframe: Timeframe, data: T): void {
    this.cache.set(key, data)
    this.expirationTimes.set(key, Date.now() + this.getExpirationTime(timeframe))
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   * @returns True if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear a specific key from the cache
   * @param key Cache key
   */
  clear(key: string): void {
    this.cache.delete(key)
    this.expirationTimes.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear()
    this.expirationTimes.clear()
  }
}
