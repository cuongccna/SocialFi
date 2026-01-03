/**
 * Candle Kiss Controller
 * High-risk co-op betting on BTC price movements
 */

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');
const https = require('https');

// ============================================
// Configuration
// ============================================

const CANDLE_CONFIG = {
  LOCK_DURATION_SECONDS: 30,
  WIN_MULTIPLIER: 1.8, // +80% on win
  MIN_STAKE: 10,
  MAX_STAKE: 1000,
};

// Active sessions in memory
const activeSessions = new Map();

// Current BTC price (updated by price feed)
let currentBtcPrice = 0;

// ============================================
// Price Feed
// ============================================

function fetchCurrentPrice() {
  return new Promise((resolve, reject) => {
    https.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          currentBtcPrice = parseFloat(json.price);
          resolve(currentBtcPrice);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Update price every second
setInterval(() => {
  fetchCurrentPrice().catch(err => console.error('Price fetch error:', err));
}, 1000);

// Initial fetch
fetchCurrentPrice().catch(console.error);

// ============================================
// Helper Functions
// ============================================

function getSession(sessionId) {
  return activeSessions.get(sessionId);
}

function createSession(sessionId, data) {
  const session = {
    id: sessionId,
    ...data,
    phase: 'WAITING',
    proposer_id: null,
    proposed_direction: null,
    direction: null,
    entry_price: null,
    exit_price: null,
    lock_start_time: null,
    settled: false,
    won: null,
    payout: null,
  };
  activeSessions.set(sessionId, session);
  return session;
}

// ============================================
// POST /games/candle/start - Start session
// ============================================
async function startSession(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { relationship_id, stake_amount = 50 } = req.body;

    console.log('[CANDLE START] Request:', { userId, relationship_id, stake_amount });

    if (!relationship_id) {
      throw new ApiError(400, 'Relationship ID required');
    }

    const stake = Math.min(Math.max(stake_amount, CANDLE_CONFIG.MIN_STAKE), CANDLE_CONFIG.MAX_STAKE);

    await client.query('BEGIN');

    // Verify relationship - allow both MATCHED and MINTED_CONTRACT
    const relResult = await client.query(
      `SELECT * FROM relationships 
       WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND status IN ('MATCHED', 'MINTED_CONTRACT')`,
      [relationship_id, userId]
    );

    if (relResult.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found');
    }

    const relationship = relResult.rows[0];
    const partnerId = relationship.user_a === userId ? relationship.user_b : relationship.user_a;

    // Check for existing active session between these two users
    const existingSessions = await client.query(
      `SELECT id FROM game_sessions 
       WHERE ((user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1))
       AND game_type = 'CANDLE_KISS' 
       AND completed = FALSE 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, partnerId]
    );

    console.log('[CANDLE START] Found existing sessions:', existingSessions.rows.length);

    if (existingSessions.rows.length > 0) {
      // Check if any session is in memory (active)
      for (const row of existingSessions.rows) {
        const sessionId = row.id;
        if (activeSessions.has(sessionId)) {
          console.log('[CANDLE START] Found active session, joining:', sessionId);
          const session = activeSessions.get(sessionId);
          await client.query('COMMIT');
          
          return res.json({
            session: {
              ...session,
              current_price: currentBtcPrice,
            },
            joined: true,
          });
        }
      }
      
      // No active session found in memory - cleanup stale sessions
      for (const row of existingSessions.rows) {
        await client.query(
          `UPDATE game_sessions SET completed = TRUE WHERE id = $1`,
          [row.id]
        );
        console.log('[CANDLE START] Cleaned up stale session:', row.id);
      }
    }

    // Check user has enough balance
    const balanceResult = await client.query(
      `SELECT balance_love FROM users WHERE id = $1`,
      [userId]
    );

    if (balanceResult.rows[0].balance_love < stake) {
      throw new ApiError(400, 'Insufficient $LOVE balance');
    }

    // Create game session in DB
    const sessionResult = await client.query(
      `INSERT INTO game_sessions (user_id, partner_id, game_type, score)
       VALUES ($1, $2, 'CANDLE_KISS', 0)
       RETURNING id, created_at`,
      [userId, partnerId]
    );

    const sessionId = sessionResult.rows[0].id;

    console.log('[CANDLE START] Created new session:', sessionId);

    // Create in-memory session
    const session = createSession(sessionId, {
      relationship_id,
      player_a_id: userId,
      player_b_id: partnerId,
      stake_amount: stake,
      created_at: sessionResult.rows[0].created_at,
    });

    await client.query('COMMIT');

    res.json({
      session: {
        ...session,
        current_price: currentBtcPrice,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/candle/join - Join session
// ============================================
async function joinSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    const session = getSession(session_id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    if (session.player_a_id !== userId && session.player_b_id !== userId) {
      throw new ApiError(403, 'Not part of this game');
    }

    res.json({
      session: {
        ...session,
        current_price: currentBtcPrice,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /games/candle/state/:sessionId - Get state
// ============================================
async function getState(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = getSession(sessionId);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    res.json({
      session,
      current_price: currentBtcPrice,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// POST /games/candle/propose - Propose bet
// ============================================
async function proposeBet(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id, direction } = req.body;

    if (!['BULL', 'BEAR'].includes(direction)) {
      throw new ApiError(400, 'Invalid direction');
    }

    const session = getSession(session_id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    if (session.phase !== 'WAITING') {
      throw new ApiError(400, 'Cannot propose in current phase');
    }

    session.proposer_id = userId;
    session.proposed_direction = direction;
    session.phase = 'PROPOSING';

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// POST /games/candle/accept - Accept bet
// ============================================
async function acceptBet(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    const session = getSession(session_id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    if (session.phase !== 'PROPOSING') {
      throw new ApiError(400, 'No proposal to accept');
    }

    if (session.proposer_id === userId) {
      throw new ApiError(400, 'Cannot accept your own proposal');
    }

    await client.query('BEGIN');

    // Deduct stake from both players
    await client.query(
      `UPDATE users SET balance_love = balance_love - $1 WHERE id = ANY($2::uuid[])`,
      [session.stake_amount, [session.player_a_id, session.player_b_id]]
    );

    // Lock the bet
    session.direction = session.proposed_direction;
    session.entry_price = currentBtcPrice;
    session.lock_start_time = new Date().toISOString();
    session.phase = 'LOCKED';

    await client.query('COMMIT');

    // Schedule settlement after lock duration
    setTimeout(() => {
      settleGame(session_id);
    }, CANDLE_CONFIG.LOCK_DURATION_SECONDS * 1000);

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/candle/reject - Reject bet
// ============================================
async function rejectBet(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    const session = getSession(session_id);
    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    if (session.phase !== 'PROPOSING') {
      throw new ApiError(400, 'No proposal to reject');
    }

    // Reset to waiting
    session.proposer_id = null;
    session.proposed_direction = null;
    session.phase = 'WAITING';

    res.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /games/candle/result/:sessionId
// ============================================
async function getResult(req, res, next) {
  try {
    const { sessionId } = req.params;

    const session = getSession(sessionId);
    if (!session || !session.settled) {
      throw new ApiError(404, 'Result not available');
    }

    const priceChange = ((session.exit_price - session.entry_price) / session.entry_price) * 100;

    res.json({
      result: {
        won: session.won,
        entry_price: session.entry_price,
        exit_price: session.exit_price,
        payout: session.payout,
        price_change_percent: priceChange,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// Settlement Logic
// ============================================
async function settleGame(sessionId) {
  const client = await getClient();
  
  try {
    const session = getSession(sessionId);
    if (!session || session.settled) return;

    await client.query('BEGIN');

    // Get exit price
    session.exit_price = currentBtcPrice;
    
    // Determine win/lose
    const priceUp = session.exit_price > session.entry_price;
    const won = (session.direction === 'BULL' && priceUp) || 
                (session.direction === 'BEAR' && !priceUp);

    session.won = won;
    session.settled = true;
    session.phase = 'SETTLED';

    if (won) {
      // Winners get stake * 1.8 (original + 80% profit)
      const winnings = Math.floor(session.stake_amount * CANDLE_CONFIG.WIN_MULTIPLIER);
      session.payout = winnings;
      
      // Credit both players
      await client.query(
        `UPDATE users SET balance_love = balance_love + $1 WHERE id = ANY($2::uuid[])`,
        [winnings, [session.player_a_id, session.player_b_id]]
      );
    } else {
      // Stake already deducted, nothing to do
      session.payout = -session.stake_amount;
    }

    // Update game session in DB
    await client.query(
      `UPDATE game_sessions 
       SET completed = TRUE, 
           score = $1,
           love_earned = $2
       WHERE id = $3`,
      [session.won ? 1 : 0, session.payout, sessionId]
    );

    await client.query('COMMIT');

    // Emit settlement via socket
    const io = global.io;
    if (io) {
      io.to(`candle:${sessionId}`).emit('candle:settled', {
        won: session.won,
        payout: session.payout,
        entry_price: session.entry_price,
        exit_price: session.exit_price,
      });
    }

    // Clean up after a delay
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 60000);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Settlement error:', error);
  } finally {
    client.release();
  }
}

// ============================================
// Socket Event Handlers
// ============================================

function setupCandleKissSocketHandlers(io) {
  // Store io globally for settlement notifications
  global.io = io;

  io.on('connection', (socket) => {
    // Join game room
    socket.on('candle:join', ({ session_id, user_id }) => {
      socket.join(`candle:${session_id}`);
      console.log(`User ${user_id} joined candle room: ${session_id}`);
      
      // Send current state
      const session = getSession(session_id);
      if (session) {
        socket.emit('candle:state', {
          session,
          current_price: currentBtcPrice,
        });
      }
    });

    // Leave room
    socket.on('candle:leave', ({ session_id }) => {
      socket.leave(`candle:${session_id}`);
    });

    // Propose bet
    socket.on('candle:propose', ({ session_id, direction, user_id, user_name }) => {
      const session = getSession(session_id);
      if (!session || session.phase !== 'WAITING') return;

      session.proposer_id = user_id;
      session.proposed_direction = direction;
      session.phase = 'PROPOSING';

      // Notify partner
      socket.to(`candle:${session_id}`).emit('candle:bet_proposed', {
        session_id,
        proposer_id: user_id,
        proposer_name: user_name,
        direction,
      });
    });

    // Accept bet
    socket.on('candle:accept', async ({ session_id, user_id, current_price }) => {
      const session = getSession(session_id);
      if (!session || session.phase !== 'PROPOSING') return;
      if (session.proposer_id === user_id) return;

      try {
        const client = await getClient();
        await client.query('BEGIN');

        // Deduct stake
        await client.query(
          `UPDATE users SET balance_love = balance_love - $1 WHERE id = ANY($2::uuid[])`,
          [session.stake_amount, [session.player_a_id, session.player_b_id]]
        );

        await client.query('COMMIT');
        client.release();

        // Lock the bet
        session.direction = session.proposed_direction;
        session.entry_price = current_price || currentBtcPrice;
        session.lock_start_time = new Date().toISOString();
        session.phase = 'LOCKED';

        // Notify both players
        io.to(`candle:${session_id}`).emit('candle:bet_accepted', {
          session,
          entry_price: session.entry_price,
        });

        // Schedule settlement
        setTimeout(() => {
          settleGame(session_id);
        }, CANDLE_CONFIG.LOCK_DURATION_SECONDS * 1000);
      } catch (error) {
        console.error('Accept bet error:', error);
      }
    });

    // Reject bet
    socket.on('candle:reject', ({ session_id, user_id }) => {
      const session = getSession(session_id);
      if (!session || session.phase !== 'PROPOSING') return;

      // Reset to waiting
      session.proposer_id = null;
      session.proposed_direction = null;
      session.phase = 'WAITING';

      // Notify both players
      io.to(`candle:${session_id}`).emit('candle:bet_rejected', {
        session_id,
        rejected_by: user_id,
      });
    });
  });

  // Broadcast price updates to all candle rooms
  setInterval(() => {
    if (currentBtcPrice > 0) {
      // Find all active locked sessions and broadcast price
      activeSessions.forEach((session, sessionId) => {
        if (session.phase === 'LOCKED') {
          io.to(`candle:${sessionId}`).emit('candle:price', {
            price: currentBtcPrice,
            timestamp: Date.now(),
          });
        }
      });
    }
  }, 1000);
}

module.exports = {
  startSession,
  joinSession,
  getState,
  proposeBet,
  acceptBet,
  rejectBet,
  getResult,
  setupCandleKissSocketHandlers,
  CANDLE_CONFIG,
};
