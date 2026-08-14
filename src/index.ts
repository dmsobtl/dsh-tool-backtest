/**
 * dsh-tool-backtest
 *
 * Strategy backtesting engine. Agent defines a strategy as buy/sell rules,
 * the engine runs it against historical K-line data and returns performance metrics.
 */

import type { Context } from '@deepseek-ai/cordis'
import { backtestTool } from './tools/backtest.ts'
import { indicatorTool } from './tools/indicators.ts'

export const name = 'tool-backtest'
export const inject = ['tools']

export interface Config {
  defaultCapital?: number
  defaultCommission?: number
}

export function apply(ctx: Context, config: Config) {
  const tools = [
    backtestTool(config),
    indicatorTool(),
  ]
  for (const tool of tools) {
    ctx.tools.register(tool as any)
  }
}
