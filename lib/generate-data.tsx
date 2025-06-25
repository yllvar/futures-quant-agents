export function generateCandlestickData(count = 30) {
  const data = []
  let price = 120 + Math.random() * 10
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 15 * 60000) // 15 min candles

    // Generate random price movements
    const change = (Math.random() - 0.5) * 3
    const open = price
    price = price + change
    const close = price

    // High is the max of open and close, plus a random amount
    const high = Math.max(open, close) + Math.random() * 1.5

    // Low is the min of open and close, minus a random amount
    const low = Math.min(open, close) - Math.random() * 1.5

    data.push({
      time: time.toISOString(),
      open,
      high,
      low,
      close,
    })
  }

  return data
}
