/**
 * FUD Controller
 * Handles Fear, Uncertainty, Doubt mechanism
 * Allows matched users to FUD each other (dump price by 15%)
 */

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');
const { sendMessage } = require('../services/telegramBot');

// FUD Constants
const FUD_PRICE_DROP_PERCENT = 15;  // 15% price dump
const FUD_COOLDOWN_HOURS = 24;      // 24 hour cooldown per match

/**
 * POST /fud
 * FUD a matched user (dump their price by 15%)
 * Requires: Must be matched with target, 24h cooldown per match
 */
async function fudUser(req, res, next) {
  const client = await getClient();
  
  try {
    const reporterId = req.user.id;
    const { target_id: targetId, reason } = req.body;
    
    if (!targetId) {
      throw new ApiError(400, 'target_id is required');
    }
    
    if (reporterId === targetId) {
      throw new ApiError(400, 'Cannot FUD yourself');
    }
    
    await client.query('BEGIN');
    
    // 1. Check if users are matched
    const matchResult = await client.query(`
      SELECT id 
      FROM relationships
      WHERE ((user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1))
        AND status IN ('MATCHED', 'MINTED_CONTRACT')
      LIMIT 1;
    `, [reporterId, targetId]);
    
    if (matchResult.rows.length === 0) {
      throw new ApiError(403, 'You can only FUD users you are matched with');
    }
    
    const relationshipId = matchResult.rows[0].id;
    
    // 2. Check cooldown (one FUD per match per 24h)
    const cooldownResult = await client.query(`
      SELECT id, created_at
      FROM fud_reports
      WHERE reporter_id = $1 
        AND target_id = $2
        AND created_at > NOW() - INTERVAL '${FUD_COOLDOWN_HOURS} hours'
      ORDER BY created_at DESC
      LIMIT 1;
    `, [reporterId, targetId]);
    
    if (cooldownResult.rows.length > 0) {
      const lastFud = new Date(cooldownResult.rows[0].created_at);
      const cooldownEnd = new Date(lastFud.getTime() + FUD_COOLDOWN_HOURS * 60 * 60 * 1000);
      const hoursRemaining = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60));
      throw new ApiError(429, `FUD cooldown active. Try again in ${hoursRemaining} hours.`);
    }
    
    // 3. Get target user with lock
    const targetResult = await client.query(`
      SELECT id, telegram_id, display_name, market_price
      FROM users
      WHERE id = $1
      FOR UPDATE;
    `, [targetId]);
    
    if (targetResult.rows.length === 0) {
      throw new ApiError(404, 'Target user not found');
    }
    
    const target = targetResult.rows[0];
    const priceBefore = parseFloat(target.market_price);
    
    // 4. Calculate new price (15% dump)
    const priceDrop = priceBefore * (FUD_PRICE_DROP_PERCENT / 100);
    const priceAfter = Math.max(priceBefore - priceDrop, 0.01); // Minimum 0.01
    
    // 5. Update target's market price
    await client.query(`
      UPDATE users
      SET 
        market_price = $1,
        price_change_24h = price_change_24h - $2,
        updated_at = NOW()
      WHERE id = $3;
    `, [priceAfter, FUD_PRICE_DROP_PERCENT, targetId]);
    
    // 6. Record price history
    await client.query(`
      INSERT INTO price_history (user_id, price)
      VALUES ($1, $2);
    `, [targetId, priceAfter]);
    
    // 7. Record FUD report
    await client.query(`
      INSERT INTO fud_reports (reporter_id, target_id, relationship_id, price_before, price_after, price_drop_percent, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `, [reporterId, targetId, relationshipId, priceBefore, priceAfter, FUD_PRICE_DROP_PERCENT, reason || null]);
    
    await client.query('COMMIT');
    
    // 8. Send notification to target (async, don't wait)
    if (target.telegram_id) {
      sendMessage(
        target.telegram_id,
        `⚠️ <b>FUD ALERT!</b>\n\n` +
        `Someone flagged you. Your price dropped <b>-${FUD_PRICE_DROP_PERCENT}%</b>\n\n` +
        `📉 Price: $${priceBefore.toFixed(2)} → $${priceAfter.toFixed(2)}\n\n` +
        `💪 Keep matching to pump your price back up!`
      ).catch(err => {
        console.error('Failed to send FUD notification:', err.message);
      });
    }
    
    res.json({
      success: true,
      message: `📉 FUD successful! ${target.display_name}'s price dumped -${FUD_PRICE_DROP_PERCENT}%`,
      fud: {
        target_id: targetId,
        target_name: target.display_name,
        price_before: priceBefore,
        price_after: priceAfter,
        price_drop_percent: FUD_PRICE_DROP_PERCENT,
        cooldown_hours: FUD_COOLDOWN_HOURS,
        next_fud_available: new Date(Date.now() + FUD_COOLDOWN_HOURS * 60 * 60 * 1000),
      },
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /fud/status/:targetId
 * Check FUD cooldown status for a specific target
 */
async function getFudStatus(req, res, next) {
  try {
    const reporterId = req.user.id;
    const { targetId } = req.params;
    
    // Check if matched
    const matchResult = await query(`
      SELECT id 
      FROM relationships
      WHERE ((user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1))
        AND status IN ('MATCHED', 'MINTED_CONTRACT')
      LIMIT 1;
    `, [reporterId, targetId]);
    
    const isMatched = matchResult.rows.length > 0;
    
    // Check cooldown
    const cooldownResult = await query(`
      SELECT created_at
      FROM fud_reports
      WHERE reporter_id = $1 
        AND target_id = $2
        AND created_at > NOW() - INTERVAL '${FUD_COOLDOWN_HOURS} hours'
      ORDER BY created_at DESC
      LIMIT 1;
    `, [reporterId, targetId]);
    
    let canFud = isMatched;
    let cooldownEndsAt = null;
    let hoursRemaining = 0;
    
    if (cooldownResult.rows.length > 0) {
      const lastFud = new Date(cooldownResult.rows[0].created_at);
      cooldownEndsAt = new Date(lastFud.getTime() + FUD_COOLDOWN_HOURS * 60 * 60 * 1000);
      hoursRemaining = Math.max(0, Math.ceil((cooldownEndsAt - new Date()) / (1000 * 60 * 60)));
      canFud = hoursRemaining === 0;
    }
    
    // Get FUD history for this pair
    const historyResult = await query(`
      SELECT created_at, price_before, price_after, price_drop_percent
      FROM fud_reports
      WHERE reporter_id = $1 AND target_id = $2
      ORDER BY created_at DESC
      LIMIT 5;
    `, [reporterId, targetId]);
    
    res.json({
      success: true,
      fud_status: {
        target_id: targetId,
        is_matched: isMatched,
        can_fud: canFud,
        cooldown_hours: FUD_COOLDOWN_HOURS,
        cooldown_ends_at: cooldownEndsAt,
        hours_remaining: hoursRemaining,
        price_drop_percent: FUD_PRICE_DROP_PERCENT,
        history: historyResult.rows,
      },
    });
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /fud/received
 * Get FUD reports received by current user
 */
async function getFudReceived(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await query(`
      SELECT 
        f.id,
        f.price_before,
        f.price_after,
        f.price_drop_percent,
        f.created_at,
        u.display_name as reporter_name,
        u.avatar_url as reporter_avatar
      FROM fud_reports f
      JOIN users u ON f.reporter_id = u.id
      WHERE f.target_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2 OFFSET $3;
    `, [userId, limit, offset]);
    
    const countResult = await query(`
      SELECT COUNT(*) as total FROM fud_reports WHERE target_id = $1;
    `, [userId]);
    
    res.json({
      success: true,
      fud_received: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
    
  } catch (err) {
    next(err);
  }
}

module.exports = {
  fudUser,
  getFudStatus,
  getFudReceived,
};
