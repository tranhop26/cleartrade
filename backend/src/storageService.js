'use strict';

/**
 * storageService.js
 * 
 * Follows patterns/STORAGE.md from .0g-skills EXACTLY:
 *  - ALWAYS generate Merkle tree BEFORE uploading
 *  - ALWAYS close ZgFile handles in try/finally (no memory leaks)
 *  - ALWAYS store root hashes — the ONLY way to retrieve files
 *  - Use verified downloads (third param = true) for data integrity
 * 
 * Network: 0G-Galileo Testnet
 *  RPC:     https://evmrpc-testnet.0g.ai
 *  Indexer: https://indexer-storage-testnet-turbo.0g.ai
 */

require('dotenv').config();
const { ZgFile, Indexer, MemData } = require('@0gfoundation/0g-storage-ts-sdk');
const { ethers } = require('ethers');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ── Network config (from NETWORK_CONFIG.md) ──────────────────────────────────
const RPC_URL = process.env.RPC_URL || 'https://evmrpc-testnet.0g.ai';
const STORAGE_INDEXER = process.env.STORAGE_INDEXER || 'https://indexer-storage-testnet-turbo.0g.ai';

function getWallet() {
  if (!process.env.PRIVATE_KEY || process.env.PRIVATE_KEY === 'your_testnet_private_key_here') {
    throw new Error('PRIVATE_KEY not configured in .env');
  }
  // ethers v6 syntax — NEVER use ethers.providers or ethers.utils (v5)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
}

// ── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload JSON data to 0G Storage.
 * Follows STORAGE.md upload pattern exactly — uses temp file for MemData.
 * 
 * @param {object} data - any JSON-serialisable object
 * @returns {{ rootHash: string|null, txHash: string|null, timestamp: string, error?: string }}
 */
async function logToStorage(data) {
  const timestamp = new Date().toISOString();

  // Write JSON to a temp file (SDK requires a file path)
  const tempPath = path.join(os.tmpdir(), `cleartrade-${Date.now()}.json`);

  try {
    // Add upload metadata to guarantee unique Merkle root every time
    // (prevents REPLACEMENT_UNDERPRICED when same data uploaded twice)
    const payload = {
      ...data,
      _uploadMeta: {
        timestamp,
        nonce: Math.random().toString(36).slice(2),
        service: 'ClearTrade',
        network: '0G-Galileo-Testnet',
      },
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf-8');

    const wallet = getWallet();
    const indexer = new Indexer(STORAGE_INDEXER);

    // Open ZgFile — MUST close in finally
    const file = await ZgFile.fromFilePath(tempPath);

    try {
      // ALWAYS generate Merkle tree BEFORE uploading
      const [tree, treeErr] = await file.merkleTree();
      if (treeErr) throw treeErr;

      const rootHash = tree.rootHash();
      console.log(`[Storage] Merkle root: ${rootHash}`);

      // Upload options — skipIfFinalized:false ensures fresh tx per upload,
      // avoiding REPLACEMENT_UNDERPRICED when same hash uploaded consecutively
      const uploadOptions = {
        skipIfFinalized: false,
        taskSize: 1,
        expectedReplica: 1,
        finalityRequired: true,
      };

      // Small delay so consecutive uploads don't conflict on nonce
      await new Promise(r => setTimeout(r, 1500));

      // Upload to 0G Storage Turbo Testnet
      const [tx, uploadErr] = await indexer.upload(file, RPC_URL, wallet, uploadOptions);
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message ?? uploadErr}`);

      console.log(`[Storage] Upload tx hash saved, rootHash=${rootHash}`);
      return { rootHash, txHash: typeof tx === 'string' ? tx : (tx?.hash ?? null), timestamp };

    } finally {
      // ALWAYS close file handles — prevents memory leaks
      await file.close();
    }

  } catch (err) {
    // Log error but DON'T crash the API
    console.error('[Storage] Upload error:', err.message ?? err);
    return { rootHash: null, txHash: null, timestamp, error: err.message ?? String(err) };

  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tempPath); } catch (_) {}
  }
}

// ── Download ─────────────────────────────────────────────────────────────────

/**
 * Read data back from 0G Storage by root hash.
 * Uses verified download (third param = true) per SECURITY.md.
 * 
 * @param {string} rootHash
 * @returns {object} parsed JSON data
 */
async function readFromStorage(rootHash) {
  const indexer = new Indexer(STORAGE_INDEXER);
  const outputPath = path.join(os.tmpdir(), `cleartrade-dl-${Date.now()}.json`);

  try {
    // download() can throw OR return an error — always use try/catch (STORAGE.md)
    const err = await indexer.download(rootHash, outputPath, /* verified= */ true);
    if (err) throw err;

    const raw = fs.readFileSync(outputPath, 'utf-8');
    return JSON.parse(raw);

  } catch (error) {
    throw new Error(`Download failed: ${error.message ?? error}`);

  } finally {
    try { fs.unlinkSync(outputPath); } catch (_) {}
  }
}

module.exports = { logToStorage, readFromStorage };
