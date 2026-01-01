/**
 * Feed Controller - INFINITE FEED EDITION
 * 
 * Implements Waterfall Logic to ensure users NEVER see an empty screen.
 * 
 * Strategy:
 * 1. LOCAL DISCOVERY: Users within radius (default 10km)
 * 2. GLOBAL EXPANSION: Hot profiles worldwide if local < 5
 * 3. RESURRECTION: Bring back PASS'd users if still < 5
 * 
 * The user will ALWAYS get profiles unless the database is completely empty.
 */

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');
const config = require('../config');

// ============================================
// CONSTANTS
// ============================================
const MIN_FEED_SIZE = 5;          // Minimum profiles before triggering next step
const TARGET_FEED_SIZE = 10;      // Target number of profiles to return
const DEFAULT_RADIUS_KM = 10;     // Default search radius
const MAX_RADIUS_KM = 500;        // Maximum search radius

// ============================================
// SEED DATA (For Genesis Protocol)
// ============================================
const SEED_FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Parker', 'Skyler', 'Drew', 'Jamie', 'Reese', 'Finley', 'Sage', 'River', 'Phoenix', 'Rowan', 'Eden', 'Blake'];
const SEED_LAST_NAMES = ['Nakamoto', 'Buterin', 'Wood', 'Sun', 'Zhao', 'Armstrong', 'Saylor', 'Hoskinson', 'Musk', 'Larsen', 'McCaleb', 'Lee', 'Ver', 'Novogratz', 'Silbert', 'Draper', 'Powell', 'Lubin', 'Bankman', 'Kwon'];
const SEED_BIOS = [
  '🚀 To the moon or bust! HODL gang', '💎 Diamond hands only.', '📈 DeFi degen | Yield farmer', '🐋 Whale watching enthusiast', '⚡ Lightning fast trades', '🌙 Night trader', '💰 Building generational wealth', '🔥 FOMO is my middle name', '🎯 Precision trading', '🌊 Riding the waves', '🦍 Ape together strong 🍌', '📊 Technical analysis nerd', '💸 Making money while you sleep', '🎰 High risk, high reward', '🔮 Crypto psychic'
];
const SEED_RANKS = ['SHRIMP', 'SHRIMP', 'SHRIMP', 'SHARK', 'SHARK', 'WHALE'];

function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ============================================
// HELPER: Build SELECT fields for user query
// ============================================
const getUserSelectFields = (includeDistance = true) => `
  u.id,
  u.telegram_id,
  u.username,
  u.display_name,
  u.bio,
  u.avatar_url,
  u.wallet_rank,
  u.market_price,
  u.price_change_24h,
  u.boosted_until,
  u.is_vip,
  u.last_active_at,
  CASE WHEN u.boosted_until > NOW() THEN TRUE ELSE FALSE END AS is_boosted
`;

