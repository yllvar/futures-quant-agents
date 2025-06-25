import { SignalValidationService } from "./signal-validation-service"

// Add this property to the TradingAgent class
private
signalValidationService: SignalValidationService = new SignalValidationService()

/**
 * Execute a trading signal by creating a new position
 */
public
async
executeSignal(
  symbol: string,
  signal: any, // TradingSignalResult,
  strategy: any, // StrategyConfig,
  marketData: MarketData[],
  marketRegime: string
)
: Promise<
{
  position: Position | null, validationResult
  : any
}
>
{
  if (signal.signal === "NEUTRAL") {
    return { position: null, validationResult: null }
  }

  // Validate the signal before execution
  const validationResult = this.signalValidationService.validateSignal(signal, strategy, marketData, marketRegime)

  // If signal doesn't pass validation, don't execute
  if (!validationResult.isValid) {
    console.log(`Signal validation failed for ${symbol}: ${validationResult.reasons.join(", ")}`)
    return { position: null, validationResult }
  }

  // Signal passed validation, proceed with execution
  console.log(`Signal validation passed for ${symbol} with score ${validationResult.score.toFixed(2)}`)

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
      return { position: null, validationResult }
    }
  } else {
    console.log(`Simulated ${position.side} order for ${symbol} at ${entryPrice}, quantity: ${positionSize}`)
  }

  // Add to positions
  this.positions.push(position)

  return { position, validationResult }
}
