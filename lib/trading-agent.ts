import ccxt from "ccxt"
import type { MarketData, StrategyConfig, TradingSignalResult, Timeframe, Position } from "./types"
import { StrategyEngine } from "./strategy-engine"
import { LLMService } from "./llm-service"
// Ensure the import is from the correct path
import { LocalStorageService } from "./storage"

type TradeSignal = "LONG" | "SHORT" | "NEUTRAL"

// Define a public API endpoint for Binance data
const BINANCE_PUBLIC_API = "https://api.binance.com/api/v3"

export class TradingAgent {
  private activePositions: Map<string, any> = new Map()
  public strategyEngine: StrategyEngine
  private llmService: LLMService
  private marketData: Map<string, Map<Timeframe, MarketData[]>> = new Map()
  private currentSignals: Map<string, TradingSignalResult> = new Map()
  private activeStrategies: Map<string, StrategyConfig> = new Map()
  private marketRegimes: Map<string, string> = new Map()
  private exchange: ccxt.Exchange | null = null
  private availableSymbols: string[] = ["SOL/USDT", "BTC/USDT", "ETH/USDT", "ADA/USDT", "XRP/USDT"]
  private lastFetchTime: Map<string, Map<Timeframe, number>> = new Map()
  private fetchInProgress: Map<string, Map<Timeframe, boolean>> = new Map()
  private multiTimeframeCache: Map<string, Record<Timeframe, MarketData[]>> = new Map()
  private positions: Position[] = []
  private positionHistory: Position[] = []
  private accountBalance = 10000
  private storage: LocalStorageService
  private isWebSocketEnabled = false
  private webSocketConnections: Map<string, WebSocket> = new Map()
  private webSocketCallbacks: Map<string, ((data: any) => void)[]> = new Map()

  // Add these properties to the TradingAgent class
  private signalCooldownPeriod = 15 * 60 * 1000 // 15 minutes cooldown between signal changes
  private lastSignalTime: Map<string, number> = new Map()
  private dataRefreshThrottleTime: Map<string, Map<Timeframe, number>> = new Map()
  private signalConfidenceThreshold = 0.65 // Minimum confidence to change signal
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(exchangeId = "binance", apiKey?: string, secret?: string, accountBalance = 10000) {
    this.storage = new LocalStorageService()
    this.strategyEngine = new StrategyEngine()
    this.llmService = new LLMService()
    this.accountBalance = accountBalance

    // Load position history from storage
    this.loadPositionHistory()

    // Initialize exchange if credentials are provided
    if (exchangeId && apiKey && secret) {
      try {
        this.exchange = new ccxt[exchangeId]({
          apiKey,
          secret,
          enableRateLimit: true,
          options: {
            defaultType: "spot",
            adjustForTimeDifference: true,
            recvWindow: 10000,
          },
        })

        // Enable WebSocket if we have API credentials
        this.isWebSocketEnabled = true

        console.log(`Initialized ${exchangeId} exchange connection with API key`)
      } catch (error) {
        console.error(`Failed to initialize ${exchangeId} exchange with API key:`, error)
        this.exchange = null
      }
    } else {
      console.log("No API credentials provided, using public API only")
    }

    // Initialize fetch status for all symbols
    this.availableSymbols.forEach((symbol) => {
      // Initialize nested maps for each symbol
      if (!this.fetchInProgress.has(symbol)) {
        this.fetchInProgress.set(symbol, new Map())
      }
      if (!this.lastFetchTime.has(symbol)) {
        this.lastFetchTime.set(symbol, new Map())
      }
      if (!this.marketData.has(symbol)) {
        this.marketData.set(symbol, new Map())
      }
    })
  }

  // Initialize WebSocket connections for real-time data
  public initializeWebSockets(symbols: string[] = this.availableSymbols): void {
    // Close any existing connections
    this.closeAllWebSockets()

    // Initialize WebSocket connections for each symbol
    symbols.forEach((symbol) => {
      this.initializeSymbolWebSocket(symbol)
    })
  }

