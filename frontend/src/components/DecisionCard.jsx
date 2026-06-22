const ACTION_STYLES = {
  BUY:  { badge: 'badge-buy',  icon: '↑', label: 'BUY'  },
  SELL: { badge: 'badge-sell', icon: '↓', label: 'SELL' },
  HOLD: { badge: 'badge-hold', icon: '—', label: 'HOLD' },
}

function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000
  if (diff < 60)   return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(isoStr).toLocaleDateString()
}

export default function DecisionCard({ trade }) {
  const style = ACTION_STYLES[trade.action] ?? ACTION_STYLES.HOLD
  const isMock = trade.reasoning?.startsWith('[MOCK]')

  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-subtle)',
      transition: 'border-color 0.2s, background 0.2s',
      marginBottom: '12px',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.2)'
      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = 'var(--border-subtle)'
      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
    }}
    >
      {/* Row 1: action + token + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span className={`badge ${style.badge}`}>
          {style.icon} {style.label}
        </span>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>{trade.token}</span>
        {trade.amount_usd > 0 && (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            ${trade.amount_usd.toFixed(2)}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
          {timeAgo(trade.timestamp)}
        </span>
      </div>

      {/* Row 2: price + confidence */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
        {trade.price_at_trade > 0 && (
          <span>@ <span className="mono" style={{ color: 'var(--text-secondary)' }}>${trade.price_at_trade.toLocaleString()}</span></span>
        )}
        <span>Confidence: <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{trade.confidence}/10</span></span>
        {isMock && <span style={{ color: 'var(--amber)', fontSize: '10px', fontWeight: 600 }}>MOCK</span>}
      </div>

      {/* Reasoning */}
      <div style={{
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        marginBottom: trade.reflection ? '8px' : 0,
        display: '-webkit-box', WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {trade.reasoning?.replace('[MOCK] ', '')}
      </div>

      {/* Reflection */}
      {trade.reflection && (
        <div style={{
          marginTop: '8px', paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '12px', color: 'var(--text-muted)',
          fontStyle: 'italic', lineHeight: 1.4,
        }}>
          💭 {trade.reflection?.replace('[MOCK] ', '')}
        </div>
      )}

      {/* rootHash */}
      {trade.rootHash && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
          <span className="label">Stored on 0G · </span>
          <a
            href="https://chainscan-galileo.0g.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="mono"
            style={{ fontSize: '10px', color: 'var(--purple)', textDecoration: 'none' }}
            title={trade.rootHash}
          >
            {trade.rootHash.slice(0, 16)}…{trade.rootHash.slice(-6)} ↗
          </a>
        </div>
      )}
    </div>
  )
}
