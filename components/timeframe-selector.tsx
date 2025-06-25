"use client"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Timeframe } from "@/lib/types"

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe
  onTimeframeChange: (timeframe: Timeframe) => void
  availableTimeframes?: Timeframe[]
}

export function TimeframeSelector({
  selectedTimeframe,
  onTimeframeChange,
  availableTimeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w"],
}: TimeframeSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-24 justify-between">
          {selectedTimeframe}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-24">
        {availableTimeframes.map((timeframe) => (
          <DropdownMenuItem
            key={timeframe}
            onClick={() => onTimeframeChange(timeframe)}
            className="flex items-center justify-between"
          >
            {timeframe}
            {selectedTimeframe === timeframe && <Check className="h-4 w-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