  private initializeSymbolWebSocket(symbol: string): void {
    try {
      // Format symbol for Binance WebSocket (e.g., "BTC/USDT" -> "btcusdt")
      const formattedSymbol = symbol.replace("/", "").toLowerCase()

      // Binance WebSocket endpoint for kline/candlestick data
      const wsEndpoint = `wss://stream.binance.com:9443/ws/${formattedSymbol}@kline_1m`

      console.log(`Connecting to WebSocket: ${wsEndpoint}`)

      // Check if WebSocket is supported in this environment
      if (typeof WebSocket === "undefined") {
        throw new Error("WebSocket is not supported in this environment")
      }

      let ws: WebSocket

      try {
        ws = new WebSocket(wsEndpoint)
      } catch (error) {
        console.error(`Failed to create WebSocket for ${symbol}:`, error)
        this.fallbackToPolling(symbol)
        return
      }

      // Store the WebSocket connection
      this.webSocketConnections.set(symbol, ws)

      // Initialize callbacks array if it doesn't exist
      if (!this.webSocketCallbacks.has(symbol)) {
        this.webSocketCallbacks.set(symbol, [])
      }

      // Set up event handlers
      ws.onopen = () => {
        console.log(`WebSocket connection established for ${symbol}`)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string)

          // Process kline data
          if (data.k) {
            const kline = data.k
            const marketData: MarketData = {
              symbol,
              timestamp: kline.t,
              open: Number.parseFloat(kline.o),
              high: Number.parseFloat(kline.h),
              low: Number.parseFloat(kline.l),
              close: Number.parseFloat(kline.c),
              volume: Number.parseFloat(kline.v),
              timeframe: "1m" as Timeframe,
            }

            // Update market data cache
            this.updateMarketData(symbol, marketData)

            // Notify all callbacks
            const callbacks = this.webSocketCallbacks.get(symbol) || []
            callbacks.forEach((callback) => callback(marketData))
          }
        } catch (error) {
          console.error(`Error processing WebSocket message for ${symbol}:`, error)
        }
      }

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${symbol}:`, error)
        this.fallbackToPolling(symbol)
      }

      ws.onclose = () => {
        console.log(`WebSocket connection closed for ${symbol}. Will attempt to reconnect...`)

        // Try to reconnect after a delay, but only if we haven't switched to polling
        setTimeout(() => {
          if (this.webSocketConnections.has(symbol)) {
            this.initializeSymbolWebSocket(symbol)
          }
        }, 5000)
      }
    } catch (error) {
      console.error(`Failed to initialize WebSocket for ${symbol}:`, error)
      this.fallbackToPolling(symbol)
    }
  }

  // Close all WebSocket connections
  public closeAllWebSockets(): void {
    this.webSocketConnections.forEach((ws, symbol) => {
      try {
        ws.close()
      } catch (error) {
        console.error(`Error closing WebSocket for ${symbol}:`, error)
      }
    })

    // Clear all WebSockets
    this.webSocketConnections.clear()

    // Clear all polling intervals
    if (this.pollingIntervals) {
      this.pollingIntervals.forEach((interval, symbol) => {
        clearInterval(interval)
      })
      this.pollingIntervals.clear()
    }
  }

  // Subscribe to real-time market data updates
  public subscribeToMarketData(symbol: string, callback: (data: MarketData) => void): () => void {
    // Initialize callbacks array if it doesn't exist
    if (!this.webSocketCallbacks.has(symbol)) {
      this.webSocketCallbacks.set(symbol, [])
    }

    // Add callback to the array
    const callbacks = this.webSocketCallbacks.get(symbol)!
    callbacks.push(callback)

    // Make sure WebSocket is initialized
    if (!this.webSocketConnections.has(symbol)) {
      this.initializeSymbolWebSocket(symbol)
    }

    // Return unsubscribe function
    return () => {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  public getAvailableSymbols(): string[] {
    return this.availableSymbols
  }

  public getAvailableTimeframes(): Timeframe[] {
    return ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"]
  }

  // Update the analyzeSymbol method to include signal stability logic
  public async analyzeSymbol(
    symbol: string,
    timeframe: Timeframe = "1h",
    huggingFaceApiKey: string,
    deepSeekApiKey: string,
    useMockImplementation = false, // Add this parameter
  ): Promise<{
    signal: TradingSignalResult
    strategy: StrategyConfig
    marketRegime: string
  }> {
    // Check if we should throttle data refresh
    const shouldThrottle = this.shouldThrottleDataRefresh(symbol, timeframe)

    // 1. Get or generate market data for primary timeframe
    const data = shouldThrottle
      ? await this.getMarketData(symbol, timeframe, undefined, false) // Don't force refresh if throttled
      : await this.getMarketData(symbol, timeframe)

    // 2. Get multi-timeframe data for additional context
    const additionalTimeframes = this.getAdditionalTimeframes(timeframe)
    const multiTimeframeData = await this.getMultiTimeframeData(symbol, [timeframe, ...additionalTimeframes])

    // 3. Detect market regime
    const marketRegime = this.strategyEngine.detectMarketRegime(data)
    this.marketRegimes.set(symbol, marketRegime)

    // 4. Get recommended strategies for this symbol and regime
    const strategies = await this.strategyEngine.analyzeInstrument(symbol, data, timeframe)

    if (strategies.length === 0) {
      throw new Error(`No suitable strategies found for ${symbol} in ${marketRegime} regime`)
    }

    // 5. Select the best strategy (for now, just take the first one)
    const selectedStrategy = strategies[0]
    this.activeStrategies.set(symbol, selectedStrategy)

    // Get current signal if it exists
    const currentSignal = this.currentSignals.get(symbol)

    // Check if we're in the cooldown period
    const now = Date.now()
    const lastSignalTime = this.lastSignalTime.get(symbol) || 0
    const isInCooldown = now - lastSignalTime < this.signalCooldownPeriod

    // Only generate a new signal if we're not in cooldown or we don't have a current signal
    if (!isInCooldown || !currentSignal) {
      // 6. Generate trading signal using LLM with multi-timeframe context
      const signal = await this.llmService.generateTradingSignalWithMultiTimeframe(
        symbol,
        data,
        selectedStrategy,
        multiTimeframeData,
        huggingFaceApiKey,
        deepSeekApiKey,
        useMockImplementation, // Pass the mock implementation flag
      )

      // Apply signal stability logic
      const finalSignal = this.applySignalStabilityLogic(symbol, signal, currentSignal)

      // Update last signal time if signal changed
      if (!currentSignal || currentSignal.signal !== finalSignal.signal) {
        this.lastSignalTime.set(symbol, now)
      }

      this.currentSignals.set(symbol, finalSignal)

      // Update data refresh throttle time
      this.updateDataRefreshThrottle(symbol, timeframe)

      return {
        signal: finalSignal,
        strategy: selectedStrategy,
        marketRegime,
      }
    } else {
      // Return existing signal if in cooldown period
      return {
        signal: currentSignal,
        strategy: selectedStrategy,
        marketRegime,
      }
    }
  }

  private getAdditionalTimeframes(timeframe: Timeframe): Timeframe[] {
    switch (timeframe) {
      case "1m":
        return ["5m", "15m", "1h"]
      case "5m":
        return ["15m", "1h", "4h"]
      case "15m":
        return ["1h", "4h", "1d"]
      case "30m":
        return ["1h", "4h", "1d"]
      case "1h":
        return ["4h", "1d", "1w"]
      case "4h":
        return ["1d", "1w", "1h"]
      case "1d":
        return ["1w", "4h", "1h"]
      case "1w":
        return ["1d", "4h", "1h"]
      default:
        return ["1h", "4h", "1d"]
    }
  }

  public async getMultiTimeframeData(
    symbol: string,
    timeframes: Timeframe[] = ["1h", "4h", "1d"],
  ): Promise<Record<Timeframe, MarketData[]>> {
    const cacheKey = `${symbol}-multi`
    const now = Date.now()
    const lastFetch = this.lastFetchTime.get(cacheKey)?.get("multi") || 0

    // Check if we have cached data that's less than 5 minutes old
    if (this.multiTimeframeCache.has(cacheKey) && now - lastFetch < 300000) {
      return this.multiTimeframeCache.get(cacheKey) as Record<Timeframe, MarketData[]>
    }

    const result: Record<Timeframe, MarketData[]> = {} as Record<Timeframe, MarketData[]>

    // Fetch data for each timeframe
    for (const timeframe of timeframes) {
      try {
        result[timeframe] = await this.getMarketData(symbol, timeframe)
      } catch (error) {
        console.error(`Error fetching ${timeframe} data for ${symbol}:`, error)
        result[timeframe] = []
      }
    }

    // Cache the results
    this.multiTimeframeCache.set(cacheKey, result)

    // Update last fetch time
    if (!this.lastFetchTime.has(cacheKey)) {
      this.lastFetchTime.set(cacheKey, new Map())
    }
    this.lastFetchTime.get(cacheKey)?.set("multi", now)

    return result
  }

  // Update the getMarketData method to accept a forceRefresh parameter
  public async getMarketData(
    symbol: string,
    timeframe: Timeframe,
    limit?: number,
    forceRefresh = false,
  ): Promise<MarketData[]> {
    // Initialize nested maps if they don't exist
    if (!this.marketData.has(symbol)) {
      this.marketData.set(symbol, new Map())
    }
    if (!this.lastFetchTime.has(symbol)) {
      this.lastFetchTime.set(symbol, new Map())
    }
    if (!this.fetchInProgress.has(symbol)) {
      this.fetchInProgress.set(symbol, new Map())
    }

    const symbolData = this.marketData.get(symbol)!
    const symbolLastFetch = this.lastFetchTime.get(symbol)!
    const symbolFetchInProgress = this.fetchInProgress.get(symbol)!

    // Check if we already have cached data for this symbol and timeframe
    if (symbolData.has(timeframe)) {
      const data = symbolData.get(timeframe) || []

      // Check if we need to refresh the data
      const now = Date.now()
      const lastFetch = symbolLastFetch.get(timeframe) || 0
      const fetchInProgress = symbolFetchInProgress.get(timeframe) || false

      // Determine refresh interval based on timeframe
      let refreshInterval: number
      switch (timeframe) {
        case "1m":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "5m":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "15m":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "30m":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "1h":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "4h":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "1d":
          refreshInterval = 60 * 1000
          break // 60 seconds
        case "1w":
          refreshInterval = 60 * 1000
          break // 60 seconds
        default:
          refreshInterval = 60 * 1000 // 60 seconds default
      }

      if ((forceRefresh || now - lastFetch > refreshInterval) && !fetchInProgress) {
        // Refresh in background
        this.refreshMarketData(symbol, timeframe).catch((err) =>
          console.error(`Background refresh failed for ${symbol} ${timeframe}:`, err),
        )
      }

      return limit ? data.slice(-limit) : data
    }

    try {
      symbolFetchInProgress.set(timeframe, true)
      console.log(`Fetching ${timeframe} OHLCV data for ${symbol} from exchange...`)

      // Use public API instead of CCXT for browser compatibility
      const formattedSymbol = symbol.replace("/", "")
      const interval = this.convertTimeframeToInterval(timeframe)
      const requestLimit = limit || 500

      const url = `${BINANCE_PUBLIC_API}/klines?symbol=${formattedSymbol}&interval=${interval}&limit=${requestLimit}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Transform to our MarketData format
      const formattedData: MarketData[] = data.map((candle: any) => ({
        symbol,
        timestamp: candle[0],
        open: Number.parseFloat(candle[1]),
        high: Number.parseFloat(candle[2]),
        low: Number.parseFloat(candle[3]),
        close: Number.parseFloat(candle[4]),
        volume: Number.parseFloat(candle[5]),
        timeframe,
      }))

