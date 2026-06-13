'use strict';
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/database');

async function seed() {
  console.log('🌱 Running seed script...');

  try {
    // 1. Create Admin User
    const email = process.env.ADMIN_EMAIL || 'admin@isetag.cm';
    // Password hash should be generated manually for security, 
    // but here we use a default if not provided
    const passwordHash = process.env.ADMIN_PASSWORD_HASH || await bcrypt.hash('isetag2025', 10);

    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING',
      [email, passwordHash]
    );
    console.log('ℹ️  Admin account check completed');

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
