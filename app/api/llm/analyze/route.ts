import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Define the request body type
interface AnalysisRequest {
  provider: string
  marketContext: string
  currentSignal: string
  currentRationale: string
  requestChainOfThought?: boolean
  model?: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { provider, marketContext, currentSignal, currentRationale, requestChainOfThought, model } =
      (await request.json()) as AnalysisRequest

    // Get API keys from environment variables (secure)
    const huggingFaceApiKey = process.env.HF_API_KEY
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY

    // Determine which API key to use based on provider
    let apiKey: string
    let baseURL: string
    let modelToUse: string

    switch (provider) {
      case "deepseek":
        apiKey = deepSeekApiKey || ""
        baseURL = "https://api.deepseek.com/v1"
        modelToUse = model || "deepseek-ai/DeepSeek-V3-0324-fast"
        break
      case "nebius":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/nebius/v1"
        modelToUse = model || "mistralai/Mistral-7B-Instruct-v0.2"
        break
      case "fireworks":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/fireworks-ai/v1"
        modelToUse = model || "fireworks-ai/firefunction-v1"
        break
      case "together":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/together/v1"
        modelToUse = model || "mistralai/Mixtral-8x7B-Instruct-v0.1"
        break
      case "groq":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/groq/v1"
        modelToUse = model || "llama3-70b-8192"
        break
      default:
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/nebius/v1"
        modelToUse = model || "mistralai/Mistral-7B-Instruct-v0.2"
    }

    // Initialize the OpenAI client with the appropriate configuration
    // Add dangerouslyAllowBrowser: true since we're in a server environment (API route)
    const client = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true, // This is safe in API routes as they run on the server
    })

    // Create system prompt based on whether chain-of-thought is requested
    const systemPrompt = requestChainOfThought
      ? `You are a SOL/USDT trading analyst. Review the market conditions and proposed trade signal.
         First, think step-by-step about the analysis:
         1. Analyze price action and trends
         2. Evaluate technical indicators
         3. Consider market regime
         4. Check multi-timeframe alignment
         5. Weigh risk factors
         6. Make a final decision
         
         Respond with JSON containing:
         - "signal": "LONG", "SHORT", or "NEUTRAL"
         - "confidence": 0.0 to 1.0
         - "reason": Brief explanation
         - "chainOfThought": Your detailed step-by-step reasoning`
      : `You are a SOL/USDT trading analyst. Review the market conditions and proposed trade signal.
         Respond with JSON containing:
         - "signal": "LONG", "SHORT", or "NEUTRAL"
         - "confidence": 0.0 to 1.0
         - "reason": Brief explanation`

    // Make the API call securely from the server
    const response = await client.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Market Context: ${marketContext}
          Proposed Signal: ${currentSignal}
          Proposed Reason: ${currentRationale}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: requestChainOfThought ? 1000 : 200, // Increase token limit for chain-of-thought
    })

    const content = response.choices[0].message.content
    let aiResponse

    try {
      aiResponse = JSON.parse(content || "{}")
    } catch (parseError) {
      console.warn("Failed to parse JSON response:", parseError)
      aiResponse = {
        signal: "NEUTRAL",
        confidence: 0.5,
        reason: "Failed to parse response: " + (content?.substring(0, 100) || "No content") + "...",
        chainOfThought: requestChainOfThought ? "Failed to parse chain-of-thought reasoning." : undefined,
      }
    }

    // Return the response
    return NextResponse.json({
      signal: aiResponse.signal || "NEUTRAL",
      confidence: Number.parseFloat(aiResponse.confidence) || 0.5,
      rationale: aiResponse.reason || "No AI rationale provided",
      chainOfThought: aiResponse.chainOfThought,
      provider,
    })
  } catch (error) {
    console.error("Error in LLM API route:", error)
    return NextResponse.json(
      { error: "Failed to process request", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
