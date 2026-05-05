'use strict';
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

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
 * Keepalive ping to prevent Neon cold starts
 * Runs every 4 minutes
 */
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

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
