'use strict';

const axios = require('axios');

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

const COINGECKO_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'ClearTrade/1.0 (paper trading app)',
};

const COIN_MAP = {
  bitcoin:  'BTC',
  ethereum: 'ETH',
  solana:   'SOL',
};

// In-memory cache — prevents CoinGecko rate-limiting on every poll
let priceCache   = null;
let priceCacheAt = 0;
const CACHE_TTL  = 25_000; // 25 seconds

/**
 * Fetch current prices for BTC, ETH, SOL from CoinGecko (no API key).
 * Returns cached data if < 25s old to avoid 429 rate limiting.
 * @returns {{ BTC: { price, change24h, change7d }, ETH: {...}, SOL: {...} }}
 */
async function fetchPrices() {
  // Return cache if still fresh
  if (priceCache && Date.now() - priceCacheAt < CACHE_TTL) {
    return priceCache;
  }

  const url = `${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true&include_7d_change=true`;

  const { data } = await axios.get(url, {
    timeout: 12000,
    headers: COINGECKO_HEADERS,
  });

  const result = {};
  for (const [coinId, symbol] of Object.entries(COIN_MAP)) {
    const raw = data[coinId];
    if (!raw) continue;
    result[symbol] = {
      price:     raw.usd,
      change24h: raw.usd_24h_change ?? 0,
      change7d:  raw.usd_7d_change  ?? 0,
    };
  }

  // Update cache
  priceCache   = result;
  priceCacheAt = Date.now();

  return result;
}

/**
 * Fetch price history for a given coin.
 * @param {string} coinId - e.g. 'bitcoin', 'ethereum', 'solana'
 * @param {number} days   - number of days of history (default 7)
 * @returns {Array<[number, number]>} array of [timestamp_ms, price_usd]
 */
async function fetchPriceHistory(coinId, days = 7) {
  const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const { data } = await axios.get(url, {
    timeout: 12000,
    headers: COINGECKO_HEADERS,
  });
  return data.prices;
}

module.exports = { fetchPrices, fetchPriceHistory };
