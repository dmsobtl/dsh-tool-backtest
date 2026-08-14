import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ResolvedConfig } from '../config.js'
import { runBacktest, type Bar, type Signal } from '../engine.js'

export const backtestTool = (config: ResolvedConfig) => defineTool({
  name: 'run_backtest',
  description: 'Run a backtest with K-line bars and trading signals. Returns performance metrics: total return, sharpe, max drawdown, win rate, and the trade list.',
  parameters: {
    strategyName: { type: 'string', required: true, description: 'Name of the strategy being tested' },
    bars: {
      type: 'array',
      required: true,
      description: 'K-line data array: [{date, open, high, low, close, volume}]',
      items: { type: 'object', additionalProperties: true },
    },
    signals: {
      type: 'array',
      required: true,
      description: 'Trading signals array: [{date, action: "buy"|"sell"|"hold", reason?}]',
      items: { type: 'object', additionalProperties: true },
    },
    capital: { type: 'number', description: 'Initial capital. Default: 100000' },
    commission: { type: 'number', description: 'Commission rate (e.g. 0.001 = 0.1%). Default: 0.001' },
  },
  output: {
    schema: { type: 'json' },
    render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  },
  async execute(args) {
    const capital = args.capital ?? config.defaultCapital
    const commission = args.commission ?? config.defaultCommission

    const bars = args.bars as unknown as Bar[]
    const signals = args.signals as unknown as Signal[]

    if (bars.length === 0) return { error: 'No bars provided' }
    if (signals.length === 0) return { error: 'No signals provided' }

    const result = runBacktest(args.strategyName, bars, signals, capital, commission)
    return JSON.parse(JSON.stringify(result))
  },
})
