'use strict';
require('dotenv').config();
const { query } = require('./src/config/database');

async function main() {
  try {
    console.log('--- CONVERSATIONS ---');
    const convos = await query('SELECT id, user_phone, last_message, lang, status FROM conversations ORDER BY id DESC LIMIT 10');
    console.log(convos.rows);

    console.log('\n--- MESSAGES ---');
    const msgs = await query('SELECT id, conversation_id, role, substring(content for 50) as content, created_at FROM messages ORDER BY id DESC LIMIT 20');
    console.log(msgs.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
