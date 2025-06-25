export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w"

export type MarketRegime = "TRENDING" | "RANGING" | "VOLATILE"

export interface MarketData {
  symbol: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  timeframe: Timeframe
}

export interface CandlestickData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type TradeSignal = "LONG" | "SHORT" | "NEUTRAL"

export interface TradingSignalResult {
  signal: TradeSignal
  confidence: number
  rationale: string
  risk_notes?: string
  entry?: number
  stopLoss?: number
  takeProfit?: number
  provider?: string
  symbol?: string
  timestamp?: number
}

export interface StrategyConfig {
  id: string
  name: string
  style: "TREND" | "MEAN_REVERSION" | "BREAKOUT"
  riskPerTrade: number
  takeProfitRatio: number
  stopLossType: "atr" | "percentage"
  indicators: {
    primary: string[]
    confirmation: string[]
  }
  suitableRegimes: MarketRegime[]
  backTestResult?: {
    winRate: number
    expectancy: number
    trades: number
    avgWin: number
    avgLoss: number
  }
  type?: string
}

export interface Position {
  id: string
  symbol: string
  side: "LONG" | "SHORT"
  entryPrice: number
  quantity: number
  stopLoss: number | null
  takeProfit: number | null
  timestamp: number
  status: "OPEN" | "CLOSED"
  closedAt?: number
  closedPrice?: number
  pnl?: number
  pnlPercentage?: number
  strategy: string
  closeReason?: "STOP_LOSS" | "TAKE_PROFIT" | "MANUAL" | "SIGNAL_CHANGE"
}

export interface BacktestResult {
  initialCapital: number
  finalCapital: number
  totalPnL: number
  totalPnLPercentage: number
  trades: Trade[]
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
  equity: number[]
  drawdowns: number[]
  strategyId: string
  strategyName: string
  startTime: number
  endTime: number
  symbol: string
  timeframe: Timeframe
}

export interface Trade {
  entryTime: number
  entryPrice: number
  exitTime: number
  exitPrice: number
  type: "long" | "short"
  pnl: number
  pnlPercentage: number
  exitReason: string
}

export interface BacktestSettings {
  initialCapital: number
  startDate: Date
  endDate: Date
  symbol: string
  timeframe: Timeframe
  strategyId: string
}
