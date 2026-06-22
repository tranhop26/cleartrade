import DecisionCard from './DecisionCard'

export default function DecisionFeed({ decisions, loading }) {
  return (
    <div className="glass-card section" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
            AI Decision History
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Last {decisions?.length ?? 0} decisions · Logged to 0G Storage
          </div>
        </div>
        {decisions?.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
            {['BUY', 'SELL', 'HOLD'].map(action => {
              const count = decisions.filter(d => d.action === action).length
              if (!count) return null
              return (
                <span key={action} className={`badge badge-${action.toLowerCase()}`}>
                  {count} {action}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>
      ) : decisions?.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: 'var(--text-muted)', fontSize: '15px',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>No decisions yet</div>
          <div style={{ fontSize: '13px' }}>Click RUN AGENT to start paper trading</div>
        </div>
      ) : (
        <div style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
          {decisions.map(trade => (
            <DecisionCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  )
}
