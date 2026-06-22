const TOKEN_COLORS = { BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff' }

function fmt(n, d = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function HoldingRow({ token, qty, prices }) {
  const price = prices?.[token]?.price ?? 0
  const value = qty * price
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 30, height: 30, borderRadius: '8px',
          background: `${TOKEN_COLORS[token]}22`,
          border: `1px solid ${TOKEN_COLORS[token]}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: TOKEN_COLORS[token],
        }}>
          {token[0]}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{token}</div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {qty > 0 ? qty.toFixed(6) : '0'}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>${fmt(value)}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${fmt(price)}</div>
      </div>
    </div>
  )
}

export default function PortfolioPanel({ portfolio, prices, loading }) {
  const totalValue = portfolio?.totalValue ?? portfolio?.cash_usd ?? 0
  const startValue = 10000
  const pnl = totalValue - startValue
  const pnlPct = ((pnl / startValue) * 100)

  return (
    <div className="glass-card" style={{ padding: '28px' }}>
      {/* Total value */}
      <div style={{ marginBottom: '24px' }}>
        <div className="label" style={{ marginBottom: '6px' }}>Total Portfolio Value</div>
        {loading
          ? <div className="skeleton" style={{ width: '60%', height: 40, marginBottom: 8 }} />
          : <div className="value-lg">${fmt(totalValue)}</div>
        }
        <div style={{ marginTop: '6px', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({pnlPct >= 0 ? '+' : ''}{fmt(pnlPct)}%)
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>since start</span>
        </div>
      </div>

      <div className="divider" />

      {/* Cash */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '8px',
            background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          }}>$</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>USD Cash</div>
            <div className="label">Available</div>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--cyan)' }}>
          ${fmt(portfolio?.cash_usd)}
        </div>
      </div>

      {/* Holdings */}
      {['BTC', 'ETH', 'SOL'].map(token => (
        <HoldingRow
          key={token}
          token={token}
          qty={portfolio?.holdings?.[token] ?? 0}
          prices={prices}
        />
      ))}

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>Total Trades</span>
        <span className="mono" style={{ color: 'var(--text-secondary)' }}>
          {portfolio?.trade_history?.length ?? 0}
        </span>
      </div>
    </div>
  )
}
