/**
 * Images Routes
 * Blur-to-Earn feature
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const {
  sendImage,
  unblurImage,
  getPendingImages,
  getImage,
} = require('../controllers/imagesController');

// All routes require authentication
router.use(authMiddleware);

// GET /images/pending - Get pending blurred images
router.get('/pending', getPendingImages);

// GET /images/:id - Get image details
router.get('/:id', getImage);

// POST /images/send - Send blurred image
router.post('/send', sendImage);

// POST /images/:id/unblur - Pay to unblur
router.post('/:id/unblur', unblurImage);

module.exports = router;
