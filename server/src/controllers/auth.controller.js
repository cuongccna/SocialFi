/**
 * Auth Controller
 * Handles Telegram authentication and user management
 */

/**
 * Helper function to build user response object
 * Ensures all profile fields are included
 */
function buildUserResponse(user) {
  return {
    id: user.id,
    telegram_id: user.telegram_id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    job_title: user.job_title,
    interests: user.interests,
    assets: user.assets,
    photos: user.photos,
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
    boosted_until: user.boosted_until,
    login_streak: user.login_streak,
    has_seen_tutorial: user.has_seen_tutorial,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * POST /auth/login
 * Authenticate user via Telegram initData
 * User is already upserted by authMiddleware
 */
async function login(req, res, next) {
  try {
    // User should be attached by authMiddleware (already upserted)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No user data found',
      });
    }

    console.log(`User logged in: ${user.display_name} (ID: ${user.id})`);

    res.json({
      success: true,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
}

/**
 * GET /auth/me
 * Get current authenticated user's profile
 */
async function getMe(req, res, next) {
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
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Get me error:', error);
    next(error);
  }
}

module.exports = {
  login,
  getMe,
};
