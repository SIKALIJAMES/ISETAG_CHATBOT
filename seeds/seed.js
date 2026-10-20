'use strict';
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

async function seed() {
  console.log('🌱 Running seed script...');

  try {
    // 1. Seed Initial Admin User (Safe & Idempotent)
    const email = (process.env.ADMIN_EMAIL || 'admin@isetag.cm').toLowerCase().trim();
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;

    if (!initialPassword && !process.env.ADMIN_PASSWORD_HASH) {
      console.warn('⚠️  Neither ADMIN_INITIAL_PASSWORD nor ADMIN_PASSWORD_HASH is set. Skipping initial admin user creation.');
    } else {
      const passwordHash = process.env.ADMIN_PASSWORD_HASH || await bcrypt.hash(initialPassword, 10);

      // Insert only if user does not exist (ON CONFLICT DO NOTHING)
      const insertResult = await pool.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [email, passwordHash]
      );

      if (insertResult.rows.length > 0) {
        console.log(`✅ Initial admin user created — id=${insertResult.rows[0].id} email=${email}`);
      } else {
        console.log(`ℹ️  Admin user "${email}" already exists. Preserving existing password (ON CONFLICT DO NOTHING).`);
      }
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
