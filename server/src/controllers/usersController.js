/**
 * Users Controller
 * User profile and stats
 */

const { pool, query, getClient } = require('../config/db');
const { ApiError } = require('../middlewares');
const path = require('path');
const fs = require('fs');

// Boost Constants
const BOOST_COST_LOVE = 500;        // Cost in $LOVE tokens
const BOOST_DURATION_MINUTES = 30;  // Boost duration
const BOOST_PRICE_INCREASE = 10;    // 10% price pump

// Avatar upload constants - Use root public folder (same as certificates)
const AVATAR_UPLOAD_DIR = path.join(__dirname, '../../../public/avatars');
const VERIFIED_BADGE_BONUS = 10;    // 10% price boost for verified users

/**
 * GET /users/stats
 * Get current user's activity stats
 */
async function getUserStats(req, res, next) {
  try {
    const userId = req.user.id;

    // Get various stats
    const [likesReceived, likesGiven, contractsMinted, marketRank] = await Promise.all([
      // Likes received (people who swiped right on user)
      pool.query(
        `SELECT COUNT(*) as count FROM swipes WHERE target_id = $1 AND action = 'LIKE'`,
        [userId]
      ),
      // Likes given (user swiped right on others)
      pool.query(
        `SELECT COUNT(*) as count FROM swipes WHERE actor_id = $1 AND action = 'LIKE'`,
        [userId]
      ),
      // Contracts minted
      pool.query(
        `SELECT COUNT(*) as count FROM relationships 
         WHERE (user_a = $1 OR user_b = $1) AND status = 'MINTED_CONTRACT'`,
        [userId]
      ),
      // Market rank
      pool.query(`
        SELECT rank FROM (
          SELECT id, ROW_NUMBER() OVER (ORDER BY market_price DESC) as rank
          FROM users WHERE is_active = TRUE
        ) ranked WHERE id = $1
      `, [userId]),
    ]);

    res.json({
      success: true,
      stats: {
        likes_received: parseInt(likesReceived.rows[0].count) || 0,
        likes_given: parseInt(likesGiven.rows[0].count) || 0,
        contracts_minted: parseInt(contractsMinted.rows[0].count) || 0,
        market_rank: marketRank.rows[0]?.rank ? parseInt(marketRank.rows[0].rank) : null,
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/me
 * Get current user's full profile
 */
async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        id,
        telegram_id,
        username,
        display_name,
        avatar_url,
        bio,
        job_title,
        interests,
        assets,
        photos,
        wallet_address,
        wallet_rank,
        market_price,
        price_change_24h,
        balance_love,
        is_active,
        last_active_at,
        has_seen_tutorial,
        created_at
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * PUT /users/me
 * Update current user's profile
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { display_name, bio, avatar_url, job_title, interests, assets, photos } = req.body;

    // Validate bio length (max 150 chars)
    if (bio && bio.length > 150) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bio must be 150 characters or less' 
      });
    }

    // Validate interests (max 5)
    if (interests && interests.length > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 5 interests allowed' 
      });
    }

    // Validate assets (max 3)
    if (assets && assets.length > 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 3 assets allowed' 
      });
    }

    // Validate photos (max 4)
    if (photos && photos.length > 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum 4 photos allowed' 
      });
    }

    const result = await pool.query(`
      UPDATE users
      SET 
        display_name = COALESCE($2, display_name),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        job_title = COALESCE($5, job_title),
        interests = COALESCE($6::jsonb, interests),
        assets = COALESCE($7::jsonb, assets),
        photos = COALESCE($8::jsonb, photos),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      userId, 
      display_name, 
      bio, 
      avatar_url, 
      job_title,
      interests ? JSON.stringify(interests) : null,
      assets ? JSON.stringify(assets) : null,
      photos ? JSON.stringify(photos) : null
    ]);

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/:id
 * Get public profile of another user
 */
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id,
        username,
        display_name,
        avatar_url,
        bio,
        wallet_rank,
        market_price,
        price_change_24h,
        is_active,
        last_active_at,
        created_at
      FROM users
      WHERE id = $1 AND is_active = TRUE
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/boost
 * Boost profile visibility for 30 minutes
 * Costs 500 $LOVE, instantly pumps market price by 10%
 */
async function boostProfile(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    
    await client.query('BEGIN');
    
    // Get current user with lock
    const userResult = await client.query(`
      SELECT 
        id, 
        display_name,
        balance_love, 
        market_price,
        boosted_until
      FROM users 
      WHERE id = $1
      FOR UPDATE;
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }
    
    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.balance_love) || 0;
    
    // Check if already boosted
    if (user.boosted_until && new Date(user.boosted_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(user.boosted_until) - new Date()) / (1000 * 60));
      throw new ApiError(400, `Profile already boosted. ${remainingMinutes} minutes remaining.`);
    }
    
    // Check balance
    if (currentBalance < BOOST_COST_LOVE) {
      throw new ApiError(400, `Insufficient $LOVE balance. Need ${BOOST_COST_LOVE}, have ${currentBalance.toFixed(2)}`);
    }
    
    // Calculate new price (10% pump)
    const currentPrice = parseFloat(user.market_price);
    const priceIncrease = currentPrice * (BOOST_PRICE_INCREASE / 100);
    const newPrice = currentPrice + priceIncrease;
    
    // Deduct $LOVE, set boost timer, pump price
    const updateResult = await client.query(`
      UPDATE users
      SET 
        balance_love = balance_love - $1,
        boosted_until = NOW() + INTERVAL '${BOOST_DURATION_MINUTES} minutes',
        market_price = $2,
        price_change_24h = price_change_24h + $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING 
        id,
        display_name,
        balance_love,
        market_price,
        price_change_24h,
        boosted_until;
    `, [BOOST_COST_LOVE, newPrice, BOOST_PRICE_INCREASE, userId]);
    
    const updatedUser = updateResult.rows[0];
    
    // Record price history for the pump
    await client.query(`
      INSERT INTO price_history (user_id, price)
      VALUES ($1, $2);
    `, [userId, newPrice]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `🚀 Profile PUMPED! You're now at the top of the feed for ${BOOST_DURATION_MINUTES} minutes!`,
      boost: {
        cost: BOOST_COST_LOVE,
        duration_minutes: BOOST_DURATION_MINUTES,
        boosted_until: updatedUser.boosted_until,
        price_before: currentPrice,
        price_after: parseFloat(updatedUser.market_price),
        price_increase_percent: BOOST_PRICE_INCREASE,
      },
      user: {
        id: updatedUser.id,
        display_name: updatedUser.display_name,
        balance_love: parseFloat(updatedUser.balance_love),
        market_price: parseFloat(updatedUser.market_price),
        price_change_24h: parseFloat(updatedUser.price_change_24h),
      },
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /users/boost-status
 * Check current boost status
 */
async function getBoostStatus(req, res, next) {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        boosted_until,
        balance_love,
        market_price
      FROM users 
      WHERE id = $1;
    `, [userId]);
    
    if (result.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }
    
    const user = result.rows[0];
    const now = new Date();
    const boostedUntil = user.boosted_until ? new Date(user.boosted_until) : null;
    const isBoosted = boostedUntil && boostedUntil > now;
    const remainingMinutes = isBoosted ? Math.ceil((boostedUntil - now) / (1000 * 60)) : 0;
    
    res.json({
      success: true,
      boost_status: {
        is_boosted: isBoosted,
        boosted_until: user.boosted_until,
        remaining_minutes: remainingMinutes,
        boost_cost: BOOST_COST_LOVE,
        boost_duration: BOOST_DURATION_MINUTES,
        can_afford: parseFloat(user.balance_love) >= BOOST_COST_LOVE,
        current_balance: parseFloat(user.balance_love),
      },
    });
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /users/badge-status
 * Get notification badge counts for bottom navigation
 */
async function getBadgeStatus(req, res, next) {
  try {
    const userId = req.user.id;

    const [unreadMessages, unclaimedTasks, pendingInvites] = await Promise.all([
      // Count unread messages across all relationships
      pool.query(`
        SELECT COUNT(*) as count 
        FROM messages m
        JOIN relationships r ON m.relationship_id = r.id
        WHERE (r.user_a = $1 OR r.user_b = $1)
          AND m.sender_id != $1
          AND m.is_read = FALSE
          AND r.status != 'BURNED_CONTRACT'
      `, [userId]),
      
      // Count unclaimed task rewards (completed but reward not yet claimed)
      pool.query(`
        SELECT COUNT(*) as count 
        FROM user_tasks 
        WHERE user_id = $1 
          AND reward_claimed = FALSE
      `, [userId]),
      
      // Pending game invites are tracked in-memory via socket, return 0 from DB
      // This could be enhanced with a game_invites table if needed
      Promise.resolve({ rows: [{ count: 0 }] }),
    ]);

    res.json({
      success: true,
      unread_messages: parseInt(unreadMessages.rows[0].count) || 0,
      unclaimed_tasks: parseInt(unclaimedTasks.rows[0].count) || 0,
      pending_game_invites: parseInt(pendingInvites.rows[0].count) || 0,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /users/avatar
 * Upload user avatar image
 * Gives +10% market price boost for verified (real photo) users
 */
async function uploadAvatar(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
      fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
    }
    
    // Generate unique filename
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `avatar_${userId}_${Date.now()}${ext}`;
    const filepath = path.join(AVATAR_UPLOAD_DIR, filename);
    
    // Write file
    fs.writeFileSync(filepath, req.file.buffer);
    
    // Create URL path (relative to public folder)
    const avatarUrl = `/public/avatars/${filename}`;
    
    await client.query('BEGIN');
    
    // Check if this is user's first real photo upload
    const userCheck = await client.query(
      'SELECT avatar_url, market_price FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    const currentUser = userCheck.rows[0];
    const isFirstRealPhoto = !currentUser.avatar_url || 
                              currentUser.avatar_url.includes('dicebear') || 
                              currentUser.avatar_url.includes('api.dicebear');
    
    let newPrice = parseFloat(currentUser.market_price);
    let bonusApplied = false;
    
    // Apply 10% bonus for first real photo (verified badge)
    if (isFirstRealPhoto) {
      newPrice = newPrice * (1 + VERIFIED_BADGE_BONUS / 100);
      bonusApplied = true;
    }
    
    // Update user with new avatar
    const result = await client.query(`
      UPDATE users
      SET 
        avatar_url = $2,
        market_price = $3,
        price_change_24h = price_change_24h + $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, display_name, avatar_url, market_price, price_change_24h
    `, [userId, avatarUrl, newPrice, bonusApplied ? VERIFIED_BADGE_BONUS : 0]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: bonusApplied 
        ? `🎉 Photo uploaded! You're now verified with +${VERIFIED_BADGE_BONUS}% Market Cap boost!`
        : 'Photo updated successfully!',
      user: result.rows[0],
      bonus_applied: bonusApplied,
      bonus_percent: bonusApplied ? VERIFIED_BADGE_BONUS : 0,
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// Photo upload directory (for profile gallery)
const PHOTO_UPLOAD_DIR = path.join(__dirname, '../../../public/photos');

/**
 * POST /users/photos
 * Upload profile photo for gallery (up to 4 photos)
 */
async function uploadPhoto(req, res, next) {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(PHOTO_UPLOAD_DIR)) {
      fs.mkdirSync(PHOTO_UPLOAD_DIR, { recursive: true });
    }
    
    // Generate unique filename
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `photo_${userId}_${Date.now()}${ext}`;
    const filepath = path.join(PHOTO_UPLOAD_DIR, filename);
    
    // Write file
    fs.writeFileSync(filepath, req.file.buffer);
    
    // Create URL path (relative to public folder)
    const photoUrl = `/public/photos/${filename}`;
    
    res.json({
      success: true,
      url: photoUrl,
      message: 'Photo uploaded successfully!',
    });
    
  } catch (err) {
    next(err);
  }
}

