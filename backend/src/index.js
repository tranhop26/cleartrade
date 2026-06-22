'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { fetchPrices } = require('./priceService');
const { getPortfolio, calculateTotalValue, executeTrade, updateRootHash } = require('./portfolioService');
const { logToStorage, readFromStorage } = require('./storageService');
const { runAgent } = require('./agentService');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({ origin: '*' }));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/prices
 * Returns current BTC, ETH, SOL prices from CoinGecko.
 */
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await fetchPrices();
    res.json({ success: true, data: prices });
  } catch (err) {
    console.error('[/api/prices]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/portfolio
 * Returns current portfolio with calculated total value.
 */
app.get('/api/portfolio', async (req, res) => {
  try {
    const portfolio = getPortfolio();
    let totalValue = portfolio.cash_usd;
    try {
      const prices = await fetchPrices();
      totalValue = calculateTotalValue(portfolio, prices);
    } catch (_) {
      // If prices unavailable, return cash only
    }
    res.json({ success: true, data: { ...portfolio, totalValue } });
  } catch (err) {
    console.error('[/api/portfolio]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/decisions
 * Returns last 20 trade history entries, newest first.
 */
app.get('/api/decisions', (req, res) => {
  try {
    const portfolio = getPortfolio();
    const decisions = [...(portfolio.trade_history ?? [])]
      .reverse()
      .slice(0, 20);
    res.json({ success: true, data: decisions });
  } catch (err) {
    console.error('[/api/decisions]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/verify/:hash
 * Retrieve and return data stored on 0G Storage by root hash.
 */
app.get('/api/verify/:hash', async (req, res) => {
  const { hash } = req.params;
  try {
    const data = await readFromStorage(hash);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/verify]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/run-agent
 * Full agent cycle:
 *   1. Fetch prices
 *   2. Get portfolio
 *   3. Run AI agent
 *   4. Execute trade
 *   5. Log to 0G Storage
 *   6. Patch rootHash back into trade record
 *   7. Return decision + rootHash + new portfolio value
 */
app.post('/api/run-agent', async (req, res) => {
  try {
    // 1. Prices
    const prices = await fetchPrices();

    // 2. Portfolio
    const portfolio = getPortfolio();
    const recentDecisions = [...(portfolio.trade_history ?? [])].slice(-3);

    // 3. AI decision
    const decision = await runAgent(prices, portfolio, recentDecisions);

    // 4. Execute trade
    const tradeResult = executeTrade(
      decision.action,
      decision.token,
      decision.amount_usd,
      prices,
      decision,
    );

    if (!tradeResult.success) {
      return res.status(400).json({ success: false, error: tradeResult.error });
    }

    const trade = tradeResult.trade;

    // 5. Log to 0G Storage (non-blocking — never crash on storage failure)
    const snapshot = getPortfolio();
    const storagePayload = {
      decision,
      trade_id: trade.id,
      portfolio_snapshot: {
        cash_usd: snapshot.cash_usd,
        holdings: snapshot.holdings,
        totalTrades: snapshot.trade_history.length,
      },
      prices_at_time: prices,
      timestamp: new Date().toISOString(),
    };

    const storageResult = await logToStorage(storagePayload);
    console.log(`[run-agent] Storage result: rootHash=${storageResult.rootHash}`);

    // 6. Patch rootHash into trade record
    if (storageResult.rootHash) {
      updateRootHash(trade.id, storageResult.rootHash);
    }

    // 7. Final portfolio value
    const finalPortfolio = getPortfolio();
    const newPortfolioValue = calculateTotalValue(finalPortfolio, prices);

    res.json({
      success: true,
      data: {
        decision,
        trade,
        rootHash: storageResult.rootHash,
        storageError: storageResult.error ?? null,
        newPortfolioValue,
      },
    });

  } catch (err) {
    console.error('[/api/run-agent]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ClearTrade Backend',
    network: '0G-Galileo Testnet',
    rpc: process.env.RPC_URL,
    storageIndexer: process.env.STORAGE_INDEXER,
    computeConfigured: !!(process.env.COMPUTE_PROVIDER_ADDRESS && process.env.COMPUTE_PROVIDER_ADDRESS !== 'will_fill_later'),
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 ClearTrade Backend running on http://localhost:${PORT}`);
  console.log(`   Network:  0G-Galileo Testnet`);
  console.log(`   RPC:      ${process.env.RPC_URL}`);
  console.log(`   Indexer:  ${process.env.STORAGE_INDEXER}`);
  console.log(`   AI Mode:  ${process.env.COMPUTE_PROVIDER_ADDRESS && process.env.COMPUTE_PROVIDER_ADDRESS !== 'will_fill_later' ? '0G Compute' : 'Mock (configure COMPUTE_PROVIDER_ADDRESS)'}\n`);
});

module.exports = app;
