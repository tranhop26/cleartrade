const express = require('express');
const router = express.Router();

// POST /api/agent/run — kích hoạt một chu kỳ agent (lấy giá → AI → upload 0G)
// TODO: implement in logic phase
router.post('/run', (_req, res) => {
  res.json({ message: 'agent/run route — not yet implemented' });
});

module.exports = router;
