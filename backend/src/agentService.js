'use strict';

/**
 * agentService.js — ClearTrade AI Brain
 * 
 * Follows patterns/COMPUTE.md from .0g-skills EXACTLY:
 *  - ALWAYS call processResponse() after EVERY inference request
 *  - ALWAYS use correct param order: processResponse(providerAddress, chatID, usageData)
 *  - ALWAYS extract ChatID from ZG-Res-Key header FIRST, body (data.id) as fallback
 *  - ALWAYS acknowledge provider before first use
 *  - ALWAYS check balance before making requests
 *  - NEVER use ethers v5 syntax
 * 
 * SDK: @0gfoundation/0g-compute-ts-sdk (renamed from @0glabs/0g-serving-broker)
 * Export: createInferenceBroker
 */

require('dotenv').config();
const { createZGComputeNetworkBroker } = require('@0gfoundation/0g-compute-ts-sdk');
const { ethers } = require('ethers');

// ── Network config (from NETWORK_CONFIG.md) ──────────────────────────────────
const RPC_URL = process.env.RPC_URL || 'https://evmrpc-testnet.0g.ai';

// ── Mock fallback (used when COMPUTE_PROVIDER_ADDRESS is not configured) ─────

function mockDecision(prices, portfolio) {
  const tokens = ['BTC', 'ETH', 'SOL'];
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  const actions = ['BUY', 'SELL', 'HOLD'];
  const weights = [0.4, 0.2, 0.4]; // Weighted toward BUY/HOLD for testing
  let r = Math.random();
  let action = 'HOLD';
  let cumulative = 0;
  for (let i = 0; i < actions.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) { action = actions[i]; break; }
  }

  const amount_usd = action === 'HOLD' ? 0 : parseFloat((Math.random() * 500 + 100).toFixed(2));
  const priceInfo = prices[token];

  return {
    action,
    token,
    amount_usd,
    reasoning: `[MOCK] ${token} is trading at $${priceInfo?.price?.toFixed(2) ?? 'N/A'} with a 24h change of ${priceInfo?.change24h?.toFixed(2) ?? 0}%. Portfolio cash: $${portfolio.cash_usd?.toFixed(2) ?? 0}. This is a mock decision for testing — configure COMPUTE_PROVIDER_ADDRESS in .env to enable real AI inference via 0G Compute Network.`,
    confidence: Math.floor(Math.random() * 4) + 3, // 3-6
    reflection: `[MOCK] Previous decisions cannot be evaluated without real AI inference. Configure 0G Compute to enable genuine reflection and learning.`,
  };
}

// ── 0G Compute inference ──────────────────────────────────────────────────────

