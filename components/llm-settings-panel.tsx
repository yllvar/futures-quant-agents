// Update the LLMSettingsPanel component to properly handle the mock implementation toggle

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { LLMConnectionMonitor } from "@/components/llm-connection-monitor"
import { AlertCircle, Save, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface LLMSettingsPanelProps {
  huggingFaceApiKey: string
  deepSeekApiKey: string
  onSaveKeys: (hfKey: string, dsKey: string) => void
  onModelChange: (provider: string, model: string) => void
  onTestConnection: () => Promise<void>
  onToggleMockImplementation?: (useMock: boolean) => void
  useMockImplementation?: boolean
}

export function LLMSettingsPanel({
  huggingFaceApiKey,
  deepSeekApiKey,
  onSaveKeys,
  onModelChange,
  onTestConnection,
  onToggleMockImplementation,
  useMockImplementation = false,
}: LLMSettingsPanelProps) {
  const [hfKey, setHfKey] = useState(huggingFaceApiKey)
  const [dsKey, setDsKey] = useState(deepSeekApiKey)
  const [selectedProvider, setSelectedProvider] = useState("fireworks-ai")
  const [selectedModel, setSelectedModel] = useState("mistralai/Mistral-7B-Instruct-v0.2")
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useMock, setUseMock] = useState(useMockImplementation)

  const handleSaveKeys = () => {
    onSaveKeys(hfKey, dsKey)
  }

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    onModelChange(provider, selectedModel)
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    onModelChange(selectedProvider, model)
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setError(null)
    try {
      await onTestConnection()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsTesting(false)
    }
  }

  const handleToggleMock = (checked: boolean) => {
    setUseMock(checked)
    if (onToggleMockImplementation) {
      onToggleMockImplementation(checked)
    }

    // Save preference to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("trading-dashboard-use-mock-llm", checked ? "true" : "false")
    }
  }

  // Load mock implementation preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMockPref = localStorage.getItem("trading-dashboard-use-mock-llm")
      if (savedMockPref !== null) {
        const useMock = savedMockPref === "true"
        setUseMock(useMock)
        if (onToggleMockImplementation) {
          onToggleMockImplementation(useMock)
        }
      }
    }
  }, [onToggleMockImplementation])

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Settings</CardTitle>
        <CardDescription>Configure the language models used for trading analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hf-api-key">HuggingFace API Key</Label>
            <Input
              id="hf-api-key"
              type="password"
              value={hfKey}
              onChange={(e) => setHfKey(e.target.value)}
              placeholder="hf_..."
              disabled={useMock}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ds-api-key">DeepSeek API Key</Label>
            <Input
              id="ds-api-key"
              type="password"
              value={dsKey}
              onChange={(e) => setDsKey(e.target.value)}
              placeholder="sk-..."
              disabled={useMock}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Primary Provider</Label>
            <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={useMock}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nebius">Nebius (HuggingFace)</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="fireworks">Fireworks AI</SelectItem>
                <SelectItem value="together">Together AI</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={selectedModel} onValueChange={handleModelChange} disabled={useMock}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {selectedProvider === "deepseek" ? (
                  <>
                    <SelectItem value="deepseek-ai/DeepSeek-V3-0324-fast">DeepSeek V3 Fast</SelectItem>
                    <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                  </>
                ) : selectedProvider === "nebius" ? (
                  <>
                    <SelectItem value="mistralai/Mistral-7B-Instruct-v0.2">Mistral 7B Instruct</SelectItem>
                    <SelectItem value="meta/llama-2-70b-chat">Llama 2 70B Chat</SelectItem>
                    <SelectItem value="google/gemma-7b-it">Gemma 7B Instruct</SelectItem>
                    <SelectItem value="microsoft/phi-2">Phi-2</SelectItem>
                  </>
                ) : selectedProvider === "fireworks" ? (
                  <>
                    <SelectItem value="fireworks-ai/firefunction-v1">FireFunction V1</SelectItem>
                    <SelectItem value="fireworks-ai/mixtral-8x7b-instruct">Mixtral 8x7B Instruct</SelectItem>
                  </>
                ) : selectedProvider === "together" ? (
                  <>
                    <SelectItem value="mistralai/Mixtral-8x7B-Instruct-v0.1">Mixtral 8x7B Instruct</SelectItem>
                    <SelectItem value="meta/llama-2-70b-chat">Llama 2 70B Chat</SelectItem>
                  </>
                ) : selectedProvider === "groq" ? (
                  <>
                    <SelectItem value="llama3-70b-8192">Llama 3 70B</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                  </>
                ) : (
                  <SelectItem value="mistralai/Mistral-7B-Instruct-v0.2">Mistral 7B Instruct</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="use-mock" checked={useMock} onCheckedChange={handleToggleMock} />
            <Label htmlFor="use-mock" className="font-medium">
              Use mock implementation (for testing)
            </Label>
          </div>

          {useMock && (
            <Alert>
              <AlertDescription>
                Using mock implementation. No API keys required. This will generate simulated trading signals for
                testing purposes. <strong>Note: Real LLM integration requires additional server configuration.</strong>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-4">
          <LLMConnectionMonitor
            huggingFaceApiKey={useMock ? "mock_key" : hfKey}
            deepSeekApiKey={useMock ? "mock_key" : dsKey}
            autoRefresh={false}
            useMockImplementation={useMock}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handleTestConnection} disabled={isTesting || (useMock && !error)}>
          {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Test Connection
        </Button>
        <Button onClick={handleSaveKeys} disabled={useMock}>
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  )
}
