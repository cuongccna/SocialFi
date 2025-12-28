/**
 * Telegram Mini App Authentication Middleware
 * Validates initData using HMAC-SHA256 according to Telegram's standard
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

const crypto = require('crypto');
const { query } = require('../config/db');
const { ApiError } = require('./errorHandler');

/**
 * Validate Telegram initData using HMAC-SHA256
 * @param {string} initData - The initData string from Telegram WebApp
 * @param {string} botToken - Your bot token from BotFather
 * @returns {object|null} - Parsed data if valid, null if invalid
 */
function validateTelegramInitData(initData, botToken) {
  try {
    // Parse the initData string into URLSearchParams
    const urlParams = new URLSearchParams(initData);
    
    // Extract the hash
    const hash = urlParams.get('hash');
    if (!hash) {
      return null;
    }
    
    // Remove hash from params and sort alphabetically
    urlParams.delete('hash');
    const dataCheckArr = [];
    
    // Sort keys alphabetically
    const sortedKeys = Array.from(urlParams.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${urlParams.get(key)}`);
    }
    
    // Create data-check-string
    const dataCheckString = dataCheckArr.join('\n');
    
    // Create secret key: HMAC_SHA256(botToken, "WebAppData")
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Calculate hash: HMAC_SHA256(dataCheckString, secretKey)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Compare hashes
    if (calculatedHash !== hash) {
      return null;
    }
    
    // Check auth_date (optional: reject if too old, e.g., > 24 hours)
    const authDate = parseInt(urlParams.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    const MAX_AGE_SECONDS = 86400; // 24 hours
    
    if (now - authDate > MAX_AGE_SECONDS) {
      console.warn('⚠️ initData expired:', { authDate, now, age: now - authDate });
      // In production, you might want to reject expired data
      // return null;
    }
    
    // Parse user data
    const userDataStr = urlParams.get('user');
    if (!userDataStr) {
      return null;
    }
    
    const userData = JSON.parse(userDataStr);
    
    return {
      user: userData,
      authDate,
      queryId: urlParams.get('query_id'),
      chatType: urlParams.get('chat_type'),
      chatInstance: urlParams.get('chat_instance'),
    };
  } catch (err) {
    console.error('❌ Error validating initData:', err.message);
    return null;
  }
}

/**
 * Upsert user in database
 * - If user exists: update last_active_at
 * - If user doesn't exist: create new user
 * @param {object} telegramUser - User data from Telegram
 * @returns {object} - User row from database
 */
async function upsertUser(telegramUser) {
  const { id: telegramId, first_name, last_name, username, language_code } = telegramUser;
  
  // Build display name
  const displayName = [first_name, last_name].filter(Boolean).join(' ') || username || `User${telegramId}`;
  
  // Upsert query using ON CONFLICT
  const upsertQuery = `
    INSERT INTO users (telegram_id, username, display_name, last_active_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (telegram_id) 
    DO UPDATE SET 
      username = COALESCE(EXCLUDED.username, users.username),
      display_name = COALESCE(EXCLUDED.display_name, users.display_name),
      last_active_at = NOW(),
      updated_at = NOW()
    RETURNING *;
  `;
  
  const result = await query(upsertQuery, [telegramId, username || null, displayName]);
  return result.rows[0];
}

/**
 * Authentication Middleware
 * Validates Telegram initData and attaches user to request
 */
async function authMiddleware(req, res, next) {
  try {
    // Get initData from Authorization header
    const authHeader = req.headers.authorization;
    
    // =========================================
    // DEVELOPMENT MODE BYPASS
    // Allow testing without real Telegram initData
    // Set DEV_BYPASS_AUTH=true in .env to enable
    // =========================================
    if (process.env.DEV_BYPASS_AUTH === 'true') {
      // Check for dev auth header format: "DevAuth telegram_id"
      if (authHeader && authHeader.startsWith('DevAuth ')) {
        const telegramId = authHeader.slice(8);
        const userResult = await query(
          'SELECT * FROM users WHERE telegram_id = $1',
          [telegramId]
        );
        
        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
          req.telegramData = { user: { id: telegramId }, authDate: Date.now() / 1000 };
          console.log(`🔓 DEV AUTH: ${req.user.display_name} (${telegramId})`);
          return next();
        }
      }
      
      // If no specific user, use first user in database
      if (!authHeader || authHeader === 'mock_init_data_for_development') {
        const userResult = await query(
          'SELECT * FROM users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1'
        );
        
        if (userResult.rows.length > 0) {
          req.user = userResult.rows[0];
          req.telegramData = { user: { id: req.user.telegram_id }, authDate: Date.now() / 1000 };
          console.log(`🔓 DEV AUTH (default): ${req.user.display_name} (${req.user.telegram_id})`);
          return next();
        }
      }
    }
    // =========================================
    
    if (!authHeader) {
      throw new ApiError(401, 'Missing Authorization header');
    }
    
    // Support both "Bearer <initData>" and raw "<initData>" formats
    const initData = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    
    if (!initData) {
      throw new ApiError(401, 'Invalid Authorization header');
    }
    
    // Get bot token from environment
    const botToken = process.env.BOT_TOKEN;
    
    if (!botToken || botToken === 'your_telegram_bot_token_here') {
      console.error('❌ BOT_TOKEN not configured in .env');
      throw new ApiError(500, 'Server misconfiguration');
    }
    
    // Validate initData
    const validatedData = validateTelegramInitData(initData, botToken);
    
    if (!validatedData) {
      throw new ApiError(401, 'Invalid or expired initData');
    }
    
    // Upsert user in database
    const user = await upsertUser(validatedData.user);
    
    // Attach to request for downstream use
    req.user = user;
    req.telegramData = validatedData;
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Authenticated: ${user.display_name} (${user.telegram_id})`);
    }
    
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional Authentication Middleware
 * Same as authMiddleware but doesn't throw error if no auth provided
 * Useful for routes that work for both authenticated and anonymous users
 */
async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // No auth provided, continue without user
    req.user = null;
    req.telegramData = null;
    return next();
  }
  
  // If auth provided, validate it
  return authMiddleware(req, res, next);
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  validateTelegramInitData,
  upsertUser,
};