async function callComputeAI(prompt, providerAddress) {
  // ethers v6 — NEVER use ethers.providers or ethers.utils (v5 patterns)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Broker lifecycle (COMPUTE.md §Broker Lifecycle)
  // createZGComputeNetworkBroker auto-detects testnet via chain ID 16602
  const broker = await createZGComputeNetworkBroker(wallet);

  // Auto-setup: create ledger account + deposit if needed
  let available = 0;
  try {
    const account = await broker.ledger.getLedger();
    // getLedger() returns tuple: [0]=address, [1]=totalBalance, [2]=availableBalance
    available = parseFloat(ethers.formatEther(account[2]));
    console.log(`[Agent] Ledger balance: ${available} 0G`);

    // If balance too low, try to top up (needs 3 0G minimum for new ledger, any amount if exists)
    if (available < 0.01) {
      console.log('[Agent] Balance low, depositing 3 0G...');
      await broker.ledger.depositFund(3);
      const acc2 = await broker.ledger.getLedger();
      available = parseFloat(ethers.formatEther(acc2[2]));
      console.log(`[Agent] Balance after top-up: ${available} 0G`);
    }
  } catch (ledgerErr) {
    if (ledgerErr.message && ledgerErr.message.includes('No ledger exists')) {
      // First time — create ledger (minimum 3 0G required by contract)
      console.log('[Agent] No ledger found. Creating with 3 0G deposit...');
      const walletBal = await provider.getBalance(wallet.address);
      const walletBalEth = parseFloat(ethers.formatEther(walletBal));
      if (walletBalEth < 3.01) {
        throw new Error(
          `Wallet balance too low: ${walletBalEth.toFixed(4)} 0G. ` +
          `Need at least 3.01 0G to create ledger. ` +
          `Get testnet tokens at: https://faucet.0g.ai`
        );
      }
      await broker.ledger.depositFund(3);
      console.log('[Agent] Ledger created with 3 0G deposit');
      const acc = await broker.ledger.getLedger();
      available = parseFloat(ethers.formatEther(acc[2]));
    } else {
      throw ledgerErr;
    }
  }

  // ALWAYS check balance before making inference requests
  console.log(`[Agent] Available balance: ${available} 0G`);
  if (available <= 0) {
    throw new Error('Insufficient 0G balance. Please deposit funds.');
  }

  // ALWAYS acknowledge provider before first use
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress);
    console.log('[Agent] Provider acknowledged OK');
  } catch (ackErr) {
    // May already be acknowledged — log and continue
    console.log('[Agent] Provider ack note:', ackErr.message);
  }

  // Get service metadata
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
  console.log(`[Agent] Using provider endpoint: ${endpoint}, model: ${model}`);

  // Generate auth headers (chatbot — no body needed for header generation)
  const headers = await broker.inference.getRequestHeaders(providerAddress);

  const messages = [
    {
      role: 'system',
      content: 'You are ClearTrade, a transparent AI paper trading agent. Paper trading means no real money — purely simulated. Respond ONLY with valid JSON, no other text.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  // Make inference request
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ messages, model, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Inference request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // ALWAYS extract ChatID from ZG-Res-Key header FIRST, body (data.id) as fallback
  let chatID = response.headers.get('ZG-Res-Key') || response.headers.get('zg-res-key');
  if (!chatID) chatID = data.id; // Fallback for chatbot only (COMPUTE.md §ChatID Extraction Rules)

  // ALWAYS call processResponse() after EVERY inference request
  // Param order: processResponse(providerAddress, chatID, usageData) — NEVER reverse!
  await broker.inference.processResponse(
    providerAddress,               // 1st: provider address
    chatID,                        // 2nd: response identifier
    JSON.stringify(data.usage),    // 3rd: JSON-stringified usage
  );

  console.log(`[Agent] processResponse() called. ChatID: ${chatID}`);

  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}

// ── Build prompt ──────────────────────────────────────────────────────────────

function buildPrompt(prices, portfolio, recentDecisions) {
  const last3 = (recentDecisions ?? []).slice(-3);
  const holdingsSummary = Object.entries(portfolio.holdings)
    .map(([token, qty]) => {
      const val = qty * (prices[token]?.price ?? 0);
      return `  ${token}: ${qty.toFixed(6)} units ($${val.toFixed(2)})`;
    })
    .join('\n');

  const recentSummary = last3.length
    ? last3.map((d, i) =>
        `  Decision ${i + 1}: ${d.action} ${d.token} $${d.amount_usd} @ $${d.price_at_trade} — Confidence: ${d.confidence}/10`
      ).join('\n')
    : '  No previous decisions yet.';

  return `
Current Market Prices:
  BTC: $${prices.BTC?.price?.toFixed(2)} (24h: ${prices.BTC?.change24h?.toFixed(2)}%, 7d: ${prices.BTC?.change7d?.toFixed(2)}%)
  ETH: $${prices.ETH?.price?.toFixed(2)} (24h: ${prices.ETH?.change24h?.toFixed(2)}%, 7d: ${prices.ETH?.change7d?.toFixed(2)}%)
  SOL: $${prices.SOL?.price?.toFixed(2)} (24h: ${prices.SOL?.change24h?.toFixed(2)}%, 7d: ${prices.SOL?.change7d?.toFixed(2)}%)

Portfolio State:
  Cash: $${portfolio.cash_usd?.toFixed(2)}
  Holdings:
${holdingsSummary}
  Total Trades: ${portfolio.trade_history?.length ?? 0}

Last 3 Decisions:
${recentSummary}

Based on this data, provide your trading decision as ONLY this JSON (no other text):
{
  "action": "BUY" or "SELL" or "HOLD",
  "token": "BTC" or "ETH" or "SOL",
  "amount_usd": <number, 0 if HOLD>,
  "reasoning": "<3-5 sentences citing specific price data>",
  "confidence": <integer 1-10>,
  "reflection": "<1-2 sentences honestly assessing if last decision was correct and why>"
}
`.trim();
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run the AI trading agent.
 * Falls back to mock when COMPUTE_PROVIDER_ADDRESS is not configured.
 * 
 * @param {{ BTC, ETH, SOL }} prices
 * @param {object} portfolio
 * @param {Array} recentDecisions - last N trade_history entries
 * @returns {object} decision { action, token, amount_usd, reasoning, confidence, reflection }
 */
async function runAgent(prices, portfolio, recentDecisions = []) {
  const providerAddress = process.env.COMPUTE_PROVIDER_ADDRESS;

  if (!providerAddress || providerAddress === 'will_fill_later' || !process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your_testnet_private_key_here') {
    console.log('[Agent] COMPUTE_PROVIDER_ADDRESS not configured — using mock decision');
    return mockDecision(prices, portfolio);
  }

  try {
    const prompt = buildPrompt(prices, portfolio, recentDecisions);
    console.log('[Agent] Calling 0G Compute inference...');
    const rawContent = await callComputeAI(prompt, providerAddress);

    // Parse JSON response — strip any accidental markdown fences
    const jsonStr = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const decision = JSON.parse(jsonStr);

    // Validate required fields
    const required = ['action', 'token', 'amount_usd', 'reasoning', 'confidence', 'reflection'];
    for (const field of required) {
      if (decision[field] === undefined) throw new Error(`Missing field in AI response: ${field}`);
    }

    console.log(`[Agent] Decision: ${decision.action} ${decision.token} $${decision.amount_usd}`);
    return decision;

  } catch (err) {
    console.error('[Agent] 0G Compute error — falling back to mock:', err.message);
    return mockDecision(prices, portfolio);
  }
}

module.exports = { runAgent };
