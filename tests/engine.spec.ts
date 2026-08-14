import { describe, expect, it } from 'vitest'
import { runBacktest, type Bar, type Signal } from '../src/engine.ts'

function bar(date: string, close: number): Bar {
  return { date, open: close, high: close, low: close, close, volume: 1000 }
}

describe('runBacktest', () => {
  it('returns zero trades with no signals', () => {
    const bars = [bar('2024-01-01', 100), bar('2024-01-02', 101)]
    const result = runBacktest('s', bars, [], 100000, 0)
    expect(result.totalTrades).toBe(0)
    expect(result.finalCapital).toBe(100000)
  })

  it('executes a buy-then-sell round trip', () => {
    const bars = [bar('2024-01-01', 100), bar('2024-01-02', 100), bar('2024-01-03', 110)]
    const signals: Signal[] = [
      { date: '2024-01-02', action: 'buy' },
      { date: '2024-01-03', action: 'sell' },
    ]
    const result = runBacktest('ma cross', bars, signals, 100000, 0)
    expect(result.totalTrades).toBe(1)
    expect(result.winRate).toBe(100)
    expect(result.finalCapital).toBeGreaterThan(100000)
    expect(result.profitFactor).toBe(null) // no losing trades -> null, not Infinity
  })

  it('computes max drawdown between entry and a drawdown', () => {
    const bars = [bar('2024-01-01', 100), bar('2024-01-02', 100), bar('2024-01-03', 90)]
    const signals: Signal[] = [
      { date: '2024-01-02', action: 'buy' },
      { date: '2024-01-03', action: 'sell' },
    ]
    const result = runBacktest('dip', bars, signals, 100000, 0)
    expect(result.totalTrades).toBe(1)
    expect(result.totalReturn).toBeLessThan(0)
    expect(result.maxDrawdown).toBeGreaterThan(0)
  })

  it('keeps profitFactor finite and JSON-safe', () => {
    const bars = [bar('2024-01-01', 100), bar('2024-01-02', 100), bar('2024-01-03', 120)]
    const signals: Signal[] = [
      { date: '2024-01-02', action: 'buy' },
      { date: '2024-01-03', action: 'sell' },
    ]
    const result = runBacktest('win', bars, signals, 100000, 0)
    const json = JSON.parse(JSON.stringify(result))
    expect(json.profitFactor).toBe(null)
  })
})
