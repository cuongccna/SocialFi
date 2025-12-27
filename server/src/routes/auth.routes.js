/**
 * Auth Routes
 * Handles Telegram authentication
 */

const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

// POST /api/auth/login - Authenticate via Telegram initData
router.post('/login', authMiddleware, login);

// GET /api/auth/me - Get current user profile
router.get('/me', authMiddleware, getMe);

module.exports = router;
