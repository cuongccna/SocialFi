/**
 * Feed Routes
 * The "Trading Floor" - finding and viewing users
 */

const express = require('express');
const router = express.Router();
const { getFeed, getTrending } = require('../controllers/feedController');
const { authMiddleware } = require('../middlewares');

// All feed routes require authentication
router.use(authMiddleware);

/**
 * GET /api/feed
 * Get users within radius for swiping
 * Query params: lat, lng, radius (km), limit, offset
 */
router.get('/', getFeed);

/**
 * GET /api/feed/trending
 * Get top users by market price
 * Query params: limit
 */
router.get('/trending', getTrending);

module.exports = router;
