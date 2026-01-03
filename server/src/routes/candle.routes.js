/**
 * Candle Kiss Game Routes
 * API endpoints for the high-risk co-op betting game
 */

const express = require('express');
const router = express.Router();
const candleKissController = require('../controllers/candleKissController');
const { authMiddleware } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

// Start a new session
router.post('/start', candleKissController.startSession);

// Join existing session
router.post('/join', candleKissController.joinSession);

// Get session state
router.get('/state/:sessionId', candleKissController.getState);

// Propose a bet direction
router.post('/propose', candleKissController.proposeBet);

// Accept partner's proposal
router.post('/accept', candleKissController.acceptBet);

// Reject partner's proposal
router.post('/reject', candleKissController.rejectBet);

// Get game result
router.get('/result/:sessionId', candleKissController.getResult);

module.exports = router;
