'use strict';
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// ─── CONFIGURE ICI ───────────────────────────────────────────────────────────
const NEW_EMAIL    = 'admin@isetag.cm';
const NEW_PASSWORD = 'Admin123!';      // ← change si tu veux un nouveau mot de passe
// ─────────────────────────────────────────────────────────────────────────────

async function resetAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const hashed = await bcrypt.hash(NEW_PASSWORD, 12);

    // Vérifie si le compte existe
    const check = await pool.query('SELECT id FROM admins WHERE email = $1', [NEW_EMAIL]);

    if (check.rows.length === 0) {
      // Crée le compte s'il n'existe pas
      await pool.query(
        `INSERT INTO admins (username, email, password, role) VALUES ($1, $2, $3, 'admin')`,
        ['admin', NEW_EMAIL, hashed]
      );
      console.log(`✅ Admin créé : ${NEW_EMAIL} / ${NEW_PASSWORD}`);
    } else {
      // Réinitialise le mot de passe
      await pool.query('UPDATE admins SET password = $1 WHERE email = $2', [hashed, NEW_EMAIL]);
      console.log(`✅ Mot de passe réinitialisé pour : ${NEW_EMAIL}`);
      console.log(`   Nouveau mot de passe : ${NEW_PASSWORD}`);
    }
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetAdmin();
