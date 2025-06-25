import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface TechnicalIndicatorCardProps {
  title: string
  value: number
  icon: ReactNode
  trend: "up" | "down" | "neutral"
  prefix?: string
  suffix?: string
}

export function TechnicalIndicatorCard({
  title,
  value,
  icon,
  trend,
  prefix = "$",
  suffix = "",
}: TechnicalIndicatorCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-semibold">
            {prefix}
            {typeof value === "number" ? value.toFixed(2) : value}
            {suffix}
          </span>
          {trend === "up" && <ArrowUpRight size={16} className="text-emerald-500" />}
          {trend === "down" && <ArrowDownRight size={16} className="text-red-500" />}
        </div>
      </CardContent>
    </Card>
  )
}
