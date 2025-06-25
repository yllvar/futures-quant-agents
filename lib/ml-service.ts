import type { MarketData } from "./types"
import { FeatureEngineering } from "./feature-engineering"

export interface ModelConfig {
  id: string
  name: string
  type: "regression" | "classification"
  features: string[]
  labelType: "nextReturn" | "nextDirection" | "volatility"
  labelHorizon: number
  hyperparameters: Record<string, any>
}

export interface ModelEvaluation {
  modelId: string
  accuracy?: number
  precision?: number
  recall?: number
  f1Score?: number
  mse?: number
  rmse?: number
  mae?: number
  r2?: number
  confusionMatrix?: number[][]
  predictions: Array<{
    timestamp: number
    actual: number
    predicted: number
  }>
}

export interface TrainTestSplit {
  trainFeatures: number[][]
  trainLabels: number[]
  testFeatures: number[][]
  testLabels: number[]
  timestamps: number[]
}

export class MLService {
  private featureEngineering: FeatureEngineering
  private models: Map<string, any> = new Map()
  private modelConfigs: Map<string, ModelConfig> = new Map()
  private modelEvaluations: Map<string, ModelEvaluation> = new Map()

  constructor() {
    this.featureEngineering = new FeatureEngineering()
  }

  /**
   * Prepare data for machine learning
   */
  public prepareData(marketData: MarketData[], config: ModelConfig): TrainTestSplit {
    // Extract features
    const featureSets = this.featureEngineering.extractFeatures(marketData, {
      window: 14,
      includeLabels: true,
      labelType: config.labelType,
      labelHorizon: config.labelHorizon,
    })

    // Normalize features
    const normalizedFeatureSets = this.featureEngineering.normalizeFeatures(featureSets)

    // Select only the requested features
    const selectedFeatures = normalizedFeatureSets.map((fs) => {
      const selected: Record<string, number> = {}
      for (const feature of config.features) {
        selected[feature] = fs.features[feature]
      }
      return {
        timestamp: fs.timestamp,
        features: selected,
        label: fs.label,
      }
    })

    // Split into train and test sets (80/20 split)
    const splitIndex = Math.floor(selectedFeatures.length * 0.8)
    const trainSet = selectedFeatures.slice(0, splitIndex)
    const testSet = selectedFeatures.slice(splitIndex)

    // Convert to format expected by ML algorithms
    const trainFeatures = trainSet.map((fs) => Object.values(fs.features))
    const trainLabels = trainSet.map((fs) => fs.label!)
    const testFeatures = testSet.map((fs) => Object.values(fs.features))
    const testLabels = testSet.map((fs) => fs.label!)
    const timestamps = testSet.map((fs) => fs.timestamp)

    return {
      trainFeatures,
      trainLabels,
      testFeatures,
      testLabels,
      timestamps,
    }
  }

  /**
   * Train a machine learning model
   * Note: In a real implementation, this would use a proper ML library
   * For this example, we'll simulate training and prediction
   */
  public async trainModel(marketData: MarketData[], config: ModelConfig): Promise<string> {
    // Prepare data
    const { trainFeatures, trainLabels } = this.prepareData(marketData, config)

    // In a real implementation, we would train a model here
    // For this example, we'll just store the configuration
    const modelId = config.id || `model-${Date.now()}`

    // Store model configuration
    this.modelConfigs.set(modelId, {
      ...config,
      id: modelId,
    })

    // Simulate model training
    console.log(`Training model ${modelId} with ${trainFeatures.length} samples`)

    // Store a mock model (in a real implementation, this would be the trained model)
    this.models.set(modelId, {
      predict: (features: number[][]) => {
        // Simple mock prediction logic
        return features.map((feature) => {
          if (config.type === "classification") {
            // For classification, return 0 or 1 based on a simple rule
            return feature.reduce((sum, val) => sum + val, 0) > 0 ? 1 : 0
          } else {
            // For regression, return a weighted sum of features
            return feature.reduce((sum, val, idx) => sum + val * (idx + 1), 0) / feature.length
          }
        })
      },
    })

    return modelId
  }

  /**
   * Evaluate a trained model
   */
  public async evaluateModel(modelId: string, marketData: MarketData[]): Promise<ModelEvaluation> {
    const model = this.models.get(modelId)
    const config = this.modelConfigs.get(modelId)

    if (!model || !config) {
      throw new Error(`Model ${modelId} not found`)
    }

    // Prepare test data
    const { testFeatures, testLabels, timestamps } = this.prepareData(marketData, config)

    // Make predictions
    const predictions = model.predict(testFeatures)

    // Calculate evaluation metrics
    const evaluation: ModelEvaluation = {
      modelId,
      predictions: predictions.map((pred: number, idx: number) => ({
        timestamp: timestamps[idx],
        actual: testLabels[idx],
        predicted: pred,
      })),
    }

    if (config.type === "classification") {
      // Classification metrics
      evaluation.accuracy = this.calculateAccuracy(testLabels, predictions)
      evaluation.precision = this.calculatePrecision(testLabels, predictions)
      evaluation.recall = this.calculateRecall(testLabels, predictions)
      evaluation.f1Score = this.calculateF1Score(evaluation.precision!, evaluation.recall!)
      evaluation.confusionMatrix = this.calculateConfusionMatrix(testLabels, predictions)
    } else {
      // Regression metrics
      evaluation.mse = this.calculateMSE(testLabels, predictions)
      evaluation.rmse = Math.sqrt(evaluation.mse)
      evaluation.mae = this.calculateMAE(testLabels, predictions)
      evaluation.r2 = this.calculateR2(testLabels, predictions)
    }

    // Store evaluation
    this.modelEvaluations.set(modelId, evaluation)

    return evaluation
  }

