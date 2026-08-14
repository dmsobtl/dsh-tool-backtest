/**
 * Core backtesting engine. Takes K-line bars + strategy signals → performance metrics.
 */

export interface Bar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Signal {
  date: string
  action: 'buy' | 'sell' | 'hold'
  reason?: string
}

export interface Trade {
  entryDate: string
  entryPrice: number
  exitDate: string
  exitPrice: number
  shares: number
  pnl: number
  pnlPercent: number
  holdingDays: number
}

export interface BacktestResult {
  strategy: string
  period: string
  initialCapital: number
  finalCapital: number
  totalReturn: number
  annualizedReturn: number
  maxDrawdown: number
  maxDrawdownPeriod: string
  sharpeRatio: number
  winRate: number
  totalTrades: number
  avgHoldingDays: number
  profitFactor: number
  trades: Trade[]
  equityCurve: Array<{ date: string; equity: number }>
}

export function runBacktest(
  bars: Bar[],
  signals: Signal[],
  initialCapital: number,
  commission: number,
): BacktestResult {
  let capital = initialCapital
  let position = 0
  let entryPrice = 0
  let entryDate = ''
  const trades: Trade[] = []
  const equityCurve: Array<{ date: string; equity: number }> = []
  let peak = initialCapital
  let maxDrawdown = 0
  let maxDrawdownPeriod = ''
  let drawdownStart = ''

  const signalMap = new Map(signals.map(s => [s.date, s]))

  for (const bar of bars) {
    const signal = signalMap.get(bar.date)
    const equity = capital + position * bar.close

    if (equity > peak) {
      peak = equity
      drawdownStart = bar.date
    }
    const dd = (peak - equity) / peak
    if (dd > maxDrawdown) {
      maxDrawdown = dd
      maxDrawdownPeriod = `${drawdownStart} ~ ${bar.date}`
    }

    equityCurve.push({ date: bar.date, equity: Math.round(equity * 100) / 100 })

    if (signal?.action === 'buy' && position === 0) {
      const cost = bar.close * (1 + commission)
      const shares = Math.floor(capital / cost)
      if (shares > 0) {
        position = shares
        entryPrice = bar.close
        entryDate = bar.date
        capital -= shares * cost
      }
    } else if (signal?.action === 'sell' && position > 0) {
      const proceeds = position * bar.close * (1 - commission)
      capital += proceeds
      const pnl = proceeds - position * entryPrice * (1 + commission)
      trades.push({
        entryDate,
        entryPrice,
        exitDate: bar.date,
        exitPrice: bar.close,
        shares: position,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(((bar.close - entryPrice) / entryPrice) * 10000) / 100,
        holdingDays: daysBetween(entryDate, bar.date),
      })
      position = 0
    }
  }

  const finalEquity = capital + position * (bars[bars.length - 1]?.close ?? 0)
  const totalReturn = (finalEquity - initialCapital) / initialCapital
  const dayCount = daysBetween(bars[0]?.date ?? '', bars[bars.length - 1]?.date ?? '') || 1
  const annualizedReturn = Math.pow(1 + totalReturn, 365 / dayCount) - 1
  const winningTrades = trades.filter(t => t.pnl > 0)
  const losingTrades = trades.filter(t => t.pnl <= 0)
  const grossProfit = winningTrades.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0))

  const returns = equityCurve.slice(1).map((e, i) => (e.equity - equityCurve[i].equity) / equityCurve[i].equity)
  const avgReturn = returns.reduce((s, r) => s + r, 0) / (returns.length || 1)
  const stdReturn = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length || 1))
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0

  return {
    strategy: '',
    period: bars.length > 0 ? `${bars[0].date} ~ ${bars[bars.length - 1].date}` : 'N/A',
    initialCapital,
    finalCapital: Math.round(finalEquity * 100) / 100,
    totalReturn: Math.round(totalReturn * 10000) / 100,
    annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    maxDrawdownPeriod,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    winRate: trades.length > 0 ? Math.round((winningTrades.length / trades.length) * 10000) / 100 : 0,
    totalTrades: trades.length,
    avgHoldingDays: trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.holdingDays, 0) / trades.length) : 0,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
    trades,
    equityCurve: equityCurve.filter((_, i) => i % Math.max(1, Math.floor(equityCurve.length / 50)) === 0),
  }
}

function daysBetween(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime()
  const t2 = new Date(d2).getTime()
  return Math.round((t2 - t1) / 86400000)
}