// Tutorial completion bonus
const TUTORIAL_BONUS_LOVE = 100;

/**
 * POST /users/tutorial-complete
 * Mark tutorial as completed and reward 100 $LOVE
 */
async function completeTutorial(req, res, next) {
  const client = await getClient();
  
  try {
    const userId = req.user.id;
    
    await client.query('BEGIN');
    
    // Check if user already completed tutorial
    const userCheck = await client.query(
      'SELECT has_seen_tutorial, balance_love FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      throw new ApiError(404, 'User not found');
    }
    
    const user = userCheck.rows[0];
    
    // If already completed, just return success (no double reward)
    if (user.has_seen_tutorial) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'Tutorial already completed',
        bonus_awarded: false,
      });
    }
    
    // Mark tutorial as completed and award bonus
    const result = await client.query(`
      UPDATE users
      SET 
        has_seen_tutorial = TRUE,
        balance_love = balance_love + $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, display_name, balance_love, has_seen_tutorial
    `, [userId, TUTORIAL_BONUS_LOVE]);
    
    await client.query('COMMIT');
    
    console.log(`[Tutorial] User ${userId} completed tutorial, awarded ${TUTORIAL_BONUS_LOVE} $LOVE`);
    
    res.json({
      success: true,
      message: `🎉 Welcome bonus! You received ${TUTORIAL_BONUS_LOVE} $LOVE tokens!`,
      bonus_awarded: true,
      bonus_amount: TUTORIAL_BONUS_LOVE,
      user: result.rows[0],
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = {
  getUserStats,
  getCurrentUser,
  updateProfile,
  getUserById,
  boostProfile,
  getBoostStatus,
  uploadAvatar,
  uploadPhoto,
  getBadgeStatus,
  completeTutorial,
};
