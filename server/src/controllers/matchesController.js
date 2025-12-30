/**
 * Matches Controller
 * Handles relationships and matches
 */

const { pool, query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');

// Yield Farming Constants
const LOVE_PER_HOUR = 10; // $LOVE earned per hour per couple

/**
 * GET /matches
 * Get all matches for current user
 */
async function getMatches(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get relationships where user is involved
    const result = await pool.query(`
      SELECT 
        r.id as relationship_id,
        r.status,
        r.contract_address,
        r.contract_minted_at,
        r.start_date,
        r.created_at as matched_at,
        CASE 
          WHEN r.user_a = $1 THEN u_b.id
          ELSE u_a.id
        END as partner_id,
        CASE 
          WHEN r.user_a = $1 THEN u_b.display_name
          ELSE u_a.display_name
        END as display_name,
        CASE 
          WHEN r.user_a = $1 THEN u_b.username
          ELSE u_a.username
        END as username,
        CASE 
          WHEN r.user_a = $1 THEN u_b.avatar_url
          ELSE u_a.avatar_url
        END as avatar_url,
        CASE 
          WHEN r.user_a = $1 THEN u_b.bio
          ELSE u_a.bio
        END as bio,
        CASE 
          WHEN r.user_a = $1 THEN u_b.wallet_rank
          ELSE u_a.wallet_rank
        END as wallet_rank,
        CASE 
          WHEN r.user_a = $1 THEN u_b.market_price
          ELSE u_a.market_price
        END as market_price,
        CASE 
          WHEN r.user_a = $1 THEN u_b.price_change_24h
          ELSE u_a.price_change_24h
        END as price_change_24h,
        CASE 
          WHEN r.user_a = $1 THEN u_b.last_active_at
          ELSE u_a.last_active_at
        END as last_active_at,
        -- Combined market cap for the relationship
        (u_a.market_price + u_b.market_price) as combined_market_cap,
        -- Joint Venture balance
        COALESCE(r.joint_balance, 0) as joint_balance
      FROM relationships r
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE (r.user_a = $1 OR r.user_b = $1)
        AND r.status != 'BURNED_CONTRACT'
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM relationships
      WHERE (user_a = $1 OR user_b = $1)
        AND status != 'BURNED_CONTRACT'
    `, [userId]);

    res.json({
      success: true,
      matches: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /matches/:id
 * Get specific match details
 */
async function getMatchById(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        r.*,
        u_a.display_name as user_a_name,
        u_a.avatar_url as user_a_avatar,
        u_a.market_price as user_a_price,
        u_b.display_name as user_b_name,
        u_b.avatar_url as user_b_avatar,
        u_b.market_price as user_b_price,
        (u_a.market_price + u_b.market_price) as combined_market_cap,
        COALESCE(r.joint_balance, 0) as joint_balance
      FROM relationships r
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE r.id = $1 
        AND (r.user_a = $2 OR r.user_b = $2)
    `, [id, userId]);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Match not found');
    }

    res.json({
      success: true,
      match: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /matches/:id/mint
 * Mint relationship NFT contract
 */
async function mintContract(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check relationship exists and user is part of it
    const check = await pool.query(`
      SELECT * FROM relationships 
      WHERE id = $1 
        AND (user_a = $2 OR user_b = $2)
        AND status = 'MATCHED'
    `, [id, userId]);

    if (check.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found or already minted');
    }

    // Generate mock contract address (in production, this would be real blockchain interaction)
    const contractAddress = `0x${Buffer.from(id).toString('hex').slice(0, 40)}`;

    // Update relationship
    const result = await pool.query(`
      UPDATE relationships
      SET 
        status = 'MINTED_CONTRACT',
        contract_address = $1,
        contract_minted_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [contractAddress, id]);

    res.json({
      success: true,
      message: 'ðŸ’ Relationship contract minted!',
      relationship: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /matches/:id/burn
 * Burn (end) relationship contract
 */
async function burnContract(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check relationship exists and user is part of it
    const check = await pool.query(`
      SELECT * FROM relationships 
      WHERE id = $1 
        AND (user_a = $2 OR user_b = $2)
        AND status IN ('MATCHED', 'MINTED_CONTRACT')
    `, [id, userId]);

    if (check.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found or already burned');
    }

    // Update relationship
    const result = await pool.query(`
      UPDATE relationships
      SET 
        status = 'BURNED_CONTRACT',
        contract_burned_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    res.json({
      success: true,
      message: 'ðŸ’” Relationship ended',
      relationship: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /matches/:id/harvest
 * Harvest accrued $LOVE from yield farming
 * Both partners can trigger harvest, both receive rewards
 */
async function harvestLove(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const relationshipId = req.params.id;
    
    await client.query('BEGIN');
    
    // Get relationship and verify user is part of it
    const relationshipResult = await client.query(`
      SELECT 
        r.id,
        r.user_a,
        r.user_b,
        r.status,
        r.last_harvest_at,
        r.accrued_love,
        u_a.display_name as user_a_name,
        u_b.display_name as user_b_name
      FROM relationships r
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE r.id = $1
        AND (r.user_a = $2 OR r.user_b = $2)
        AND r.status IN ('MATCHED', 'MINTED_CONTRACT')
      FOR UPDATE;
    `, [relationshipId, userId]);
    
    if (relationshipResult.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found or not eligible for harvest');
    }
    
    const relationship = relationshipResult.rows[0];
    const lastHarvest = new Date(relationship.last_harvest_at);
    const now = new Date();
    
    // Calculate hours since last harvest
    const hoursDiff = (now - lastHarvest) / (1000 * 60 * 60);
    
    // Minimum 1 hour between harvests
    if (hoursDiff < 1) {
      const minutesRemaining = Math.ceil((1 - hoursDiff) * 60);
      throw new ApiError(400, `Harvest available in ${minutesRemaining} minutes`);
    }
    
    // Calculate reward: time-based + any accrued passive love
    const timeBasedReward = Math.floor(hoursDiff) * LOVE_PER_HOUR;
    const accruedReward = parseFloat(relationship.accrued_love) || 0;
    const totalReward = timeBasedReward + accruedReward;
    
    // Each partner gets half of the total reward
    const rewardPerUser = totalReward / 2;
    
    // Update both users' balance
    await client.query(`
      UPDATE users 
      SET 
        balance_love = balance_love + $1,
        updated_at = NOW()
      WHERE id IN ($2, $3);
    `, [rewardPerUser, relationship.user_a, relationship.user_b]);
    
    // Reset harvest timer and accrued love
    await client.query(`
      UPDATE relationships
      SET 
        last_harvest_at = NOW(),
        accrued_love = 0,
        updated_at = NOW()
      WHERE id = $1;
    `, [relationshipId]);
    
    await client.query('COMMIT');
    
    // Get updated balances
    const balancesResult = await query(`
      SELECT id, display_name, balance_love 
      FROM users 
      WHERE id IN ($1, $2);
    `, [relationship.user_a, relationship.user_b]);
    
    res.json({
      success: true,
      message: `🌾 Harvested ${totalReward.toFixed(2)} $LOVE!`,
      harvest: {
        relationship_id: relationshipId,
        hours_farmed: Math.floor(hoursDiff),
        time_based_reward: timeBasedReward,
        accrued_reward: accruedReward,
        total_harvested: totalReward,
        per_user: rewardPerUser,
      },
      users: balancesResult.rows.map(u => ({
        id: u.id,
        display_name: u.display_name,
        new_balance: parseFloat(u.balance_love),
      })),
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /matches/:id/farming-status
 * Get current yield farming status for a relationship
 */
async function getFarmingStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const relationshipId = req.params.id;
    
    const result = await query(`
      SELECT 
        r.id,
        r.status,
        r.last_harvest_at,
        r.accrued_love,
        r.start_date,
        EXTRACT(EPOCH FROM (NOW() - r.last_harvest_at)) / 3600 as hours_since_harvest
      FROM relationships r
      WHERE r.id = $1
        AND (r.user_a = $2 OR r.user_b = $2)
        AND r.status IN ('MATCHED', 'MINTED_CONTRACT');
    `, [relationshipId, userId]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found');
    }
    
    const relationship = result.rows[0];
    const hoursSinceHarvest = parseFloat(relationship.hours_since_harvest);
    const pendingReward = Math.floor(hoursSinceHarvest) * LOVE_PER_HOUR;
    const accruedLove = parseFloat(relationship.accrued_love) || 0;
    const totalPending = pendingReward + accruedLove;
    const canHarvest = hoursSinceHarvest >= 1;
    
    res.json({
      success: true,
      farming: {
        relationship_id: relationshipId,
        status: relationship.status,
        started_at: relationship.start_date,
        last_harvest_at: relationship.last_harvest_at,
        hours_since_harvest: hoursSinceHarvest.toFixed(2),
        rate_per_hour: LOVE_PER_HOUR,
        pending_reward: pendingReward,
        accrued_love: accruedLove,
        total_pending: totalPending,
        can_harvest: canHarvest,
        next_harvest_in: canHarvest ? 0 : Math.ceil((1 - hoursSinceHarvest) * 60),
      },
    });
    
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMatches,
  getMatchById,
  mintContract,
  burnContract,
  harvestLove,
  getFarmingStatus,
};
