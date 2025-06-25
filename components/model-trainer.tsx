"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Save } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ModelConfig } from "@/lib/ml-service"
import type { MarketData } from "@/lib/types"

interface ModelTrainerProps {
  marketData: MarketData[]
  onTrainModel: (config: ModelConfig) => Promise<string>
}

export function ModelTrainer({ marketData, onTrainModel }: ModelTrainerProps) {
  const [modelName, setModelName] = useState("")
  const [modelType, setModelType] = useState<"classification" | "regression">("classification")
  const [labelType, setLabelType] = useState<"nextDirection" | "nextReturn" | "volatility">("nextDirection")
  const [labelHorizon, setLabelHorizon] = useState(5)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "close",
    "rsi",
    "macd",
    "bollingerWidth",
    "momentum5",
  ])
  const [isTraining, setIsTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const availableFeatures = [
    { id: "close", label: "Close Price" },
    { id: "open", label: "Open Price" },
    { id: "high", label: "High Price" },
    { id: "low", label: "Low Price" },
    { id: "volume", label: "Volume" },
    { id: "rsi", label: "RSI" },
    { id: "macd", label: "MACD" },
    { id: "bollingerWidth", label: "Bollinger Band Width" },
    { id: "atr", label: "ATR" },
    { id: "priceRange", label: "Price Range" },
    { id: "bodySize", label: "Candle Body Size" },
    { id: "upperShadow", label: "Upper Shadow" },
    { id: "lowerShadow", label: "Lower Shadow" },
    { id: "momentum5", label: "Momentum (5)" },
    { id: "momentum10", label: "Momentum (10)" },
    { id: "volatility", label: "Volatility" },
    { id: "volumeChange", label: "Volume Change" },
    { id: "volumeMA", label: "Volume MA" },
    { id: "sma20", label: "SMA (20)" },
    { id: "ema20", label: "EMA (20)" },
    { id: "trendStrength", label: "Trend Strength" },
  ]

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures((current) =>
      current.includes(featureId) ? current.filter((id) => id !== featureId) : [...current, featureId],
    )
  }

  const handleTrainModel = async () => {
    if (!modelName) {
      setError("Model name is required")
      return
    }

    if (selectedFeatures.length === 0) {
      setError("At least one feature must be selected")
      return
    }

    setIsTraining(true)
    setError(null)
    setSuccess(null)

    try {
      const config: ModelConfig = {
        id: `model-${Date.now()}`,
        name: modelName,
        type: modelType,
        features: selectedFeatures,
        labelType,
        labelHorizon,
        hyperparameters: {
          // Default hyperparameters
          learningRate: 0.01,
          epochs: 100,
          batchSize: 32,
          regularization: 0.001,
        },
      }

      const modelId = await onTrainModel(config)
      setSuccess(`Model "${modelName}" trained successfully with ID: ${modelId}`)
    } catch (err) {
      setError(`Error training model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Train ML Model</CardTitle>
        <CardDescription>Create and train a machine learning model using historical market data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="model-name">Model Name</Label>
          <Input
            id="model-name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="Enter model name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model-type">Model Type</Label>
            <Select value={modelType} onValueChange={(value) => setModelType(value as any)}>
              <SelectTrigger id="model-type">
                <SelectValue placeholder="Select model type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classification">Classification</SelectItem>
                <SelectItem value="regression">Regression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label-type">Prediction Target</Label>
            <Select value={labelType} onValueChange={(value) => setLabelType(value as any)}>
              <SelectTrigger id="label-type">
                <SelectValue placeholder="Select prediction target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nextDirection">Price Direction</SelectItem>
                <SelectItem value="nextReturn">Price Return</SelectItem>
                <SelectItem value="volatility">Volatility</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label-horizon">Prediction Horizon (Candles)</Label>
          <Input
            id="label-horizon"
            type="number"
            min={1}
            max={50}
            value={labelHorizon}
            onChange={(e) => setLabelHorizon(Number.parseInt(e.target.value) || 5)}
          />
        </div>

        <div className="space-y-2">
          <Label>Select Features</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availableFeatures.map((feature) => (
              <div key={feature.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`feature-${feature.id}`}
                  checked={selectedFeatures.includes(feature.id)}
                  onCheckedChange={() => toggleFeature(feature.id)}
                />
                <Label htmlFor={`feature-${feature.id}`} className="text-sm">
                  {feature.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleTrainModel} disabled={isTraining}>
          {isTraining ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Train Model
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
