"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LLMConnectionMonitor } from "@/components/llm-connection-monitor"
import { testIndicators } from "@/lib/indicator-test"
import type { TradingAgent } from "@/lib/trading-agent"
import type { StrategyConfig } from "@/lib/types"

interface TechnicalDetailsPanelProps {
  huggingFaceApiKey?: string
  deepSeekApiKey?: string
  tradingAgent?: TradingAgent
  currentSymbol?: string
  currentStrategy?: StrategyConfig | null
}

export function TechnicalDetailsPanel({
  huggingFaceApiKey = "",
  deepSeekApiKey = "",
  tradingAgent,
  currentSymbol = "SOL/USDT",
  currentStrategy = null,
}: TechnicalDetailsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [indicatorResults, setIndicatorResults] = useState<string>("")
  const [isCalculating, setIsCalculating] = useState(false)

  // Mock API keys - in a real app, these would come from environment variables
  const mockHuggingFaceApiKey = huggingFaceApiKey || "hf_xxxxxxxxxxxxxxxxxxxx"
  const mockDeepSeekApiKey = deepSeekApiKey || "sk-xxxxxxxxxxxxxxxxxxxx"

  const calculateIndicators = async () => {
    if (!tradingAgent || !currentStrategy) return

    setIsCalculating(true)
    try {
      const marketData = await tradingAgent.getMarketData(currentSymbol, "1h")
      const results = await testIndicators(marketData, currentStrategy)
      setIndicatorResults(results)
    } catch (error) {
      console.error("Error calculating indicators:", error)
      setIndicatorResults("Error calculating indicators. See console for details.")
    } finally {
      setIsCalculating(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Technical Details & Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connections">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="connections">API Status</TabsTrigger>
            <TabsTrigger value="llm-monitor">LLM Monitor</TabsTrigger>
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span>Binance CCXT</span>
                </div>
                <div className="text-xs text-muted-foreground">Rate: 120/1200</div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  <span>HuggingFace API</span>
                </div>
                <div className="text-xs text-muted-foreground">Rate: 8/60</div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </div>
                  <span>DeepSeek API</span>
                </div>
                <div className="text-xs text-muted-foreground">Rate: 2/60</div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </div>
                  <span>WebSocket Feed</span>
                </div>
                <div className="text-xs text-muted-foreground">Disconnected</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Rate Limits</h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Binance API</span>
                    <span>120/1200</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "10%" }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>HuggingFace API</span>
                    <span>8/60</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "13%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="llm-monitor">
            <LLMConnectionMonitor
              huggingFaceApiKey={mockHuggingFaceApiKey}
              deepSeekApiKey={mockDeepSeekApiKey}
              autoRefresh={true}
              refreshInterval={30000}
            />
          </TabsContent>

          <TabsContent value="indicators">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Technical Indicators</h3>
                <Button
                  size="sm"
                  onClick={calculateIndicators}
                  disabled={isCalculating || !tradingAgent || !currentStrategy}
                >
                  {isCalculating ? "Calculating..." : "Calculate"}
                </Button>
              </div>

              {indicatorResults ? (
                <pre className="p-3 bg-muted rounded-md text-xs overflow-auto whitespace-pre-wrap">
                  {indicatorResults}
                </pre>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Click "Calculate" to compute technical indicators for the current symbol and strategy.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
