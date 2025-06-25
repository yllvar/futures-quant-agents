import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { provider, apiKey } = await request.json()

    // Determine base URL based on provider
    let baseURL: string
    let model: string

    switch (provider) {
      case "deepseek":
        baseURL = "https://api.deepseek.com/v1"
        model = "deepseek-ai/DeepSeek-V3-0324-fast"
        break
      case "nebius":
        baseURL = "https://router.huggingface.co/nebius/v1"
        model = "mistralai/Mistral-7B-Instruct-v0.2"
        break
      case "fireworks":
        baseURL = "https://router.huggingface.co/fireworks-ai/v1"
        model = "fireworks-ai/firefunction-v1"
        break
      case "together":
        baseURL = "https://router.huggingface.co/together/v1"
        model = "mistralai/Mixtral-8x7B-Instruct-v0.1"
        break
      case "groq":
        baseURL = "https://router.huggingface.co/groq/v1"
        model = "llama3-70b-8192"
        break
      default:
        baseURL = "https://router.huggingface.co/nebius/v1"
        model = "mistralai/Mistral-7B-Instruct-v0.2"
    }

    const startTime = Date.now()

    // Initialize the OpenAI client with the appropriate configuration
    // Add dangerouslyAllowBrowser: true since we're in a server environment (API route)
    const client = new OpenAI({
      apiKey,
      baseURL,
      dangerouslyAllowBrowser: true, // This is safe in API routes as they run on the server
    })

    // Make a simple test request
    await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: "Test connection",
        },
      ],
      max_tokens: 10,
    })

    const latency = Date.now() - startTime

    // Return success response
    return NextResponse.json({
      success: true,
      latency,
      provider,
    })
  } catch (error) {
    const latency =
      Date.now() -
      (request.headers.get("x-request-time") ? Number.parseInt(request.headers.get("x-request-time") || "0") : 0)

    return NextResponse.json({
      success: false,
      latency,
      provider: request.headers.get("x-provider") || "",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
