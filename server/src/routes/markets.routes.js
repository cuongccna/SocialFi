/**
 * Markets Routes
 * Prediction markets endpoints
 */

const express = require('express');
const router = express.Router();
const { 
  getMarkets, 
  getMarketById, 
  placeBet, 
  getUserBets,
  createMarket 
} = require('../controllers/marketsController');
const { authMiddleware } = require('../middlewares');

/**
 * GET /api/markets
 * Get all open markets (requires auth to show user's bets)
 */
router.get('/', authMiddleware, getMarkets);

/**
 * GET /api/markets/:id
 * Get specific market details
 */
router.get('/:id', (req, res, next) => {
  // Optional auth to get user's bet
  authMiddleware(req, res, () => next());
}, getMarketById);

/**
 * POST /api/markets/:id/bet
 * Place a bet (requires auth)
 */
router.post('/:id/bet', authMiddleware, placeBet);

/**
 * GET /api/markets/user/bets
 * Get user's bets (requires auth)
 */
router.get('/user/bets', authMiddleware, getUserBets);

/**
 * POST /api/markets/create
 * Create new market (requires auth)
 */
router.post('/create', authMiddleware, createMarket);

module.exports = router;
