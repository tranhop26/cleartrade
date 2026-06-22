# ClearTrade — AI Paper Trading Agent on 0G Network

> **Live Demo**: 🔗 *(URL after deployment)*

ClearTrade is a transparent, on-chain AI paper trading agent built for the [Zero Cup](https://zerocup.0g.ai) hackathon. Every AI trading decision is logged to **0G Storage** with a verifiable root hash — anyone can verify what the AI decided, when, and why.

---

## 🌟 What Makes It Different

Unlike black-box trading bots, ClearTrade is **fully auditable**:
- Every decision is stored immutably on **0G Storage** (decentralized storage network)
- Each trade record has a `rootHash` — verifiable at [storagescan-galileo.0g.ai](https://storagescan-galileo.0g.ai)
- AI inference runs on **0G Compute Network** (Qwen 2.5 Omni 7B model in TEE)
- No centralized database — all decisions are on-chain

---

## 🔧 0G Features Used

| Feature | Usage |
|---------|-------|
| **0G Storage** | Every AI trading decision is uploaded as JSON. Returns a Merkle root hash for verification. |
| **0G Compute** | AI inference via `@0gfoundation/0g-compute-ts-sdk` — runs Qwen 2.5 on 0G's TEE-verified GPU network |
| **0G Chain (Galileo Testnet)** | All storage transactions are on-chain at `evmrpc-testnet.0g.ai` |

---

## 🏗️ Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 18 + Vite, Recharts, Inter + JetBrains Mono fonts |
| **Backend** | Node.js + Express |
| **AI** | `@0gfoundation/0g-compute-ts-sdk` (Qwen 2.5 Omni 7B) |
| **Storage** | `@0gfoundation/0g-storage-ts-sdk` |
| **Prices** | CoinGecko API (no key needed) |
| **Deploy** | Railway (backend + frontend) |

---

## 🚀 Run Locally

### Prerequisites
- Node.js >= 20
- A wallet with testnet 0G tokens ([faucet.0g.ai](https://faucet.0g.ai))

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/cleartrade.git
cd cleartrade

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and set your PRIVATE_KEY
```

```env
PRIVATE_KEY=0x...your_testnet_key
RPC_URL=https://evmrpc-testnet.0g.ai
STORAGE_INDEXER=https://indexer-storage-testnet-turbo.0g.ai
COMPUTE_PROVIDER_ADDRESS=0xa48f01287233509FD694a22Bf840225062E67836
PORT=3001
```

### 3. Start Backend

```bash
cd backend
node src/index.js
# → Running on http://localhost:3001
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
# → Running on http://localhost:5173
```

### 5. Open Browser

Visit `http://localhost:5173` and click **▶ RUN AGENT**

---

## 📐 Architecture

```
Browser (React)
    ↓ /api/*
Express Server (Node.js)
    ├── GET /api/prices      → CoinGecko API
    ├── GET /api/portfolio   → local JSON file
    ├── POST /api/run-agent  → 0G Compute (AI inference)
    │       └── result       → 0G Storage (immutable log)
    └── GET /api/decisions   → trade history
```

## 🔍 Verifying a Decision on 0G

Each decision card in the UI shows a `rootHash`. To verify:

1. Copy the `rootHash` value (e.g., `0x8c72f6849f9ecc6b08...`)
2. Visit [storagescan-galileo.0g.ai](https://storagescan-galileo.0g.ai)
3. Search for the hash — you'll see the exact JSON the AI produced

---

## 📁 Project Structure

```
cleartrade/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server + API routes
│   │   ├── agentService.js   # 0G Compute inference
│   │   ├── storageService.js # 0G Storage upload/download
│   │   ├── portfolioService.js
│   │   └── priceService.js   # CoinGecko with 25s cache
│   └── data/portfolio.json   # Portfolio state (gitignored in prod)
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main dashboard
    │   ├── api/client.js     # Axios wrapper
    │   └── index.css         # Design system
    └── server.js             # Production static server + API proxy
```

---

## 🏆 Zero Cup Submission

- **Track**: DeFi / AI Agents
- **0G Features**: Storage + Compute + Chain
- **Transparency**: Every AI decision verifiable on-chain
