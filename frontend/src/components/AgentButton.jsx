export default function AgentButton({ onRun, loading, lastResult }) {
  return (
    <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
          🤖 AI Trading Agent
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Runs market analysis via{' '}
          <span style={{ color: 'var(--cyan)' }}>0G Compute</span> and logs
          decisions to <span style={{ color: 'var(--purple)' }}>0G Storage</span>.
        </div>
      </div>

      {/* Button */}
      <button
        id="run-agent-btn"
        className={`btn-agent${loading ? ' running' : ''}`}
        onClick={onRun}
        disabled={loading}
      >
        {loading ? (
          <><span className="spinner" />Analyzing Markets...</>
        ) : (
          '⚡ RUN AGENT'
        )}
      </button>

      {/* Last result preview */}
      {lastResult && !loading && (
        <div style={{
          padding: '14px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className={`badge badge-${lastResult.decision?.action?.toLowerCase()}`}>
              {lastResult.decision?.action}
            </span>
            <span style={{ fontWeight: 700 }}>{lastResult.decision?.token}</span>
            {lastResult.decision?.amount_usd > 0 && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                ${lastResult.decision.amount_usd.toFixed(2)}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
              {lastResult.decision?.confidence}/10 confidence
            </span>
          </div>

          {/* Confidence bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: '10px' }}>
            <div style={{
              height: '100%',
              width: `${(lastResult.decision?.confidence / 10) * 100}%`,
              borderRadius: 2,
              background: 'linear-gradient(90deg, var(--cyan), var(--green))',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Portfolio value */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>New Portfolio Value</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>
              ${lastResult.newPortfolioValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* rootHash */}
          {lastResult.rootHash && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <div className="label" style={{ marginBottom: '4px' }}>0G Storage Root Hash</div>
              <a
                href={`https://chainscan-galileo.0g.ai`}
                target="_blank"
                rel="noopener noreferrer"
                className="mono"
                style={{ fontSize: '10px', color: 'var(--cyan)', wordBreak: 'break-all', textDecoration: 'none' }}
                title={lastResult.rootHash}
              >
                {lastResult.rootHash.slice(0, 20)}…{lastResult.rootHash.slice(-8)}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
