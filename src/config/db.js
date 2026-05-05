'use strict';
const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected');
    });
  }
  return pool;
}

/**
 * Execute a query with optional parameters
 */
async function query(text, params) {
  const start = Date.now();
  const db = getPool();
  try {
    const res = await db.query(text, params);
    const duration = Date.now() - start;
    logger.debug('DB query executed', { duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error('DB query error:', { text, error: err.message });
    throw err;
  }
}

/**
 * Get a client from pool (for transactions)
 */
async function getClient() {
  const db = getPool();
  const client = await db.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return client.release();
  };

  return client;
}

module.exports = { query, getClient, getPool };
