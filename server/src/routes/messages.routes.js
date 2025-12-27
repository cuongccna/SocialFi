/**
 * Messages Routes
 * Chat between matches
 */

const express = require('express');
const router = express.Router();
const { 
  getMessages, 
  sendMessage, 
  getConversations,
  getUnreadCount 
} = require('../controllers/messagesController');
const { authMiddleware } = require('../middlewares');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/messages/conversations
 * Get list of all conversations
 */
router.get('/conversations', getConversations);

/**
 * GET /api/messages/unread
 * Get unread message count
 */
router.get('/unread', getUnreadCount);

/**
 * GET /api/messages/:matchId
 * Get messages for a specific match
 */
router.get('/:matchId', getMessages);

/**
 * POST /api/messages/:matchId
 * Send a message
 */
router.post('/:matchId', sendMessage);

module.exports = router;
