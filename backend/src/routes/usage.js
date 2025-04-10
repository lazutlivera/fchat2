const express = require('express');
const router = express.Router();
const { getUsageStats } = require('../services/database');

router.get('/stats', async (req, res) => {
  try {
    const timeframe = req.query.timeframe || 'day';
    const stats = await getUsageStats(timeframe);
    res.json(stats);
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

module.exports = router; 