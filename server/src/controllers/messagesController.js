/**
 * Messages Controller
 * Chat between matched users
 */

const { pool, query } = require('../config/db');
const { ApiError } = require('../middlewares');
const { sendAnonymousMessage } = require('../services/telegramBot');

/**
 * GET /messages/:matchId
 * Get messages for a specific match/relationship
 */
async function getMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // cursor for pagination

    // Verify user is part of this relationship
    const relationship = await pool.query(`
      SELECT * FROM relationships 
      WHERE id = $1 
        AND (user_a = $2 OR user_b = $2)
        AND status != 'BURNED_CONTRACT'
    `, [matchId, userId]);

    if (relationship.rows.length === 0) {
      throw new ApiError(403, 'Not authorized to view these messages');
    }

    // Get messages
    let query = `
      SELECT 
        m.*,
        u.display_name as sender_name,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.relationship_id = $1
    `;
    const params = [matchId];

    if (before) {
      query += ` AND m.created_at < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Mark messages as read
    await pool.query(`
      UPDATE messages 
      SET is_read = TRUE 
      WHERE relationship_id = $1 
        AND sender_id != $2 
        AND is_read = FALSE
    `, [matchId, userId]);

    res.json({
      success: true,
      messages: result.rows.reverse(), // Return in chronological order
      has_more: result.rows.length === limit,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /messages/:matchId
 * Send a message to a match
 */
async function sendMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { matchId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      throw new ApiError(400, 'Message content is required');
    }

    if (content.length > 1000) {
      throw new ApiError(400, 'Message too long (max 1000 characters)');
    }

    // Verify user is part of this relationship
    const relationship = await pool.query(`
      SELECT * FROM relationships 
      WHERE id = $1 
        AND (user_a = $2 OR user_b = $2)
        AND status != 'BURNED_CONTRACT'
    `, [matchId, userId]);

    if (relationship.rows.length === 0) {
      throw new ApiError(403, 'Not authorized to send messages here');
    }

    // Insert message
    const result = await pool.query(`
      INSERT INTO messages (relationship_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [matchId, userId, content.trim()]);

    const message = result.rows[0];

    // Get sender info
    const sender = await pool.query(
      'SELECT display_name, avatar_url, telegram_id FROM users WHERE id = $1',
      [userId]
    );

    // Get recipient info (the other person in the relationship)
    const rel = relationship.rows[0];
    const recipientId = rel.user_a === userId ? rel.user_b : rel.user_a;
    const recipient = await pool.query(
      'SELECT telegram_id FROM users WHERE id = $1',
      [recipientId]
    );

    // Send notification via Telegram Bot (async, don't wait)
    if (recipient.rows[0]?.telegram_id) {
      sendAnonymousMessage(
        sender.rows[0].telegram_id,
        recipient.rows[0].telegram_id,
        sender.rows[0].display_name,
        content.trim(),
        matchId
      ).catch(err => console.warn('Bot relay failed:', err.message));
    }

    res.status(201).json({
      success: true,
      message: {
        ...message,
        sender_name: sender.rows[0].display_name,
        sender_avatar: sender.rows[0].avatar_url,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /messages/conversations
 * Get list of conversations with last message
 */
async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        r.id as relationship_id,
        r.status,
        CASE 
          WHEN r.user_a = $1 THEN u_b.id
          ELSE u_a.id
        END as partner_id,
        CASE 
          WHEN r.user_a = $1 THEN u_b.display_name
          ELSE u_a.display_name
        END as partner_name,
        CASE 
          WHEN r.user_a = $1 THEN u_b.avatar_url
          ELSE u_a.avatar_url
        END as partner_avatar,
        (
          SELECT content FROM messages 
          WHERE relationship_id = r.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (
          SELECT created_at FROM messages 
          WHERE relationship_id = r.id 
          ORDER BY created_at DESC LIMIT 1
        ) as last_message_at,
        (
          SELECT COUNT(*) FROM messages 
          WHERE relationship_id = r.id 
            AND sender_id != $1 
            AND is_read = FALSE
        ) as unread_count
      FROM relationships r
      JOIN users u_a ON r.user_a = u_a.id
      JOIN users u_b ON r.user_b = u_b.id
      WHERE (r.user_a = $1 OR r.user_b = $1)
        AND r.status != 'BURNED_CONTRACT'
      ORDER BY last_message_at DESC NULLS LAST
    `, [userId]);

    res.json({
      success: true,
      conversations: result.rows,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /messages/unread
 * Get total unread message count
 */
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM messages m
      JOIN relationships r ON m.relationship_id = r.id
      WHERE (r.user_a = $1 OR r.user_b = $1)
        AND m.sender_id != $1
        AND m.is_read = FALSE
        AND r.status != 'BURNED_CONTRACT'
    `, [userId]);

    res.json({
      success: true,
      unread_count: parseInt(result.rows[0].count) || 0,
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMessages,
  sendMessage,
  getConversations,
  getUnreadCount,
};
