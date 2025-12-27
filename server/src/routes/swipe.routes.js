/**
 * Action Routes
 * Swipes and interactions
 */

const express = require('express');
const router = express.Router();
const { swipe, getSwipeHistory } = require('../controllers/actionController');
const { authMiddleware } = require('../middlewares');

// All action routes require authentication
router.use(authMiddleware);

/**
 * POST /api/swipe
 * Process a swipe action
 * Body: { target_id, action: 'LIKE' | 'PASS' | 'SUPER' }
 */
router.post('/', swipe);

/**
 * GET /api/swipe/history
 * Get user's swipe history
 * Query params: limit, offset
 */
router.get('/history', getSwipeHistory);

module.exports = router;
