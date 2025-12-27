/**
 * Referrals Routes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares');
const { getReferralInfo, applyReferralCode, claimReferralRewards } = require('../controllers/referralsController');

router.use(authMiddleware);

router.get('/', getReferralInfo);
router.post('/apply', applyReferralCode);
router.post('/claim', claimReferralRewards);

module.exports = router;
