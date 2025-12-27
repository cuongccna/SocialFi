/**
 * Auth Controller
 * Handles Telegram authentication and user management
 */

/**
 * POST /auth/login
 * Authenticate user via Telegram initData
 * User is already upserted by authMiddleware
 */
async function login(req, res) {
  try {
    // User should be attached by authMiddleware (already upserted)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user data found',
      });
    }

    console.log(`✅ User logged in: ${user.display_name} (ID: ${user.id})`);

    res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        latitude: user.latitude,
        longitude: user.longitude,
        wallet_address: user.wallet_address,
        wallet_rank: user.wallet_rank,
        market_price: parseFloat(user.market_price),
        price_change_24h: parseFloat(user.price_change_24h),
        balance_love: parseFloat(user.balance_love),
        is_active: user.is_active,
        last_active_at: user.last_active_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
}

/**
 * GET /auth/me
 * Get current authenticated user's profile
 */
async function getMe(req, res) {
  try {
    // User is already attached by authMiddleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        latitude: user.latitude,
        longitude: user.longitude,
        wallet_address: user.wallet_address,
        wallet_rank: user.wallet_rank,
        market_price: parseFloat(user.market_price),
        price_change_24h: parseFloat(user.price_change_24h),
        balance_love: parseFloat(user.balance_love),
        is_active: user.is_active,
        last_active_at: user.last_active_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error('❌ Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
    });
  }
}

module.exports = {
  login,
  getMe,
};
