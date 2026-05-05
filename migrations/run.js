'use strict';
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

async function runMigrations() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('🔄 Running database migrations...');

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      await pool.query(sql);
      console.log(`✅ Migration ${file} completed successfully`);
    } catch (err) {
      console.error(`❌ Migration ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  console.log('🎉 All migrations completed!');
}

runMigrations().then(() => process.exit(0));
