/**
 * Leaderboard Controller
 * Top users by market cap, matches, etc.
 */

const { pool, query } = require('../config/db');

/**
 * GET /leaderboard
 * Get top users by different criteria
 * Query params: type (market_cap | matches | activity), limit, offset
 */
async function getLeaderboard(req, res, next) {
  try {
    const { type = 'market_cap' } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    let orderBy = 'market_price DESC';
    let selectExtra = '';

    switch (type) {
      case 'market_cap':
        orderBy = 'market_price DESC';
        break;
      case 'gainers':
        orderBy = 'price_change_24h DESC';
        break;
      case 'losers':
        orderBy = 'price_change_24h ASC';
        break;
      case 'matches':
        // Special case - handled separately below
        break;
      case 'active':
        orderBy = 'last_active_at DESC NULLS LAST';
        break;
      default:
        orderBy = 'market_price DESC';
    }

    let result;
    
    if (type === 'matches') {
      // Special query for matches - need subquery for match_count
      result = await pool.query(`
        SELECT 
          u.id,
          u.display_name,
          u.username,
          u.avatar_url,
          u.wallet_rank,
          u.market_price,
          u.price_change_24h,
          u.balance_love,
          u.last_active_at,
          (SELECT COUNT(*) FROM relationships r WHERE r.user_a = u.id OR r.user_b = u.id) as match_count,
          ROW_NUMBER() OVER (ORDER BY (SELECT COUNT(*) FROM relationships r WHERE r.user_a = u.id OR r.user_b = u.id) DESC) as rank
        FROM users u
        WHERE u.is_active = TRUE
        ORDER BY match_count DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
    } else {
      result = await pool.query(`
        SELECT 
          u.id,
          u.display_name,
          u.username,
          u.avatar_url,
          u.wallet_rank,
          u.market_price,
          u.price_change_24h,
          u.balance_love,
          u.last_active_at,
          ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
        FROM users u
        WHERE u.is_active = TRUE
        ORDER BY ${orderBy}
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
    }

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE is_active = TRUE'
    );

    // Get current user's rank if authenticated
    let userRank = null;
    if (req.user?.id) {
      let rankQuery;
      if (type === 'matches') {
        // Special query for matches ranking
        rankQuery = `
          SELECT rank FROM (
            SELECT 
              u.id,
              ROW_NUMBER() OVER (ORDER BY (
                SELECT COUNT(*) FROM relationships r 
                WHERE r.user_a = u.id OR r.user_b = u.id
              ) DESC) as rank
            FROM users u
            WHERE u.is_active = TRUE
          ) ranked WHERE id = $1
        `;
      } else {
        rankQuery = `
          SELECT rank FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
            FROM users WHERE is_active = TRUE
          ) ranked WHERE id = $1
        `;
      }
      
      const rankResult = await pool.query(rankQuery, [req.user.id]);
      
      if (rankResult.rows.length > 0) {
        userRank = parseInt(rankResult.rows[0].rank);
      }
    }

    res.json({
      success: true,
      leaderboard: result.rows.map(row => ({
        ...row,
        rank: parseInt(row.rank),
      })),
      total: parseInt(countResult.rows[0].total),
      user_rank: userRank,
      type,
      limit,
      offset,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /leaderboard/couples
 * Top couples by combined market cap
 */
async function getCouplesLeaderboard(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(`
      SELECT 
        r.id as relationship_id,
        r.status,
        r.contract_address,
        r.start_date,
        u_a.id as user_a_id,
        u_a.display_name as user_a_name,
        u_a.avatar_url as user_a_avatar,
        u_a.market_price as user_a_price,
        u_b.id as user_b_id,
        u_b.display_name as user_b_name,
        u_b.avatar_url as user_b_avatar,
        u_b.market_price as user_b_price,
        (u_a.market_price + u_b.market_price) as combined_market_cap,
        ROW_NUMBER() OVER (ORDER BY (u_a.market_price + u_b.market_price) DESC) as rank
      FROM relationships r
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE r.status IN ('MATCHED', 'MINTED_CONTRACT')
      ORDER BY combined_market_cap DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM relationships 
      WHERE status IN ('MATCHED', 'MINTED_CONTRACT')
    `);

    res.json({
      success: true,
      couples: result.rows.map(row => ({
        ...row,
        rank: parseInt(row.rank),
      })),
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeaderboard,
  getCouplesLeaderboard,
};
