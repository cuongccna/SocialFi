/**
 * Disputes Routes (Jury DAO)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  getDisputes,
  getMyDisputes,
  getDisputeById,
  createDispute,
  voteOnDispute,
  getJuryStats,
} = require('../controllers/disputesController');

// All routes require authentication
router.use(authMiddleware);

// GET /disputes - Get open disputes for voting
router.get('/', getDisputes);

// GET /disputes/stats - Get user's jury stats
router.get('/stats', getJuryStats);

// GET /disputes/my - Get user's own disputes
router.get('/my', getMyDisputes);

// GET /disputes/:id - Get dispute by ID
router.get('/:id', getDisputeById);

// POST /disputes - Create new dispute
router.post('/', createDispute);

// POST /disputes/:id/vote - Vote on dispute
router.post('/:id/vote', voteOnDispute);

module.exports = router;
