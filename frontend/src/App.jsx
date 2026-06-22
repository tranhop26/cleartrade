import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { getPrices, getPortfolio, getDecisions, runAgent, getHealth } from './api/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000
  if (s < 60)    return `${Math.floor(s)}s ago`
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

// ─── Agent Loading Overlay ─────────────────────────────────────────────────────

const STEPS = [
  { label: 'Fetching live prices…',       ms: 1000 },
  { label: 'AI analyzing market…',        ms: 3000 },
  { label: 'Writing decision to 0G Storage…', ms: 2000 },
]

function AgentOverlay({ visible }) {
  const [done, setDone] = useState([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!visible) { setDone([]); setActive(0); return }
    let idx = 0
    const tick = () => {
      if (idx >= STEPS.length) return
      const step = STEPS[idx]
      const timer = setTimeout(() => {
        setDone(prev => [...prev, idx])
        setActive(idx + 1)
        idx++
        tick()
      }, step.ms)
      return timer
    }
    const t = tick()
    return () => clearTimeout(t)
  }, [visible])

  if (!visible) return null

  return (
    <div className="overlay">
      <div className="overlay-panel">
        <div className="overlay-title">Running Agent</div>
        {STEPS.map((step, i) => {
          const isDone   = done.includes(i)
          const isActive = active === i
          return (
            <div
              key={i}
              className={`overlay-step${isDone ? ' done' : isActive ? ' active' : ''}`}
            >
              <span className="step-icon">
                {isDone ? '✓' : isActive ? '⏳' : '○'}
              </span>
              {step.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Chart Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  const pnl = val - 10000
  return (
    <div style={{
      background: '#0F0F1A', border: '1px solid #1E1E3A',
      borderRadius: 4, padding: '8px 12px',
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>${fmt(val)}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: pnl >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>
        {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({pnl >= 0 ? '+' : ''}{fmt((pnl/10000)*100)}%)
      </div>
    </div>
  )
}

// ─── Decision Card ─────────────────────────────────────────────────────────────

function DecisionCard({ trade }) {
  const action = trade.action?.toUpperCase()
  const badgeClass = action === 'BUY' ? 'dc-badge-buy' : action === 'SELL' ? 'dc-badge-sell' : 'dc-badge-hold'
  const confPct = ((trade.confidence ?? 0) / 10) * 100

  return (
    <div className="decision-card">
      {/* Header row */}
      <div className="dc-header">
        <span className={`dc-badge ${badgeClass}`}>{action} {trade.token}</span>
        {trade.amount_usd > 0 && (
          <span className="dc-amount">${fmt(trade.amount_usd)}</span>
        )}
        <div className="dc-meta">
          <span className="dc-time">{timeAgo(trade.timestamp)}</span>
          <span className="dc-conf">Confidence {trade.confidence ?? 0}/10</span>
        </div>
      </div>

      {/* Body */}
      <div className="dc-body">
        {/* Confidence bar */}
        <div className="dc-conf-bar">
          <div className="dc-conf-fill" style={{ width: `${confPct}%` }} />
        </div>

        {/* Reasoning */}
        {trade.reasoning && (
          <div className="dc-reasoning">
            {trade.reasoning.replace('[MOCK] ', '')}
          </div>
        )}

        {/* Reflection */}
        {trade.reflection && (
          <div className="dc-reflection">
            ↻ {trade.reflection.replace('[MOCK] ', '')}
          </div>
        )}

        {/* Root hash */}
        {trade.rootHash && (
          <div className="dc-hash">
            <span className="dc-hash-label">rootHash:</span>
            <span className="dc-hash-val">
              {trade.rootHash.slice(0, 10)}…{trade.rootHash.slice(-4)}
            </span>
            <a
              className="dc-hash-link"
              href={`https://storagescan-galileo.0g.ai`}
              target="_blank"
              rel="noopener noreferrer"
            >
              [Verify on 0G ↗]
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [prices,    setPrices]    = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [decisions, setDecisions] = useState([])
  const [health,    setHealth]    = useState(null)
  const [agentBusy, setAgentBusy] = useState(false)
  const priceTimer = useRef(null)

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const loadPrices    = useCallback(async () => { try { setPrices(await getPrices()) }    catch {} }, [])
  const loadPortfolio = useCallback(async () => { try { setPortfolio(await getPortfolio()) } catch {} }, [])
  const loadDecisions = useCallback(async () => { try { setDecisions(await getDecisions()) } catch {} }, [])
  const loadHealth    = useCallback(async () => { try { setHealth(await getHealth()) }    catch {} }, [])

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadHealth(); loadPrices(); loadPortfolio(); loadDecisions()
  }, [loadHealth, loadPrices, loadPortfolio, loadDecisions])

  // ── Price polling every 30s ─────────────────────────────────────────────────
  useEffect(() => {
    priceTimer.current = setInterval(loadPrices, 30_000)
    return () => clearInterval(priceTimer.current)
  }, [loadPrices])

  // ── Run Agent ────────────────────────────────────────────────────────────────
  const handleRunAgent = async () => {
    setAgentBusy(true)
    try {
      await runAgent()
      await Promise.all([loadPortfolio(), loadDecisions()])
    } catch (e) {
      console.error('Agent error:', e.message)
    } finally {
      setAgentBusy(false)
    }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalValue  = portfolio?.totalValue ?? portfolio?.cash_usd ?? 10000
  const pnlAbs      = totalValue - 10000
  const pnlPct      = (pnlAbs / 10000) * 100
  const holdings    = portfolio?.holdings ?? {}
  const cash        = portfolio?.cash_usd ?? 10000

  // Build chart data from decisions history
  const chartData = (() => {
    if (!decisions?.length) return []
    let c = 10000, h = { BTC: 0, ETH: 0, SOL: 0 }
    const pts = [{ t: 'Start', v: 10000 }]
    ;[...decisions].reverse().forEach(tr => {
      const p = tr.price_at_trade ?? 0
      if (tr.action === 'BUY'  && p) { c -= tr.amount_usd; h[tr.token] = (h[tr.token]||0) + tr.amount_usd/p }
      if (tr.action === 'SELL' && p) { c += tr.amount_usd; h[tr.token] = Math.max(0,(h[tr.token]||0) - tr.amount_usd/p) }
      const hv = Object.entries(h).reduce((s,[,q]) => s + q*p, 0)
      pts.push({ t: new Date(tr.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), v: parseFloat((c+hv).toFixed(2)) })
    })
    return pts
  })()

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <AgentOverlay visible={agentBusy} />

      {/* ── SECTION 1: HEADER ─────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">⬡ CLEARTRADE</div>
          <div className="header-sub">Transparent AI Trading · 0G Network</div>
        </div>

        <div className="header-center">
          <span className="badge badge-live">
            <span className="live-dot" />LIVE
          </span>
          <span className="badge badge-net">0G TESTNET</span>
          <span className="badge badge-paper">PAPER TRADING ONLY</span>
        </div>

        <button
          className="btn-run"
          onClick={handleRunAgent}
          disabled={agentBusy}
          id="run-agent-btn"
        >
          ▶ RUN AGENT
        </button>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="main">

        {/* ── SECTION 2: STATS ROW ────────────────────────────────────────── */}
        <div className="stats-row">
          {/* Portfolio Value */}
          <div className="stat-card">
            <div className="stat-label">Portfolio Value</div>
            <div className="stat-value">${fmt(totalValue, 2)}</div>
            <div className={`stat-change ${pnlAbs >= 0 ? 'positive' : 'negative'}`}>
              {pnlAbs >= 0 ? '+' : ''}{fmt(pnlAbs, 2)} ({pnlPct >= 0 ? '+' : ''}{fmt(pnlPct, 2)}%)
            </div>
          </div>

          {/* BTC */}
          <div className="stat-card">
            <div className="stat-label">BTC · Bitcoin</div>
            <div className="stat-value">{prices?.BTC?.price ? `$${fmt(prices.BTC.price, 0)}` : <span style={{color:'var(--dim)'}}>$—</span>}</div>
            <div className={`stat-change ${(prices?.BTC?.change24h ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {prices?.BTC?.change24h != null
                ? `${prices.BTC.change24h >= 0 ? '+' : ''}${fmt(prices.BTC.change24h)}% 24h`
                : <span style={{color:'var(--dim)'}}>— 24h</span>}
            </div>
          </div>

          {/* ETH */}
          <div className="stat-card">
            <div className="stat-label">ETH · Ethereum</div>
            <div className="stat-value">{prices?.ETH?.price ? `$${fmt(prices.ETH.price, 0)}` : <span style={{color:'var(--dim)'}}>$—</span>}</div>
            <div className={`stat-change ${(prices?.ETH?.change24h ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {prices?.ETH?.change24h != null
                ? `${prices.ETH.change24h >= 0 ? '+' : ''}${fmt(prices.ETH.change24h)}% 24h`
                : <span style={{color:'var(--dim)'}}>— 24h</span>}
            </div>
          </div>

          {/* SOL */}
          <div className="stat-card">
            <div className="stat-label">SOL · Solana</div>
            <div className="stat-value">{prices?.SOL?.price ? `$${fmt(prices.SOL.price, 2)}` : <span style={{color:'var(--dim)'}}>$—</span>}</div>
            <div className={`stat-change ${(prices?.SOL?.change24h ?? 0) >= 0 ? 'positive' : 'negative'}`}>
              {prices?.SOL?.change24h != null
                ? `${prices.SOL.change24h >= 0 ? '+' : ''}${fmt(prices.SOL.change24h)}% 24h`
                : <span style={{color:'var(--dim)'}}>— 24h</span>}
            </div>
          </div>
        </div>

        {/* ── SECTION 3: P&L CHART ────────────────────────────────────────── */}
        <div className="panel" style={{ padding: '20px' }}>
          <div className="panel-title">P&amp;L Chart</div>
          {chartData.length < 2 ? (
            <div className="chart-empty">
              Run the agent to start tracking performance
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00FF88" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00FF88" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill:'#555577', fontSize:10, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill:'#555577', fontSize:10, fontFamily:'JetBrains Mono' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v.toLocaleString()}`}
                  width={72}
                  domain={['auto','auto']}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#00FF88"
                  strokeWidth={2}
                  fill="url(#pnlGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#00FF88', stroke: 'none' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── SECTION 4: HOLDINGS BAR ─────────────────────────────────────── */}
        <div className="holdings-bar">
          <span style={{ color: 'var(--dim)', marginRight: 10 }}>HOLDINGS:</span>
          {['BTC','ETH','SOL'].map((t, i) => {
            const qty = holdings[t] ?? 0
            const val = qty * (prices?.[t]?.price ?? 0)
            return (
              <span key={t}>
                {i > 0 && <span className="holdings-sep">·</span>}
                <span className="hl">{t}</span>{' '}
                {qty > 0 ? qty.toFixed(5) : '0'}
                {val > 0 && <span style={{ color: 'var(--dim)' }}> (≈${fmt(val, 0)})</span>}
              </span>
            )
          })}
          <span className="holdings-sep">·</span>
          <span>CASH </span><span className="hl">${fmt(cash, 2)}</span>
        </div>

        {/* ── SECTION 5: DECISION LOG ──────────────────────────────────────── */}
        <div className="panel">
          <div className="panel-title">
            DECISION LOG
            <span className="count-badge">{decisions.length}</span>
            {health?.computeConfigured && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)' }}>⚡ 0G COMPUTE ACTIVE</span>
            )}
          </div>

          {decisions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">◈</div>
              <div className="empty-state-text">No decisions yet. Click RUN AGENT to start paper trading.</div>
            </div>
          ) : (
            decisions.map(trade => <DecisionCard key={trade.id} trade={trade} />)
          )}
        </div>

      </main>
    </>
  )
}
