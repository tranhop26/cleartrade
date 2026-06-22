'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');

const INITIAL_PORTFOLIO = {
  cash_usd: 10000,
  holdings: { BTC: 0, ETH: 0, SOL: 0 },
  trade_history: [],
  created_at: new Date().toISOString(),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readPortfolioFile() {
  ensureDataDir();
  if (!fs.existsSync(PORTFOLIO_FILE)) {
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(INITIAL_PORTFOLIO, null, 2));
    return { ...INITIAL_PORTFOLIO };
  }
  return JSON.parse(fs.readFileSync(PORTFOLIO_FILE, 'utf-8'));
}

function writePortfolioFile(portfolio) {
  ensureDataDir();
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
}

// ── Exports ──────────────────────────────────────────────────────────────────

/**
 * Read and return the current portfolio state.
 * Creates the file with initial state if it doesn't exist.
 */
function getPortfolio() {
  return readPortfolioFile();
}

/**
 * Compute total portfolio value = cash + sum(holding * price).
 * @param {object} portfolio
 * @param {{ BTC: { price }, ETH: { price }, SOL: { price } }} currentPrices
 * @returns {number}
 */
function calculateTotalValue(portfolio, currentPrices) {
  let total = portfolio.cash_usd;
  for (const [token, qty] of Object.entries(portfolio.holdings)) {
    const priceData = currentPrices[token];
    if (priceData && qty > 0) {
      total += qty * priceData.price;
    }
  }
  return parseFloat(total.toFixed(2));
}

/**
 * Execute a trade — validate, update portfolio, append history entry, persist.
 * @param {'BUY'|'SELL'|'HOLD'} action
 * @param {'BTC'|'ETH'|'SOL'} token
 * @param {number} amount_usd
 * @param {{ BTC: { price }, ... }} currentPrices
 * @param {object} decision - full agent decision object (reasoning, confidence, reflection)
 * @returns {{ success: boolean, trade?: object, error?: string }}
 */
function executeTrade(action, token, amount_usd, currentPrices, decision) {
  const portfolio = readPortfolioFile();

  if (action === 'HOLD' || amount_usd === 0) {
    // Record HOLD without modifying balances
    const trade = buildTradeEntry(action, token, 0, currentPrices[token]?.price ?? 0, decision);
    portfolio.trade_history.push(trade);
    writePortfolioFile(portfolio);
    return { success: true, trade };
  }

  const price = currentPrices[token]?.price;
  if (!price) {
    return { success: false, error: `No price data for ${token}` };
  }

  const qty = amount_usd / price;

  if (action === 'BUY') {
    if (portfolio.cash_usd < amount_usd) {
      return { success: false, error: `Insufficient cash: have $${portfolio.cash_usd.toFixed(2)}, need $${amount_usd}` };
    }
    portfolio.cash_usd -= amount_usd;
    portfolio.holdings[token] = (portfolio.holdings[token] ?? 0) + qty;
  } else if (action === 'SELL') {
    const held = portfolio.holdings[token] ?? 0;
    if (held < qty) {
      return { success: false, error: `Insufficient ${token}: have ${held.toFixed(6)}, need ${qty.toFixed(6)}` };
    }
    portfolio.holdings[token] -= qty;
    portfolio.cash_usd += amount_usd;
  } else {
    return { success: false, error: `Unknown action: ${action}` };
  }

  const trade = buildTradeEntry(action, token, amount_usd, price, decision);
  portfolio.trade_history.push(trade);
  writePortfolioFile(portfolio);
  return { success: true, trade };
}

/**
 * After 0G Storage upload, patch the rootHash into the trade entry.
 * @param {string} tradeId
 * @param {string|null} rootHash
 */
function updateRootHash(tradeId, rootHash) {
  const portfolio = readPortfolioFile();
  const entry = portfolio.trade_history.find((t) => t.id === tradeId);
  if (entry) {
    entry.rootHash = rootHash;
    writePortfolioFile(portfolio);
  }
}

// ── Private helpers ──────────────────────────────────────────────────────────

function buildTradeEntry(action, token, amount_usd, price, decision) {
  return {
    id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    token,
    amount_usd,
    price_at_trade: price,
    reasoning: decision?.reasoning ?? '',
    confidence: decision?.confidence ?? 0,
    reflection: decision?.reflection ?? '',
    rootHash: null,
  };
}

module.exports = {
  getPortfolio,
  calculateTotalValue,
  executeTrade,
  updateRootHash,
};
