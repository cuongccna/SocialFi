/**
 * Feed Routes
 * The "Trading Floor" - finding and viewing users
 * Uses Waterfall Logic to ensure users NEVER see an empty feed
 */

const express = require('express');
const router = express.Router();
const { getFeed, getFeedStats, resurrectPasses, getTrending, debugFeed } = require('../controllers/feedController');
const { authMiddleware } = require('../middlewares');

// Debug route (NO auth required for testing)
router.get('/debug', debugFeed);

// All feed routes require authentication
router.use(authMiddleware);

/**
 * GET /api/feed
 * Get users for swiping with Waterfall Logic:
 * 1. Nearby users (within radius)
 * 2. Global users (if < 5 nearby)
 * 3. Resurrected passes (if swiped everyone)
 * Query params: lat, lng, radius (km), limit, offset
 */
router.get('/', getFeed);

/**
 * GET /api/feed/stats
 * Get feed statistics for current user
 * Returns: totalUsers, totalSwiped, unswiped, likes, passes, matches
 */
router.get('/stats', getFeedStats);

/**
 * POST /api/feed/resurrect
 * Manually trigger resurrection of passed profiles
 * Body: { limit: 10 }
 */
router.post('/resurrect', resurrectPasses);

/**
 * GET /api/feed/trending
 * Get top users by market price
 * Query params: limit
 */
router.get('/trending', getTrending);

module.exports = router;
