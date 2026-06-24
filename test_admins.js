'use strict';
require('dotenv').config();
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Checking tables in database...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name));

    for (const table of tables.rows.map(r => r.table_name)) {
      const countRes = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`Table ${table} has ${countRes.rows[0].count} rows`);
    }

    if (tables.rows.map(r => r.table_name).includes('admins')) {
      const admins = await pool.query('SELECT id, username, email, password, role FROM admins');
      console.log('Admins:', admins.rows);
    }

    if (tables.rows.map(r => r.table_name).includes('users')) {
      const users = await pool.query('SELECT id, email, password_hash FROM users');
      console.log('Users:', users.rows);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
