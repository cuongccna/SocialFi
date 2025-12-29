/**
 * Matches Routes
 * Relationships and matches endpoints
 */

const express = require('express');
const router = express.Router();
const { 
  getMatches, 
  getMatchById, 
  mintContract, 
  burnContract,
  harvestLove,
  getFarmingStatus,
} = require('../controllers/matchesController');
const { authMiddleware } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/matches
 * Get all matches for current user
 */
router.get('/', getMatches);

/**
 * GET /api/matches/:id
 * Get specific match details
 */
router.get('/:id', getMatchById);

/**
 * GET /api/matches/:id/farming
 * Get yield farming status for a relationship
 */
router.get('/:id/farming', getFarmingStatus);

/**
 * POST /api/matches/:id/mint
 * Mint relationship NFT contract
 */
router.post('/:id/mint', mintContract);

/**
 * POST /api/matches/:id/burn
 * Burn (end) relationship contract
 */
router.post('/:id/burn', burnContract);

/**
 * POST /api/matches/:id/harvest
 * Harvest accrued $LOVE from yield farming
 */
router.post('/:id/harvest', harvestLove);

module.exports = router;
