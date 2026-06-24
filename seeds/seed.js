'use strict';
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

async function seed() {
  console.log('🌱 Running seed script...');

  try {
    // 1. Create/Reset Admin User
    const email = (process.env.ADMIN_EMAIL || 'admin@isetag.cm').toLowerCase().trim();
    const plainPassword = 'isetag2025';

    // Warn if ADMIN_PASSWORD_HASH is set externally (this overrides the default)
    if (process.env.ADMIN_PASSWORD_HASH) {
      console.warn('⚠️  ADMIN_PASSWORD_HASH env var is set — using it instead of default password');
    }

    const passwordHash = process.env.ADMIN_PASSWORD_HASH || await bcrypt.hash(plainPassword, 10);

    // Verify the hash works before saving (sanity check)
    if (!process.env.ADMIN_PASSWORD_HASH) {
      const valid = await bcrypt.compare(plainPassword, passwordHash);
      console.log(`🔑 Hash sanity check: ${valid ? '✅ OK' : '❌ FAILED'}`);
    }

    // Force-delete and reinsert to guarantee a clean state
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email, passwordHash]
    );

    // Read back and verify
    const check = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      const stored = check.rows[0];
      const verifyOk = !process.env.ADMIN_PASSWORD_HASH
        ? await bcrypt.compare(plainPassword, stored.password_hash)
        : true;
      console.log(`✅ Admin user saved — id=${stored.id} email=${stored.email} hash_verify=${verifyOk ? '✅' : '❌'}`);
    } else {
      console.error('❌ Admin user not found after insert!');
    }

    // 2. Fix database schema for messages table (ensure role exists and direction is nullable)
    console.log('🔧 Checking messages table schema...');
    
    // Ensure role column exists
    await pool.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
    `);
    
    // Make direction column nullable if it exists
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'messages' AND column_name = 'direction'
        ) THEN
          ALTER TABLE messages ALTER COLUMN direction DROP NOT NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Messages table schema check completed');

    console.log('🎉 Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();
