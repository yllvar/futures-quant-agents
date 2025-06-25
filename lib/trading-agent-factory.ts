import { TradingAgent } from "./trading-agent"
import { EnhancedTradingAgent } from "./trading-agent-extension"
import { BacktestingEngine } from "./backtesting-engine"

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
