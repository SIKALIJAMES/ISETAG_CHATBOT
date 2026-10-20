'use strict';
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('[DB] ❌ FATAL ERROR: DATABASE_URL environment variable is not defined!');
}

const getSslConfig = () => {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')) {
    return false;
  }
  const ssl = {
    rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
  if (process.env.DATABASE_SSL_CA) {
    ssl.ca = process.env.DATABASE_SSL_CA;
  }
  return ssl;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,  // 15s — enough for Neon cold start
});

// Log connection events
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

pool.on('connect', () => {
  console.log('[DB] Client connected');
});

/**
 * NOTE: Keepalive ping is disabled to avoid exhausting Neon's free tier quota.
 * Neon's free tier offers 190 compute hours/month. Keeping the database awake 24/7
 * consumes ~720 hours/month, which leads to quota suspension.
 * Leaving the database to sleep when inactive is highly recommended for free tier.
 */
/*
if (process.env.NODE_ENV !== 'test') {
  setInterval(async () => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      if (process.env.NODE_ENV === 'development') {
        console.log('[DB] ❤️ Keepalive ping OK');
      }
    } catch (err) {
      console.error('[DB] Keepalive ping failed:', err.message);
    }
  }, 4 * 60 * 1000);
}
*/

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
  getPool: () => pool
};
