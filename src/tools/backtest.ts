import type { Config } from '../index.ts'
import { runBacktest, type Bar, type Signal } from '../engine.ts'

export const backtestTool = (config: Config) => ({
  name: 'run_backtest',
  description: 'Run a backtest with K-line bars and trading signals. Returns performance metrics: total return, sharpe, max drawdown, win rate, trade list.',
  parameters: {
    type: 'object' as const,
    properties: {
      strategyName: { type: 'string' as const, description: 'Name of the strategy being tested' },
      bars: {
        type: 'array' as const,
        description: 'K-line data array: [{date, open, high, low, close, volume}]',
        items: { type: 'object' as const, additionalProperties: true as const },
      },
      signals: {
        type: 'array' as const,
        description: 'Trading signals array: [{date, action: "buy"|"sell"|"hold", reason?}]',
        items: { type: 'object' as const, additionalProperties: true as const },
      },
      capital: { type: 'number' as const, description: 'Initial capital. Default: 100000' },
      commission: { type: 'number' as const, description: 'Commission rate (e.g. 0.001 = 0.1%). Default: 0.001' },
    },
    required: ['strategyName', 'bars', 'signals'] as const,
  },
  async execute(args: { strategyName: string; bars: Bar[]; signals: Signal[]; capital?: number; commission?: number }) {
    const capital = args.capital ?? config.defaultCapital ?? 100000
    const commission = args.commission ?? config.defaultCommission ?? 0.001

    if (args.bars.length === 0) return [{ type: 'text' as const, text: JSON.stringify({ error: 'No bars provided' }) }]
    if (args.signals.length === 0) return [{ type: 'text' as const, text: JSON.stringify({ error: 'No signals provided' }) }]

    const result = runBacktest(args.bars, args.signals, capital, commission)
    result.strategy = args.strategyName

    const summary = {
      strategy: result.strategy,
      period: result.period,
      initialCapital: result.initialCapital,
      finalCapital: result.finalCapital,
      totalReturn: `${result.totalReturn}%`,
      annualizedReturn: `${result.annualizedReturn}%`,
      maxDrawdown: `${result.maxDrawdown}%`,
      sharpeRatio: result.sharpeRatio,
      winRate: `${result.winRate}%`,
      totalTrades: result.totalTrades,
      avgHoldingDays: result.avgHoldingDays,
      profitFactor: result.profitFactor,
    }

    return [{ type: 'text' as const, text: JSON.stringify({ summary, recentTrades: result.trades.slice(-10), equityCurve: result.equityCurve }, null, 2) }]
  },
})
