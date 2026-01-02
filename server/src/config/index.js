/**
 * Application Configuration
 * Centralizes all environment variables
 */

module.exports = {
  // Server
  port: parseInt(process.env.PORT) || 3008,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'cryptocrush',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  
  // Telegram Bot
  botToken: process.env.BOT_TOKEN || '',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // App Constants
  constants: {
    // Swipe rewards
    LOVE_PER_SWIPE: 1,
    
    // Market price changes
    PRICE_CHANGE_LIKE: 0.5,     // +0.5% on LIKE
    PRICE_CHANGE_PASS: -0.2,    // -0.2% on PASS
    PRICE_CHANGE_MATCH: 5.0,    // +5% on MATCH
    
    // Geo search
    DEFAULT_SEARCH_RADIUS_KM: 50,
    MAX_SEARCH_RADIUS_KM: 200,
    FEED_LIMIT: 20,
  },
};
