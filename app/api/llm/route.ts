import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Define the request body type
interface AnalysisRequest {
  provider: string
  marketContext: string
  currentSignal: string
  currentRationale: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { provider, marketContext, currentSignal, currentRationale } = (await request.json()) as AnalysisRequest

    // Get API keys from environment variables (secure)
    const huggingFaceApiKey = process.env.HF_API_KEY
    const deepSeekApiKey = process.env.DEEPSEEK_API_KEY

    // Determine which API key to use based on provider
    let apiKey: string
    let baseURL: string
    let model: string

    switch (provider) {
      case "deepseek":
        apiKey = deepSeekApiKey || ""
        baseURL = "https://api.deepseek.com/v1"
        model = "deepseek-ai/DeepSeek-V3-0324-fast"
        break
      case "nebius":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/nebius/v1"
        model = "mistralai/Mistral-7B-Instruct-v0.2"
        break
      case "fireworks":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/fireworks-ai/v1"
        model = "fireworks-ai/firefunction-v1"
        break
      case "together":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/together/v1"
        model = "mistralai/Mixtral-8x7B-Instruct-v0.1"
        break
      case "groq":
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/groq/v1"
        model = "llama3-70b-8192"
        break
      default:
        apiKey = huggingFaceApiKey || ""
        baseURL = "https://router.huggingface.co/nebius/v1"
        model = "mistralai/Mistral-7B-Instruct-v0.2"
    }

    // Initialize the OpenAI client with the appropriate configuration
    const client = new OpenAI({
      apiKey,
      baseURL,
    })

    // Make the API call securely from the server
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a SOL/USDT trading analyst. Review the market conditions and proposed trade signal.
          Respond with JSON containing:
          - "signal": "LONG", "SHORT", or "NEUTRAL"
          - "confidence": 0.0 to 1.0
          - "reason": Brief explanation`,
        },
        {
          role: "user",
          content: `Market Context: ${marketContext}
          Proposed Signal: ${currentSignal}
          Proposed Reason: ${currentRationale}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
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
      }
    }

    // Return the response
    return NextResponse.json({
      signal: aiResponse.signal || "NEUTRAL",
      confidence: Number.parseFloat(aiResponse.confidence) || 0.5,
      rationale: aiResponse.reason || "No AI rationale provided",
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
