/**
 * Mining Game Routes
 * API endpoints for the Love Mining Rig co-op tapper game
 */

const express = require('express');
const router = express.Router();
const miningController = require('../controllers/miningController');
const { authMiddleware } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

// Start a new mining session
router.post('/start', miningController.startSession);

// Join an existing session
router.post('/join', miningController.joinSession);

// Get mining state
router.get('/state/:sessionId', miningController.getState);

// Get user's stamina
router.get('/stamina', miningController.getStamina);

// Submit tap batch
router.post('/taps', miningController.submitTaps);

// End mining session
router.post('/end', miningController.endSession);

module.exports = router;
