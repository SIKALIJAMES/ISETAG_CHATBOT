'use strict';
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('[DB] ❌ FATAL ERROR: DATABASE_URL environment variable is not defined!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
  pool
};
