/**
 * PostgreSQL Database Configuration
 * Uses pg.Pool for connection pooling
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'cryptocrush',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  
  // Pool configuration
  max: 20,                    // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Log pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err);
  process.exit(-1);
});

/**
 * Test database connection
 * Call this on server startup to verify DB is accessible
 */
async function checkDbConnection() {
  let client;
  try {
    client = await pool.connect();
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    const { current_time, pg_version } = result.rows[0];
    
    console.log('✅ Database connected successfully!');
    console.log(`   📅 Server time: ${current_time}`);
    console.log(`   🐘 PostgreSQL: ${pg_version.split(',')[0]}`);
    
    // Check PostGIS extension
    try {
      const postgisResult = await client.query("SELECT PostGIS_Version() as postgis_version");
      console.log(`   🌍 PostGIS: ${postgisResult.rows[0].postgis_version}`);
    } catch (err) {
      console.warn('   ⚠️  PostGIS extension not found. Run: CREATE EXTENSION postgis;');
    }
    
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('   Check your .env configuration:');
    console.error(`   - DB_HOST: ${process.env.DB_HOST}`);
    console.error(`   - DB_PORT: ${process.env.DB_PORT}`);
    console.error(`   - DB_NAME: ${process.env.DB_NAME}`);
    console.error(`   - DB_USER: ${process.env.DB_USER}`);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  
  // Log slow queries (> 100ms) in development
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.log('🐢 Slow query:', { text, duration: `${duration}ms`, rows: result.rowCount });
  }
  
  return result;
}

/**
 * Get a client from the pool for transactions
 * Remember to release the client when done!
 * @returns {Promise<PoolClient>}
 */
async function getClient() {
  return await pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  checkDbConnection,
};
