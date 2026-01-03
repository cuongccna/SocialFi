/**
 * Love Mining Rig Controller
 * Handles the co-op tapper mining game
 */

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');

// ============================================
// Configuration
// ============================================

const MINING_CONFIG = {
  MAX_STAMINA: 100,
  STAMINA_PER_TAP: 1,
  STAMINA_PER_MESSAGE: 10,
  LOVE_PER_TAP: 0.1,
  SYNC_WINDOW_MS: 500,
  SYNC_MULTIPLIER: 2,
  ROCK_GROWTH_PER_SYNC: 0.1,
  MAX_ROCK_SIZE: 2.0,
};

// Active mining sessions in memory
const activeSessions = new Map();

// ============================================
// Helper Functions
// ============================================

function getOrCreateSession(sessionId) {
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      player_a_taps: 0,
      player_b_taps: 0,
      player_a_last_batch: null,
      player_b_last_batch: null,
      total_love: 0,
      sync_combos: 0,
      rock_size: 1.0,
    });
  }
  return activeSessions.get(sessionId);
}

// ============================================
// POST /games/mining/start - Start mining session
// ============================================
async function startSession(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { relationship_id } = req.body;

    console.log('[MINING START] Request:', { userId, relationship_id });

    if (!relationship_id) {
      throw new ApiError(400, 'Relationship ID required');
    }

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
    const existingSession = await client.query(
      `SELECT id FROM game_sessions 
       WHERE ((user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1))
       AND game_type = 'MINING' 
       AND completed = FALSE 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, partnerId]
    );

    console.log('[MINING START] Found existing sessions:', existingSession.rows.length);

    if (existingSession.rows.length > 0) {
      // Check if any session is in memory (active)
      for (const row of existingSession.rows) {
        const sessionId = row.id;
        if (activeSessions.has(sessionId)) {
          console.log('[MINING START] Found active session, joining:', sessionId);
          const stamina = await getUserStamina(client, userId);
          await client.query('COMMIT');
          
          const memSession = activeSessions.get(sessionId);
          return res.json({
            session: {
              id: sessionId,
              relationship_id,
              player_a_id: userId,
              player_b_id: partnerId,
              total_love_mined: memSession?.total_love || 0,
              sync_combos: memSession?.sync_combos || 0,
            },
            stamina,
            joined: true,
          });
        }
      }
      
      // No active session found in memory - cleanup stale sessions
      for (const row of existingSession.rows) {
        await client.query(
          `UPDATE game_sessions SET completed = TRUE WHERE id = $1`,
          [row.id]
        );
        console.log('[MINING START] Cleaned up stale session:', row.id);
      }
    }

    // Create new session
    const sessionResult = await client.query(
      `INSERT INTO game_sessions (user_id, partner_id, game_type, score)
       VALUES ($1, $2, 'MINING', 0)
       RETURNING id, created_at`,
      [userId, partnerId]
    );

    const sessionId = sessionResult.rows[0].id;

    // Get user's stamina
    const stamina = await getUserStamina(client, userId);

    await client.query('COMMIT');

    res.json({
      session: {
        id: sessionId,
        relationship_id,
        player_a_id: userId,
        player_b_id: partnerId,
        total_love_mined: 0,
        sync_combos: 0,
        created_at: sessionResult.rows[0].created_at,
      },
      stamina,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/mining/join - Join mining session
// ============================================
async function joinSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    if (!session_id) {
      throw new ApiError(400, 'Session ID required');
    }

    // Verify session exists and user is part of it
    const sessionResult = await query(
      `SELECT gs.*, r.id as relationship_id
       FROM game_sessions gs
       JOIN relationships r ON (r.user_a = gs.user_id OR r.user_a = gs.partner_id)
                            AND (r.user_b = gs.user_id OR r.user_b = gs.partner_id)
       WHERE gs.id = $1 AND (gs.user_id = $2 OR gs.partner_id = $2)`,
      [session_id, userId]
    );

    if (sessionResult.rows.length === 0) {
      throw new ApiError(404, 'Session not found');
    }

    const session = sessionResult.rows[0];
    const stamina = await getUserStamina(null, userId);

    res.json({
      session: {
        id: session.id,
        relationship_id: session.relationship_id,
        player_a_id: session.user_id,
        player_b_id: session.partner_id,
      },
      stamina,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /games/mining/state/:sessionId - Get state
// ============================================
async function getState(req, res, next) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // Get session from DB
    const sessionResult = await query(
      `SELECT gs.*, r.id as relationship_id
       FROM game_sessions gs
       JOIN relationships r ON (r.user_a = gs.user_id OR r.user_a = gs.partner_id)
                            AND (r.user_b = gs.user_id OR r.user_b = gs.partner_id)
       WHERE gs.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new ApiError(404, 'Session not found');
    }

    const session = sessionResult.rows[0];
    const memSession = getOrCreateSession(sessionId);
    
    // Get stamina for both players
    const myStamina = await getUserStamina(null, userId);
    const partnerId = session.user_id === userId ? session.partner_id : session.user_id;
    const partnerStamina = await getUserStamina(null, partnerId);

    const isPlayerA = session.user_id === userId;

    res.json({
      session: {
        id: session.id,
        relationship_id: session.relationship_id,
        player_a_id: session.user_id,
        player_b_id: session.partner_id,
      },
      my_stamina: myStamina,
      partner_stamina: partnerStamina,
      my_taps: isPlayerA ? memSession.player_a_taps : memSession.player_b_taps,
      partner_taps: isPlayerA ? memSession.player_b_taps : memSession.player_a_taps,
      total_love: memSession.total_love,
      sync_combo_active: false,
      sync_multiplier: 1,
      rock_size: memSession.rock_size,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /games/mining/stamina - Get user stamina
// ============================================
async function getStamina(req, res, next) {
  try {
    const userId = req.user.id;
    const stamina = await getUserStamina(null, userId);
    res.json({ stamina });
  } catch (error) {
    next(error);
  }
}

// ============================================
// POST /games/mining/taps - Submit tap batch
// ============================================
async function submitTaps(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { session_id, tap_count, timestamp } = req.body;

    if (!session_id || !tap_count) {
      throw new ApiError(400, 'Session ID and tap count required');
    }

    await client.query('BEGIN');

    // Get session
    const sessionResult = await client.query(
      `SELECT * FROM game_sessions WHERE id = $1`,
      [session_id]
    );

    if (sessionResult.rows.length === 0) {
      throw new ApiError(404, 'Session not found');
    }

    const session = sessionResult.rows[0];
    const isPlayerA = session.user_id === userId;

    // Get current stamina
    const currentStamina = await getUserStamina(client, userId);
    const staminaCost = tap_count * MINING_CONFIG.STAMINA_PER_TAP;
    
    if (currentStamina < staminaCost) {
      throw new ApiError(400, 'Not enough stamina');
    }

    // Deduct stamina
    const newStamina = Math.max(0, currentStamina - staminaCost);
    await client.query(
      `UPDATE users SET mining_stamina = $1 WHERE id = $2`,
      [newStamina, userId]
    );

    // Update in-memory session
    const memSession = getOrCreateSession(session_id);
    
    // Check for sync combo
    let syncTriggered = false;
    let syncMultiplier = 1;
    
    const partnerLastBatch = isPlayerA ? memSession.player_b_last_batch : memSession.player_a_last_batch;
    
    if (partnerLastBatch && timestamp) {
      const timeDiff = Math.abs(timestamp - partnerLastBatch.timestamp);
      if (timeDiff <= MINING_CONFIG.SYNC_WINDOW_MS) {
        syncTriggered = true;
        syncMultiplier = MINING_CONFIG.SYNC_MULTIPLIER;
        memSession.sync_combos++;
        memSession.rock_size = Math.min(
          memSession.rock_size + MINING_CONFIG.ROCK_GROWTH_PER_SYNC,
          MINING_CONFIG.MAX_ROCK_SIZE
        );
      }
    }

    // Calculate love earned
    const loveEarned = tap_count * MINING_CONFIG.LOVE_PER_TAP * syncMultiplier;
    memSession.total_love += loveEarned;

    // Update player stats
    if (isPlayerA) {
      memSession.player_a_taps += tap_count;
      memSession.player_a_last_batch = { timestamp, tap_count };
    } else {
      memSession.player_b_taps += tap_count;
      memSession.player_b_last_batch = { timestamp, tap_count };
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      love_earned: loveEarned,
      sync_triggered: syncTriggered,
      sync_multiplier: syncMultiplier,
      new_stamina: newStamina,
      partner_synced: syncTriggered,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/mining/end - End session
// ============================================
async function endSession(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    await client.query('BEGIN');

    const memSession = activeSessions.get(session_id) || { total_love: 0, sync_combos: 0 };
    const loveEarned = Math.floor(memSession.total_love);

    // Update game session
    await client.query(
      `UPDATE game_sessions 
       SET completed = TRUE, score = $1, love_earned = $1
       WHERE id = $2`,
      [loveEarned, session_id]
    );

    // Get session info
    const sessionResult = await client.query(
      `SELECT user_id, partner_id FROM game_sessions WHERE id = $1`,
      [session_id]
    );

    if (sessionResult.rows.length > 0) {
      const { user_id, partner_id } = sessionResult.rows[0];
      
      // Award love to both players
      if (loveEarned > 0) {
        await client.query(
          `UPDATE users SET balance_love = balance_love + $1 WHERE id = ANY($2::uuid[])`,
          [loveEarned, [user_id, partner_id]]
        );
      }
    }

    // Clean up memory
    activeSessions.delete(session_id);

    await client.query('COMMIT');

    res.json({
      total_love_mined: memSession.total_love,
      sync_combos: memSession.sync_combos,
      love_earned: loveEarned,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// Helper: Get user stamina
// ============================================
async function getUserStamina(client, userId) {
  const queryFn = client ? client.query.bind(client) : query;
  const result = await queryFn(
    `SELECT COALESCE(mining_stamina, $1) as stamina FROM users WHERE id = $2`,
    [MINING_CONFIG.MAX_STAMINA, userId]
  );
  return result.rows[0]?.stamina || MINING_CONFIG.MAX_STAMINA;
}

// ============================================
// Recharge stamina (called from chat)
// ============================================
async function rechargeStamina(userId, amount = MINING_CONFIG.STAMINA_PER_MESSAGE) {
  await query(
    `UPDATE users 
     SET mining_stamina = LEAST(mining_stamina + $1, $2)
     WHERE id = $3`,
    [amount, MINING_CONFIG.MAX_STAMINA, userId]
  );
}

// ============================================
// Socket Event Handlers
// ============================================

function setupMiningSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Join mining room
    socket.on('mining:join', ({ session_id, user_id }) => {
      socket.join(`mining:${session_id}`);
      console.log(`User ${user_id} joined mining room: ${session_id}`);
    });

    // Leave room
    socket.on('mining:leave', ({ session_id }) => {
      socket.leave(`mining:${session_id}`);
    });

    // Submit taps via socket
    socket.on('mining:submit_taps', async ({ session_id, tap_count, timestamp, user_id }) => {
      try {
        // Get session from memory
        const memSession = getOrCreateSession(session_id);

        // Get session from DB to know player positions
        const sessionResult = await query(
          `SELECT user_id, partner_id FROM game_sessions WHERE id = $1`,
          [session_id]
        );

        if (sessionResult.rows.length === 0) return;

        const session = sessionResult.rows[0];
        const isPlayerA = session.user_id === user_id;
        const partnerId = isPlayerA ? session.partner_id : session.user_id;

        // Check for sync
        const partnerLastBatch = isPlayerA ? memSession.player_b_last_batch : memSession.player_a_last_batch;
        let syncTriggered = false;

        if (partnerLastBatch && timestamp) {
          const timeDiff = Math.abs(timestamp - partnerLastBatch.timestamp);
          if (timeDiff <= MINING_CONFIG.SYNC_WINDOW_MS) {
            syncTriggered = true;
            memSession.sync_combos++;
            memSession.rock_size = Math.min(
              memSession.rock_size + MINING_CONFIG.ROCK_GROWTH_PER_SYNC,
              MINING_CONFIG.MAX_ROCK_SIZE
            );

            // Broadcast sync to both players
            io.to(`mining:${session_id}`).emit('mining:sync_combo', {
              multiplier: MINING_CONFIG.SYNC_MULTIPLIER,
            });
          }
        }

        // Calculate love
        const multiplier = syncTriggered ? MINING_CONFIG.SYNC_MULTIPLIER : 1;
        const loveEarned = tap_count * MINING_CONFIG.LOVE_PER_TAP * multiplier;
        memSession.total_love += loveEarned;

        // Update player stats
        if (isPlayerA) {
          memSession.player_a_taps += tap_count;
          memSession.player_a_last_batch = { timestamp, tap_count };
        } else {
          memSession.player_b_taps += tap_count;
          memSession.player_b_last_batch = { timestamp, tap_count };
        }

        // Deduct stamina
        const staminaCost = tap_count * MINING_CONFIG.STAMINA_PER_TAP;
        await query(
          `UPDATE users SET mining_stamina = GREATEST(0, mining_stamina - $1) WHERE id = $2
           RETURNING mining_stamina`,
          [staminaCost, user_id]
        );

        // Get new stamina
        const staminaResult = await query(
          `SELECT mining_stamina FROM users WHERE id = $1`,
          [user_id]
        );
        const newStamina = staminaResult.rows[0]?.mining_stamina || 0;

        // Send result to player
        socket.emit('mining:tap_result', {
          love_earned: loveEarned,
          sync_triggered: syncTriggered,
          sync_multiplier: multiplier,
          new_stamina: newStamina,
          partner_synced: syncTriggered,
        });

        // Broadcast to partner
        socket.to(`mining:${session_id}`).emit('mining:partner_taps', {
          tap_count,
          total: isPlayerA ? memSession.player_a_taps : memSession.player_b_taps,
        });

        // Broadcast stamina update
        io.to(`mining:${session_id}`).emit('mining:stamina_update', {
          user_id,
          stamina: newStamina,
        });
      } catch (error) {
        console.error('Mining submit_taps error:', error);
      }
    });
  });
}

module.exports = {
  startSession,
  joinSession,
  getState,
  getStamina,
  submitTaps,
  endSession,
  rechargeStamina,
  setupMiningSocketHandlers,
  MINING_CONFIG,
};
