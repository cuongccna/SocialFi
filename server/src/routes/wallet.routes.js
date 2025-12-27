/**
 * Wallet Routes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const { connectWallet, disconnectWallet, getWalletStatus } = require('../controllers/walletController');

router.use(authMiddleware);

router.get('/status', getWalletStatus);
router.post('/connect', connectWallet);
router.delete('/disconnect', disconnectWallet);

module.exports = router;