  /**
   * Make predictions using a trained model
   */
  public async predict(
    modelId: string,
    marketData: MarketData[],
  ): Promise<Array<{ timestamp: number; prediction: number }>> {
    const model = this.models.get(modelId)
    const config = this.modelConfigs.get(modelId)

    if (!model || !config) {
      throw new Error(`Model ${modelId} not found`)
    }

    // Extract features without labels
    const featureSets = this.featureEngineering.extractFeatures(marketData, {
      window: 14,
      includeLabels: false,
      labelType: config.labelType,
      labelHorizon: config.labelHorizon,
    })

    // Normalize features
    const normalizedFeatureSets = this.featureEngineering.normalizeFeatures(featureSets)

    // Select only the requested features
    const features = normalizedFeatureSets.map((fs) => {
      const selected: number[] = []
      for (const feature of config.features) {
        selected.push(fs.features[feature])
      }
      return selected
    })

    // Make predictions
    const predictions = model.predict(features)

    // Return predictions with timestamps
    return predictions.map((pred: number, idx: number) => ({
      timestamp: normalizedFeatureSets[idx].timestamp,
      prediction: pred,
    }))
  }

  /**
   * Get all model configurations
   */
  public getModelConfigs(): ModelConfig[] {
    return Array.from(this.modelConfigs.values())
  }

  /**
   * Get model evaluation
   */
  public getModelEvaluation(modelId: string): ModelEvaluation | undefined {
    return this.modelEvaluations.get(modelId)
  }

  /**
   * Get all model evaluations
   */
  public getAllModelEvaluations(): ModelEvaluation[] {
    return Array.from(this.modelEvaluations.values())
  }

  /**
   * Delete a model
   */
  public deleteModel(modelId: string): boolean {
    this.models.delete(modelId)
    this.modelConfigs.delete(modelId)
    this.modelEvaluations.delete(modelId)
    return true
  }

  // Evaluation metric calculations
  private calculateAccuracy(actual: number[], predicted: number[]): number {
    let correct = 0
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === predicted[i]) {
        correct++
      }
    }
    return correct / actual.length
  }

  private calculatePrecision(actual: number[], predicted: number[]): number {
    let truePositives = 0
    let falsePositives = 0

    for (let i = 0; i < actual.length; i++) {
      if (predicted[i] === 1) {
        if (actual[i] === 1) {
          truePositives++
        } else {
          falsePositives++
        }
      }
    }

    return truePositives / (truePositives + falsePositives)
  }

  private calculateRecall(actual: number[], predicted: number[]): number {
    let truePositives = 0
    let falseNegatives = 0

    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === 1) {
        if (predicted[i] === 1) {
          truePositives++
        } else {
          falseNegatives++
        }
      }
    }

    return truePositives / (truePositives + falseNegatives)
  }

  private calculateF1Score(precision: number, recall: number): number {
    return (2 * (precision * recall)) / (precision + recall)
  }

  private calculateConfusionMatrix(actual: number[], predicted: number[]): number[][] {
    const matrix = [
      [0, 0], // [TN, FP]
      [0, 0], // [FN, TP]
    ]

    for (let i = 0; i < actual.length; i++) {
      matrix[actual[i]][predicted[i]]++
    }

    return matrix
  }

  private calculateMSE(actual: number[], predicted: number[]): number {
    let sum = 0
    for (let i = 0; i < actual.length; i++) {
      sum += Math.pow(actual[i] - predicted[i], 2)
    }
    return sum / actual.length
  }

  private calculateMAE(actual: number[], predicted: number[]): number {
    let sum = 0
    for (let i = 0; i < actual.length; i++) {
      sum += Math.abs(actual[i] - predicted[i])
    }
    return sum / actual.length
  }

  private calculateR2(actual: number[], predicted: number[]): number {
    const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length

    let totalSS = 0
    let residualSS = 0

    for (let i = 0; i < actual.length; i++) {
      totalSS += Math.pow(actual[i] - mean, 2)
      residualSS += Math.pow(actual[i] - predicted[i], 2)
    }

    return 1 - residualSS / totalSS
  }
}
