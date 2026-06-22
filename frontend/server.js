const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Proxy API calls — pathRewrite adds /api back since Express strips it
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: { '^/': '/api/' }
}));

// Serve React static files
app.use(express.static(path.join(__dirname, 'dist')));

// All routes → index.html (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Proxying /api/* to: ${BACKEND_URL}`);
});
