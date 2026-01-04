/**
 * Shop Routes
 * Love Decor Shop - Buy and equip decorations
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const shopController = require('../controllers/shopController');

// All routes require authentication
router.use(authMiddleware);

// GET /api/shop/items - Get all shop items
router.get('/items', shopController.getShopItems);

// GET /api/shop/inventory - Get user's owned items
router.get('/inventory', shopController.getUserInventory);

// POST /api/shop/buy - Purchase an item
router.post('/buy', shopController.buyItem);

// POST /api/shop/equip - Equip an item to relationship
router.post('/equip', shopController.equipItem);

// POST /api/shop/unequip - Unequip an item
router.post('/unequip', shopController.unequipItem);

// GET /api/shop/decor/:relationshipId - Get relationship's active decor
router.get('/decor/:relationshipId', shopController.getRelationshipDecor);

module.exports = router;
