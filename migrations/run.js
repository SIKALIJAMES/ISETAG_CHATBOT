'use strict';
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Running database migrations...');

    const sqlPath = path.join(__dirname, '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('✅ Migration 001_init.sql completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

module.exports = { runMigrations };

// Run directly if called as script
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
