const express = require('express');
const router = express.Router();

// GET /api/history — danh sách quyết định + rootHash 0G Storage
// TODO: implement in logic phase
router.get('/', (_req, res) => {
  res.json({ message: 'history route — not yet implemented' });
});

module.exports = router;
