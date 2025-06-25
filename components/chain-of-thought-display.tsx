"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Brain } from "lucide-react"
import { cn } from "@/lib/core/utils"

interface ChainOfThoughtDisplayProps {
  chainOfThought?: string
  reasoning?: string // Add an alternative prop name
  isLoading?: boolean
}

export function ChainOfThoughtDisplay({
  chainOfThought,
  reasoning, // Support both prop names
  isLoading = false,
}: ChainOfThoughtDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Use either chainOfThought or reasoning prop, whichever is provided
  const content = chainOfThought || reasoning

  // If no content and not loading, don't render anything
  if (!content && !isLoading) {
    return null
  }

  const formatChainOfThought = (text: string | undefined) => {
    // Guard against null, undefined, or non-string values
    if (!text || typeof text !== "string") {
      return <p>No detailed reasoning available.</p>
    }

    // Split by steps and format them
    const steps = text.split(/Step \d+:/g).filter(Boolean)

    if (steps.length <= 1) {
      // If no clear steps, just return the text with line breaks
      return text.split("\n").map((line, i) => (
        <p key={i} className={line.trim().startsWith("-") ? "pl-4" : ""}>
          {line}
        </p>
      ))
    }

    return steps.map((step, index) => {
      const stepNumber = index + 1
      const stepContent = step.trim()

      // Split the step content by bullet points
      const bulletPoints = stepContent.split("\n").map((line, i) => (
        <p key={i} className={line.trim().startsWith("-") ? "pl-4" : ""}>
          {line}
        </p>
      ))

      return (
        <div key={index} className="mb-3">
          <h4 className="font-medium mb-1">
            Step {stepNumber}:{stepContent.split("\n")[0]}
          </h4>
          <div className="pl-4 text-sm">{bulletPoints.slice(1)}</div>
        </div>
      )
    })
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center">
            <Brain size={16} className="mr-2" />
            Chain-of-Thought Reasoning
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8 px-2">
            {isExpanded ? (
              <>
                <ChevronUp size={16} className="mr-1" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-1" /> Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "text-xs transition-all duration-300 overflow-hidden",
          isExpanded ? "max-h-[500px] overflow-y-auto" : "max-h-0 p-0",
        )}
      >
        {isLoading ? (
          <div className="h-16 bg-muted animate-pulse rounded"></div>
        ) : (
          <div className="space-y-1 text-muted-foreground">{formatChainOfThought(content)}</div>
        )}
      </CardContent>
    </Card>
  )
}
