/**
 * Referrals Controller
 * Invite friends and earn $LOVE
 */

const { pool, query } = require('../config/db');
const { ApiError } = require('../middlewares');
const crypto = require('crypto');

/**
 * Generate unique referral code
 */
function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * GET /referrals
 * Get user's referral stats and code
 */
async function getReferralInfo(req, res, next) {
  try {
    const userId = req.user.id;

    // Get or create referral code
    let user = await pool.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    let referralCode = user.rows[0].referral_code;

    if (!referralCode) {
      // Generate new code
      referralCode = generateReferralCode();
      await pool.query(
        'UPDATE users SET referral_code = $2 WHERE id = $1',
        [userId, referralCode]
      );
    }

    // Get referral stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(CASE WHEN reward_claimed = TRUE THEN 1 END) as claimed_referrals,
        COALESCE(SUM(CASE WHEN reward_claimed = TRUE THEN reward_amount ELSE 0 END), 0) as total_earned
      FROM referrals
      WHERE referrer_id = $1
    `, [userId]);

    // Get recent referrals
    const recentReferrals = await pool.query(`
      SELECT 
        r.id,
        r.created_at,
        r.reward_claimed,
        r.reward_amount,
        u.display_name as referred_name,
        u.avatar_url as referred_avatar
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [userId]);

    // Generate invite link - use Mini App deep link format
    const inviteLink = `https://t.me/GigEcoBot/GigEconomy?startapp=ref_${referralCode}`;

    res.json({
      success: true,
      referral_code: referralCode,
      invite_link: inviteLink,
      reward_per_referral: 50, // $LOVE per successful referral
      stats: {
        total_referrals: parseInt(stats.rows[0].total_referrals),
        claimed_referrals: parseInt(stats.rows[0].claimed_referrals),
        total_earned: parseFloat(stats.rows[0].total_earned),
        pending_rewards: parseInt(stats.rows[0].total_referrals) - parseInt(stats.rows[0].claimed_referrals),
      },
      recent_referrals: recentReferrals.rows,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /referrals/apply
 * Apply a referral code (called when new user signs up)
 */
async function applyReferralCode(req, res, next) {
  try {
    const userId = req.user.id;
    const { referral_code } = req.body;

    if (!referral_code) {
      throw new ApiError(400, 'Referral code is required');
    }

    // Check if user already used a referral
    const alreadyReferred = await pool.query(
      'SELECT referred_by FROM users WHERE id = $1',
      [userId]
    );

    if (alreadyReferred.rows[0].referred_by) {
      throw new ApiError(400, 'You have already used a referral code');
    }

    // Find referrer
    const referrer = await pool.query(
      'SELECT id FROM users WHERE referral_code = $1',
      [referral_code.toUpperCase()]
    );

    if (referrer.rows.length === 0) {
      throw new ApiError(404, 'Invalid referral code');
    }

    const referrerId = referrer.rows[0].id;

    // Can't refer yourself
    if (referrerId === userId) {
      throw new ApiError(400, 'You cannot use your own referral code');
    }

    // Apply referral
    await pool.query('BEGIN');

    try {
      // Update user's referred_by
      await pool.query(
        'UPDATE users SET referred_by = $2 WHERE id = $1',
        [userId, referrerId]
      );

      // Create referral record
      await pool.query(`
        INSERT INTO referrals (referrer_id, referred_id, referral_code, reward_amount)
        VALUES ($1, $2, $3, 50)
      `, [referrerId, userId, referral_code.toUpperCase()]);

      // Give bonus to new user (25 $LOVE for using a referral)
      await pool.query(
        'UPDATE users SET balance_love = balance_love + 25 WHERE id = $1',
        [userId]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Referral code applied! You received 25 $LOVE bonus!',
        bonus: 25,
      });

    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    next(err);
  }
}

/**
 * POST /referrals/claim
 * Claim pending referral rewards (when referred user becomes active)
 */
async function claimReferralRewards(req, res, next) {
  try {
    const userId = req.user.id;

    // Find unclaimed referrals where referred user has been active
    const unclaimed = await pool.query(`
      SELECT r.id, r.reward_amount
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = $1 
        AND r.reward_claimed = FALSE
        AND (
          -- Referred user has swiped at least once
          EXISTS(SELECT 1 FROM swipes WHERE actor_id = u.id)
        )
    `, [userId]);

    if (unclaimed.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No pending rewards to claim',
        claimed: 0,
        total_reward: 0,
      });
    }

    const totalReward = unclaimed.rows.reduce((sum, r) => sum + parseFloat(r.reward_amount), 0);
    const referralIds = unclaimed.rows.map(r => r.id);

    await pool.query('BEGIN');

    try {
      // Mark as claimed
      await pool.query(
        'UPDATE referrals SET reward_claimed = TRUE WHERE id = ANY($1)',
        [referralIds]
      );

      // Add rewards to user balance
      await pool.query(
        'UPDATE users SET balance_love = balance_love + $2 WHERE id = $1',
        [userId, totalReward]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: `Claimed ${totalReward} $LOVE from ${unclaimed.rows.length} referrals!`,
        claimed: unclaimed.rows.length,
        total_reward: totalReward,
      });

    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReferralInfo,
  applyReferralCode,
  claimReferralRewards,
};
