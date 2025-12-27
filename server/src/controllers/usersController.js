/**
 * Users Controller
 * User profile and stats
 */

const pool = require('../config/db');

/**
 * GET /users/stats
 * Get current user's activity stats
 */
async function getUserStats(req, res, next) {
  try {
    const userId = req.user.id;

    // Get various stats
    const [likesReceived, likesGiven, contractsMinted, marketRank] = await Promise.all([
      // Likes received (people who swiped right on user)
      pool.query(
        `SELECT COUNT(*) as count FROM swipes WHERE target_id = $1 AND action = 'LIKE'`,
        [userId]
      ),
      // Likes given (user swiped right on others)
      pool.query(
        `SELECT COUNT(*) as count FROM swipes WHERE actor_id = $1 AND action = 'LIKE'`,
        [userId]
      ),
      // Contracts minted
      pool.query(
        `SELECT COUNT(*) as count FROM relationships 
         WHERE (user_a = $1 OR user_b = $1) AND status = 'MINTED_CONTRACT'`,
        [userId]
      ),
      // Market rank
      pool.query(`
        SELECT rank FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY market_price DESC) as rank
          FROM users WHERE is_active = TRUE
        ) ranked WHERE id = $1
      `, [userId]),
    ]);

    res.json({
      success: true,
      stats: {
        likes_received: parseInt(likesReceived.rows[0].count) || 0,
        likes_given: parseInt(likesGiven.rows[0].count) || 0,
        contracts_minted: parseInt(contractsMinted.rows[0].count) || 0,
        market_rank: marketRank.rows[0]?.rank ? parseInt(marketRank.rows[0].rank) : null,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/me
 * Get current user's full profile
 */
async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        id,
        telegram_id,
        username,
        display_name,
        avatar_url,
        bio,
        wallet_address,
        wallet_rank,
        market_price,
        price_change_24h,
        balance_love,
        is_active,
        last_active_at,
        created_at
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /users/me
 * Update current user's profile
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { display_name, bio, avatar_url } = req.body;

    const result = await pool.query(`
      UPDATE users
      SET 
        display_name = COALESCE($2, display_name),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [userId, display_name, bio, avatar_url]);

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:id
 * Get public profile of another user
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id,
        username,
        display_name,
        avatar_url,
        bio,
        wallet_rank,
        market_price,
        price_change_24h,
        is_active,
        last_active_at,
        created_at
      FROM users
      WHERE id = $1 AND is_active = TRUE
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUserStats,
  getCurrentUser,
  updateProfile,
  getUserById,
};
