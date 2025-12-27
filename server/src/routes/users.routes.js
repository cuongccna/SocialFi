/**
 * Users Routes
 * User profile and stats endpoints
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const {
  getUserStats,
  getCurrentUser,
  updateProfile,
  getUserById,
} = require('../controllers/usersController');

// All routes require authentication
router.use(authMiddleware);

// GET /users/stats - Get current user's activity stats
router.get('/stats', getUserStats);

// GET /users/me - Get current user's full profile
router.get('/me', getCurrentUser);

// PUT /users/me - Update current user's profile
router.put('/me', updateProfile);

// GET /users/:id - Get public profile of another user
router.get('/:id', getUserById);

module.exports = router;
