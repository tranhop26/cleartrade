const express = require('express');
const router = express.Router();

// GET /api/portfolio — trả về trạng thái portfolio hiện tại
// TODO: implement in logic phase
router.get('/', (_req, res) => {
  res.json({ message: 'portfolio route — not yet implemented' });
});

module.exports = router;
