/**
 * Feed Controller
 * Handles the "Trading Floor" - finding nearby users to swipe
 * Uses Waterfall Logic to ensure users NEVER see an empty feed
 * 
 * Waterfall Priority:
 * 1. Users within radius (10km) not yet interacted
 * 2. Global users sorted by market_price (if < 5 results)
 * 3. Resurrection - Reset PASS swipes and return them (if still < 5)
 */

const { query } = require('../config/db');
const { ApiError } = require('../middlewares');
const config = require('../config');

const MIN_FEED_SIZE = 5; // Minimum profiles to show
const VIP_INJECT_COUNT = 2; // Number of VIP profiles to inject per feed

/**
 * GET /feed
 * Waterfall logic to always return profiles
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
    
    let users = [];
    let source = 'nearby'; // Track where results came from
    let resurrectedCount = 0;
    
    // =========================================
    // STEP 1: Priority - Users within radius
    // =========================================
    const nearbyQuery = `
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
        ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2) AS distance_km,
        'nearby' AS source
      FROM users u
      WHERE u.id != $3
        AND u.is_active = TRUE
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        -- Within radius
        AND calculate_distance_km($1, $2, u.latitude, u.longitude) <= $4
        -- Exclude ALL swiped users (LIKE, PASS, SUPERLIKE)
        AND u.id NOT IN (
          SELECT target_id 
          FROM swipes 
          WHERE actor_id = $3
        )
      ORDER BY 
        u.market_price DESC,
        calculate_distance_km($1, $2, u.latitude, u.longitude) ASC
      LIMIT $5
      OFFSET $6;
    `;
    
    const nearbyResult = await query(nearbyQuery, [lat, lng, userId, radiusKm, limit, offset]);
    users = nearbyResult.rows;
    
    // =========================================
    // STEP 2: Expansion - Global users if < MIN_FEED_SIZE
    // =========================================
    if (users.length < MIN_FEED_SIZE && offset === 0) {
      source = 'global';
      const remaining = limit - users.length;
      const excludeIds = users.map(u => u.id);
      
      const globalQuery = `
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
          CASE 
            WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
            THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
            ELSE NULL
          END AS distance_km,
          'global' AS source
        FROM users u
        WHERE u.id != $3
          AND u.is_active = TRUE
          -- Exclude already fetched nearby users
          AND u.id != ALL($4::uuid[])
          -- Exclude ALL swiped users
          AND u.id NOT IN (
            SELECT target_id 
            FROM swipes 
            WHERE actor_id = $3
          )
        ORDER BY 
          u.market_price DESC,
          u.created_at DESC
        LIMIT $5;
      `;
      
      const globalResult = await query(globalQuery, [lat, lng, userId, excludeIds, remaining]);
      users = [...users, ...globalResult.rows];
    }
    
    // =========================================
    // STEP 3: Resurrection - Reset PASS swipes if still < MIN_FEED_SIZE
    // =========================================
    if (users.length < MIN_FEED_SIZE && offset === 0) {
      source = 'resurrected';
      const remaining = limit - users.length;
      const excludeIds = users.map(u => u.id);
      
      // Find users who were PASSed (not LIKE or SUPERLIKE)
      // These are candidates for resurrection
      const passedUsersQuery = `
        SELECT target_id 
        FROM swipes 
        WHERE actor_id = $1 
          AND action = 'PASS'
          -- Exclude users who are already matched (mutual like)
          AND target_id NOT IN (
            SELECT CASE 
              WHEN user1_id = $1 THEN user2_id 
              ELSE user1_id 
            END
            FROM matches
            WHERE user1_id = $1 OR user2_id = $1
          )
        ORDER BY created_at ASC
        LIMIT $2;
      `;
      
      const passedResult = await query(passedUsersQuery, [userId, remaining]);
      const passedUserIds = passedResult.rows.map(r => r.target_id);
      
      if (passedUserIds.length > 0) {
        // Reset these PASS swipes (delete them)
        await query(`
          DELETE FROM swipes 
          WHERE actor_id = $1 
            AND action = 'PASS'
            AND target_id = ANY($2::uuid[]);
        `, [userId, passedUserIds]);
        
        resurrectedCount = passedUserIds.length;
        
        // Fetch the resurrected users
        const resurrectedQuery = `
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
            CASE 
              WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
              THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
              ELSE NULL
            END AS distance_km,
            'resurrected' AS source
          FROM users u
          WHERE u.id = ANY($3::uuid[])
            AND u.is_active = TRUE
            AND u.id != ALL($4::uuid[])
          ORDER BY u.market_price DESC;
        `;
        
        const resurrectedResult = await query(resurrectedQuery, [lat, lng, passedUserIds, excludeIds]);
        users = [...users, ...resurrectedResult.rows];
      }
    }
    
    // =========================================
    // STEP 4: VIP Injection - Always mix in 1-2 VIP profiles
    // VIPs appear even if user already swiped them (they "updated profile")
    // =========================================
    const vipQuery = `
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
        CASE 
          WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
          THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
          ELSE 5.0 -- Default distance for VIPs
        END AS distance_km,
        'vip' AS source
      FROM users u
      WHERE u.is_vip = TRUE
        AND u.is_active = TRUE
        AND u.id != $3
        -- Exclude VIPs already in current results
        AND u.id != ALL($4::uuid[])
      ORDER BY RANDOM()
      LIMIT $5;
    `;
    
    const existingIds = users.map(u => u.id);
    const vipResult = await query(vipQuery, [lat, lng, userId, existingIds, VIP_INJECT_COUNT]);
    
    if (vipResult.rows.length > 0) {
      // Update VIP last_active_at to NOW (always online)
      const vipIds = vipResult.rows.map(v => v.id);
      await query(`
        UPDATE users 
        SET last_active_at = NOW() 
        WHERE id = ANY($1::uuid[]);
      `, [vipIds]);
      
      // Shuffle VIPs into random positions in the feed
      const vips = vipResult.rows;
      vips.forEach(vip => {
        // Insert at random position (not first, to feel more natural)
        const minPos = Math.min(1, users.length);
        const maxPos = users.length;
        const randomPos = Math.floor(Math.random() * (maxPos - minPos + 1)) + minPos;
        users.splice(randomPos, 0, vip);
      });
    }
    
    // Get total available count (for pagination info)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE u.id != $1
        AND u.is_active = TRUE
        AND u.id NOT IN (
          SELECT target_id FROM swipes WHERE actor_id = $1
        );
    `;
    
    const countResult = await query(countQuery, [userId]);
    const totalAvailable = parseInt(countResult.rows[0].total);
    
    // Count by source
    const sourceBreakdown = {
      nearby: users.filter(u => u.source === 'nearby').length,
      global: users.filter(u => u.source === 'global').length,
      resurrected: users.filter(u => u.source === 'resurrected').length,
      vip: users.filter(u => u.source === 'vip').length,
    };
    
    res.json({
      success: true,
      data: {
        users: users,
        pagination: {
          total: totalAvailable + resurrectedCount,
          limit,
          offset,
          hasMore: totalAvailable > 0 || resurrectedCount > 0,
        },
        search: {
          radiusKm,
          coordinates: { lat, lng },
        },
        meta: {
          source,
          breakdown: sourceBreakdown,
          resurrectedCount,
          message: resurrectedCount > 0 
            ? `Brought back ${resurrectedCount} profiles you previously passed` 
            : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /feed/stats
 * Get feed statistics for current user
 */
