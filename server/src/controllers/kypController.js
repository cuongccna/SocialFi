/**
 * KYP (Know Your Partner) Game Controller
 * Handles the real-time quiz game logic
 */

const { query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');

// ============================================
// KYP Questions (Server-side copy)
// ============================================

const KYP_QUESTIONS = [
  // Spicy
  { id: 1, question: "How many exes does your partner have?", options: ["0-1", "2-3", "4-5", "I don't want to know 💀"], category: 'Spicy', points: 30 },
  { id: 2, question: "What's your partner's biggest turn-off in a relationship?", options: ["Dishonesty", "Clinginess", "Bad hygiene", "Being boring"], category: 'Spicy', points: 25 },
  { id: 3, question: "How would your partner react if their ex texted 'I miss you'?", options: ["Ignore completely", "Reply politely", "Show you first", "Block immediately"], category: 'Spicy', points: 30 },
  { id: 4, question: "What's the longest your partner has ever been single?", options: ["Less than 3 months", "3-12 months", "1-3 years", "Forever single until me 😏"], category: 'Spicy', points: 20 },
  { id: 5, question: "Your partner's love language is probably...", options: ["Words of Affirmation", "Physical Touch", "Quality Time", "Gifts & Acts of Service"], category: 'Spicy', points: 25 },
  { id: 6, question: "Who said 'I love you' first in your partner's last relationship?", options: ["My partner", "Their ex", "Neither", "They don't remember"], category: 'Spicy', points: 30 },
  { id: 7, question: "How jealous is your partner on a scale?", options: ["Not at all", "A little protective", "Moderately jealous", "FBI investigation level"], category: 'Spicy', points: 25 },
  { id: 8, question: "Your partner's biggest red flag they'd forgive is...", options: ["Being too busy", "Talking to exes", "Not being romantic", "Forgetting anniversaries"], category: 'Spicy', points: 25 },
  
  // Finance
  { id: 20, question: "How does your partner feel about splitting bills on dates?", options: ["Always 50/50", "Whoever asks pays", "The higher earner pays", "Take turns"], category: 'Finance', points: 20 },
  { id: 21, question: "Your partner's spending style is...", options: ["Super saver 🏦", "Balanced budgeter", "Treat yourself type 🛍️", "YOLO spender"], category: 'Finance', points: 20 },
  { id: 22, question: "What would your partner spend a surprise $1000 on?", options: ["Invest/save it", "Shopping spree", "Travel experience", "Treat friends & family"], category: 'Finance', points: 20 },
  { id: 23, question: "Your partner's biggest financial guilt is...", options: ["Food delivery 🍕", "Online shopping", "Gaming/entertainment", "Subscriptions they forget"], category: 'Finance', points: 15 },
  { id: 24, question: "How much crypto does your partner probably hodl?", options: ["Zero, too risky", "A little for fun", "Moderate investment", "Diamond hands forever 💎"], category: 'Finance', points: 25 },
  { id: 25, question: "When buying expensive items, your partner...", options: ["Researches for weeks", "Buys impulsively", "Waits for sales", "Asks friends first"], category: 'Finance', points: 15 },
  { id: 26, question: "Your partner's ideal retirement age is...", options: ["30 (fire movement)", "45-50 early retire", "60 normal", "Never stopping"], category: 'Finance', points: 20 },
  
  // Life
  { id: 40, question: "Your partner is a morning person or night owl?", options: ["Early bird 🌅", "Night owl 🦉", "Depends on the day", "Always tired 😴"], category: 'Life', points: 10 },
  { id: 41, question: "What's your partner's go-to comfort food?", options: ["Pizza/Fast food", "Home-cooked meal", "Ramen/Noodles", "Ice cream/Desserts"], category: 'Life', points: 10 },
  { id: 42, question: "On weekends, your partner prefers to...", options: ["Stay in & relax", "Go out socializing", "Productive activities", "Adventure outdoors"], category: 'Life', points: 15 },
  { id: 43, question: "Your partner's dream travel destination is...", options: ["Beach paradise 🏝️", "European culture trip", "Asian adventure", "Local exploration"], category: 'Life', points: 15 },
  { id: 44, question: "How does your partner handle stress?", options: ["Talks it out", "Needs alone time", "Exercises/Physical activity", "Distracts with entertainment"], category: 'Life', points: 20 },
  { id: 45, question: "Your partner's biggest pet peeve is probably...", options: ["Being late", "Loud chewing", "Phone during meals", "Messy spaces"], category: 'Life', points: 15 },
  { id: 46, question: "In an argument, your partner typically...", options: ["Needs to win", "Seeks compromise", "Goes silent", "Gets emotional"], category: 'Life', points: 20 },
  { id: 47, question: "Your partner's ideal pet would be...", options: ["Dog 🐕", "Cat 🐱", "No pets", "Something exotic"], category: 'Life', points: 10 },
];

// Game config
const CONFIG = {
  QUESTIONS_PER_GAME: 10,
  TIME_TO_BET: 10,
  TIME_TO_ANSWER: 30,
  MIN_BET: 5,
  MAX_BET: 100,
  DEFAULT_BET: 10,
};

// Active games in memory (for real-time state)
const activeGames = new Map();

// ============================================
// Helper Functions
// ============================================

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomQuestions(count) {
  return shuffleArray(KYP_QUESTIONS).slice(0, count);
}

// ============================================
// POST /games/kyp/start - Start new KYP game
// ============================================
async function startGame(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { relationship_id } = req.body;

    if (!relationship_id) {
      throw new ApiError(400, 'Relationship ID required');
    }

    await client.query('BEGIN');

    // Verify relationship exists and user is part of it
    // Allow both MATCHED and MINTED_CONTRACT status (not BURNED_CONTRACT)
    const relResult = await client.query(
      `SELECT * FROM relationships 
       WHERE id = $1 AND (user_a = $2 OR user_b = $2) AND status IN ('MATCHED', 'MINTED_CONTRACT')`,
      [relationship_id, userId]
    );

    if (relResult.rows.length === 0) {
      throw new ApiError(404, 'Relationship not found or not matched');
    }

    const relationship = relResult.rows[0];
    const partnerId = relationship.user_a === userId ? relationship.user_b : relationship.user_a;

    // Check for existing active game between these two users
    const existingGames = await client.query(
      `SELECT id FROM game_sessions 
       WHERE ((user_id = $1 AND partner_id = $2) OR (user_id = $2 AND partner_id = $1))
       AND game_type = 'KYP' 
       AND completed = FALSE 
       AND created_at > NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC`,
      [userId, partnerId]
    );

    console.log('[KYP START] Found existing game sessions:', existingGames.rows.length);

    if (existingGames.rows.length > 0) {
      // Check ALL returned games to find one in activeGames
      for (const row of existingGames.rows) {
        const existingSessionId = row.id;
        console.log('[KYP START] Checking session:', existingSessionId, 'in activeGames:', activeGames.has(existingSessionId));
        
        // Check if the game is still in memory (active)
        if (activeGames.has(existingSessionId)) {
          const game = activeGames.get(existingSessionId);
          console.log('[KYP START] Found existing active game, joining instead:', existingSessionId);
          
          // If this user is joining an existing game, transition to BETTING phase
          if (game.phase === 'WAITING') {
            game.phase = 'BETTING';
            game.current_round = 1;
            console.log('[KYP START] Game phase changed to BETTING');
            
            // Emit socket event to notify all players in the room
            const io = module.exports.io;
            if (io) {
              const currentRound = {
                round_number: game.current_round,
                question: game.questions[game.current_round - 1],
                phase: game.phase,
                time_remaining: CONFIG.TIME_TO_BET,
              };
              io.to(`kyp:${existingSessionId}`).emit('kyp:phase', {
                phase: game.phase,
                round: currentRound,
              });
              console.log('[KYP START] Emitted kyp:phase to room:', `kyp:${existingSessionId}`);
            }
          }

          await client.query('COMMIT');

          // Get partner info
          const partnerResult = await query(
            `SELECT display_name, avatar_url FROM users WHERE id = $1`,
            [partnerId]
          );

          return res.json({
            success: true,
            session: {
              id: game.id,
              relationship_id: game.relationship_id,
              player_a_id: game.player_a_id,
              player_b_id: game.player_b_id,
              current_round: game.current_round,
              total_rounds: game.total_rounds,
              phase: game.phase,
              pot: game.pot,
              player_a_score: game.player_a_score,
              player_b_score: game.player_b_score,
              matches: game.matches,
              created_at: game.created_at,
            },
            partner: partnerResult.rows[0] || null,
            joined: true,  // Flag to indicate this is a join, not a new game
          });
        }
      }
      
      // No active game found in memory - clean up ALL stale sessions
      for (const row of existingGames.rows) {
        await client.query(
          `UPDATE game_sessions SET completed = TRUE WHERE id = $1`,
          [row.id]
        );
        console.log(`[KYP START] Cleaned up stale game session: ${row.id}`);
      }
    }

    // Create game session
    const questions = getRandomQuestions(CONFIG.QUESTIONS_PER_GAME);
    
    const sessionResult = await client.query(
      `INSERT INTO game_sessions (user_id, partner_id, game_type, score)
       VALUES ($1, $2, 'KYP', 0)
       RETURNING id, created_at`,
      [userId, partnerId]
    );

    const sessionId = sessionResult.rows[0].id;

    console.log('[KYP START] Creating game session:', sessionId);
    console.log('[KYP START] Players:', { player_a: userId, player_b: partnerId });
    console.log('[KYP START] Relationship ID:', relationship_id);

    // Store game state in memory
    activeGames.set(sessionId, {
      id: sessionId,
      relationship_id,
      player_a_id: userId,
      player_b_id: partnerId,
      questions,
      current_round: 0,
      total_rounds: CONFIG.QUESTIONS_PER_GAME,
      phase: 'WAITING',
      pot: 0,
      player_a_score: 0,
      player_b_score: 0,
      matches: 0,
      player_a_bet: null,
      player_b_bet: null,
      player_a_answer: null,
      player_b_answer: null,
      created_at: new Date().toISOString(),
    });

    console.log('[KYP START] Game stored in activeGames. Total games:', activeGames.size);

    await client.query('COMMIT');

    // Get partner info
    const partnerResult = await query(
      `SELECT display_name, avatar_url FROM users WHERE id = $1`,
      [partnerId]
    );

    res.json({
      success: true,
      session: {
        id: sessionId,
        relationship_id,
        player_a_id: userId,
        player_b_id: partnerId,
        current_round: 0,
        total_rounds: CONFIG.QUESTIONS_PER_GAME,
        phase: 'WAITING',
        pot: 0,
        player_a_score: 0,
        player_b_score: 0,
        matches: 0,
        created_at: sessionResult.rows[0].created_at,
      },
      partner: partnerResult.rows[0] || null,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

// ============================================
// POST /games/kyp/join - Join existing game
// ============================================
async function joinGame(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    console.log('[KYP JOIN] Request:', { userId, session_id });
    console.log('[KYP JOIN] Active games count:', activeGames.size);
    console.log('[KYP JOIN] Active game IDs:', Array.from(activeGames.keys()));

    if (!session_id) {
      console.log('[KYP JOIN] Error: No session_id provided');
      throw new ApiError(400, 'Session ID required');
    }

    const game = activeGames.get(session_id);

    if (!game) {
      console.log('[KYP JOIN] Error: Game not found in activeGames map for session_id:', session_id);
      throw new ApiError(404, 'Game not found or expired');
    }
    
    console.log('[KYP JOIN] Found game:', { id: game.id, player_a: game.player_a_id, player_b: game.player_b_id, phase: game.phase });

    if (game.player_a_id !== userId && game.player_b_id !== userId) {
      throw new ApiError(403, 'You are not part of this game');
    }

    // Mark as joined and start if both players ready
    if (game.phase === 'WAITING') {
      game.phase = 'BETTING';
      game.current_round = 1;
    }

    // Get partner info
    const partnerId = game.player_a_id === userId ? game.player_b_id : game.player_a_id;
    const partnerResult = await query(
      `SELECT display_name, avatar_url FROM users WHERE id = $1`,
      [partnerId]
    );

    res.json({
      success: true,
      session: {
        id: game.id,
        relationship_id: game.relationship_id,
        player_a_id: game.player_a_id,
        player_b_id: game.player_b_id,
        current_round: game.current_round,
        total_rounds: game.total_rounds,
        phase: game.phase,
        pot: game.pot,
        player_a_score: game.player_a_score,
        player_b_score: game.player_b_score,
        matches: game.matches,
        created_at: game.created_at,
      },
      partner: partnerResult.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /games/kyp/state/:sessionId - Get game state
// ============================================
async function getGameState(req, res, next) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    console.log('[KYP STATE] Request:', { userId, sessionId });
    console.log('[KYP STATE] Active games count:', activeGames.size);
    console.log('[KYP STATE] Active game IDs:', Array.from(activeGames.keys()));

    const game = activeGames.get(sessionId);

    if (!game) {
      console.log('[KYP STATE] Error: Game not found for sessionId:', sessionId);
      throw new ApiError(404, 'Game not found or expired');
    }

    console.log('[KYP STATE] Found game:', { id: game.id, phase: game.phase, players: [game.player_a_id, game.player_b_id] });

    if (game.player_a_id !== userId && game.player_b_id !== userId) {
      console.log('[KYP STATE] Error: User not part of game');
      throw new ApiError(403, 'You are not part of this game');
    }

    const currentQuestion = game.questions[game.current_round - 1] || null;

    res.json({
      session: {
        id: game.id,
        relationship_id: game.relationship_id,
        player_a_id: game.player_a_id,
        player_b_id: game.player_b_id,
        current_round: game.current_round,
        total_rounds: game.total_rounds,
        phase: game.phase,
        pot: game.pot,
        player_a_score: game.player_a_score,
        player_b_score: game.player_b_score,
        matches: game.matches,
        created_at: game.created_at,
      },
      round: currentQuestion ? {
        round_number: game.current_round,
        question: currentQuestion,
        phase: game.phase,
        time_remaining: CONFIG.TIME_TO_ANSWER,
        player_a_bet_ready: game.player_a_bet !== null,
        player_b_bet_ready: game.player_b_bet !== null,
        player_a_answered: game.player_a_answer !== null,
        player_b_answered: game.player_b_answer !== null,
      } : null,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// POST /games/kyp/bet - Submit bet
// ============================================
async function submitBet(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id, amount } = req.body;

    const game = activeGames.get(session_id);

    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    if (game.phase !== 'BETTING') {
      throw new ApiError(400, 'Not in betting phase');
    }

    const bet = Math.min(Math.max(amount || CONFIG.DEFAULT_BET, CONFIG.MIN_BET), CONFIG.MAX_BET);

    if (game.player_a_id === userId) {
      game.player_a_bet = bet;
    } else if (game.player_b_id === userId) {
      game.player_b_bet = bet;
    } else {
      throw new ApiError(403, 'Not part of this game');
    }

    // Check if both players have bet
    const bothBet = game.player_a_bet !== null && game.player_b_bet !== null;

    if (bothBet) {
      game.pot = game.player_a_bet + game.player_b_bet;
      game.phase = 'ANSWERING';
    }

    res.json({
      success: true,
      bet_confirmed: true,
      waiting_for_partner: !bothBet,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// POST /games/kyp/answer - Submit answer
// ============================================
async function submitAnswer(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id, answer_index } = req.body;

    const game = activeGames.get(session_id);

    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    if (game.phase !== 'ANSWERING') {
      throw new ApiError(400, 'Not in answering phase');
    }

    if (answer_index < 0 || answer_index > 3) {
      throw new ApiError(400, 'Invalid answer index');
    }

    if (game.player_a_id === userId) {
      game.player_a_answer = answer_index;
    } else if (game.player_b_id === userId) {
      game.player_b_answer = answer_index;
    } else {
      throw new ApiError(403, 'Not part of this game');
    }

    // Check if both players have answered
    const bothAnswered = game.player_a_answer !== null && game.player_b_answer !== null;

    if (bothAnswered) {
      // Process reveal
      game.phase = 'REVEAL';
      
      const isMatch = game.player_a_answer === game.player_b_answer;
      const currentQuestion = game.questions[game.current_round - 1];
      
      if (isMatch) {
        game.matches++;
        // Both players get the pot
        game.player_a_score += game.pot;
        game.player_b_score += game.pot;
      }

      // Store round result
      game.lastRoundResult = {
        round_number: game.current_round,
        question: currentQuestion,
        phase: 'REVEAL',
        player_a_answer: game.player_a_answer,
        player_b_answer: game.player_b_answer,
        is_match: isMatch,
        pot_won: isMatch ? game.pot : 0,
      };
    }

    res.json({
      success: true,
      answer_confirmed: true,
      waiting_for_partner: !bothAnswered,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET /games/kyp/results/:sessionId - Get final results
// ============================================
async function getResults(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const game = activeGames.get(sessionId);

    if (!game) {
      throw new ApiError(404, 'Game not found');
    }

    if (game.player_a_id !== userId && game.player_b_id !== userId) {
      throw new ApiError(403, 'Not part of this game');
    }

    await client.query('BEGIN');

    // Get player info
    const playerAResult = await client.query(
      `SELECT id, display_name, avatar_url FROM users WHERE id = $1`,
      [game.player_a_id]
    );
    const playerBResult = await client.query(
      `SELECT id, display_name, avatar_url FROM users WHERE id = $1`,
      [game.player_b_id]
    );

    const matchPercentage = Math.round((game.matches / game.total_rounds) * 100);
    const loveEarned = Math.floor(game.matches * 5); // 5 $LOVE per match

    // Update game session in DB
    await client.query(
      `UPDATE game_sessions 
       SET score = $1, completed = TRUE, duration_seconds = $2, love_earned = $3
       WHERE id = $4`,
      [game.matches, 0, loveEarned, sessionId]
    );

    // Add $LOVE rewards to both players
    if (loveEarned > 0) {
      await client.query(
        `UPDATE users SET balance_love = balance_love + $1 WHERE id = ANY($2::uuid[])`,
        [loveEarned, [game.player_a_id, game.player_b_id]]
      );
    }

    await client.query('COMMIT');

    // Clean up game from memory
    activeGames.delete(sessionId);

    res.json({
      result: {
        session_id: sessionId,
        player_a: {
          id: playerAResult.rows[0].id,
          name: playerAResult.rows[0].display_name,
          avatar_url: playerAResult.rows[0].avatar_url,
          score: game.player_a_score,
        },
        player_b: {
          id: playerBResult.rows[0].id,
          name: playerBResult.rows[0].display_name,
          avatar_url: playerBResult.rows[0].avatar_url,
          score: game.player_b_score,
        },
        total_matches: game.matches,
        total_rounds: game.total_rounds,
        match_percentage: matchPercentage,
        love_earned: loveEarned,
        compatibility_rating: getCompatibilityRating(matchPercentage),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

function getCompatibilityRating(percentage) {
  if (percentage >= 90) return 'SOULMATES';
  if (percentage >= 80) return 'Perfect Match';
  if (percentage >= 70) return 'Great Connection';
  if (percentage >= 60) return 'Good Vibes';
  if (percentage >= 50) return 'Getting There';
  if (percentage >= 30) return 'Opposites Attract?';
  return 'Work in Progress';
}

// ============================================
// POST /games/kyp/share - Generate share image
// ============================================
async function generateShareImage(req, res, next) {
  try {
    const userId = req.user.id;
    const { session_id } = req.body;

    // For now, return a placeholder
    // In production, this would generate an actual image using canvas or a service

    const game = activeGames.get(session_id);
    const matchPercentage = game ? Math.round((game.matches / game.total_rounds) * 100) : 0;

    res.json({
      success: true,
      image_url: `https://cryptocrush.app/share/kyp/${session_id}.png`,
      share_text: `💕 We matched ${matchPercentage}% on CryptoCrush KYP Challenge! Think you can beat us? #CryptoCrush #KYPChallenge`,
    });
  } catch (error) {
    next(error);
  }
}

// ============================================
// Socket Event Handlers
// ============================================

function setupKYPSocketHandlers(io) {
  // Store io instance for use in controllers
  module.exports.io = io;
  
  io.on('connection', (socket) => {
    // Join KYP game room
    socket.on('kyp:join', ({ session_id }) => {
      socket.join(`kyp:${session_id}`);
      console.log(`User joined KYP room: ${session_id}`);
      
      const game = activeGames.get(session_id);
      if (game) {
        const currentRound = game.questions[game.current_round - 1] ? {
          round_number: game.current_round,
          question: game.questions[game.current_round - 1],
          phase: game.phase,
          time_remaining: CONFIG.TIME_TO_ANSWER,
        } : null;
        
        // Send state to the joining user
        socket.emit('kyp:state', {
          session: game,
          round: currentRound,
        });
        
        // Broadcast to ALL users in the room (including existing ones) that someone joined
        // This helps update all clients when game state changes (e.g., phase to BETTING)
        io.to(`kyp:${session_id}`).emit('kyp:phase', {
          phase: game.phase,
          round: currentRound,
        });
      }
    });

    // Leave game
    socket.on('kyp:leave', ({ session_id }) => {
      socket.leave(`kyp:${session_id}`);
    });

    // Submit bet via socket
    socket.on('kyp:bet', async ({ session_id, amount, user_id }) => {
      const game = activeGames.get(session_id);
      if (!game || game.phase !== 'BETTING') return;

      const bet = Math.min(Math.max(amount || CONFIG.DEFAULT_BET, CONFIG.MIN_BET), CONFIG.MAX_BET);

      if (game.player_a_id === user_id) {
        game.player_a_bet = bet;
      } else if (game.player_b_id === user_id) {
        game.player_b_bet = bet;
      }

      // Broadcast bet update
      io.to(`kyp:${session_id}`).emit('kyp:bet_update', {
        player_id: user_id,
        ready: true,
      });

      // Check if both bet
      if (game.player_a_bet !== null && game.player_b_bet !== null) {
        game.pot = game.player_a_bet + game.player_b_bet;
        game.phase = 'ANSWERING';

        io.to(`kyp:${session_id}`).emit('kyp:phase', {
          phase: 'ANSWERING',
          round: {
            round_number: game.current_round,
            question: game.questions[game.current_round - 1],
            phase: 'ANSWERING',
            time_remaining: CONFIG.TIME_TO_ANSWER,
          },
        });
      }
    });

    // Submit answer via socket
    socket.on('kyp:answer', async ({ session_id, answer_index, user_id }) => {
      const game = activeGames.get(session_id);
      if (!game || game.phase !== 'ANSWERING') return;

      if (game.player_a_id === user_id) {
        game.player_a_answer = answer_index;
      } else if (game.player_b_id === user_id) {
        game.player_b_answer = answer_index;
      }

      // Broadcast answer update
      io.to(`kyp:${session_id}`).emit('kyp:answer_update', {
        player_id: user_id,
        answered: true,
      });

      // Check if both answered
      if (game.player_a_answer !== null && game.player_b_answer !== null) {
        const isMatch = game.player_a_answer === game.player_b_answer;
        const currentQuestion = game.questions[game.current_round - 1];

        if (isMatch) {
          game.matches++;
          game.player_a_score += game.pot;
          game.player_b_score += game.pot;
        }

        game.phase = 'REVEAL';

        io.to(`kyp:${session_id}`).emit('kyp:round_result', {
          round_number: game.current_round,
          question: currentQuestion,
          phase: 'REVEAL',
          player_a_answer: game.player_a_answer,
          player_b_answer: game.player_b_answer,
          is_match: isMatch,
          pot_won: isMatch ? game.pot : 0,
        });

        // After reveal, advance to next round or end game
        setTimeout(async () => {
          if (game.current_round >= game.total_rounds) {
            // Game finished - fetch player info from database
            try {
              const playersResult = await query(`
                SELECT id, display_name, avatar_url FROM users 
                WHERE id IN ($1, $2)
              `, [game.player_a_id, game.player_b_id]);
              
              const playerA = playersResult.rows.find(p => p.id === game.player_a_id) || {};
              const playerB = playersResult.rows.find(p => p.id === game.player_b_id) || {};
              
              const matchPercentage = Math.round((game.matches / game.total_rounds) * 100);
              const loveEarned = game.player_a_score + game.player_b_score;
              
              // Calculate compatibility rating
              let compatibilityRating = 'Strangers 👋';
              if (matchPercentage >= 90) compatibilityRating = 'Soulmates 💕';
              else if (matchPercentage >= 70) compatibilityRating = 'Perfect Match 💘';
              else if (matchPercentage >= 50) compatibilityRating = 'Getting There 💫';
              else if (matchPercentage >= 30) compatibilityRating = 'Room to Grow 🌱';
              
              io.to(`kyp:${session_id}`).emit('kyp:game_end', {
                session_id,
                player_a: {
                  id: game.player_a_id,
                  name: playerA.display_name || 'Player A',
                  avatar_url: playerA.avatar_url || null,
                  score: game.player_a_score,
                },
                player_b: {
                  id: game.player_b_id,
                  name: playerB.display_name || 'Player B',
                  avatar_url: playerB.avatar_url || null,
                  score: game.player_b_score,
                },
                total_matches: game.matches,
                total_rounds: game.total_rounds,
                match_percentage: matchPercentage,
                love_earned: loveEarned,
                compatibility_rating: compatibilityRating,
              });
              
              // Mark game as completed in database
              await query(
                `UPDATE game_sessions SET completed = TRUE, score = $2 WHERE id = $1`,
                [session_id, loveEarned]
              );
              
              // Clean up from active games
              activeGames.delete(session_id);
              console.log(`[KYP] Game ${session_id} completed. Match: ${matchPercentage}%`);
              
            } catch (dbError) {
              console.error('[KYP] Error fetching player info for game end:', dbError);
              // Fallback emit with minimal data
              io.to(`kyp:${session_id}`).emit('kyp:game_end', {
                session_id,
                player_a: { id: game.player_a_id, name: 'Player A', avatar_url: null, score: game.player_a_score },
                player_b: { id: game.player_b_id, name: 'Player B', avatar_url: null, score: game.player_b_score },
                total_matches: game.matches,
                total_rounds: game.total_rounds,
                match_percentage: Math.round((game.matches / game.total_rounds) * 100),
                love_earned: game.player_a_score + game.player_b_score,
                compatibility_rating: 'Good Match 💫',
              });
            }
          } else {
            // Reset for next round
            game.current_round++;
            game.phase = 'BETTING';
            game.player_a_bet = null;
            game.player_b_bet = null;
            game.player_a_answer = null;
            game.player_b_answer = null;
            game.pot = 0;

            io.to(`kyp:${session_id}`).emit('kyp:phase', {
              phase: 'BETTING',
              round: {
                round_number: game.current_round,
                question: game.questions[game.current_round - 1],
                phase: 'BETTING',
                time_remaining: CONFIG.TIME_TO_BET,
              },
            });
          }
        }, 5000); // 5 second reveal
      }
    });
  });
}

module.exports = {
  startGame,
  joinGame,
  getGameState,
  submitBet,
  submitAnswer,
  getResults,
  generateShareImage,
  setupKYPSocketHandlers,
};
