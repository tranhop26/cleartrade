import { useState, useEffect } from 'react'

export default function Header({ health }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const isLive = health?.status === 'ok'
  const computeOn = health?.computeConfigured

  return (
    <header style={{
      padding: '20px 0',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0078ff, #00d4ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px', boxShadow: '0 0 20px rgba(0,212,255,0.3)',
        }}>
          ◈
        </div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Clear<span style={{ color: 'var(--cyan)' }}>Trade</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            AI PAPER TRADING · 0G NETWORK
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Network */}
        <span className="badge badge-live" style={{ gap: '6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? 'var(--green)' : 'var(--red)', display: 'inline-block', boxShadow: isLive ? '0 0 6px var(--green)' : 'none' }} />
          Galileo Testnet
        </span>

        {/* AI Mode */}
        <span className="badge" style={{
          background: computeOn ? 'rgba(168,85,247,0.12)' : 'rgba(255,165,2,0.1)',
          color: computeOn ? '#a855f7' : 'var(--amber)',
          border: `1px solid ${computeOn ? 'rgba(168,85,247,0.3)' : 'rgba(255,165,2,0.2)'}`,
        }}>
          {computeOn ? '⚡ 0G Compute' : '🔧 Mock AI'}
        </span>

        {/* Clock */}
        <span className="mono" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {time.toLocaleTimeString()}
        </span>
      </div>
    </header>
  )
}