      // Cache the data
      symbolData.set(timeframe, formattedData)
      symbolLastFetch.set(timeframe, Date.now())
      symbolFetchInProgress.set(timeframe, false)

      console.log(`Successfully fetched ${formattedData.length} candles for ${symbol} ${timeframe}`)
      return formattedData
    } catch (error) {
      console.error(`Error fetching market data for ${symbol} ${timeframe}:`, error)
      symbolFetchInProgress.set(timeframe, false)

      // If we have cached data, return it even if it's old
      if (symbolData.has(timeframe)) {
        console.log(`Using cached data for ${symbol} ${timeframe}`)
        return symbolData.get(timeframe) || []
      }

      // Fall back to mock data
      return this.generateMockMarketData(symbol, timeframe, limit || 50)
    }
  }

  // Convert our timeframe format to Binance interval format
  private convertTimeframeToInterval(timeframe: Timeframe): string {
    switch (timeframe) {
      case "1m":
        return "1m"
      case "5m":
        return "5m"
      case "15m":
        return "15m"
      case "30m":
        return "30m"
      case "1h":
        return "1h"
      case "4h":
        return "4h"
      case "1d":
        return "1d"
      case "1w":
        return "1w"
      default:
        return "1h"
    }
  }

  public async getHistoricalMarketData(
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date = new Date(),
  ): Promise<MarketData[]> {
    try {
      console.log(
        `Fetching historical ${timeframe} data for ${symbol} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      )

      // Convert dates to timestamps (milliseconds)
      const since = startDate.getTime()
      const until = endDate.getTime()

      // Format symbol for API
      const formattedSymbol = symbol.replace("/", "")
      const interval = this.convertTimeframeToInterval(timeframe)

      // Binance API has a limit of 1000 candles per request
      // We'll need to make multiple requests to get all the data
      let allCandles: MarketData[] = []
      let startTime = since

      while (startTime < until) {
        const url = `${BINANCE_PUBLIC_API}/klines?symbol=${formattedSymbol}&interval=${interval}&startTime=${startTime}&limit=1000`

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.length === 0) {
          break // No more data
        }

        // Transform to our MarketData format
        const formattedCandles: MarketData[] = data.map((candle: any) => ({
          symbol,
          timestamp: candle[0],
          open: Number.parseFloat(candle[1]),
          high: Number.parseFloat(candle[2]),
          low: Number.parseFloat(candle[3]),
          close: Number.parseFloat(candle[4]),
          volume: Number.parseFloat(candle[5]),
          timeframe,
        }))

        allCandles = [...allCandles, ...formattedCandles]

        // Update startTime for next request
        startTime = formattedCandles[formattedCandles.length - 1].timestamp + 1

        // If we got fewer than 1000 candles, we've reached the end
        if (data.length < 1000) {
          break
        }

        // Add a small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      console.log(`Successfully fetched ${allCandles.length} historical candles for ${symbol}`)

      // Filter out candles beyond the end date
      return allCandles.filter((candle) => candle.timestamp <= until)
    } catch (error) {
      console.error(`Error fetching historical market data for ${symbol}:`, error)
      return this.generateMockMarketData(symbol, timeframe, 500)
    }
  }

  // Get current ticker data for a symbol
  public async getTicker(symbol: string): Promise<{
    symbol: string
    last: number
    bid: number
    ask: number
    volume: number
    timestamp: number
    change24h: number
    changePercent24h: number
  }> {
    try {
      // Use public API instead of CCXT for browser compatibility
      const formattedSymbol = symbol.replace("/", "")
      const url = `${BINANCE_PUBLIC_API}/ticker/24hr?symbol=${formattedSymbol}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      return {
        symbol,
        last: Number.parseFloat(data.lastPrice),
        bid: Number.parseFloat(data.bidPrice),
        ask: Number.parseFloat(data.askPrice),
        volume: Number.parseFloat(data.volume),
        timestamp: Date.now(),
        change24h: Number.parseFloat(data.priceChange),
        changePercent24h: Number.parseFloat(data.priceChangePercent),
      }
    } catch (error) {
      console.error(`Error fetching ticker for ${symbol}:`, error)

      // Return mock data on error
      const mockPrice = symbol.startsWith("BTC")
        ? 60000
        : symbol.startsWith("ETH")
          ? 3000
          : symbol.startsWith("SOL")
            ? 120
            : symbol.startsWith("ADA")
              ? 0.5
              : symbol.startsWith("XRP")
                ? 0.6
                : 100

      return {
        symbol,
        last: mockPrice,
        bid: mockPrice * 0.999,
        ask: mockPrice * 1.001,
        volume: Math.random() * 1000000,
        timestamp: Date.now(),
        change24h: 0,
        changePercent24h: 0,
      }
    }
  }

  private generateMockMarketData(symbol: string, timeframe: Timeframe, count?: number): MarketData[] {
    // Ensure count has a default value if undefined
    const dataCount = count || 50
    console.log(`Generating ${dataCount} mock data points for ${symbol} (${timeframe})`)

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

    // Adjust volatility based on timeframe
    switch (timeframe) {
      case "1m":
        volatility *= 0.2
        break
      case "5m":
        volatility *= 0.4
        break
      case "15m":
        volatility *= 0.6
        break
      case "30m":
        volatility *= 0.8
        break
      case "4h":
        volatility *= 1.5
        break
      case "1d":
        volatility *= 2.5
        break
      case "1w":
        volatility *= 4
        break
    }

    const rawData = this.generateCustomCandlestickData(dataCount, basePrice, volatility, timeframe)

    const formattedData: MarketData[] = rawData.map((candle) => ({
      symbol,
      timestamp: new Date(candle.time).getTime(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: Math.random() * 1000000 * (basePrice / 100), // Scale volume by price
      timeframe,
    }))

    // Cache the mock data
    if (!this.marketData.has(symbol)) {
      this.marketData.set(symbol, new Map())
    }
    if (!this.lastFetchTime.has(symbol)) {
      this.lastFetchTime.set(symbol, new Map())
    }

    this.marketData.get(symbol)!.set(timeframe, formattedData)
    this.lastFetchTime.get(symbol)!.set(timeframe, Date.now())

    return formattedData
  }

  private generateCustomCandlestickData(count = 30, startPrice = 100, volatility = 1, timeframe: Timeframe = "1h") {
    const data = []
    let price = startPrice
    const now = new Date()

    // Determine candle interval in minutes based on timeframe
    let intervalMinutes = 60 // Default to 1h

    switch (timeframe) {
      case "1m":
        intervalMinutes = 1
        break
      case "5m":
        intervalMinutes = 5
        break
      case "15m":
        intervalMinutes = 15
        break
      case "30m":
        intervalMinutes = 30
        break
      case "1h":
        intervalMinutes = 60
        break
      case "4h":
        intervalMinutes = 240
        break
      case "1d":
        intervalMinutes = 1440
        break
      case "1w":
        intervalMinutes = 10080
        break
    }

    for (let i = 0; i < count; i++) {
      const time = new Date(now.getTime() - (count - i) * intervalMinutes * 60000)

      // Generate random price movements
      const change = (Math.random() - 0.5) * volatility * 3
      const open = price
      price = price + change
      const close = price

      // High is the max of open and close, plus a random amount
      const high = Math.max(open, close) + Math.random() * volatility * 0.5

      // Low is the min of open and close, minus a random amount
      const low = Math.min(open, close) - Math.random() * volatility * 0.5

      data.push({
        time: time.toISOString(),
        open,
        high,
        low,
        close,
      })
    }

    return data
  }

  public async updateMarketData(symbol: string, newCandle: MarketData): Promise<void> {
    const timeframe = newCandle.timeframe

    if (!this.marketData.has(symbol)) {
      this.marketData.set(symbol, new Map())
    }

    const symbolData = this.marketData.get(symbol)!

    if (!symbolData.has(timeframe)) {
      symbolData.set(timeframe, [newCandle])
      return
    }

    const data = symbolData.get(timeframe)!

    // If the timestamp is the same as the last candle, update it
    if (data.length > 0 && data[data.length - 1].timestamp === newCandle.timestamp) {
      data[data.length - 1] = newCandle
    } else {
      // Otherwise add it as a new candle
      data.push(newCandle)

      // Keep only the last 200 candles
      if (data.length > 200) {
        symbolData.set(timeframe, data.slice(-200))
      }
    }
  }

  public getCurrentSignal(symbol: string): TradingSignalResult | undefined {
    return this.currentSignals.get(symbol)
  }

  public getActiveStrategy(symbol: string): StrategyConfig | undefined {
    return this.activeStrategies.get(symbol)
  }

  public getMarketRegime(symbol: string): string | undefined {
    return this.marketRegimes.get(symbol)
  }

  public async refreshMarketData(symbol: string, timeframe: Timeframe): Promise<MarketData[]> {
    // Initialize maps if they don't exist
    if (!this.marketData.has(symbol)) {
      this.marketData.set(symbol, new Map())
    }
    if (!this.lastFetchTime.has(symbol)) {
      this.lastFetchTime.set(symbol, new Map())
    }

    // Clear cached data for this symbol and timeframe
    this.marketData.get(symbol)?.delete(timeframe)
    this.lastFetchTime.get(symbol)?.set(timeframe, 0)

    // Also clear multi-timeframe cache that might include this timeframe
    const cacheKey = `${symbol}-multi`
    this.multiTimeframeCache.delete(cacheKey)

    // Fetch fresh data
    return this.getMarketData(symbol, timeframe)
  }

  // Method to clear all caches - useful for testing or when changing exchanges
  public clearAllCaches(): void {
    this.marketData.clear()
    this.lastFetchTime.clear()
    this.fetchInProgress.clear()
    this.multiTimeframeCache.clear()

    console.log("All market data caches cleared")
  }

  // Position Management Methods

  /**
   * Execute a trading signal by creating a new position
   */
  public async executeSignal(
    symbol: string,
    signal: TradingSignalResult,
    strategy: StrategyConfig,
  ): Promise<Position | null> {
    if (signal.signal === "NEUTRAL") {
      return null
    }

    // Calculate position size based on risk
    const riskAmount = this.accountBalance * strategy.riskPerTrade
    const entryPrice = signal.entry || (await this.getCurrentPrice(symbol))
    const stopLoss = signal.stopLoss || this.calculateStopLoss(entryPrice, signal.signal, strategy)

    const riskPerUnit = Math.abs(entryPrice - stopLoss)
    const positionSize = riskAmount / riskPerUnit

    // Create position
    const position: Position = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      side: signal.signal === "LONG" ? "LONG" : "SHORT",
      entryPrice,
      quantity: positionSize,
      stopLoss,
      takeProfit: signal.takeProfit || this.calculateTakeProfit(entryPrice, stopLoss, strategy),
      timestamp: Date.now(),
      status: "OPEN",
      strategy: strategy.id,
    }

    // In a real implementation, execute order via exchange
    if (this.exchange) {
      try {
        // Uncomment this in a real implementation
        // await this.exchange.createOrder(symbol, 'market', position.side.toLowerCase(), position.quantity);
        console.log(`Executed ${position.side} order for ${symbol} at ${entryPrice}, quantity: ${positionSize}`)
      } catch (error) {
        console.error(`Failed to execute order: ${error}`)
        return null
      }
    } else {
      console.log(`Simulated ${position.side} order for ${symbol} at ${entryPrice}, quantity: ${positionSize}`)
    }

    // Add to positions
    this.positions.push(position)

    return position
  }

  /**
   * Get the current price for a symbol
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const ticker = await this.getTicker(symbol)
      return ticker.last
    } catch (error) {
      console.error(`Failed to get current price: ${error}`)

      // Fallback to last price from market data
      try {
        const data = await this.getMarketData(symbol, "1m")
        if (data.length > 0) {
          return data[data.length - 1].close
        }
      } catch (error) {
        console.error(`Failed to get market data for current price: ${error}`)
      }

      // If all else fails, return a default price based on symbol
      if (symbol.startsWith("BTC")) return 60000
      if (symbol.startsWith("ETH")) return 3000
      if (symbol.startsWith("SOL")) return 120
      if (symbol.startsWith("ADA")) return 0.5
      if (symbol.startsWith("XRP")) return 0.6

      return 100 // Default fallback
    }
  }

  /**
   * Calculate stop loss price based on strategy and signal
   */
  private calculateStopLoss(entryPrice: number, signal: TradeSignal, strategy: StrategyConfig): number {
    if (strategy.stopLossType === "atr") {
      // In a real implementation, calculate ATR-based stop loss
      // For now, use a simplified version (2% of entry price)
      const stopPercentage = 0.02

      if (signal === "LONG") {
        return entryPrice * (1 - stopPercentage)
      } else {
        return entryPrice * (1 + stopPercentage)
      }
    } else {
      // Percentage-based stop loss
      const stopPercentage = 0.02 // 2%

      if (signal === "LONG") {
        return entryPrice * (1 - stopPercentage)
      } else {
        return entryPrice * (1 + stopPercentage)
      }
    }
  }

  /**
   * Calculate take profit price based on strategy and risk:reward ratio
   */
  private calculateTakeProfit(entryPrice: number, stopLoss: number, strategy: StrategyConfig): number {
    const riskAmount = Math.abs(entryPrice - stopLoss)
    const rewardAmount = riskAmount * strategy.takeProfitRatio

    if (entryPrice > stopLoss) {
      // Long position
      return entryPrice + rewardAmount
    } else {
      // Short position
      return entryPrice - rewardAmount
    }
  }

  /**
   * Update positions based on new price data
   */
  public updatePositions(symbol: string, currentPrice: number): void {
    this.positions = this.positions.map((position) => {
      if (position.symbol !== symbol || position.status !== "OPEN") {
        return position
      }

      // Check if stop loss or take profit hit
      if (position.side === "LONG") {
        if (position.stopLoss !== null && currentPrice <= position.stopLoss) {
          return this.closePosition(position, currentPrice, "STOP_LOSS")
        }
        if (position.takeProfit !== null && currentPrice >= position.takeProfit) {
          return this.closePosition(position, currentPrice, "TAKE_PROFIT")
        }
      } else {
        // SHORT
        if (position.stopLoss !== null && currentPrice >= position.stopLoss) {
          return this.closePosition(position, currentPrice, "STOP_LOSS")
        }
        if (position.takeProfit !== null && currentPrice <= position.takeProfit) {
          return this.closePosition(position, currentPrice, "TAKE_PROFIT")
        }
      }

      return position
    })
  }

  // Add methods for loading and saving position history
  private loadPositionHistory(): void {
    this.positionHistory = this.storage.getItem<Position[]>("position-history", [])

    // Also load account balance if available
    const savedBalance = this.storage.getItem<number>("account-balance", this.accountBalance)
    this.accountBalance = savedBalance
  }

  private savePositionHistory(): void {
    this.storage.saveItem("position-history", this.positionHistory)
  }

  private saveAccountBalance(): void {
    this.storage.saveItem("account-balance", this.accountBalance)
  }

  // Update the closePosition method to save history
  private closePosition(
    position: Position,
    closePrice: number,
    reason: "STOP_LOSS" | "TAKE_PROFIT" | "MANUAL" | "SIGNAL_CHANGE",
  ): Position {
    const pnl =
      position.side === "LONG"
        ? (closePrice - position.entryPrice) * position.quantity
        : (position.entryPrice - closePrice) * position.quantity

    const pnlPercentage =
      position.side === "LONG"
        ? ((closePrice - position.entryPrice) / position.entryPrice) * 100
        : ((position.entryPrice - closePrice) / position.entryPrice) * 100

    const closedPosition = {
      ...position,
      status: "CLOSED" as const,
      closedAt: Date.now(),
      closedPrice: closePrice,
      pnl,
      pnlPercentage,
      closeReason: reason,
    }

    // Add to history
    this.positionHistory.push(closedPosition)

    // Save to storage
    this.savePositionHistory()

    return closedPosition
  }

  // Update updateAccountBalance to save changes
  public updateAccountBalance(newBalance: number): void {
    this.accountBalance = newBalance
    this.saveAccountBalance()
  }

  /**
   * Manually close a position
   */
  public async closePositionManually(positionId: string): Promise<Position | null> {
    const position = this.positions.find((p) => p.id === positionId && p.status === "OPEN")

    if (!position) {
      return null
    }

    const currentPrice = await this.getCurrentPrice(position.symbol)
    return this.closePosition(position, currentPrice, "MANUAL")
  }

  /**
   * Get all open positions
   */
  public getOpenPositions(): Position[] {
    return this.positions.filter((p) => p.status === "OPEN")
  }

  /**
   * Get position history
   */
  public getPositionHistory(): Position[] {
    return this.positionHistory
  }

  /**
   * Get open positions for a specific symbol
   */
  public getOpenPositionsForSymbol(symbol: string): Position[] {
    return this.positions.filter((p) => p.symbol === symbol && p.status === "OPEN")
  }

  /**
   * Check for signal changes and update positions accordingly
   */
  public async checkAndUpdatePositionsForSignalChanges(symbol: string, newSignal: TradingSignalResult): Promise<void> {
    const openPositions = this.getOpenPositionsForSymbol(symbol)

    // If no open positions, nothing to do
    if (openPositions.length === 0) {
      return
    }

    const currentPrice = await this.getCurrentPrice(symbol)

    // Check each position for this symbol
    for (const position of openPositions) {
      // If signal changed to opposite direction, close position
      if (
        (position.side === "LONG" && newSignal.signal === "SHORT") ||
        (position.side === "SHORT" && newSignal.signal === "LONG")
      ) {
        this.closePosition(position, currentPrice, "SIGNAL_CHANGE")
      }
    }
  }

  // Add a method to clear storage data
  public clearStorageData(): void {
    this.storage.removeItem("position-history")
    this.storage.removeItem("account-balance")
    this.positionHistory = []
    console.log("Trading agent storage data cleared")
  }

  /**
   * Get account balance
   */
  public getAccountBalance(): number {
    return this.accountBalance
  }

  // Add method to check if WebSocket is connected for a symbol
  public isWebSocketConnected(symbol: string): boolean {
    // If we have a WebSocket connection, check its state
    if (this.webSocketConnections.has(symbol)) {
      const ws = this.webSocketConnections.get(symbol)!
      return ws.readyState === WebSocket.OPEN
    }

    // If we're using polling as a fallback, consider it "connected"
    if (this.pollingIntervals && this.pollingIntervals.has(symbol)) {
      return true
    }

    return false
  }

  // Add method to get WebSocket connection status for all symbols
  public getWebSocketStatus(): Record<string, string> {
    const status: Record<string, string> = {}

    // Check WebSocket connections
    this.webSocketConnections.forEach((ws, symbol) => {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          status[symbol] = "connecting"
          break
        case WebSocket.OPEN:
          status[symbol] = "connected"
          break
        case WebSocket.CLOSING:
          status[symbol] = "closing"
          break
        case WebSocket.CLOSED:
          status[symbol] = "disconnected"
          break
        default:
          status[symbol] = "unknown"
      }
    })

    // Check polling fallbacks
    if (this.pollingIntervals) {
      this.pollingIntervals.forEach((_, symbol) => {
        if (!status[symbol]) {
          status[symbol] = "connected" // Consider polling as "connected"
        }
      })
    }

    return status
  }

  // Add method to check if exchange connection is working
  public async testExchangeConnection(): Promise<boolean> {
    try {
      // Try to fetch a simple ticker to test the connection
      const url = `${BINANCE_PUBLIC_API}/ping`
      const response = await fetch(url)
      return response.ok
    } catch (error) {
      console.error("Exchange connection test failed:", error)
      return false
    }
  }

  // Add method to get exchange info
  public getExchangeInfo(): { name: string; connected: boolean; apiKeyProvided: boolean } {
    return {
      name: "binance",
      connected: this.isWebSocketEnabled,
      apiKeyProvided: !!(this.exchange?.apiKey && this.exchange?.secret),
    }
  }

  // Add these methods to the TradingAgent class

  // Apply signal stability logic to prevent frequent signal changes
  private applySignalStabilityLogic(
    symbol: string,
    newSignal: TradingSignalResult,
    currentSignal: TradingSignalResult | undefined,
  ): TradingSignalResult {
    // If no current signal, return the new signal
    if (!currentSignal) {
      return newSignal
    }

    // If the new signal is the same as the current signal, update confidence and rationale
    if (newSignal.signal === currentSignal.signal) {
      return {
        ...newSignal,
        confidence: (newSignal.confidence + currentSignal.confidence) / 2, // Average confidence
      }
    }

    // If the new signal is different but has high confidence, allow the change
    if (newSignal.confidence >= this.signalConfidenceThreshold) {
      console.log(
        `Signal changed from ${currentSignal.signal} to ${newSignal.signal} with high confidence ${newSignal.confidence}`,
      )
      return newSignal
    }

    // Otherwise, keep the current signal but note the potential change in rationale
    return {
      ...currentSignal,
      rationale: `${currentSignal.rationale}\n\nAlternative view (${newSignal.confidence.toFixed(
        2,
      )} confidence): ${newSignal.rationale}`,
    }
  }

  // Check if we should throttle data refresh for a symbol and timeframe
  private shouldThrottleDataRefresh(symbol: string, timeframe: Timeframe): boolean {
    if (!this.dataRefreshThrottleTime.has(symbol)) {
      return false
    }

    const timeframeMap = this.dataRefreshThrottleTime.get(symbol)
    if (!timeframeMap || !timeframeMap.has(timeframe)) {
      return false
    }

    const lastRefreshTime = timeframeMap.get(timeframe) || 0
    const now = Date.now()

    // Throttle based on timeframe
    let throttlePeriod: number
    switch (timeframe) {
      case "1m":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "5m":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "15m":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "30m":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "1h":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "4h":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "1d":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      case "1w":
        throttlePeriod = 60 * 1000
        break // 60 seconds
      default:
        throttlePeriod = 60 * 1000 // 60 seconds default
    }

    return now - lastRefreshTime < throttlePeriod
  }

  // Update the data refresh throttle time for a symbol and timeframe
  private updateDataRefreshThrottle(symbol: string, timeframe: Timeframe): void {
    if (!this.dataRefreshThrottleTime.has(symbol)) {
      this.dataRefreshThrottleTime.set(symbol, new Map())
    }

    const timeframeMap = this.dataRefreshThrottleTime.get(symbol)!
    timeframeMap.set(timeframe, Date.now())
  }

  // Add a new method to handle fallback to polling
  private fallbackToPolling(symbol: string): void {
    console.log(`Falling back to polling for ${symbol} due to WebSocket issues`)

    // Remove the WebSocket connection
    this.webSocketConnections.delete(symbol)

    // Set up polling interval
    const pollInterval = setInterval(async () => {
      try {
        // Fetch latest data
        const data = await this.getMarketData(symbol, "1m", 1, true)

        if (data && data.length > 0) {
          // Notify callbacks with the latest data
          const callbacks = this.webSocketCallbacks.get(symbol) || []
          callbacks.forEach((callback) => callback(data[data.length - 1]))
        }
      } catch (error) {
        console.error(`Error polling data for ${symbol}:`, error)
      }
    }, 60000) // Poll every 60 seconds

    // Store the interval ID for cleanup
    this.pollingIntervals = this.pollingIntervals || new Map()
    this.pollingIntervals.set(symbol, pollInterval)
  }

  // 4. Add a new method to synchronize all data fetching and analysis cycles

  /**
   * Synchronize all data fetching and analysis to a consistent 60-second cycle
   * This ensures all components update at the same time for a coherent user experience
   */
  public synchronizeDataCycle(symbol: string, timeframe: Timeframe): void {
    // Clear any existing intervals
    if (this.pollingIntervals.has(symbol)) {
      clearInterval(this.pollingIntervals.get(symbol)!)
      this.pollingIntervals.delete(symbol)
    }

    // Set up a synchronized 60-second interval
    const syncInterval = setInterval(async () => {
      try {
        console.log(`Synchronized data cycle: Fetching data for ${symbol} (${timeframe})`)

        // Step 1: Fetch fresh market data
        const data = await this.refreshMarketData(symbol, timeframe)

        // Step 2: Update any WebSocket callbacks with the latest data
        if (data.length > 0) {
          const callbacks = this.webSocketCallbacks.get(symbol) || []
          callbacks.forEach((callback) => callback(data[data.length - 1]))
        }

        // Step 3: Reset throttle timers to allow immediate next cycle
        this.updateDataRefreshThrottle(symbol, timeframe)

        // Step 4: Log completion of cycle
        console.log(`Synchronized data cycle completed for ${symbol} (${timeframe})`)
      } catch (error) {
        console.error(`Error in synchronized data cycle for ${symbol}:`, error)
      }
    }, 60000) // Exactly 60 seconds

    // Store the interval for cleanup
    this.pollingIntervals.set(symbol, syncInterval)

    // Run immediately for the first time
    this.refreshMarketData(symbol, timeframe).catch((err) =>
      console.error(`Initial refresh failed for ${symbol} ${timeframe}:`, err),
    )
  }
}
