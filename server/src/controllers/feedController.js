/**
 * Feed Controller
 * Handles the "Trading Floor" - finding nearby users to swipe
 * Uses Haversine formula for distance calculation (no PostGIS required)
 */

const { query } = require('../config/db');
const { ApiError } = require('../middlewares');
const config = require('../config');

/**
 * GET /feed
 * Find users within radius, excluding self and already swiped
 * Sorted by market_price (trending) then distance
 */
async function getFeed(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Get query params with default fallback to HCMC center
    const lat = parseFloat(req.query.lat) || 10.8231;
    const lng = parseFloat(req.query.lng) || 106.6297;
    const radiusKm = Math.min(
      parseFloat(req.query.radius) || config.constants.DEFAULT_SEARCH_RADIUS_KM,
      config.constants.MAX_SEARCH_RADIUS_KM
    );
    const limit = parseInt(req.query.limit) || config.constants.FEED_LIMIT;
    const offset = parseInt(req.query.offset) || 0;
    
    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ApiError(400, 'Coordinates out of range. lat: -90 to 90, lng: -180 to 180');
    }
    
    // Update current user's location
    await query(
      `UPDATE users 
       SET latitude = $1,
           longitude = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [lat, lng, userId]
    );
    
    // Main feed query using Haversine function
    const feedQuery = `
      SELECT 
        u.id,
        u.telegram_id,
        u.username,
        u.display_name,
        u.bio,
        u.avatar_url,
        u.wallet_rank,
        u.market_price,
        u.price_change_24h,
        ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2) AS distance_km
      FROM users u
      WHERE u.id != $3
        AND u.is_active = TRUE
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        -- Within radius using Haversine formula
        AND calculate_distance_km($1, $2, u.latitude, u.longitude) <= $4
        -- Exclude already swiped users
        AND u.id NOT IN (
          SELECT target_id 
          FROM swipes 
          WHERE actor_id = $3
        )
      ORDER BY 
        -- Trending users first (high market price)
        u.market_price DESC,
        -- Then by distance
        calculate_distance_km($1, $2, u.latitude, u.longitude) ASC
      LIMIT $5
      OFFSET $6;
    `;
    
    const result = await query(feedQuery, [lat, lng, userId, radiusKm, limit, offset]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE u.id != $3
        AND u.is_active = TRUE
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND calculate_distance_km($1, $2, u.latitude, u.longitude) <= $4
        AND u.id NOT IN (
          SELECT target_id FROM swipes WHERE actor_id = $3
        );
    `;
    
    const countResult = await query(countQuery, [lat, lng, userId, radiusKm]);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + result.rows.length < total,
        },
        search: {
          radiusKm,
          coordinates: { lat, lng },
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /feed/trending
 * Get top users by market price (global leaderboard)
 */
async function getTrending(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await query(`
      SELECT 
        id,
        telegram_id,
        username,
        display_name,
        avatar_url,
        wallet_rank,
        market_price,
        price_change_24h,
        RANK() OVER (ORDER BY market_price DESC) as rank
      FROM users
      WHERE is_active = TRUE
      ORDER BY market_price DESC
      LIMIT $1;
    `, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFeed,
  getTrending,
};
