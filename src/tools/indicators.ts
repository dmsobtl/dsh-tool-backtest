/**
 * Technical indicator calculator tool.
 */

export const indicatorTool = () => ({
  name: 'calc_indicator',
  description: 'Calculate technical indicators from price data. Supports: SMA, EMA, RSI, MACD, Bollinger Bands. Input is an array of close prices.',
  parameters: {
    type: 'object' as const,
    properties: {
      prices: { type: 'array' as const, items: { type: 'number' as const }, description: 'Array of close prices (oldest first)' },
      indicator: { type: 'string' as const, enum: ['sma', 'ema', 'rsi', 'macd', 'bollinger'] as const },
      period: { type: 'number' as const, description: 'Period length. Default varies by indicator.' },
    },
    required: ['prices', 'indicator'] as const,
  },
  async execute(args: { prices: number[]; indicator: string; period?: number }) {
    const { prices, indicator } = args
    if (prices.length < 2) return [{ type: 'text' as const, text: JSON.stringify({ error: 'Need at least 2 prices' }) }]

    switch (indicator) {
      case 'sma': return [{ type: 'text' as const, text: JSON.stringify({ indicator: 'SMA', period: args.period ?? 20, values: sma(prices, args.period ?? 20) }) }]
      case 'ema': return [{ type: 'text' as const, text: JSON.stringify({ indicator: 'EMA', period: args.period ?? 20, values: ema(prices, args.period ?? 20) }) }]
      case 'rsi': return [{ type: 'text' as const, text: JSON.stringify({ indicator: 'RSI', period: args.period ?? 14, values: rsi(prices, args.period ?? 14) }) }]
      case 'macd': return [{ type: 'text' as const, text: JSON.stringify({ indicator: 'MACD', ...macd(prices) }) }]
      case 'bollinger': return [{ type: 'text' as const, text: JSON.stringify({ indicator: 'Bollinger', period: args.period ?? 20, ...bollinger(prices, args.period ?? 20) }) }]
      default: return [{ type: 'text' as const, text: JSON.stringify({ error: `Unknown indicator: ${indicator}` }) }]
    }
  },
})

function sma(prices: number[], period: number): number[] {
  const result: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    result.push(Math.round((sum / period) * 100) / 100)
  }
  return result
}

function ema(prices: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period]
  for (let i = period; i < prices.length; i++) {
    result.push(Math.round((prices[i] * k + result[result.length - 1] * (1 - k)) * 100) / 100)
  }
  return result
}

function rsi(prices: number[], period: number): number[] {
  const changes = prices.slice(1).map((p, i) => p - prices[i])
  const result: number[] = []
  let avgGain = 0, avgLoss = 0

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period
  result.push(Math.round((100 - 100 / (1 + avgGain / (avgLoss || 0.001))) * 100) / 100)

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result.push(Math.round((100 - 100 / (1 + avgGain / (avgLoss || 0.001))) * 100) / 100)
  }
  return result
}

function macd(prices: number[]) {
  const ema12 = ema(prices, 12)
  const ema26 = ema(prices, 26)
  const diff = ema12.slice(ema12.length - ema26.length).map((v, i) => Math.round((v - ema26[i]) * 100) / 100)
  const dea = ema(diff.map(Math.abs), 9)
  const histogram = diff.slice(diff.length - dea.length).map((d, i) => Math.round((d - dea[i]) * 100) / 100)
  return { dif: diff.slice(-20), dea: dea.slice(-20), histogram: histogram.slice(-20) }
}

function bollinger(prices: number[], period: number) {
  const mid = sma(prices, period)
  const upper: number[] = []
  const lower: number[] = []
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const std = Math.sqrt(slice.reduce((s, p) => s + (p - mean) ** 2, 0) / period)
    upper.push(Math.round((mean + 2 * std) * 100) / 100)
    lower.push(Math.round((mean - 2 * std) * 100) / 100)
  }
  return { middle: mid.slice(-20), upper: upper.slice(-20), lower: lower.slice(-20) }
}
