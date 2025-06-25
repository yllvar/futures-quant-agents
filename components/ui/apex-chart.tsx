"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"
import type { MarketData, Timeframe } from "@/lib/types"

// Dynamically import ApexCharts with no SSR to avoid hydration issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

interface ApexChartProps {
  data: MarketData[]
  type: "candlestick" | "line" | "area"
  height?: number
  width?: string
  theme?: "light" | "dark"
  timeframe?: Timeframe
  indicators?: {
    sma20?: number[]
    sma50?: number[]
    upperBand?: number[]
    lowerBand?: number[]
  }
}

export function ApexChart({
  data,
  type = "candlestick",
  height = 300,
  width = "100%",
  theme = "dark",
  timeframe = "1h",
  indicators,
}: ApexChartProps) {
  // Get date format based on timeframe - memoize this function
  const getDateFormat = useMemo(() => {
    return (tf: Timeframe) => {
      switch (tf) {
        case "1m":
        case "5m":
        case "15m":
        case "30m":
          return "HH:mm"
        case "1h":
        case "4h":
          return "HH:mm dd MMM"
        case "1d":
          return "dd MMM"
        case "1w":
          return "dd MMM yy"
        default:
          return "HH:mm dd MMM"
      }
    }
  }, [])

  // Prepare chart series
  const series = useMemo(() => {
    if (!data || data.length === 0) {
      return []
    }

    try {
      // Format data for candlestick chart
      const ohlc = data.map((item) => ({
        x: new Date(item.timestamp),
        y: [item.open, item.high, item.low, item.close],
      }))

      // Format data for line/area charts
      const lineData = data.map((item) => ({
        x: new Date(item.timestamp),
        y: item.close,
      }))

      // Prepare series based on chart type
      const mainSeries = []
      if (type === "candlestick") {
        mainSeries.push({
          name: "Price",
          type: "candlestick",
          data: ohlc,
        })
      } else if (type === "line") {
        mainSeries.push({
          name: "Price",
          type: "line",
          data: lineData,
        })
      } else {
        mainSeries.push({
          name: "Price",
          type: "area",
          data: lineData,
        })
      }

      // Add indicators if provided
      const indicatorSeries = []

      if (indicators?.sma20) {
        const sma20Data = data.map((item, i) => ({
          x: new Date(item.timestamp),
          y: indicators.sma20[i] || null,
        }))

        indicatorSeries.push({
          name: "SMA20",
          type: "line",
          data: sma20Data,
          color: "#eab308",
        })
      }

      if (indicators?.sma50) {
        const sma50Data = data.map((item, i) => ({
          x: new Date(item.timestamp),
          y: indicators.sma50[i] || null,
        }))

        indicatorSeries.push({
          name: "SMA50",
          type: "line",
          data: sma50Data,
          color: "#a855f7",
        })
      }

      if (indicators?.upperBand && indicators?.lowerBand) {
        const upperBandData = data.map((item, i) => ({
          x: new Date(item.timestamp),
          y: indicators.upperBand[i] || null,
        }))

        const lowerBandData = data.map((item, i) => ({
          x: new Date(item.timestamp),
          y: indicators.lowerBand[i] || null,
        }))

        indicatorSeries.push({
          name: "Upper Band",
          type: "line",
          data: upperBandData,
          color: "#fb923c",
          dashArray: 5,
        })

        indicatorSeries.push({
          name: "Lower Band",
          type: "line",
          data: lowerBandData,
          color: "#fb923c",
          dashArray: 5,
        })
      }

      // Combine main series with indicators
      return [...mainSeries, ...indicatorSeries]
    } catch (error) {
      console.error("Error processing chart data:", error)
      return []
    }
  }, [data, indicators, type])

  // Prepare chart options
  const options = useMemo(() => {
    const baseOptions = {
      chart: {
        type: "candlestick",
        height: height,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
        },
        animations: {
          enabled: false,
        },
        background: "transparent",
        foreColor: theme === "dark" ? "#e5e7eb" : "#374151",
      },
      theme: {
        mode: theme,
      },
      grid: {
        borderColor: theme === "dark" ? "#374151" : "#e5e7eb",
        strokeDashArray: 2,
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: "#22c55e",
            downward: "#ef4444",
          },
          wick: {
            useFillColor: true,
          },
        },
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          format: getDateFormat(timeframe),
          style: {
            colors: theme === "dark" ? "#9ca3af" : "#6b7280",
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: {
        tooltip: {
          enabled: true,
        },
        labels: {
          style: {
            colors: theme === "dark" ? "#9ca3af" : "#6b7280",
          },
          formatter: (value: number) => {
            return value.toFixed(2)
          },
        },
      },
      tooltip: {
        enabled: true,
        theme: theme,
        x: {
          format: getDateFormat(timeframe),
        },
        y: {
          formatter: (value: number) => {
            return typeof value === "number" ? `${value.toFixed(2)}` : value
          },
        },
      },
      stroke: {
        curve: "smooth",
        width: type === "candlestick" ? 1 : 2,
      },
      fill: {
        type: type === "area" ? "gradient" : "solid",
        gradient: {
          shade: "dark",
          type: "vertical",
          shadeIntensity: 0.5,
          gradientToColors: undefined,
          inverseColors: true,
          opacityFrom: 0.7,
          opacityTo: 0.1,
          stops: [0, 100],
        },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        labels: {
          colors: theme === "dark" ? "#e5e7eb" : "#374151",
        },
      },
    }

    return baseOptions
  }, [height, theme, timeframe, type, getDateFormat])

  // Check for empty data AFTER all hooks have been called
  const isDataEmpty = !data || data.length === 0
  const isClient = typeof window !== "undefined"

  if (isDataEmpty) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted/20 rounded-md">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted/20 rounded-md">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <ReactApexChart
        options={options}
        series={series}
        type={type}
        height={height}
        width={width}
        key={`chart-${timeframe}-${type}-${theme}`} // Force re-render on these prop changes
      />
    </div>
  )
}
