// LLM Connection Status Types
export type ConnectionStatus = "connected" | "disconnected" | "error" | "standby"

// Provider configuration
export interface ProviderConfig {
  baseURL: string
  defaultModel: string
  supportedModels: string[]
}

// Map of providers to their configurations
export const PROVIDERS: Record<string, ProviderConfig> = {
  nebius: {
    baseURL: "https://router.huggingface.co/nebius/v1",
    defaultModel: "mistralai/Mistral-7B-Instruct-v0.2",
    supportedModels: [
      "mistralai/Mistral-7B-Instruct-v0.2",
      "meta/llama-2-70b-chat",
      "google/gemma-7b-it",
      "microsoft/phi-2",
    ],
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3-0324-fast",
    supportedModels: ["deepseek-ai/DeepSeek-V3-0324-fast", "deepseek-chat"],
  },
  fireworks: {
    baseURL: "https://router.huggingface.co/fireworks-ai/v1",
    defaultModel: "fireworks-ai/firefunction-v1",
    supportedModels: ["fireworks-ai/firefunction-v1", "fireworks-ai/mixtral-8x7b-instruct"],
  },
  together: {
    baseURL: "https://router.huggingface.co/together/v1",
    defaultModel: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    supportedModels: ["mistralai/Mixtral-8x7B-Instruct-v0.1", "meta/llama-2-70b-chat"],
  },
  groq: {
    baseURL: "https://router.huggingface.co/groq/v1",
    defaultModel: "llama3-70b-8192",
    supportedModels: ["llama3-70b-8192", "mixtral-8x7b-32768"],
  },
}

// Update the LLMConnectionState type to include all providers
export interface LLMConnectionState {
  huggingface: {
    status: ConnectionStatus
    provider: string
    lastChecked: Date | null
    latency: number | null
    errorMessage: string | null
    requestCount: number
    successCount: number
  }
  deepseek: {
    status: ConnectionStatus
    lastChecked: Date | null
    latency: number | null
    errorMessage: string | null
    requestCount: number
    successCount: number
  }
}

// Update the initialConnectionState to include provider information
export const initialConnectionState: LLMConnectionState = {
  huggingface: {
    status: "disconnected",
    provider: "nebius",
    lastChecked: null,
    latency: null,
    errorMessage: null,
    requestCount: 0,
    successCount: 0,
  },
  deepseek: {
    status: "disconnected",
    lastChecked: null,
    latency: null,
    errorMessage: null,
    requestCount: 0,
    successCount: 0,
  },
}

// Create mock LLM implementation
export function createMockLLMImplementation() {
  return {
    generateAnalysis: async (marketContext: string, currentSignal: string, currentRationale: string) => {
      console.log("Using mock LLM implementation")

      // Simulate API latency
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Generate a mock response based on the current signal
      // This provides realistic-looking output without requiring API access
      const signals = ["LONG", "SHORT", "NEUTRAL"]
      const randomSignal = signals[Math.floor(Math.random() * signals.length)]
      const confidence = 0.65 + Math.random() * 0.3 // Between 0.65 and 0.95

      // Generate mock chain-of-thought reasoning
      const chainOfThought = `
Step 1: Analyzing price action
- Current price: $120.45
- 24h change: +2.3%
- Price is above SMA20 (118.20) and SMA50 (115.80)

Step 2: Evaluating technical indicators
- RSI: 62 (moderately bullish, not overbought)
- MACD: Positive and above signal line (bullish)
- Volume: 20% above average (confirming price movement)

Step 3: Considering market regime
- Current regime: TRENDING
- Volatility: Moderate (2.1%)
- Trend strength: Strong (ADX: 28)

Step 4: Checking multi-timeframe alignment
- 1h: Bullish (price above key MAs)
- 4h: Bullish (recent breakout)
- 1d: Neutral (consolidating)

Step 5: Weighing risk factors
- Support at $118.00 (2% below current price)
- Resistance at $125.00 (3.8% above current price)
- Risk-reward ratio: 1.9 (favorable)

Step 6: Making final decision
- Technical indicators are bullish
- Price action confirms uptrend
- Multi-timeframe analysis mostly aligned
- Risk-reward ratio is favorable
- Confidence: ${confidence.toFixed(2)} (moderate to high)
      `

      return {
        signal: randomSignal,
        confidence,
        rationale: `Mock analysis based on market conditions. The ${randomSignal} signal is generated with ${(confidence * 100).toFixed(1)}% confidence based on simulated technical indicators and market sentiment.`,
        chainOfThought,
        provider: "mock-provider",
      }
    },

    testConnection: async () => {
      // Simulate API latency
      await new Promise((resolve) => setTimeout(resolve, 300))

      return {
        success: true,
        latency: 300,
        provider: "mock-provider",
      }
    },
  }
}

