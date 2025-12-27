/**
 * Leaderboard Routes
 */

const express = require('express');
const router = express.Router();
const { getLeaderboard, getCouplesLeaderboard } = require('../controllers/leaderboardController');
const { authMiddleware } = require('../middlewares');

// Optional auth - will include user's rank if authenticated
router.use((req, res, next) => {
  // Try to authenticate but don't require it
  authMiddleware(req, res, (err) => {
    // Ignore auth errors, just continue
    next();
  });
});

/**
 * GET /api/leaderboard
 * Get top users leaderboard
 * Query: type=market_cap|gainers|losers|matches|active
 */
router.get('/', getLeaderboard);

/**
 * GET /api/leaderboard/couples
 * Get top couples by combined market cap
 */
router.get('/couples', getCouplesLeaderboard);

module.exports = router;
