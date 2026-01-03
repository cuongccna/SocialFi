/**
 * API Routes
 * All routes are prefixed with /api
 */

const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CryptoCrush API is running! 🚀',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Feature routes
router.use('/auth', require('./auth.routes'));
router.use('/feed', require('./feed.routes'));
router.use('/swipe', require('./swipe.routes'));
router.use('/matches', require('./matches.routes'));
router.use('/leaderboard', require('./leaderboard.routes'));
router.use('/markets', require('./markets.routes'));
router.use('/messages', require('./messages.routes'));
router.use('/disputes', require('./disputes.routes'));
router.use('/images', require('./images.routes'));
router.use('/users', require('./users.routes'));
router.use('/tasks', require('./tasks.routes'));
router.use('/referrals', require('./referrals.routes'));
router.use('/wallet', require('./wallet.routes'));
router.use('/fud', require('./fud.routes'));
router.use('/games', require('./games.routes'));

module.exports = router;
