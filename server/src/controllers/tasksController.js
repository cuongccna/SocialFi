/**
 * Tasks Controller
 * Daily missions and tasks for earning $LOVE
 */

const { pool, query } = require('../config/db');
const { ApiError } = require('../middlewares');

/**
 * GET /tasks
 * Get all available tasks with user's completion status
 */
async function getTasks(req, res, next) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT 
        t.id,
        t.code,
        t.title,
        t.description,
        t.reward_amount,
        t.task_type,
        t.requirement_type,
        t.requirement_value,
        CASE 
          WHEN t.task_type = 'DAILY' THEN 
            EXISTS(SELECT 1 FROM user_tasks ut WHERE ut.task_id = t.id AND ut.user_id = $1 AND ut.task_date = $2)
          WHEN t.task_type = 'WEEKLY' THEN
            EXISTS(SELECT 1 FROM user_tasks ut WHERE ut.task_id = t.id AND ut.user_id = $1 AND ut.task_date >= CURRENT_DATE - INTERVAL '7 days')
          ELSE
            EXISTS(SELECT 1 FROM user_tasks ut WHERE ut.task_id = t.id AND ut.user_id = $1)
        END as is_completed,
        (
          SELECT ut.completed_at FROM user_tasks ut 
          WHERE ut.task_id = t.id AND ut.user_id = $1 
          ORDER BY ut.completed_at DESC LIMIT 1
        ) as last_completed_at
      FROM tasks t
      WHERE t.is_active = TRUE
      ORDER BY 
        CASE t.task_type 
          WHEN 'DAILY' THEN 1 
          WHEN 'WEEKLY' THEN 2 
          WHEN 'ONE_TIME' THEN 3 
          ELSE 4 
        END,
        t.reward_amount DESC
    `, [userId, today]);

    // Get user's current progress for each task type
    const [swipeCount, matchCount, contractCount, juryVotes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND DATE(created_at) = $2`, [userId, today]),
      pool.query(`SELECT COUNT(*) FROM relationships WHERE (user_a = $1 OR user_b = $1)`, [userId]),
      pool.query(`SELECT COUNT(*) FROM relationships WHERE (user_a = $1 OR user_b = $1) AND status = 'MINTED_CONTRACT'`, [userId]),
      pool.query(`SELECT COUNT(*) FROM jury_votes WHERE juror_id = $1 AND DATE(created_at) = $2`, [userId, today]),
    ]);

    const progress = {
      SWIPE: parseInt(swipeCount.rows[0].count),
      MATCH: parseInt(matchCount.rows[0].count),
      CONTRACT: parseInt(contractCount.rows[0].count),
      JURY_VOTE: parseInt(juryVotes.rows[0].count),
      WALLET: req.user.wallet_address ? 1 : 0,
      LOGIN: 1, // Always 1 since they're logged in
    };

    res.json({
      success: true,
      tasks: result.rows.map(task => ({
        ...task,
        reward_amount: parseFloat(task.reward_amount),
        current_progress: progress[task.requirement_type] || 0,
      })),
      progress,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /tasks/:taskId/claim
 * Claim reward for a completed task
 */
async function claimTask(req, res, next) {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Get task info
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND is_active = TRUE',
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      throw new ApiError(404, 'Task not found');
    }

    const task = taskResult.rows[0];

    // Check if already claimed today (for daily tasks)
    const existingClaim = await pool.query(`
      SELECT * FROM user_tasks 
      WHERE user_id = $1 AND task_id = $2 
        AND (task_date = $3 OR $4 != 'DAILY')
    `, [userId, taskId, today, task.task_type]);

    if (existingClaim.rows.length > 0 && task.task_type !== 'DAILY') {
      throw new ApiError(400, 'Task already claimed');
    }

    if (existingClaim.rows.length > 0 && task.task_type === 'DAILY') {
      throw new ApiError(400, 'Task already claimed today');
    }

    // Check if user meets requirement
    let currentProgress = 0;
    switch (task.requirement_type) {
      case 'LOGIN':
        currentProgress = 1;
        break;
      case 'SWIPE':
        const swipes = await pool.query(
          `SELECT COUNT(*) FROM swipes WHERE actor_id = $1 AND DATE(created_at) = $2`,
          [userId, today]
        );
        currentProgress = parseInt(swipes.rows[0].count);
        break;
      case 'MATCH':
        const matches = await pool.query(
          `SELECT COUNT(*) FROM relationships WHERE (user_a = $1 OR user_b = $1)`,
          [userId]
        );
        currentProgress = parseInt(matches.rows[0].count);
        break;
      case 'CONTRACT':
        const contracts = await pool.query(
          `SELECT COUNT(*) FROM relationships WHERE (user_a = $1 OR user_b = $1) AND status = 'MINTED_CONTRACT'`,
          [userId]
        );
        currentProgress = parseInt(contracts.rows[0].count);
        break;
      case 'WALLET':
        const wallet = await pool.query(
          'SELECT wallet_address FROM users WHERE id = $1',
          [userId]
        );
        currentProgress = wallet.rows[0].wallet_address ? 1 : 0;
        break;
      case 'JURY_VOTE':
        const votes = await pool.query(
          `SELECT COUNT(*) FROM jury_votes WHERE juror_id = $1 AND DATE(created_at) = $2`,
          [userId, today]
        );
        currentProgress = parseInt(votes.rows[0].count);
        break;
    }

    if (currentProgress < task.requirement_value) {
      throw new ApiError(400, `Task not complete. Progress: ${currentProgress}/${task.requirement_value}`);
    }

    // Claim the reward
    await pool.query('BEGIN');

    try {
      // Insert completion record
      await pool.query(`
        INSERT INTO user_tasks (user_id, task_id, reward_claimed, reward_amount, task_date)
        VALUES ($1, $2, TRUE, $3, $4)
      `, [userId, taskId, task.reward_amount, today]);

      // Add reward to user's balance
      await pool.query(
        'UPDATE users SET balance_love = balance_love + $2 WHERE id = $1',
        [userId, task.reward_amount]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: `Claimed ${task.reward_amount} $LOVE!`,
        reward: parseFloat(task.reward_amount),
        task_code: task.code,
      });

    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    next(err);
  }
}

