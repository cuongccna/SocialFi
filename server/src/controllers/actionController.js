/**
 * Action Controller
 * Handles swipes, matches, and market cap updates
 */

const pool = require('../config/db');
const { getClient } = require('../config/db');
const { ApiError } = require('../middlewares');
const config = require('../config');

/**
 * POST /swipe
 * Process a swipe action with transaction
 * - Insert swipe record
 * - Update target's market price
 * - Check for match if LIKE
 * - Award $LOVE tokens
 */
async function swipe(req, res, next) {
  const client = await getClient();
  
  try {
    const actorId = req.user.id;
    const { target_id: targetId, action } = req.body;
    
    // Validate input
    if (!targetId) {
      throw new ApiError(400, 'target_id is required');
    }
    
    if (!['LIKE', 'PASS', 'SUPER'].includes(action)) {
      throw new ApiError(400, 'action must be LIKE, PASS, or SUPER');
    }
    
    // Prevent self-swipe
    if (actorId === targetId) {
      throw new ApiError(400, 'Cannot swipe on yourself');
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    // 1. Check if target user exists
    const targetCheck = await client.query(
      'SELECT id, display_name, market_price FROM users WHERE id = $1 AND is_active = TRUE',
      [targetId]
    );
    
    if (targetCheck.rows.length === 0) {
      throw new ApiError(404, 'Target user not found');
    }
    
    // 2. Check if already swiped
    const existingSwipe = await client.query(
      'SELECT id FROM swipes WHERE actor_id = $1 AND target_id = $2',
      [actorId, targetId]
    );
    
    if (existingSwipe.rows.length > 0) {
      throw new ApiError(409, 'Already swiped on this user');
    }
    
    // 3. Insert swipe record
    await client.query(
      'INSERT INTO swipes (actor_id, target_id, action) VALUES ($1, $2, $3)',
      [actorId, targetId, action]
    );
    
    // 4. Update target's market price based on action
    let priceChange = 0;
    let newPrice = 0;
    
    if (action === 'LIKE' || action === 'SUPER') {
      // LIKE: +0.5%, SUPER: +1%
      const multiplier = action === 'SUPER' 
        ? config.constants.PRICE_CHANGE_LIKE * 2 
        : config.constants.PRICE_CHANGE_LIKE;
      
      const priceResult = await client.query(`
        UPDATE users 
        SET 
          market_price = market_price + (market_price * $1 / 100),
          price_change_24h = price_change_24h + $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING market_price, price_change_24h;
      `, [multiplier, targetId]);
      
      priceChange = multiplier;
      newPrice = priceResult.rows[0].market_price;
      
    } else if (action === 'PASS') {
      // PASS: -0.2%
      const multiplier = config.constants.PRICE_CHANGE_PASS;
      
      const priceResult = await client.query(`
        UPDATE users 
        SET 
          market_price = GREATEST(market_price + (market_price * $1 / 100), 0.01),
          price_change_24h = price_change_24h + $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING market_price, price_change_24h;
      `, [multiplier, targetId]);
      
      priceChange = multiplier;
      newPrice = priceResult.rows[0].market_price;
    }
    
    // 5. Award $LOVE tokens to actor (mining reward)
    await client.query(`
      UPDATE users 
      SET balance_love = balance_love + $1,
          updated_at = NOW()
      WHERE id = $2;
    `, [config.constants.LOVE_PER_SWIPE, actorId]);
    
    // 6. Check for match (only if LIKE or SUPER)
    let isMatch = false;
    let relationship = null;
    
    if (action === 'LIKE' || action === 'SUPER') {
      // Check if target has liked us
      const mutualLike = await client.query(`
        SELECT id FROM swipes 
        WHERE actor_id = $1 
          AND target_id = $2 
          AND action IN ('LIKE', 'SUPER')
      `, [targetId, actorId]);
      
      if (mutualLike.rows.length > 0) {
        isMatch = true;
        
        // Create relationship
        const relationshipResult = await client.query(`
          INSERT INTO relationships (user_a, user_b, status, start_date)
          VALUES ($1, $2, 'MATCHED', NOW())
          ON CONFLICT (LEAST(user_a, user_b), GREATEST(user_a, user_b)) 
          DO UPDATE SET updated_at = NOW()
          RETURNING *;
        `, [actorId, targetId]);
        
        relationship = relationshipResult.rows[0];
        
        // MATCH PUMP: Both users get +5% market price
        await client.query(`
          UPDATE users 
          SET 
            market_price = market_price + (market_price * $1 / 100),
            price_change_24h = price_change_24h + $1,
            updated_at = NOW()
          WHERE id IN ($2, $3);
        `, [config.constants.PRICE_CHANGE_MATCH, actorId, targetId]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Build response
    const response = {
      success: true,
      data: {
        action,
        target_id: targetId,
        match: isMatch,
        market_impact: {
          price_change_percent: priceChange,
          new_price: parseFloat(newPrice.toFixed(4)),
        },
        reward: {
          love_earned: config.constants.LOVE_PER_SWIPE,
        },
      },
    };
    
    if (isMatch && relationship) {
      response.data.relationship = {
        id: relationship.id,
        status: relationship.status,
        message: '🎉 It\'s a Match! You both LONG each other!',
        match_pump: `+${config.constants.PRICE_CHANGE_MATCH}% to both market caps!`,
      };
    }
    
    res.status(201).json(response);
    
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    next(err);
  } finally {
    // Always release client back to pool
    client.release();
  }
}

/**
 * GET /swipes/history
 * Get user's swipe history
 */
async function getSwipeHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await pool.query(`
      SELECT 
        s.id,
        s.action,
        s.created_at,
        u.id as target_id,
        u.display_name as target_name,
        u.avatar_url as target_avatar,
        u.market_price as target_price
      FROM swipes s
      JOIN users u ON s.target_id = u.id
      WHERE s.actor_id = $1
      ORDER BY s.created_at DESC
      LIMIT $2 OFFSET $3;
    `, [userId, limit, offset]);
    
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  swipe,
  getSwipeHistory,
};
