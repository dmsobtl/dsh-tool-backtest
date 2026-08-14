/**
 * Technical indicator calculator tool.
 */

import { defineTool } from '@deepseek-ai/dsh-tools'

export const indicatorTool = () => defineTool({
  name: 'calc_indicator',
  description: 'Calculate technical indicators from price data. Supports SMA, EMA, RSI, MACD, Bollinger Bands. Input is an array of close prices (oldest first).',
  parameters: {
    prices: { type: 'array', required: true, items: { type: 'number' }, description: 'Array of close prices (oldest first)' },
    indicator: { type: 'string', required: true, enum: ['sma', 'ema', 'rsi', 'macd', 'bollinger'] as const },
    period: { type: 'number', description: 'Period length. Default varies by indicator.' },
  },
  output: {
    schema: { type: 'json' },
    render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  },
  async execute(args) {
    const { prices, indicator } = args
    if (prices.length < 2) return { error: 'Need at least 2 prices' }

    const period = args.period ?? (indicator === 'rsi' ? 14 : 20)
    const minPrices = indicator === 'macd' ? 26 : indicator === 'rsi' ? period + 1 : period
    if (prices.length < minPrices) {
      return { error: `Need at least ${minPrices} prices for ${indicator}` }
    }

    let result: Record<string, unknown>
    switch (indicator) {
      case 'sma': result = { indicator: 'SMA', period, values: sma(prices, period) }; break
      case 'ema': result = { indicator: 'EMA', period, values: ema(prices, period) }; break
      case 'rsi': result = { indicator: 'RSI', period, values: rsi(prices, period) }; break
      case 'macd': result = { indicator: 'MACD', ...macd(prices) }; break
      case 'bollinger': result = { indicator: 'Bollinger', period, ...bollinger(prices, period) }; break
      default: result = { error: `Unknown indicator: ${indicator}` }
    }
    return JSON.parse(JSON.stringify(result))
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
  let avgGain = 0
  let avgLoss = 0

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period
  result.push(rsiValue(avgGain, avgLoss))

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result.push(rsiValue(avgGain, avgLoss))
  }
  return result
}

function rsiValue(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100
}

function macd(prices: number[]) {
  const ema12 = ema(prices, 12)
  const ema26 = ema(prices, 26)
  const diff = ema12.slice(ema12.length - ema26.length).map((v, i) => Math.round((v - ema26[i]) * 100) / 100)
  const dea = ema(diff, 9)
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