/**
 * POST /tasks/daily-login
 * Auto-claim daily login reward
 */
async function claimDailyLogin(req, res, next) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Find daily login task
    const task = await pool.query(
      "SELECT * FROM tasks WHERE code = 'daily_login' AND is_active = TRUE"
    );

    if (task.rows.length === 0) {
      return res.json({ success: true, already_claimed: true });
    }

    const taskId = task.rows[0].id;
    const reward = parseFloat(task.rows[0].reward_amount);

    // Check if already claimed today
    const existing = await pool.query(
      'SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2 AND task_date = $3',
      [userId, taskId, today]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, already_claimed: true });
    }

    // Claim the reward using upsert to avoid race conditions
    try {
      const insertResult = await pool.query(`
        INSERT INTO user_tasks (user_id, task_id, reward_claimed, reward_amount, task_date)
        VALUES ($1, $2, TRUE, $3, $4)
        ON CONFLICT (user_id, task_id, task_date) DO NOTHING
        RETURNING id
      `, [userId, taskId, reward, today]);

      // If no row was inserted (conflict), it was already claimed
      if (insertResult.rows.length === 0) {
        return res.json({ success: true, already_claimed: true });
      }

      // Add reward to user's balance
      await pool.query(
        'UPDATE users SET balance_love = balance_love + $2 WHERE id = $1',
        [userId, reward]
      );

      res.json({
        success: true,
        message: `Daily login bonus: +${reward} $LOVE!`,
        reward,
        already_claimed: false,
      });

    } catch (err) {
      // If still a unique violation somehow, treat as already claimed
      if (err.code === '23505') {
        return res.json({ success: true, already_claimed: true });
      }
      throw err;
    }

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTasks,
  claimTask,
  claimDailyLogin,
};
