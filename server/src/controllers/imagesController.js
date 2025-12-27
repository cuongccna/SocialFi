/**
 * Images Controller
 * Handle blurred image sending and unblurring (Blur-to-Earn)
 */

const pool = require('../config/db');
const { ApiError } = require('../middlewares');
const { sendBlurredImage } = require('../services/telegramBot');

/**
 * POST /images/send
 * Send a blurred image to match
 */
async function sendImage(req, res, next) {
  try {
    const senderId = req.user.id;
    const { relationship_id, original_url, blurred_url, unblur_cost = 10 } = req.body;

    if (!relationship_id || !original_url || !blurred_url) {
      throw new ApiError(400, 'Missing required fields');
    }

    // Verify sender is part of relationship
    const rel = await pool.query(`
      SELECT * FROM relationships 
      WHERE id = $1 AND (user_a = $2 OR user_b = $2)
    `, [relationship_id, senderId]);

    if (rel.rows.length === 0) {
      throw new ApiError(403, 'Not authorized');
    }

    // Get recipient ID
    const relationship = rel.rows[0];
    const recipientId = relationship.user_a === senderId ? relationship.user_b : relationship.user_a;

    // Create blurred image record
    const result = await pool.query(`
      INSERT INTO blurred_images (relationship_id, sender_id, recipient_id, original_url, blurred_url, unblur_cost)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [relationship_id, senderId, recipientId, original_url, blurred_url, unblur_cost]);

    const image = result.rows[0];

    // Get sender and recipient info for bot notification
    const [senderInfo, recipientInfo] = await Promise.all([
      pool.query('SELECT display_name FROM users WHERE id = $1', [senderId]),
      pool.query('SELECT telegram_id FROM users WHERE id = $1', [recipientId]),
    ]);

    // Send notification via Telegram Bot
    if (recipientInfo.rows[0]?.telegram_id) {
      sendBlurredImage(
        recipientInfo.rows[0].telegram_id,
        senderInfo.rows[0].display_name,
        blurred_url,
        unblur_cost,
        image.id
      ).catch(err => console.warn('Bot blur notification failed:', err.message));
    }

    // Also create a message record for the chat
    await pool.query(`
      INSERT INTO messages (relationship_id, sender_id, content, message_type)
      VALUES ($1, $2, $3, 'IMAGE')
    `, [relationship_id, senderId, JSON.stringify({ image_id: image.id, blurred_url, unblur_cost })]);

    res.status(201).json({
      success: true,
      message: 'Blurred image sent!',
      image: {
        id: image.id,
        blurred_url: image.blurred_url,
        unblur_cost: Number(image.unblur_cost),
      },
    });

  } catch (err) {
    next(err);
  }
}

/**
 * POST /images/:id/unblur
 * Pay to unblur an image
 */
async function unblurImage(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: imageId } = req.params;

    // Get image details
    const imageResult = await pool.query(`
      SELECT * FROM blurred_images 
      WHERE id = $1 AND recipient_id = $2 AND is_unblurred = FALSE
    `, [imageId, userId]);

    if (imageResult.rows.length === 0) {
      throw new ApiError(404, 'Image not found or already unblurred');
    }

    const image = imageResult.rows[0];
    const cost = parseFloat(image.unblur_cost);

    // Check user balance
    const balanceResult = await pool.query(
      'SELECT balance_love FROM users WHERE id = $1',
      [userId]
    );

    if (parseFloat(balanceResult.rows[0].balance_love) < cost) {
      throw new ApiError(400, 'Insufficient $LOVE balance');
    }

    // Transaction: deduct from recipient, add to sender, mark as unblurred
    await pool.query('BEGIN');

    try {
      // Deduct from recipient (viewer)
      await pool.query(
        'UPDATE users SET balance_love = balance_love - $2 WHERE id = $1',
        [userId, cost]
      );

      // Add to sender (creator gets 80%, platform gets 20%)
      const creatorShare = cost * 0.8;
      await pool.query(
        'UPDATE users SET balance_love = balance_love + $2 WHERE id = $1',
        [image.sender_id, creatorShare]
      );

      // Mark image as unblurred
      await pool.query(`
        UPDATE blurred_images 
        SET is_unblurred = TRUE, unblurred_at = NOW()
        WHERE id = $1
      `, [imageId]);

      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Image unblurred!',
        original_url: image.original_url,
        cost_paid: cost,
        creator_earned: creatorShare,
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
 * GET /images/pending
 * Get pending blurred images for current user
 */
async function getPendingImages(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        bi.*,
        u.display_name as sender_name,
        u.avatar_url as sender_avatar
      FROM blurred_images bi
      JOIN users u ON bi.sender_id = u.id
      WHERE bi.recipient_id = $1 AND bi.is_unblurred = FALSE
      ORDER BY bi.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      images: result.rows.map(img => ({
        id: img.id,
        sender_name: img.sender_name,
        sender_avatar: img.sender_avatar,
        blurred_url: img.blurred_url,
        unblur_cost: Number(img.unblur_cost),
        created_at: img.created_at,
      })),
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /images/:id
 * Get image details (returns original if unblurred, blurred if not)
 */
async function getImage(req, res, next) {
  try {
    const userId = req.user.id;
    const { id: imageId } = req.params;

    const result = await pool.query(`
      SELECT bi.*, u.display_name as sender_name
      FROM blurred_images bi
      JOIN users u ON bi.sender_id = u.id
      WHERE bi.id = $1 
        AND (bi.sender_id = $2 OR bi.recipient_id = $2)
    `, [imageId, userId]);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Image not found');
    }

    const image = result.rows[0];
    const isSender = image.sender_id === userId;
    const canViewOriginal = isSender || image.is_unblurred;

    res.json({
      success: true,
      image: {
        id: image.id,
        sender_name: image.sender_name,
        url: canViewOriginal ? image.original_url : image.blurred_url,
        is_blurred: !canViewOriginal,
        unblur_cost: canViewOriginal ? 0 : Number(image.unblur_cost),
        is_unblurred: image.is_unblurred,
      },
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendImage,
  unblurImage,
  getPendingImages,
  getImage,
};