async function getFeedStats(req, res, next) {
  try {
    const userId = req.user.id;
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND id != $1) as total_users,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1) as total_swiped,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND action = 'LIKE') as total_likes,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND action = 'PASS') as total_passes,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND action = 'SUPERLIKE') as total_superlikes,
        (SELECT COUNT(*) FROM matches WHERE user1_id = $1 OR user2_id = $1) as total_matches;
    `;
    
    const result = await query(statsQuery, [userId]);
    const stats = result.rows[0];
    
    const unswiped = parseInt(stats.total_users) - parseInt(stats.total_swiped);
    
    res.json({
      success: true,
      data: {
        totalUsers: parseInt(stats.total_users),
        totalSwiped: parseInt(stats.total_swiped),
        unswiped: unswiped,
        likes: parseInt(stats.total_likes),
        passes: parseInt(stats.total_passes),
        superlikes: parseInt(stats.total_superlikes),
        matches: parseInt(stats.total_matches),
        canResurrect: parseInt(stats.total_passes) > 0 && unswiped < MIN_FEED_SIZE,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /feed/resurrect
 * Manually trigger resurrection of passed profiles
 */
async function resurrectPasses(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.body.limit) || 10;
    
    // Find and delete PASS swipes (oldest first)
    const result = await query(`
      WITH deleted AS (
        DELETE FROM swipes 
        WHERE id IN (
          SELECT id FROM swipes 
          WHERE actor_id = $1 
            AND action = 'PASS'
            -- Don't resurrect matched users
            AND target_id NOT IN (
              SELECT CASE 
                WHEN user1_id = $1 THEN user2_id 
                ELSE user1_id 
              END
              FROM matches
              WHERE user1_id = $1 OR user2_id = $1
            )
          ORDER BY created_at ASC
          LIMIT $2
        )
        RETURNING target_id
      )
      SELECT COUNT(*) as resurrected_count FROM deleted;
    `, [userId, limit]);
    
    const resurrectedCount = parseInt(result.rows[0].resurrected_count);
    
    res.json({
      success: true,
      data: {
        resurrectedCount,
        message: resurrectedCount > 0 
          ? `${resurrectedCount} profiles have been brought back to your feed!`
          : 'No profiles to resurrect',
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
  getFeedStats,
  resurrectPasses,
  getTrending,
};
