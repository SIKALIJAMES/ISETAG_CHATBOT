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

    console.log('🎉 Seed completed successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();
