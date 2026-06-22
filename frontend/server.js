'use strict';

/**
 * Production server for ClearTrade frontend.
 * Serves Vite build output (dist/) as static files.
 * Manually proxies /api/* to backend using axios.
 *
 * Environment variables:
 *   PORT          - port to listen on (default: 4173)
 *   BACKEND_URL   - backend service URL (default: http://localhost:3001)
 */

const express = require('express');
const axios   = require('axios');
const path    = require('path');

const app     = express();
const PORT    = process.env.PORT || 4173;
const BACKEND = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

app.use(express.json());

// Proxy /api/* → backend
// NOTE: req.path is stripped (e.g. /health from /api/health)
// so we reconstruct the full /api/xxx path manually
app.all('/api/*', async (req, res) => {
  const qs = Object.keys(req.query).length ? '?' + new URLSearchParams(req.query).toString() : '';
  const targetUrl = `${BACKEND}/api${req.path}${qs}`;
  try {
    const response = await axios({
      method:  req.method,
      url:     targetUrl,
      data:    req.method !== 'GET' ? req.body : undefined,
      headers: { 'content-type': 'application/json' },
      timeout: 30000,
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const body   = err.response?.data  || { error: 'Backend unavailable', detail: err.message };
    res.status(status).json(body);
  }
});

// Serve Vite build
const DIST = path.join(__dirname, 'dist');
app.use(express.static(DIST));

// SPA fallback — all routes serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🖥️  ClearTrade Frontend on http://localhost:${PORT}`);
  console.log(`   Backend proxy → ${BACKEND}`);
});
