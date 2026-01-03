/**
 * Games Routes
 * API endpoints for the Game Arcade feature
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const gamesController = require('../controllers/gamesController');
const kypRoutes = require('./kyp.routes');
const miningRoutes = require('./mining.routes');
const candleRoutes = require('./candle.routes');

// All routes require authentication
router.use(authMiddleware);

// KYP (Know Your Partner) game routes
router.use('/kyp', kypRoutes);

// Mining (Love Mining Rig) game routes
router.use('/mining', miningRoutes);

// Candle Kiss (High Risk Betting) game routes
router.use('/candle', candleRoutes);

// GET /games/stats - Get user's game statistics
router.get('/stats', gamesController.getGameStats);

// POST /games/use-ticket - Use a ticket to play a game
router.post('/use-ticket', gamesController.useTicket);

// POST /games/refill-tickets - Refill tickets by burning $LOVE
router.post('/refill-tickets', gamesController.refillTickets);

// POST /games/submit-score - Submit game score
router.post('/submit-score', gamesController.submitScore);

// GET /games/leaderboard - Get game leaderboard
router.get('/leaderboard', gamesController.getLeaderboard);

module.exports = router;
