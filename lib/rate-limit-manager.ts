/**
 * Manages API request rate limits
 */
export class RateLimitManager {
  private weightUsed = 0
  private lastResetTime: number = Date.now()
  private readonly weightLimit: number = 1200 // Binance's limit per minute
  private readonly resetInterval: number = 60 * 1000 // 1 minute
  private requestQueue: Array<{ weight: number; fn: Function; resolve: Function; reject: Function }> = []
  private processing = false

  /**
   * Get endpoint weight based on endpoint and parameters
   */
  getEndpointWeight(endpoint: string, params: any): number {
    // Map of endpoint weights based on Binance documentation
    const weights: Record<string, number> = {
      klines: params.limit ? Math.ceil(params.limit / 500) : 1,
      "ticker/24hr": 1,
      depth: params.limit ? Math.ceil(params.limit / 100) * 5 : 5,
      trades: 1,
      // Add more endpoints as needed
    }

    // Default weight if endpoint not found
    return weights[endpoint] || 1
  }

  /**
   * Execute request with rate limiting
   */
  async executeRequest<T>(endpoint: string, params: any, requestFn: () => Promise<T>): Promise<T> {
    const weight = this.getEndpointWeight(endpoint, params)

    return new Promise((resolve, reject) => {
      // Add to queue
      this.requestQueue.push({
        weight,
        fn: requestFn,
        resolve,
        reject,
      })

      // Start processing if not already
      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue() {
    if (this.requestQueue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true

    // Reset weight if interval passed
    if (Date.now() - this.lastResetTime > this.resetInterval) {
      this.weightUsed = 0
      this.lastResetTime = Date.now()
    }

    const request = this.requestQueue[0]

    // Check if adding this request would exceed the limit
    if (this.weightUsed + request.weight > this.weightLimit) {
      const waitTime = this.resetInterval - (Date.now() - this.lastResetTime) + 100
      console.log(`Rate limit approaching, waiting ${waitTime}ms before next request`)
      setTimeout(() => this.processQueue(), waitTime)
      return
    }

    // Execute the request
    this.requestQueue.shift()
    this.weightUsed += request.weight

    try {
      const result = await request.fn()
      request.resolve(result)
    } catch (error) {
      request.reject(error)
    }

    // Process next request with a small delay
    setTimeout(() => this.processQueue(), 50)
  }
}
