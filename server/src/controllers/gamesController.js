/**
 * Games Controller
 * Handles game-related API endpoints for the Game Arcade
 */

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');

// ============================================
// Constants
// ============================================
const MAX_DAILY_TICKETS = 3;
const TICKET_REFILL_COST = 50; // $LOVE

// ============================================
// GET /games/stats - Get user's game statistics
// ============================================
async function getGameStats(req, res, next) {
  try {
    const userId = req.user.id;

    // Check if user has game stats, create if not
    let result = await query(
      `SELECT * FROM user_game_stats WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create new stats for user
      result = await query(
        `INSERT INTO user_game_stats (user_id) 
         VALUES ($1) 
         RETURNING *`,
        [userId]
      );
    }

    let stats = result.rows[0];

    // Check if we need to reset daily tickets (new day)
    const lastReset = new Date(stats.last_ticket_reset);
    const now = new Date();
    const lastResetDate = lastReset.toDateString();
    const todayDate = now.toDateString();

    if (lastResetDate !== todayDate) {
      // Reset tickets for new day
      const updateResult = await query(
        `UPDATE user_game_stats 
         SET daily_tickets = $1, last_ticket_reset = NOW(), updated_at = NOW()
         WHERE user_id = $2
         RETURNING *`,
        [MAX_DAILY_TICKETS, userId]
      );
      stats = updateResult.rows[0];
    }

    // Get user's login streak from users table
    const userResult = await query(
      `SELECT login_streak FROM users WHERE id = $1`,
      [userId]
    );
    
    stats.current_streak = userResult.rows[0]?.login_streak || 0;

    res.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// POST /games/use-ticket - Use a ticket to play a game
// ============================================
async function useTicket(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { game_type } = req.body;

    if (!game_type || !['KYP', 'MINING', 'CANDLE_KISS'].includes(game_type)) {
      throw new ApiError(400, 'Invalid game type');
    }

    await client.query('BEGIN');

    // Get current stats with lock
    const statsResult = await client.query(
      `SELECT * FROM user_game_stats WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );

    if (statsResult.rows.length === 0) {
      // Create stats if not exists
      await client.query(
        `INSERT INTO user_game_stats (user_id) VALUES ($1)`,
        [userId]
      );
    }

    let stats = statsResult.rows[0] || { daily_tickets: MAX_DAILY_TICKETS };

    // Check if we need to reset daily tickets
    const lastReset = new Date(stats.last_ticket_reset || new Date());
    const now = new Date();
    if (lastReset.toDateString() !== now.toDateString()) {
      stats.daily_tickets = MAX_DAILY_TICKETS;
    }

    // Check tickets
    if (stats.daily_tickets <= 0) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        remaining_tickets: 0,
        message: 'No tickets remaining',
      });
    }

    // Deduct ticket
    const updateResult = await client.query(
      `UPDATE user_game_stats 
       SET daily_tickets = daily_tickets - 1,
           last_ticket_reset = CASE 
             WHEN last_ticket_reset::date < CURRENT_DATE THEN NOW()
             ELSE last_ticket_reset
           END,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING daily_tickets`,
      [userId]
    );

    // Create game session
    const sessionResult = await client.query(
      `INSERT INTO game_sessions (user_id, game_type)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, game_type]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      remaining_tickets: updateResult.rows[0].daily_tickets,
      session_id: sessionResult.rows[0].id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/refill-tickets - Refill tickets with $LOVE
// ============================================
async function refillTickets(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;

    await client.query('BEGIN');

    // Check user balance
    const userResult = await client.query(
      `SELECT balance_love FROM users WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }

    const balance = parseFloat(userResult.rows[0].balance_love);

    if (balance < TICKET_REFILL_COST) {
      await client.query('ROLLBACK');
      return res.json({
        success: false,
        message: 'Insufficient $LOVE balance',
        required: TICKET_REFILL_COST,
        current: balance,
      });
    }

    // Deduct $LOVE
    const newBalance = balance - TICKET_REFILL_COST;
    await client.query(
      `UPDATE users SET balance_love = $1, updated_at = NOW() WHERE id = $2`,
      [newBalance, userId]
    );

    // Refill tickets
    const statsResult = await client.query(
      `UPDATE user_game_stats 
       SET daily_tickets = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING daily_tickets`,
      [MAX_DAILY_TICKETS, userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      tickets: statsResult.rows[0]?.daily_tickets || MAX_DAILY_TICKETS,
      new_balance: newBalance,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/submit-score - Submit game score
// ============================================
async function submitScore(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { session_id, score, duration_seconds } = req.body;

    if (!session_id || typeof score !== 'number') {
      throw new ApiError(400, 'Invalid request body');
    }

    await client.query('BEGIN');

    // Verify session belongs to user
    const sessionResult = await client.query(
      `SELECT * FROM game_sessions WHERE id = $1 AND user_id = $2`,
      [session_id, userId]
    );

    if (sessionResult.rows.length === 0) {
      throw new ApiError(404, 'Game session not found');
    }

    const session = sessionResult.rows[0];

    if (session.completed) {
      throw new ApiError(400, 'Session already completed');
    }

    // Calculate rewards (base: 1 $LOVE per 100 points)
    const loveEarned = Math.floor(score / 100) * 0.1;

    // Update session
    await client.query(
      `UPDATE game_sessions 
       SET score = $1, duration_seconds = $2, completed = TRUE, love_earned = $3
       WHERE id = $4`,
      [score, duration_seconds || 0, loveEarned, session_id]
    );

    // Update user stats
    const gameType = session.game_type;
    const highScoreColumn = 
      gameType === 'KYP' ? 'kyp_high_score' :
      gameType === 'MINING' ? 'mining_high_score' : 
      'candle_kiss_high_score';

    const statsResult = await client.query(
      `UPDATE user_game_stats 
       SET total_score = total_score + $1,
           ${highScoreColumn} = GREATEST(${highScoreColumn}, $1),
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING total_score, ${highScoreColumn} as high_score`,
      [score, userId]
    );

    const isHighScore = statsResult.rows[0]?.high_score === score;

    // Add $LOVE to user balance
    if (loveEarned > 0) {
      await client.query(
        `UPDATE users SET balance_love = balance_love + $1, updated_at = NOW() WHERE id = $2`,
        [loveEarned, userId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      love_earned: loveEarned,
      new_total_score: statsResult.rows[0]?.total_score || 0,
      is_high_score: isHighScore,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// GET /games/leaderboard - Get game leaderboard
// ============================================
async function getLeaderboard(req, res, next) {
  try {
    const { game_type, limit = 50 } = req.query;

    let orderColumn = 'total_score';
    if (game_type) {
      if (game_type === 'KYP') orderColumn = 'kyp_high_score';
      else if (game_type === 'MINING') orderColumn = 'mining_high_score';
      else if (game_type === 'CANDLE_KISS') orderColumn = 'candle_kiss_high_score';
    }

    const result = await query(
      `SELECT 
        ugs.user_id,
        u.display_name,
        u.avatar_url,
        ugs.${orderColumn} as total_score,
        RANK() OVER (ORDER BY ugs.${orderColumn} DESC) as rank
       FROM user_game_stats ugs
       JOIN users u ON u.id = ugs.user_id
       WHERE ugs.${orderColumn} > 0
       ORDER BY ugs.${orderColumn} DESC
       LIMIT $1`,
      [Math.min(parseInt(limit), 100)]
    );

    res.json({
      success: true,
      leaderboard: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getGameStats,
  useTicket,
  refillTickets,
  submitScore,
  getLeaderboard,
};
