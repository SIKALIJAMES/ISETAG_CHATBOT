'use strict';
require('dotenv').config();
const { query } = require('../src/config/database');

async function fixSnack() {
  const sql = `
    UPDATE knowledge_chunks 
    SET content = REPLACE(
      REPLACE(content, '☕ Snack-bar pour collations et boissons', '☕ Cafétéria pour collations légères et boissons sans alcool (eau, jus naturels)'),
      '☕ Snack-bar et espaces de détente', '☕ Cafétéria et espaces de détente'
    )
    WHERE content ILIKE '%Snack-bar%'
  `;
  const res = await query(sql);
  console.log(`✅ Mis à jour avec succès : ${res.rowCount} enregistrement(s).`);
  process.exit(0);
}

fixSnack().catch(err => {
  console.error(err);
  process.exit(1);
});

