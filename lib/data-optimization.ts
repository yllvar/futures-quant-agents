import { HierarchicalCache } from "./hierarchical-cache"
import { RateLimitManager } from "./rate-limit-manager"
import { IncrementalDataFetcher } from "./incremental-data-fetcher"

// Create singleton instances
const hierarchicalCache = new HierarchicalCache()
const rateLimitManager = new RateLimitManager()
const incrementalDataFetcher = new IncrementalDataFetcher(hierarchicalCache, rateLimitManager)

export {
  hierarchicalCache,
  rateLimitManager,
  incrementalDataFetcher,
  HierarchicalCache,
  RateLimitManager,
  IncrementalDataFetcher,
}