// ============================================
// MAIN: GET /feed - Infinite Feed with Waterfall Logic
// ============================================
async function getFeed(req, res, next) {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    
    // Parse query parameters
    const lat = parseFloat(req.query.lat) || 10.8231;   // Default: HCMC
    const lng = parseFloat(req.query.lng) || 106.6297;
    const radiusKm = Math.min(parseFloat(req.query.radius) || DEFAULT_RADIUS_KM, MAX_RADIUS_KM);
    const limit = Math.min(parseInt(req.query.limit) || TARGET_FEED_SIZE, 50);
    
    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ApiError(400, 'Invalid coordinates');
    }
    
    // Update current user's location (async, don't wait)
    query(`
      UPDATE users 
      SET latitude = $1, longitude = $2, last_active_at = NOW(), updated_at = NOW()
      WHERE id = $3
    `, [lat, lng, userId]).catch(err => console.error('[Feed] Location update failed:', err.message));
    
    // Results array and metadata
    let users = [];
    let resurrectedCount = 0;
    const sources = { local: 0, global: 0, resurrected: 0, random: 0, genesis: 0 };
    
    // Check total users in DB for debugging
    const countResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE AND id != $1', [userId]);
    console.log(`[Feed] Total other active users in DB: ${countResult.rows[0].count}`);
    
    // =========================================
    // STEP 1: LOCAL DISCOVERY
    // Query users within radius, exclude swiped users
    // =========================================
    console.log(`[Feed] Step 1: Local Discovery (${radiusKm}km radius)`);
    
    const localQuery = `
      SELECT 
        ${getUserSelectFields()},
        ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2) AS distance_km,
        'local' AS source
      FROM users u
      WHERE u.id != $3
        AND u.is_active = TRUE
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND calculate_distance_km($1, $2, u.latitude, u.longitude) <= $4
        -- CRITICAL: Exclude ALL users already swiped
        AND NOT EXISTS (
          SELECT 1 FROM swipes s 
          WHERE s.actor_id = $3 AND s.target_id = u.id
        )
      ORDER BY
        -- Boosted profiles first
        CASE WHEN u.boosted_until > NOW() THEN 0 ELSE 1 END,
        -- Then by market price (hot profiles)
        u.market_price DESC,
        -- Then by distance
        calculate_distance_km($1, $2, u.latitude, u.longitude) ASC
      LIMIT $5;
    `;
    
    const localResult = await query(localQuery, [lat, lng, userId, radiusKm, limit]);
    users = localResult.rows;
    sources.local = users.length;
    
    console.log(`[Feed] Step 1 Result: ${users.length} local users found`);
    
    // =========================================
    // STEP 2: GLOBAL EXPANSION
    // If local < MIN_FEED_SIZE, fetch hot profiles worldwide
    // =========================================
    if (users.length < MIN_FEED_SIZE) {
      console.log(`[Feed] Step 2: Global Expansion (local=${users.length} < ${MIN_FEED_SIZE})`);
      
      const remaining = limit - users.length;
      const excludeIds = users.map(u => u.id);
      
      const globalQuery = `
        SELECT 
          ${getUserSelectFields()},
          CASE 
            WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
            THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
            ELSE 999.0
          END AS distance_km,
          'global' AS source
        FROM users u
        WHERE u.id != $3
          AND u.is_active = TRUE
          -- Exclude users already in local results
          AND u.id != ALL($4::uuid[])
          -- CRITICAL: Exclude ALL users already swiped
          AND NOT EXISTS (
            SELECT 1 FROM swipes s 
            WHERE s.actor_id = $3 AND s.target_id = u.id
          )
        ORDER BY
          -- Boosted profiles first
          CASE WHEN u.boosted_until > NOW() THEN 0 ELSE 1 END,
          -- Sort by market price DESC (show "hot" profiles)
          u.market_price DESC,
          -- Recently active users
          u.last_active_at DESC NULLS LAST
        LIMIT $5;
      `;
      
      const globalResult = await query(globalQuery, [lat, lng, userId, excludeIds, remaining]);
      users = [...users, ...globalResult.rows];
      sources.global = globalResult.rows.length;
      
      console.log(`[Feed] Step 2 Result: ${globalResult.rows.length} global users added, total=${users.length}`);
    }
    
    // =========================================
    // STEP 3: RESURRECTION PROTOCOL
    // If still < MIN_FEED_SIZE, resurrect PASS'd users
    // Delete their PASS swipes and return them
    // =========================================
    if (users.length < MIN_FEED_SIZE) {
      console.log(`[Feed] Step 3: Resurrection Protocol (total=${users.length} < ${MIN_FEED_SIZE})`);
      
      const remaining = limit - users.length;
      const excludeIds = users.map(u => u.id);
      
      // Find users who were PASSed (oldest first, so they come back naturally)
      const findPassedQuery = `
        SELECT s.target_id
        FROM swipes s
        INNER JOIN users u ON u.id = s.target_id
        WHERE s.actor_id = $1
          AND s.action = 'PASS'
          AND u.is_active = TRUE
          AND s.target_id != ALL($2::uuid[])
          -- Don't resurrect users who are already matched
          AND NOT EXISTS (
            SELECT 1 FROM relationships r
            WHERE (r.user_a = $1 AND r.user_b = s.target_id)
               OR (r.user_b = $1 AND r.user_a = s.target_id)
          )
        ORDER BY s.created_at ASC
        LIMIT $3;
      `;
      
      const passedResult = await query(findPassedQuery, [userId, excludeIds, remaining]);
      const passedUserIds = passedResult.rows.map(r => r.target_id);
      
      if (passedUserIds.length > 0) {
        console.log(`[Feed] Resurrecting ${passedUserIds.length} passed users...`);
        
        // DELETE their PASS swipes (give them a second chance)
        await query(`
          DELETE FROM swipes 
          WHERE actor_id = $1 
            AND action = 'PASS'
            AND target_id = ANY($2::uuid[])
        `, [userId, passedUserIds]);
        
        resurrectedCount = passedUserIds.length;
        
        // Fetch the resurrected users
        const resurrectedQuery = `
          SELECT 
            ${getUserSelectFields()},
            CASE 
              WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
              THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
              ELSE 999.0
            END AS distance_km,
            'resurrected' AS source
          FROM users u
          WHERE u.id = ANY($3::uuid[])
            AND u.is_active = TRUE
          ORDER BY u.market_price DESC;
        `;
        
        const resurrectedResult = await query(resurrectedQuery, [lat, lng, passedUserIds]);
        users = [...users, ...resurrectedResult.rows];
        sources.resurrected = resurrectedResult.rows.length;
        
        console.log(`[Feed] Step 3 Result: ${resurrectedResult.rows.length} users resurrected, total=${users.length}`);
      }
    }
    
    // =========================================
    // STEP 4: FULL RESURRECTION (LIKE swipes without match)
    // If STILL empty, resurrect old LIKE swipes that didn't match
    // This is the last resort - give users another chance!
    // =========================================
    if (users.length < MIN_FEED_SIZE) {
      console.log(`[Feed] Step 4: Full Resurrection - LIKE swipes without match (total=${users.length})`);
      
      const remaining = limit - users.length;
      const excludeIds = users.map(u => u.id);
      
      // Find users who were LIKED but didn't match (one-way likes)
      const findLikedQuery = `
        SELECT s.target_id
        FROM swipes s
        INNER JOIN users u ON u.id = s.target_id
        WHERE s.actor_id = $1
          AND s.action = 'LIKE'
          AND u.is_active = TRUE
          AND s.target_id != ALL($2::uuid[])
          -- ONLY resurrect if NOT already matched
          AND NOT EXISTS (
            SELECT 1 FROM relationships r
            WHERE (r.user_a = $1 AND r.user_b = s.target_id)
               OR (r.user_b = $1 AND r.user_a = s.target_id)
          )
        ORDER BY s.created_at ASC
        LIMIT $3;
      `;
      
      const likedResult = await query(findLikedQuery, [userId, excludeIds, remaining]);
      const likedUserIds = likedResult.rows.map(r => r.target_id);
      
      if (likedUserIds.length > 0) {
        console.log(`[Feed] Resurrecting ${likedUserIds.length} LIKED (unmatched) users...`);
        
        // DELETE their LIKE swipes (give another chance to match)
        await query(`
          DELETE FROM swipes 
          WHERE actor_id = $1 
            AND action = 'LIKE'
            AND target_id = ANY($2::uuid[])
            -- Double check: don't delete if matched
            AND NOT EXISTS (
              SELECT 1 FROM relationships r
              WHERE (r.user_a = $1 AND r.user_b = target_id)
                 OR (r.user_b = $1 AND r.user_a = target_id)
            )
        `, [userId, likedUserIds]);
        
        resurrectedCount += likedUserIds.length;
        
        // Fetch the resurrected users
        const resurrectedQuery = `
          SELECT 
            ${getUserSelectFields()},
            CASE 
              WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
              THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
              ELSE 999.0
            END AS distance_km,
            'resurrected_like' AS source
          FROM users u
          WHERE u.id = ANY($3::uuid[])
            AND u.is_active = TRUE
          ORDER BY u.market_price DESC;
        `;
        
        const resurrectedResult = await query(resurrectedQuery, [lat, lng, likedUserIds]);
        users = [...users, ...resurrectedResult.rows];
        sources.resurrected += resurrectedResult.rows.length;
        
        console.log(`[Feed] Step 4 Result: ${resurrectedResult.rows.length} LIKED users resurrected, total=${users.length}`);
      }
    }
    
    // =========================================
    // STEP 5: EMERGENCY RANDOM FILL
    // If ABSOLUTELY empty, just fetch RANDOM users and reset their swipes
    // This ensures the feed is NEVER empty if users exist in DB
    // =========================================
    if (users.length < MIN_FEED_SIZE) {
      console.log(`[Feed] Step 5: Emergency Random Fill (total=${users.length})`);
      
      const remaining = limit - users.length;
      const excludeIds = users.map(u => u.id);
      
      // Fetch random users excluding current user and already fetched
      const randomQuery = `
        SELECT id 
        FROM users 
        WHERE id != $1 
          AND is_active = TRUE
          AND id != ALL($2::uuid[])
        ORDER BY RANDOM()
        LIMIT $3;
      `;
      
      const randomResult = await query(randomQuery, [userId, excludeIds, remaining]);
      const randomUserIds = randomResult.rows.map(r => r.id);
      
      if (randomUserIds.length > 0) {
        console.log(`[Feed] Emergency filling with ${randomUserIds.length} random users...`);
        
        // DELETE ALL swipes for these users to ensure they show up fresh
        await query(`
          DELETE FROM swipes 
          WHERE actor_id = $1 
            AND target_id = ANY($2::uuid[])
        `, [userId, randomUserIds]);
        
        resurrectedCount += randomUserIds.length;
        
        // Fetch the random users details
        const randomUsersQuery = `
          SELECT 
            ${getUserSelectFields()},
            CASE 
              WHEN u.latitude IS NOT NULL AND u.longitude IS NOT NULL 
              THEN ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2)
              ELSE 999.0
            END AS distance_km,
            'random_fill' AS source
          FROM users u
          WHERE u.id = ANY($3::uuid[])
          ORDER BY u.market_price DESC;
        `;
        
        const randomUsersResult = await query(randomUsersQuery, [lat, lng, randomUserIds]);
        users = [...users, ...randomUsersResult.rows];
        sources.random = randomUsersResult.rows.length;
        
        console.log(`[Feed] Step 5 Result: ${randomUsersResult.rows.length} random users added, total=${users.length}`);
      }
    }

    // =========================================
    // STEP 6: GENESIS PROTOCOL (Auto-Seed)
    // If database is empty (or we've exhausted everyone), CREATE new users
    // This ensures the feed is TRULY infinite
    // =========================================
    if (users.length < MIN_FEED_SIZE) {
      console.log(`[Feed] Step 6: Genesis Protocol - Creating fake users (total=${users.length})`);
      
      const needed = TARGET_FEED_SIZE - users.length;
      const newUsersIds = [];
      
      for (let i = 0; i < needed; i++) {
        const firstName = randomElement(SEED_FIRST_NAMES);
        const lastName = randomElement(SEED_LAST_NAMES);
        const displayName = `${firstName} ${lastName}`;
        const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now()}_${i}`;
        // Generate a valid BigInt for telegram_id (avoid collision)
        const telegramId = BigInt(Date.now()) + BigInt(Math.floor(Math.random() * 1000000)) + BigInt(i * 1000);
        
        // Random coords near user or default HCMC
        const userLat = lat + (Math.random() * 0.1 - 0.05);
        const userLng = lng + (Math.random() * 0.1 - 0.05);
        
        try {
          const insertQuery = `
            INSERT INTO users (
              telegram_id, username, display_name, bio,
              wallet_rank, market_price, price_change_24h, balance_love,
              latitude, longitude, is_active, last_active_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, NOW())
            RETURNING id;
          `;
          
          const insertResult = await query(insertQuery, [
            telegramId.toString(), // Pass as string for BigInt
            username,
            displayName,
            randomElement(SEED_BIOS),
            randomElement(SEED_RANKS),
            (Math.random() * 4995 + 5).toFixed(2), // Price
            (Math.random() * 80 - 30).toFixed(2),  // Change
            Math.floor(Math.random() * 49900 + 100), // Balance
            userLat,
            userLng
          ]);
          
          if (insertResult.rows[0]) {
            newUsersIds.push(insertResult.rows[0].id);
          }
        } catch (err) {
          console.error(`[Feed] Genesis creation failed for ${username}:`, err.message);
        }
      }
      
      if (newUsersIds.length > 0) {
        console.log(`[Feed] Genesis created ${newUsersIds.length} new users`);
        
        const genesisQuery = `
          SELECT 
            ${getUserSelectFields()},
            ROUND(calculate_distance_km($1, $2, u.latitude, u.longitude)::numeric, 2) AS distance_km,
            'genesis' AS source
          FROM users u
          WHERE u.id = ANY($3::uuid[])
          ORDER BY u.market_price DESC;
        `;
        
        const genesisResult = await query(genesisQuery, [lat, lng, newUsersIds]);
        users = [...users, ...genesisResult.rows];
        sources.genesis = genesisResult.rows.length;
      }
    }

    // =========================================
    // STEP 7: ENRICH with chart data
    // =========================================
    if (users.length > 0) {
      const userIds = users.map(u => u.id);
      
      const chartQuery = `
        SELECT 
          user_id,
          ARRAY_AGG(price ORDER BY recorded_at ASC) AS chart_data
        FROM (
          SELECT user_id, price, recorded_at,
                 ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY recorded_at DESC) AS rn
          FROM price_history
          WHERE user_id = ANY($1::uuid[])
        ) sub
        WHERE rn <= 20
        GROUP BY user_id;
      `;
      
      const chartResult = await query(chartQuery, [userIds]);
      const chartMap = new Map(chartResult.rows.map(r => [r.user_id, r.chart_data]));
      
      // Enrich users with chart_data
      users = users.map(user => ({
        ...user,
        chart_data: chartMap.get(user.id) || [user.market_price],
      }));
    }
    
    // =========================================
    // RESPONSE
    // =========================================
    const elapsed = Date.now() - startTime;
    console.log(`[Feed] Complete: ${users.length} users in ${elapsed}ms (local=${sources.local}, global=${sources.global}, resurrected=${sources.resurrected}, random=${sources.random}, genesis=${sources.genesis})`);
    
    res.json({
      success: true,
      users: users,
      meta: {
        total: users.length,
        sources,
        resurrectedCount,
        radiusKm,
        elapsed: `${elapsed}ms`,
        hasMore: users.length >= MIN_FEED_SIZE,
      },
    });
    
  } catch (err) {
    console.error('[Feed] Error:', err);
    next(err);
  }
}

// ============================================
// GET /feed/stats - Feed statistics
// ============================================
async function getFeedStats(req, res, next) {
  try {
    const userId = req.user.id;
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE AND id != $1) as total_users,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1) as total_swiped,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND action = 'LIKE') as total_likes,
        (SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND action = 'PASS') as total_passes,
        (SELECT COUNT(*) FROM relationships WHERE user_a = $1 OR user_b = $1) as total_matches,
        (
          SELECT COUNT(*) FROM users u
          WHERE u.is_active = TRUE AND u.id != $1
            AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.actor_id = $1 AND s.target_id = u.id)
        ) as available_to_swipe;
    `;
    
    const result = await query(statsQuery, [userId]);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(stats.total_users),
        totalSwiped: parseInt(stats.total_swiped),
        totalLikes: parseInt(stats.total_likes),
        totalPasses: parseInt(stats.total_passes),
        totalMatches: parseInt(stats.total_matches),
        availableToSwipe: parseInt(stats.available_to_swipe),
        canResurrect: parseInt(stats.total_passes), // PASS'd users can be resurrected
      },
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// GET /feed/trending - Top profiles by market cap
// ============================================
async function getTrending(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const trendingQuery = `
      SELECT 
        ${getUserSelectFields()},
        NULL AS distance_km,
        'trending' AS source
      FROM users u
      WHERE u.is_active = TRUE
        AND u.id != $1
      ORDER BY 
        u.price_change_24h DESC,
        u.market_price DESC
      LIMIT $2;
    `;
    
    const result = await query(trendingQuery, [userId, limit]);
    
    res.json({
      success: true,
      users: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// POST /feed/resurrect - Manually resurrect PASS'd users
// ============================================
async function resurrectPasses(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.body.limit) || 10, 50);
    
    // Delete oldest PASS swipes
    const deleteQuery = `
      DELETE FROM swipes 
      WHERE id IN (
        SELECT id FROM swipes 
        WHERE actor_id = $1 AND action = 'PASS'
        ORDER BY created_at ASC
        LIMIT $2
      )
      RETURNING target_id;
    `;
    
    const result = await query(deleteQuery, [userId, limit]);
    const resurrectedCount = result.rows.length;
    
    console.log(`[Feed] Manually resurrected ${resurrectedCount} users for ${userId}`);
    
    res.json({
      success: true,
      resurrectedCount,
      message: `${resurrectedCount} profiles are now available again!`,
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// GET /feed/debug - Debug endpoint (no auth)
// ============================================
async function debugFeed(req, res, next) {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
        (SELECT COUNT(*) FROM swipes) as total_swipes,
        (SELECT COUNT(*) FROM swipes WHERE action = 'LIKE') as total_likes,
        (SELECT COUNT(*) FROM swipes WHERE action = 'PASS') as total_passes,
        (SELECT COUNT(*) FROM relationships) as total_matches;
    `);
    
    const recentUsers = await query(`
      SELECT id, username, display_name, market_price, is_active, created_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    
    res.json({
      success: true,
      stats: stats.rows[0],
      recentUsers: recentUsers.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  getFeed,
  getFeedStats,
  getTrending,
  resurrectPasses,
  debugFeed,
};
