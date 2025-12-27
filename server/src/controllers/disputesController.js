/**
 * Disputes Controller (Jury DAO)
 * Handle dispute creation, voting, and resolution
 */

const pool = require('../config/db');

/**
 * GET /disputes
 * Get disputes for voting (excludes user's own disputes)
 */
async function getDisputes(req, res, next) {
  try {
    const userId = req.user.id;
    const { status = 'VOTING' } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;

    const result = await pool.query(`
      SELECT 
        d.id,
        d.title,
        d.evidence_content,
        d.defendant_response,
        d.stake_amount,
        d.status,
        d.votes_plaintiff,
        d.votes_defendant,
        d.created_at,
        d.expiry_date,
        -- Plaintiff info
        p.id as plaintiff_id,
        p.display_name as plaintiff_name,
        p.avatar_url as plaintiff_avatar,
        p.market_price as plaintiff_price,
        -- Defendant info
        def.id as defendant_id,
        def.display_name as defendant_name,
        def.avatar_url as defendant_avatar,
        def.market_price as defendant_price,
        -- User's vote (if any)
        jv.vote_side as user_vote
      FROM disputes d
      JOIN users p ON d.plaintiff_id = p.id
      JOIN users def ON d.defendant_id = def.id
      LEFT JOIN jury_votes jv ON d.id = jv.dispute_id AND jv.juror_id = $1
      WHERE d.status = $2
        AND d.plaintiff_id != $1
        AND d.defendant_id != $1
      ORDER BY d.created_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, status, limit, offset]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM disputes 
      WHERE status = $1 
        AND plaintiff_id != $2 
        AND defendant_id != $2
    `, [status, userId]);

    res.json({
      success: true,
      disputes: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /disputes/my
 * Get user's own disputes (as plaintiff or defendant)
 */
async function getMyDisputes(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        d.*,
        p.display_name as plaintiff_name,
        p.avatar_url as plaintiff_avatar,
        def.display_name as defendant_name,
        def.avatar_url as defendant_avatar,
        CASE 
          WHEN d.plaintiff_id = $1 THEN 'plaintiff'
          ELSE 'defendant'
        END as my_role
      FROM disputes d
      JOIN users p ON d.plaintiff_id = p.id
      JOIN users def ON d.defendant_id = def.id
      WHERE d.plaintiff_id = $1 OR d.defendant_id = $1
      ORDER BY d.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      disputes: result.rows,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /disputes/:id
 * Get single dispute details
 */
async function getDisputeById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        d.*,
        p.id as plaintiff_id,
        p.display_name as plaintiff_name,
        p.avatar_url as plaintiff_avatar,
        p.market_price as plaintiff_price,
        def.id as defendant_id,
        def.display_name as defendant_name,
        def.avatar_url as defendant_avatar,
        def.market_price as defendant_price,
        jv.vote_side as user_vote,
        (SELECT COUNT(*) FROM jury_votes WHERE dispute_id = d.id) as total_votes
      FROM disputes d
      JOIN users p ON d.plaintiff_id = p.id
      JOIN users def ON d.defendant_id = def.id
      LEFT JOIN jury_votes jv ON d.id = jv.dispute_id AND jv.juror_id = $2
      WHERE d.id = $1
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    res.json({
      success: true,
      dispute: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /disputes
 * Create a new dispute
 */
async function createDispute(req, res, next) {
  try {
    const plaintiffId = req.user.id;
    const { relationship_id, defendant_id, title, evidence_content, stake_amount = 50 } = req.body;

    // Validate relationship exists
    const relCheck = await pool.query(
      `SELECT id FROM relationships 
       WHERE id = $1 AND (user_a = $2 OR user_b = $2)`,
      [relationship_id, plaintiffId]
    );

    if (relCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid relationship or you are not part of it' 
      });
    }

    // Deduct stake from plaintiff
    const balanceCheck = await pool.query(
      'SELECT balance_love FROM users WHERE id = $1',
      [plaintiffId]
    );

    if (parseFloat(balanceCheck.rows[0].balance_love) < stake_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient $LOVE balance for stake' 
      });
    }

    // Create dispute and deduct balance
    const result = await pool.query(`
      WITH deduct AS (
        UPDATE users 
        SET balance_love = balance_love - $5
        WHERE id = $1
      )
      INSERT INTO disputes (relationship_id, plaintiff_id, defendant_id, title, evidence_content, stake_amount)
      VALUES ($2, $1, $3, $4, $6, $5)
      RETURNING *
    `, [plaintiffId, relationship_id, defendant_id, title, stake_amount, evidence_content]);

    res.status(201).json({
      success: true,
      message: 'Dispute created! Let the jury decide.',
      dispute: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /disputes/:id/vote
 * Cast a vote on a dispute
 */
async function voteOnDispute(req, res, next) {
  try {
    const jurorId = req.user.id;
    const { id: disputeId } = req.params;
    const { vote_side, stake_amount = 5 } = req.body;

    if (!['PLAINTIFF', 'DEFENDANT'].includes(vote_side)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vote must be PLAINTIFF or DEFENDANT' 
      });
    }

    // Check dispute is open
    const disputeCheck = await pool.query(
      `SELECT * FROM disputes 
       WHERE id = $1 AND status = 'VOTING' 
       AND plaintiff_id != $2 AND defendant_id != $2`,
      [disputeId, jurorId]
    );

    if (disputeCheck.rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dispute not found, already resolved, or you are a party' 
      });
    }

    // Check balance
    const balanceCheck = await pool.query(
      'SELECT balance_love FROM users WHERE id = $1',
      [jurorId]
    );

    if (parseFloat(balanceCheck.rows[0].balance_love) < stake_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient $LOVE balance to vote' 
      });
    }

    // Insert vote, deduct balance, update vote counts
    const voteColumn = vote_side === 'PLAINTIFF' ? 'votes_plaintiff' : 'votes_defendant';

    await pool.query('BEGIN');

    try {
      // Deduct juror stake
      await pool.query(
        'UPDATE users SET balance_love = balance_love - $2 WHERE id = $1',
        [jurorId, stake_amount]
      );

      // Insert vote
      await pool.query(`
        INSERT INTO jury_votes (dispute_id, juror_id, vote_side, stake_amount)
        VALUES ($1, $2, $3, $4)
      `, [disputeId, jurorId, vote_side, stake_amount]);

      // Update dispute vote count
      await pool.query(`
        UPDATE disputes 
        SET ${voteColumn} = ${voteColumn} + 1
        WHERE id = $1
      `, [disputeId]);

      // Reward juror for participation
      await pool.query(
        'UPDATE users SET balance_love = balance_love + 2 WHERE id = $1',
        [jurorId]
      );

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: `Vote cast for ${vote_side}! +2 $LOVE earned for jury duty.`,
        vote_side,
        reward: 2,
      });

    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ 
        success: false, 
        message: 'You have already voted on this dispute' 
      });
    }
    next(err);
  }
}

/**
 * GET /disputes/stats
 * Get jury stats for current user
 */
async function getJuryStats(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_votes,
        COALESCE(SUM(reward_earned), 0) as total_rewards,
        (SELECT COUNT(*) FROM disputes WHERE status = 'VOTING' AND plaintiff_id != $1 AND defendant_id != $1) as open_disputes
      FROM jury_votes
      WHERE juror_id = $1
    `, [userId]);

    res.json({
      success: true,
      stats: {
        total_votes: parseInt(result.rows[0].total_votes),
        total_rewards: parseFloat(result.rows[0].total_rewards),
        open_disputes: parseInt(result.rows[0].open_disputes),
      },
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDisputes,
  getMyDisputes,
  getDisputeById,
  createDispute,
  voteOnDispute,
  getJuryStats,
};
