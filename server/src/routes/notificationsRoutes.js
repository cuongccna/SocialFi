/**
 * Notifications Routes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAll,
} = require('../controllers/notificationsController');

// All routes require authentication
router.use(authMiddleware);

// GET /api/notifications - Get all notifications
router.get('/', getNotifications);

// POST /api/notifications/:id/read - Mark single notification as read
router.post('/:id/read', markAsRead);

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', markAllAsRead);

// DELETE /api/notifications - Clear all
router.delete('/', clearAll);

module.exports = router;
