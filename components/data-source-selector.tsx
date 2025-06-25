"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

interface DataSourceSelectorProps {
  onSourceChange: (useHistorical: boolean) => void
  onDateRangeChange: (startDate: Date, endDate: Date) => void
  isHistoricalEnabled?: boolean
}

export function DataSourceSelector({
  onSourceChange,
  onDateRangeChange,
  isHistoricalEnabled = false,
}: DataSourceSelectorProps) {
  const [useHistorical, setUseHistorical] = useState(isHistoricalEnabled)
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // 90 days ago
  const [endDate, setEndDate] = useState<Date>(new Date()) // Today
  const [error, setError] = useState<string | null>(null)

  const handleToggleChange = (checked: boolean) => {
    setUseHistorical(checked)
    onSourceChange(checked)
  }

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return

    // Validate that start date is not after end date
    if (date > endDate) {
      setError("Start date cannot be after end date")
      return
    }

    setStartDate(date)
    setError(null)
    onDateRangeChange(date, endDate)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return

    // Validate that end date is not before start date
    if (date < startDate) {
      setError("End date cannot be before start date")
      return
    }

    // Validate that end date is not in the future
    if (date > new Date()) {
      setError("End date cannot be in the future")
      return
    }

    setEndDate(date)
    setError(null)
    onDateRangeChange(startDate, date)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Source</CardTitle>
        <CardDescription>Choose between real-time and historical data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="use-historical" checked={useHistorical} onCheckedChange={handleToggleChange} />
            <Label htmlFor="use-historical">Use Historical Data</Label>
          </div>
          <div className="text-right">
            {useHistorical ? (
              <span className="text-amber-500">Historical</span>
            ) : (
              <span className="text-emerald-500">Real-time</span>
            )}
          </div>
        </div>

        {useHistorical && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={handleStartDateChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="end-date">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="end-date"
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={handleEndDateChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