// Test connection to a provider using the server API route
export async function testProviderConnection(
  provider: string,
  apiKey: string,
  model?: string,
  useMockImplementation = false,
): Promise<{ success: boolean; latency: number; provider: string; error?: string }> {
  // If mock implementation is enabled, return success
  if (useMockImplementation) {
    const mockImpl = createMockLLMImplementation()
    return mockImpl.testConnection()
  }

  const startTime = Date.now()

  try {
    // Call the server API route instead of directly calling the LLM API
    const response = await fetch("/api/llm/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-time": startTime.toString(),
        "x-provider": provider,
      },
      body: JSON.stringify({
        provider,
        apiKey,
        model: model || PROVIDERS[provider]?.defaultModel,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      success: false,
      latency,
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Test HuggingFace connection with provider fallback
export async function testHuggingFaceConnection(
  apiKey: string,
  provider = "nebius",
): Promise<{ success: boolean; latency: number; provider: string; error?: string }> {
  return testProviderConnection(provider, apiKey)
}

// Test Deep Seek connection
export async function testDeepSeekConnection(
  apiKey: string,
): Promise<{ success: boolean; latency: number; error?: string }> {
  const result = await testProviderConnection("deepseek", apiKey)
  return {
    success: result.success,
    latency: result.latency,
    error: result.error,
  }
}

// Update the generateAnalysisWithProvider function to request chain-of-thought reasoning
export async function generateAnalysisWithProvider(
  provider: string,
  apiKey: string,
  marketContext: string,
  currentSignal: string,
  currentRationale: string,
  requestChainOfThought = false, // Add this parameter
  model?: string,
): Promise<{ signal: string; confidence: number; rationale: string; chainOfThought?: string; provider: string }> {
  try {
    // Call the server API route instead of directly calling the LLM API
    const response = await fetch("/api/llm/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider,
        marketContext,
        currentSignal,
        currentRationale,
        requestChainOfThought, // Include this in the request
        model: model || PROVIDERS[provider]?.defaultModel,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Analysis failed with provider ${provider}:`, error)
    throw error
  }
}

// Update the other functions to pass the requestChainOfThought parameter
export async function generateHuggingFaceAnalysis(
  apiKey: string,
  marketContext: string,
  currentSignal: string,
  currentRationale: string,
  requestChainOfThought = false,
  provider = "nebius",
  model?: string,
): Promise<{ signal: string; confidence: number; rationale: string; chainOfThought?: string; provider: string }> {
  return generateAnalysisWithProvider(
    provider,
    apiKey,
    marketContext,
    currentSignal,
    currentRationale,
    requestChainOfThought,
    model,
  )
}

export async function generateDeepSeekAnalysis(
  apiKey: string,
  marketContext: string,
  currentSignal: string,
  currentRationale: string,
  requestChainOfThought = false,
): Promise<{ signal: string; confidence: number; rationale: string; chainOfThought?: string }> {
  const result = await generateAnalysisWithProvider(
    "deepseek",
    apiKey,
    marketContext,
    currentSignal,
    currentRationale,
    requestChainOfThought,
  )
  return {
    signal: result.signal,
    confidence: result.confidence,
    rationale: result.rationale,
    chainOfThought: result.chainOfThought,
  }
}

export async function generateHuggingFaceAnalysisWithFallback(
  apiKey: string,
  marketContext: string,
  currentSignal: string,
  currentRationale: string,
  requestChainOfThought = false,
): Promise<{
  signal: string
  confidence: number
  rationale: string
  chainOfThought?: string
  provider: string
}> {
  // Try with known working providers first
  const priorityProviders = ["nebius", "together", "fireworks", "groq"]

  for (const provider of priorityProviders) {
    try {
      console.log(`Attempting analysis with provider ${provider}`)
      const result = await generateAnalysisWithProvider(
        provider,
        apiKey,
        marketContext,
        currentSignal,
        currentRationale,
        requestChainOfThought,
      )
      console.log(`Successfully generated analysis with provider ${provider}`)
      return result
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error)
    }
  }

  throw new Error("All providers failed")
}

// Test all providers and return the first successful one
export async function testAllHuggingFaceProviders(
  apiKey: string,
): Promise<{ success: boolean; latency: number; provider: string; error?: string }> {
  const priorityProviders = ["nebius", "together", "fireworks", "groq"]

  for (const provider of priorityProviders) {
    try {
      console.log(`Testing provider ${provider}`)
      const result = await testProviderConnection(provider, apiKey)
      if (result.success) {
        console.log(`Provider ${provider} test successful`)
        return result // Return first successful provider
      }
    } catch (error) {
      console.error(`Provider ${provider} test failed:`, error)
      // Continue to next provider
    }
  }

  return {
    success: false,
    latency: 0,
    provider: "",
    error: "All providers failed",
  }
}
