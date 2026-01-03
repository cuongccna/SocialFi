/**
 * KYP (Know Your Partner) Game Routes
 */

const express = require('express');
const router = express.Router();
const kypController = require('../controllers/kypController');
const { authenticate } = require('../middlewares');

// All KYP routes require authentication
router.use(authenticate);

// Start a new KYP game
router.post('/start', kypController.startGame);

// Join an existing game
router.post('/join', kypController.joinGame);

// Get game state
router.get('/state/:sessionId', kypController.getGameState);

// Submit bet
router.post('/bet', kypController.submitBet);

// Submit answer
router.post('/answer', kypController.submitAnswer);

// Get final results
router.get('/results/:sessionId', kypController.getResults);

// Generate share image
router.post('/share', kypController.generateShareImage);

module.exports = router;
