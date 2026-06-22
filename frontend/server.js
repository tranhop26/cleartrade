'use strict';

/**
 * Production server for ClearTrade frontend.
 * Serves Vite build output (dist/) as static files.
 * Proxies /api/* requests to the backend service.
 *
 * Environment variables:
 *   PORT          - port to listen on (default: 4173)
 *   BACKEND_URL   - backend service URL (default: http://localhost:3001)
 */

const express    = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path       = require('path');

const app        = express();
const PORT       = process.env.PORT || 4173;
const BACKEND    = process.env.BACKEND_URL || 'http://localhost:3001';

// Proxy /api/* to backend — use pathFilter so Express doesn't strip the /api prefix
app.use(createProxyMiddleware({
  target:       BACKEND,
  changeOrigin: true,
  pathFilter:   '/api',
  on: {
    error: (err, req, res) => {
      console.error('[Proxy] Error:', err.message);
      res.status(502).json({ error: 'Backend unavailable' });
    },
  },
}));

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
