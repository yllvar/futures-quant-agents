"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpCircle, ArrowDownCircle, CircleDot, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { ConfidenceMeter } from "@/components/confidence-meter"
import { ChainOfThoughtDisplay } from "@/components/chain-of-thought-display"
import type { TradingSignalResult, StrategyConfig } from "@/lib/core/types"
import { Progress } from "@/components/ui/progress"

interface TradingSignalProps {
  signal: TradingSignalResult | null
  strategy: StrategyConfig | null
  symbol: string
  isLoading?: boolean
  timeUntilUpdate?: number
  validationResult?: {
    isValid: boolean
    reasons: string[]
    score: number
  } | null
}

export function TradingSignal({
  signal,
  strategy,
  symbol,
  isLoading = false,
  timeUntilUpdate = 0,
  validationResult = null,
}: TradingSignalProps) {
  const [timestamp, setTimestamp] = useState(new Date())

  // Update timestamp when signal changes
  useEffect(() => {
    if (signal) {
      setTimestamp(new Date())
    }
  }, [signal])

  // Render loading state
  const renderLoadingState = () => {
    if (!isLoading) return null

    return (
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mt-2 text-sm">Generating trading signal...</span>
        </div>
      </div>
    )
  }

  // Generate a mock validation result if none is provided
  const displayValidation =
    validationResult ||
    (signal && signal.signal !== "NEUTRAL"
      ? {
          isValid: signal.confidence > 0.75,
          score: signal.confidence,
          reasons:
            signal.confidence <= 0.75
              ? [
                  "Signal confidence below threshold (75%)",
                  "Insufficient volume confirmation",
                  "Needs additional technical confirmation",
                ]
              : [],
        }
      : null)

  return (
    <Card className="h-full relative">
      {renderLoadingState()}
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">Trading Signal & Analysis</CardTitle>
          {strategy && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              {strategy.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center mb-4">
          {signal?.signal === "LONG" && (
            <Badge className="px-4 py-1.5 text-lg font-semibold bg-emerald-500 hover:bg-emerald-600">
              <ArrowUpCircle size={20} className="mr-2" />
              LONG
            </Badge>
          )}
          {signal?.signal === "SHORT" && (
            <Badge className="px-4 py-1.5 text-lg font-semibold bg-red-500 hover:bg-red-600">
              <ArrowDownCircle size={20} className="mr-2" />
              SHORT
            </Badge>
          )}
          {(!signal?.signal || signal?.signal === "NEUTRAL") && (
            <Badge className="px-4 py-1.5 text-lg font-semibold bg-amber-500 hover:bg-amber-600">
              <CircleDot size={20} className="mr-2" />
              NEUTRAL
            </Badge>
          )}
        </div>

        <div className="flex justify-center mb-2">
          <ConfidenceMeter value={signal?.confidence ? Math.round(signal.confidence * 100) : 65} />
        </div>

        {displayValidation && signal?.signal !== "NEUTRAL" && (
          <div
            className={`p-3 rounded-md border ${
              displayValidation.isValid
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Signal Validation</span>
              <Badge
                variant={displayValidation.isValid ? "default" : "outline"}
                className={displayValidation.isValid ? "bg-emerald-500" : "text-amber-500 border-amber-500"}
              >
                {displayValidation.isValid ? (
                  <>
                    <CheckCircle size={14} className="mr-1" /> VALID
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="mr-1" /> INVALID
                  </>
                )}
              </Badge>
            </div>

            <div className="text-xs">
              <div className="flex justify-between mb-1">
                <span>Validation Score:</span>
                <span className="font-mono">{(displayValidation.score * 100).toFixed(0)}%</span>
              </div>

              <div className="w-full h-1.5 mb-2">
                <Progress
                  value={displayValidation.score * 100}
                  className="h-1.5"
                  indicatorClassName={displayValidation.isValid ? "bg-emerald-500" : "bg-amber-500"}
                />
              </div>

              {displayValidation.reasons.length > 0 && (
                <div className="mt-2">
                  <span className="block mb-1">Validation Issues:</span>
                  <ul className="list-disc pl-4 space-y-1">
                    {displayValidation.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Signal Rationale</h3>
          {isLoading ? (
            <div className="h-16 bg-muted animate-pulse rounded"></div>
          ) : (
            <p className="text-sm">{signal?.rationale || "No signal rationale available"}</p>
          )}
        </div>

        {signal?.risk_notes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Risk Notes</h3>
            <p className="text-sm">{signal.risk_notes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Timestamp</h3>
            <p className="text-sm font-mono">{timestamp.toLocaleTimeString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Symbol</h3>
            <p className="text-sm font-mono">{symbol}</p>
          </div>
        </div>

        {signal?.entry && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Entry</h3>
              <p className="text-sm font-mono">${signal.entry.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Stop Loss</h3>
              <p className="text-sm font-mono">${signal.stopLoss?.toFixed(2) || "N/A"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Take Profit</h3>
              <p className="text-sm font-mono">${signal.takeProfit?.toFixed(2) || "N/A"}</p>
            </div>
          </div>
        )}

        {timeUntilUpdate > 0 && (
          <div className="text-xs text-right text-muted-foreground">Next update in: {timeUntilUpdate}s</div>
        )}

        {/* Add Chain-of-Thought Display with proper prop name */}
        {signal?.chainOfThought && (
          <ChainOfThoughtDisplay chainOfThought={signal.chainOfThought} isLoading={isLoading} />
        )}
      </CardContent>
    </Card>
  )
}
