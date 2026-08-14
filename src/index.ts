/**
 * dsh-tool-backtest
 *
 * Strategy backtesting engine. The agent defines a strategy as buy/sell
 * signals, and the engine runs it against historical K-line data to produce
 * performance metrics.
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { backtestTool } from './tools/backtest.js'
import { indicatorTool } from './tools/indicators.js'

export { runBacktest } from './engine.js'
export type { Bar, Signal, Trade, BacktestResult } from './engine.js'
export type { ResolvedConfig } from './config.js'

export const name = 'tool-backtest'
export const inject = ['tools']

export const Config = z.object({
  defaultCapital: z.number().default(100000),
  defaultCommission: z.number().default(0.001),
})

export function apply(ctx: Context, config: { defaultCapital: number; defaultCommission: number }) {
  for (const tool of [backtestTool(config), indicatorTool()]) {
    ctx.tools.register(tool)
  }
}
