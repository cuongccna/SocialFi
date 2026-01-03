/**
 * AI Routes
 * AI-powered features (Rizz God)
 */

const express = require('express');
const router = express.Router();
const { getAISuggestion } = require('../controllers/aiController');
const { authMiddleware } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/chat/ai-suggestion
 * Get AI-generated pickup line suggestions
 * Costs 20 $LOVE per use
 */
router.post('/ai-suggestion', getAISuggestion);

module.exports = router;
