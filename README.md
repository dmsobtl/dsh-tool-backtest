# dsh-tool-backtest

DSH 插件：策略回测引擎 — 定义买卖信号，跑历史数据，输出绩效指标。

## 工具清单

| 工具 | 功能 |
|------|------|
| `run_backtest` | 输入 K 线 + 信号 → 输出收益率、夏普、回撤、胜率、交易记录 |
| `calc_indicator` | 技术指标计算：SMA、EMA、RSI、MACD、布林带 |

## 安装

```bash
dsh plugin add dsh-tool-backtest
```

## 配置

```yaml
- id: backtest
  plugin: dsh-tool-backtest
  config:
    defaultCapital: 100000    # 默认初始资金
    defaultCommission: 0.001  # 默认手续费率 0.1%
```

## 使用流程

Agent 的标准回测工作流：

```
1. market_kline 获取历史数据
2. calc_indicator 计算技术指标
3. 根据策略规则生成 signals（Agent 自行判断）
4. run_backtest 执行回测
5. 分析结果，给出建议
```

## 工具详解

### `run_backtest`

**输入**：

```json
{
  "strategyName": "MA5/20 金叉",
  "bars": [{"date":"2024-01-02","open":100,"high":102,"low":99,"close":101,"volume":50000}, ...],
  "signals": [{"date":"2024-01-15","action":"buy","reason":"MA5上穿MA20"}, ...],
  "capital": 100000,
  "commission": 0.001
}
```

**输出**：

```json
{
  "summary": {
    "strategy": "MA5/20 金叉",
    "period": "2024-01-02 ~ 2024-12-31",
    "totalReturn": "18.5%",
    "annualizedReturn": "18.5%",
    "maxDrawdown": "7.2%",
    "sharpeRatio": 1.82,
    "winRate": "65%",
    "totalTrades": 12,
    "avgHoldingDays": 15,
    "profitFactor": 2.3
  },
  "recentTrades": [...],
  "equityCurve": [...]
}
```

### `calc_indicator`

**支持的指标**：

| 指标 | 参数 | 说明 |
|------|------|------|
| `sma` | period (默认 20) | 简单移动平均 |
| `ema` | period (默认 20) | 指数移动平均 |
| `rsi` | period (默认 14) | 相对强弱指标，0-100 |
| `macd` | 固定 12/26/9 | DIF、DEA、柱状图 |
| `bollinger` | period (默认 20) | 上轨、中轨、下轨 |

**输入**：

```json
{
  "prices": [100, 101.5, 99.8, 102.3, ...],
  "indicator": "rsi",
  "period": 14
}
```

**输出**：

```json
{
  "indicator": "RSI",
  "period": 14,
  "values": [45.2, 52.1, 68.3, ...]
}
```

## 绩效指标说明

| 指标 | 含义 | 参考值 |
|------|------|--------|
| 年化收益 | 按交易天数折算的年化回报 | > 15% 算不错 |
| 最大回撤 | 从峰值到谷底的最大跌幅 | < 20% 较安全 |
| 夏普比率 | 风险调整后收益 | > 1 可接受，> 2 优秀 |
| 胜率 | 盈利交易占比 | 趋势策略 40-50% 正常 |
| 盈亏比 | 平均盈利/平均亏损 | > 1.5 配合低胜率可行 |
| 交易次数 | 样本量 | > 20 有统计意义 |

## 与 dsh-tool-market-data 配合

```yaml
# 典型 Agent 对话：

User: 用 RSI 超卖策略回测 BTC 半年

Agent:
→ market_kline({ symbol: "BTC", market: "crypto", period: "1d", limit: 180 })
→ calc_indicator({ prices: [close prices...], indicator: "rsi", period: 14 })
# 生成信号：RSI < 30 → buy, RSI > 70 → sell
→ run_backtest({ strategyName: "RSI(14) 超买超卖", bars: [...], signals: [...] })
# 输出绩效报告
```

## 局限性

- 不支持做空（仅多头）
- 不支持分批建仓/加仓
- 不支持止损止盈（需在信号层面实现）
- 滑点未建模（以收盘价成交）
- 无资金管理（每次全仓进出）

这些适合作为 v0.2+ 的增强方向。

## License

MIT
