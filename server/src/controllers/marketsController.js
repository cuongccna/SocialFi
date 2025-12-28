/**
 * Markets Controller
 * Prediction markets for couples
 */

const { getClient } = require('../config/db');
const { pool, query } = require('../config/db');
const { ApiError } = require('../middlewares');

/**
 * GET /markets
 * Get all open prediction markets
 */
async function getMarkets(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || 'OPEN'; // OPEN, CLOSED, PAYOUT_LONG, PAYOUT_SHORT

    const result = await pool.query(`
      SELECT 
        m.*,
        r.status as relationship_status,
        r.contract_address,
        u_a.id as user_a_id,
        u_a.display_name as user_a_name,
        u_a.avatar_url as user_a_avatar,
        u_a.market_price as user_a_price,
        u_b.id as user_b_id,
        u_b.display_name as user_b_name,
        u_b.avatar_url as user_b_avatar,
        u_b.market_price as user_b_price,
        (u_a.market_price + u_b.market_price) as combined_market_cap,
        (m.pool_long + m.pool_short) as total_pool,
        CASE 
          WHEN (m.pool_long + m.pool_short) > 0 
          THEN ROUND(m.pool_long * 100.0 / (m.pool_long + m.pool_short), 1)
          ELSE 50
        END as long_percentage,
        b.id as user_bet_id,
        b.position as user_bet_position,
        b.amount as user_bet_amount
      FROM prediction_markets m
      JOIN relationships r ON m.relationship_id = r.id
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      LEFT JOIN bets b ON b.market_id = m.id AND b.user_id = $4
      WHERE m.status = $1
      ORDER BY (m.pool_long + m.pool_short) DESC, m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset, userId]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM prediction_markets WHERE status = $1',
      [status]
    );

    res.json({
      success: true,
      markets: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /markets/:id
 * Get specific market details
 */
async function getMarketById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        m.*,
        r.status as relationship_status,
        r.contract_address,
        r.start_date as relationship_start,
        u_a.id as user_a_id,
        u_a.display_name as user_a_name,
        u_a.avatar_url as user_a_avatar,
        u_a.market_price as user_a_price,
        u_b.id as user_b_id,
        u_b.display_name as user_b_name,
        u_b.avatar_url as user_b_avatar,
        u_b.market_price as user_b_price,
        (m.pool_long + m.pool_short) as total_pool,
        CASE 
          WHEN (m.pool_long + m.pool_short) > 0 
          THEN ROUND(m.pool_long * 100.0 / (m.pool_long + m.pool_short), 1)
          ELSE 50
        END as long_percentage
      FROM prediction_markets m
      JOIN relationships r ON m.relationship_id = r.id
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Market not found');
    }

    // Get user's bet if authenticated
    let userBet = null;
    if (req.user?.id) {
      const betResult = await pool.query(
        'SELECT * FROM bets WHERE market_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (betResult.rows.length > 0) {
        userBet = betResult.rows[0];
      }
    }

    res.json({
      success: true,
      market: result.rows[0],
      user_bet: userBet,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /markets/:id/bet
 * Place a bet on a market
 * Body: { position: 'LONG' | 'SHORT', amount: number }
 */
async function placeBet(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { id: marketId } = req.params;
    const { position, amount } = req.body;

    // Validate input
    if (!['LONG', 'SHORT'].includes(position)) {
      throw new ApiError(400, 'Position must be LONG or SHORT');
    }

    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount < 1) {
      throw new ApiError(400, 'Minimum bet is 1 $LOVE');
    }

    await client.query('BEGIN');

    // Check market exists and is open
    const market = await client.query(
      'SELECT * FROM prediction_markets WHERE id = $1 AND status = $2',
      [marketId, 'OPEN']
    );

    if (market.rows.length === 0) {
      throw new ApiError(404, 'Market not found or closed');
    }

    // Check expiry
    if (new Date(market.rows[0].expiry_date) < new Date()) {
      throw new ApiError(400, 'Market has expired');
    }

    // Check user has enough balance
    const user = await client.query(
      'SELECT balance_love FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows[0].balance_love < betAmount) {
      throw new ApiError(400, 'Insufficient $LOVE balance');
    }

    // Check if user already bet on this market
    const existingBet = await client.query(
      'SELECT * FROM bets WHERE market_id = $1 AND user_id = $2',
      [marketId, userId]
    );

    if (existingBet.rows.length > 0) {
      // User already has a bet - check if same position
      const existingPosition = existingBet.rows[0].position;
      if (existingPosition !== position) {
        throw new ApiError(400, `You already bet ${existingPosition}. Cannot bet ${position} on the same market.`);
      }
      // Same position - will add to existing bet below
    }

    // Deduct balance
    await client.query(
      'UPDATE users SET balance_love = balance_love - $1, updated_at = NOW() WHERE id = $2',
      [betAmount, userId]
    );

    let bet;
    if (existingBet.rows.length > 0) {
      // Add to existing bet
      bet = await client.query(`
        UPDATE bets 
        SET amount = amount + $1, updated_at = NOW()
        WHERE market_id = $2 AND user_id = $3
        RETURNING *
      `, [betAmount, marketId, userId]);
    } else {
      // Create new bet
      bet = await client.query(`
        INSERT INTO bets (user_id, market_id, position, amount)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [userId, marketId, position, betAmount]);
    }

    // Update market pool
    const poolColumn = position === 'LONG' ? 'pool_long' : 'pool_short';
    await client.query(`
      UPDATE prediction_markets 
      SET ${poolColumn} = ${poolColumn} + $1
      WHERE id = $2
    `, [betAmount, marketId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Placed ${betAmount} $LOVE ${position} bet!`,
      bet: bet.rows[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /markets/user/bets
 * Get user's betting history
 */
async function getUserBets(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(`
      SELECT 
        b.*,
        m.status as market_status,
        m.expiry_date,
        m.pool_long,
        m.pool_short,
        u_a.display_name as user_a_name,
        u_b.display_name as user_b_name
      FROM bets b
      JOIN prediction_markets m ON b.market_id = m.id
      JOIN relationships r ON m.relationship_id = r.id
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      success: true,
      bets: result.rows,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /markets/create
 * Create a new market for a minted relationship
 */
async function createMarket(req, res, next) {
  try {
    const { relationship_id, expiry_days = 30 } = req.body;

    // Check relationship exists and is minted
    const relationship = await pool.query(
      'SELECT * FROM relationships WHERE id = $1 AND status = $2',
      [relationship_id, 'MINTED_CONTRACT']
    );

    if (relationship.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found or not minted');
    }

    // Check if market already exists for this relationship
    const existingMarket = await pool.query(
      'SELECT id FROM prediction_markets WHERE relationship_id = $1 AND status = $2',
      [relationship_id, 'OPEN']
    );

    if (existingMarket.rows.length > 0) {
      throw new ApiError(409, 'Market already exists for this relationship');
    }

    // Create market
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiry_days);

    const result = await pool.query(`
      INSERT INTO prediction_markets (relationship_id, expiry_date)
      VALUES ($1, $2)
      RETURNING *
    `, [relationship_id, expiryDate]);

    res.status(201).json({
      success: true,
      market: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMarkets,
  getMarketById,
  placeBet,
  getUserBets,
  createMarket,
};
