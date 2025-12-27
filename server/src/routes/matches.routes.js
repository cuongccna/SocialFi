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
  burnContract 
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
 * POST /api/matches/:id/mint
 * Mint relationship NFT contract
 */
router.post('/:id/mint', mintContract);

/**
 * POST /api/matches/:id/burn
 * Burn (end) relationship contract
 */
router.post('/:id/burn', burnContract);

module.exports = router;
