interface ConfidenceMeterProps {
  value: number
}

export function ConfidenceMeter({ value }: ConfidenceMeterProps) {
  // Calculate colors based on confidence value
  const getColor = () => {
    if (value >= 80) return "text-emerald-500"
    if (value >= 60) return "text-amber-500"
    return "text-red-500"
  }

  // Calculate the stroke dash offset for the progress circle
  const circumference = 2 * Math.PI * 40 // 40 is the radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={getColor()}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${getColor()}`}>{value}%</span>
      </div>
    </div>
  )
}
