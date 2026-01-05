/**
 * Users Routes
 * User profile and stats endpoints
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const {
  getUserStats,
  getCurrentUser,
  updateProfile,
  getUserById,
  boostProfile,
  getBoostStatus,
  uploadAvatar,
  uploadPhoto,
  getBadgeStatus,
} = require('../controllers/usersController');

// Configure multer for memory storage (we'll handle file saving manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// GET /users/stats - Get current user's activity stats
router.get('/stats', getUserStats);

// GET /users/badge-status - Get notification badge counts
router.get('/badge-status', getBadgeStatus);

// GET /users/me - Get current user's full profile
router.get('/me', getCurrentUser);

// PUT /users/me - Update current user's profile
router.put('/me', updateProfile);

// POST /users/avatar - Upload avatar image
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// POST /users/photos - Upload profile photo for gallery
router.post('/photos', upload.single('photo'), uploadPhoto);

// GET /users/boost-status - Check boost status
router.get('/boost-status', getBoostStatus);

// POST /users/boost - Boost profile visibility (costs 500 $LOVE)
router.post('/boost', boostProfile);

// GET /users/:id - Get public profile of another user
router.get('/:id', getUserById);

module.exports = router;
