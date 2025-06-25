"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, BarChart, LineChart, PieChart, Trash2 } from "lucide-react"
import { ApexChart } from "@/components/ui/apex-chart"
import { ModelTrainer } from "@/components/model-trainer"
import type { ModelConfig, ModelEvaluation } from "@/lib/ml-service"
import type { MarketData } from "@/lib/types"
import type { MLService } from "@/lib/ml-service"

interface ModelEvaluationDashboardProps {
  marketData: MarketData[]
  mlService: MLService
}

export function ModelEvaluationDashboard({ marketData, mlService }: ModelEvaluationDashboardProps) {
  const [activeTab, setActiveTab] = useState("train")
  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [modelEvaluation, setModelEvaluation] = useState<ModelEvaluation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load model configs
  useEffect(() => {
    setModelConfigs(mlService.getModelConfigs())
  }, [mlService])

  // Handle model training
  const handleTrainModel = async (config: ModelConfig) => {
    setIsLoading(true)
    setError(null)

    try {
      const modelId = await mlService.trainModel(marketData, config)

      // Update model configs
      setModelConfigs(mlService.getModelConfigs())

      // Select the newly trained model
      setSelectedModelId(modelId)

      // Switch to evaluate tab
      setActiveTab("evaluate")

      // Evaluate the model
      await handleEvaluateModel(modelId)

      return modelId
    } catch (err) {
      setError(`Error training model: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Handle model evaluation
  const handleEvaluateModel = async (modelId: string) => {
    setIsLoading(true)
    setError(null)
    setModelEvaluation(null)

    try {
      const evaluation = await mlService.evaluateModel(modelId, marketData)
      setModelEvaluation(evaluation)
    } catch (err) {
      setError(`Error evaluating model: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle model deletion
  const handleDeleteModel = (modelId: string) => {
    mlService.deleteModel(modelId)
    setModelConfigs(mlService.getModelConfigs())

    if (selectedModelId === modelId) {
      setSelectedModelId(null)
      setModelEvaluation(null)
    }
  }

  // Format evaluation metrics for display
  const formatMetric = (value: number | undefined) => {
    if (value === undefined) return "N/A"
    return value.toFixed(4)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="train">
            <LineChart className="mr-2 h-4 w-4" />
            Train Model
          </TabsTrigger>
          <TabsTrigger value="evaluate">
            <BarChart className="mr-2 h-4 w-4" />
            Evaluate Model
          </TabsTrigger>
          <TabsTrigger value="predict">
            <PieChart className="mr-2 h-4 w-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="train" className="space-y-4">
          <ModelTrainer marketData={marketData} onTrainModel={handleTrainModel} />
        </TabsContent>

        <TabsContent value="evaluate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Evaluation</CardTitle>
              <CardDescription>Evaluate model performance on historical data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-64">
                  <Select
                    value={selectedModelId || ""}
                    onValueChange={(value) => {
                      setSelectedModelId(value)
                      handleEvaluateModel(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelConfigs.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedModelId && (
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteModel(selectedModelId)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Model
                  </Button>
                )}
              </div>

              {isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {modelEvaluation && !isLoading && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {modelEvaluation.accuracy !== undefined && (
                      <Card>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatMetric(modelEvaluation.accuracy)}</div>
                        </CardContent>
                      </Card>
                    )}

                    {modelEvaluation.f1Score !== undefined && (
                      <Card>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm font-medium">F1 Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatMetric(modelEvaluation.f1Score)}</div>
                        </CardContent>
                      </Card>
                    )}

                    {modelEvaluation.rmse !== undefined && (
                      <Card>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm font-medium">RMSE</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatMetric(modelEvaluation.rmse)}</div>
                        </CardContent>
                      </Card>
                    )}

                    {modelEvaluation.r2 !== undefined && (
                      <Card>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm font-medium">R² Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatMetric(modelEvaluation.r2)}</div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Prediction Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ApexChart
                          type="line"
                          height={400}
                          series={[
                            {
                              name: "Actual",
                              data: modelEvaluation.predictions.map((p) => ({
                                x: new Date(p.timestamp),
                                y: p.actual,
                              })),
                            },
                            {
                              name: "Predicted",
                              data: modelEvaluation.predictions.map((p) => ({
                                x: new Date(p.timestamp),
                                y: p.predicted,
                              })),
                            },
                          ]}
                          options={{
                            chart: {
                              type: "line",
                              zoom: {
                                enabled: true,
                              },
                            },
                            stroke: {
                              curve: "smooth",
                              width: [3, 3],
                              dashArray: [0, 5],
                            },
                            markers: {
                              size: 0,
                            },
                            xaxis: {
                              type: "datetime",
                            },
                            tooltip: {
                              shared: true,
                              intersect: false,
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!modelEvaluation && !isLoading && selectedModelId && (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">No evaluation data available</p>
                </div>
              )}

              {!selectedModelId && !isLoading && (
                <div className="flex justify-center py-8">
                  <p className="text-muted-foreground">Select a model to evaluate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predict" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Predictions</CardTitle>
              <CardDescription>View predictions on recent market data</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Prediction visualization would go here */}
              <div className="flex justify-center py-8">
                <p className="text-muted-foreground">Coming soon: Real-time predictions</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
