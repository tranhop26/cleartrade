import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const START_VALUE = 10000

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  const pnl = val - START_VALUE
  return (
    <div style={{
      background: 'rgba(13,18,37,0.95)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: '10px', padding: '12px 16px',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '16px' }}>${val?.toLocaleString()}</div>
      <div style={{ fontSize: '12px', color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600, marginTop: 2 }}>
        {pnl >= 0 ? '+' : ''}{pnl?.toFixed(2)} ({((pnl / START_VALUE) * 100).toFixed(2)}%)
      </div>
    </div>
  )
}

export default function PortfolioChart({ history }) {
  // Build chart data from trade history + current snapshot
  const data = (() => {
    if (!history?.length) {
      return [{ time: 'Start', value: START_VALUE }]
    }

    let runningCash = START_VALUE
    let holdings = { BTC: 0, ETH: 0, SOL: 0 }

    const points = [{ time: 'Start', value: START_VALUE }]

    history.slice().reverse().forEach((trade) => {
      const price = trade.price_at_trade ?? 0
      if (trade.action === 'BUY' && price > 0) {
        const qty = trade.amount_usd / price
        runningCash -= trade.amount_usd
        holdings[trade.token] = (holdings[trade.token] ?? 0) + qty
      } else if (trade.action === 'SELL' && price > 0) {
        const qty = trade.amount_usd / price
        holdings[trade.token] = Math.max(0, (holdings[trade.token] ?? 0) - qty)
        runningCash += trade.amount_usd
      }

      const holdingsValue = Object.entries(holdings).reduce((sum, [, qty]) => sum + qty * price, 0)
      const total = runningCash + holdingsValue

      points.push({
        time: new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(total.toFixed(2)),
      })
    })

    return points
  })()

  const minVal = Math.min(...data.map(d => d.value))
  const maxVal = Math.max(...data.map(d => d.value))
  const isProfit = data[data.length - 1]?.value >= START_VALUE

  return (
    <div className="glass-card section" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>Portfolio Performance</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Started with ${START_VALUE.toLocaleString()} · Paper trading
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: '8px',
          background: isProfit ? 'var(--green-dim)' : 'var(--red-dim)',
          color: isProfit ? 'var(--green)' : 'var(--red)',
          fontSize: '13px', fontWeight: 700,
        }}>
          {data.length > 1 ? `${data.length - 1} trades` : 'No trades yet'}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={isProfit ? '#00ff88' : '#ff4757'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={isProfit ? '#00ff88' : '#ff4757'} stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            domain={[Math.min(minVal * 0.998, START_VALUE * 0.998), Math.max(maxVal * 1.002, START_VALUE * 1.002)]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v.toLocaleString()}`}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={START_VALUE} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isProfit ? '#00ff88' : '#ff4757'}
            strokeWidth={2}
            fill="url(#chartGrad)"
            dot={data.length < 10}
            activeDot={{ r: 5, fill: isProfit ? '#00ff88' : '#ff4757', stroke: 'none' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
