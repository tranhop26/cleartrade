const COINS = [
  { key: 'BTC', name: 'Bitcoin',  icon: '₿', color: '#f7931a', cgId: 'bitcoin'  },
  { key: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea', cgId: 'ethereum' },
  { key: 'SOL', name: 'Solana',   icon: '◎', color: '#9945ff', cgId: 'solana'   },
]

function fmt(n, decimals = 2) {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ChangeChip({ value }) {
  if (value == null) return null
  const pos = value >= 0
  return (
    <span className={pos ? 'positive' : 'negative'} style={{ fontSize: '13px', fontWeight: 600 }}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

function PriceCard({ coin, data, loading }) {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '10px',
            background: `${coin.color}22`,
            border: `1px solid ${coin.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', color: coin.color, fontWeight: 700,
          }}>
            {coin.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{coin.key}</div>
            <div className="label">{coin.name}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>24h</div>
          {loading
            ? <div className="skeleton" style={{ width: 60, height: 16 }} />
            : <ChangeChip value={data?.change24h} />
          }
        </div>
      </div>

      {/* Price */}
      {loading ? (
        <div className="skeleton" style={{ width: '70%', height: 32, marginBottom: 8 }} />
      ) : (
        <div className="value-lg" style={{ marginBottom: '8px' }}>
          ${fmt(data?.price)}
        </div>
      )}

      {/* 7d change */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="label">7d</span>
        {loading
          ? <div className="skeleton" style={{ width: 50, height: 14 }} />
          : <ChangeChip value={data?.change7d} />
        }
      </div>
    </div>
  )
}

export default function PriceCards({ prices, loading }) {
  return (
    <div className="grid-3">
      {COINS.map(coin => (
        <PriceCard
          key={coin.key}
          coin={coin}
          data={prices?.[coin.key]}
          loading={loading}
        />
      ))}
    </div>
  )
}
