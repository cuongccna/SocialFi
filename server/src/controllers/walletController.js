/**
 * Wallet Controller
 * TON wallet connection and management
 */

const pool = require('../config/db');

/**
 * POST /wallet/connect
 * Save connected wallet address
 */
async function connectWallet(req, res, next) {
  try {
    const userId = req.user.id;
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required',
      });
    }

    // Check if wallet already connected to another account
    const existing = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1 AND id != $2',
      [wallet_address, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This wallet is already connected to another account',
      });
    }

    // Check if user already has a wallet
    const user = await pool.query(
      'SELECT wallet_address, wallet_connected_at FROM users WHERE id = $1',
      [userId]
    );

    const isFirstConnection = !user.rows[0].wallet_address;

    // Update user's wallet
    await pool.query(`
      UPDATE users 
      SET 
        wallet_address = $2,
        wallet_connected_at = COALESCE(wallet_connected_at, NOW()),
        updated_at = NOW()
      WHERE id = $1
    `, [userId, wallet_address]);

    // If first time connecting, give bonus reward
    let bonus = 0;
    if (isFirstConnection) {
      bonus = 25;
      await pool.query(
        'UPDATE users SET balance_love = balance_love + $2 WHERE id = $1',
        [userId, bonus]
      );
    }

    res.json({
      success: true,
      message: isFirstConnection 
        ? `Wallet connected! You earned ${bonus} $LOVE bonus!`
        : 'Wallet updated successfully',
      wallet_address,
      bonus,
      is_first_connection: isFirstConnection,
    });

  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /wallet/disconnect
 * Disconnect wallet
 */
async function disconnectWallet(req, res, next) {
  try {
    const userId = req.user.id;

    await pool.query(`
      UPDATE users 
      SET wallet_address = NULL, updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    res.json({
      success: true,
      message: 'Wallet disconnected',
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /wallet/status
 * Get wallet connection status
 */
async function getWalletStatus(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT wallet_address, wallet_connected_at, wallet_rank FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    res.json({
      success: true,
      is_connected: !!user.wallet_address,
      wallet_address: user.wallet_address,
      connected_at: user.wallet_connected_at,
      wallet_rank: user.wallet_rank,
    });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  connectWallet,
  disconnectWallet,
  getWalletStatus,
};
