/**
 * FUD Routes
 * Fear, Uncertainty, Doubt mechanism endpoints
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const {
  fudUser,
  getFudStatus,
  getFudReceived,
} = require('../controllers/fudController');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/fud
 * FUD a matched user (dump their price by 15%)
 */
router.post('/', fudUser);

/**
 * GET /api/fud/received
 * Get FUD reports received by current user
 */
router.get('/received', getFudReceived);

/**
 * GET /api/fud/status/:targetId
 * Check FUD cooldown status for a specific target
 */
router.get('/status/:targetId', getFudStatus);

module.exports = router;
