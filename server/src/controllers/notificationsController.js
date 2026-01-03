/**
 * Notifications Controller
 * Handle in-app notifications for matches, messages, game invites, rewards
 */

const { pool, query } = require('../config/db');

/**
 * GET /notifications
 * Get all notifications for current user
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    // For now, generate notifications from recent activity
    // In production, you'd have a dedicated notifications table
    
    const notifications = [];

    // Get recent matches (last 7 days)
    const matchesResult = await pool.query(`
      SELECT 
        r.id,
        r.created_at,
        CASE WHEN r.user_a = $1 THEN r.user_b ELSE r.user_a END as partner_id,
        u.display_name as partner_name,
        u.avatar_url as partner_avatar
      FROM relationships r
      JOIN users u ON u.id = CASE WHEN r.user_a = $1 THEN r.user_b ELSE r.user_a END
      WHERE (r.user_a = $1 OR r.user_b = $1)
        AND r.status IN ('MATCHED', 'MINTED_CONTRACT')
        AND r.created_at > NOW() - INTERVAL '7 days'
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [userId]);

    for (const match of matchesResult.rows) {
      notifications.push({
        id: `match_${match.id}`,
        type: 'MATCH',
        title: 'New Match! 💕',
        body: `You matched with ${match.partner_name}`,
        data: {
          user_id: match.partner_id,
          user_name: match.partner_name,
          user_avatar: match.partner_avatar,
          relationship_id: match.id,
        },
        is_read: true, // Matches are assumed read after 24h
        created_at: match.created_at,
      });
    }

    // Get recent unread messages
    const messagesResult = await pool.query(`
      SELECT 
        m.id,
        m.content,
        m.created_at,
        m.sender_id,
        u.display_name as sender_name,
        u.avatar_url as sender_avatar,
        r.id as relationship_id
      FROM messages m
      JOIN relationships r ON m.relationship_id = r.id
      JOIN users u ON u.id = m.sender_id
      WHERE (r.user_a = $1 OR r.user_b = $1)
        AND m.sender_id != $1
        AND m.is_read = FALSE
      ORDER BY m.created_at DESC
      LIMIT 10
    `, [userId]);

    for (const msg of messagesResult.rows) {
      notifications.push({
        id: `msg_${msg.id}`,
        type: 'MESSAGE',
        title: 'New Message',
        body: `${msg.sender_name}: ${msg.content?.substring(0, 50)}${msg.content?.length > 50 ? '...' : ''}`,
        data: {
          user_id: msg.sender_id,
          user_name: msg.sender_name,
          user_avatar: msg.sender_avatar,
          relationship_id: msg.relationship_id,
        },
        is_read: false,
        created_at: msg.created_at,
      });
    }

    // Get unclaimed task rewards
    const tasksResult = await pool.query(`
      SELECT 
        ut.id,
        ut.completed_at,
        ut.reward_amount,
        t.title as task_title
      FROM user_tasks ut
      JOIN tasks t ON ut.task_id = t.id
      WHERE ut.user_id = $1
        AND ut.reward_claimed = FALSE
      ORDER BY ut.completed_at DESC
      LIMIT 5
    `, [userId]);

    for (const task of tasksResult.rows) {
      notifications.push({
        id: `task_${task.id}`,
        type: 'REWARD',
        title: 'Task Completed! 🎉',
        body: `You earned ${task.reward_amount} $LOVE for "${task.task_title}"`,
        data: {
          reward_amount: parseFloat(task.reward_amount),
        },
        is_read: false,
        created_at: task.completed_at,
      });
    }

    // Sort all notifications by date
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply pagination
    const paginated = notifications.slice(offset, offset + limit);

    res.json({
      success: true,
      notifications: paginated,
      total: notifications.length,
      limit,
      offset,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /notifications/:id/read
 * Mark a notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Parse notification ID to determine type
    if (id.startsWith('msg_')) {
      const messageId = id.replace('msg_', '');
      await pool.query(
        `UPDATE messages SET is_read = TRUE 
         WHERE id = $1 AND sender_id != $2`,
        [messageId, userId]
      );
    }
    // Tasks and matches don't have read status in current schema

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /notifications/read-all
 * Mark all notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    // Mark all messages as read
    await pool.query(`
      UPDATE messages m
      SET is_read = TRUE
      FROM relationships r
      WHERE m.relationship_id = r.id
        AND (r.user_a = $1 OR r.user_b = $1)
        AND m.sender_id != $1
        AND m.is_read = FALSE
    `, [userId]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /notifications
 * Clear all notifications (marks them as read/claimed)
 */
async function clearAll(req, res, next) {
  try {
    const userId = req.user.id;

    // Mark all messages as read
    await pool.query(`
      UPDATE messages m
      SET is_read = TRUE
      FROM relationships r
      WHERE m.relationship_id = r.id
        AND (r.user_a = $1 OR r.user_b = $1)
        AND m.sender_id != $1
    `, [userId]);

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAll,
};
