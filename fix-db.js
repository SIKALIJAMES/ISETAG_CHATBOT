const { query } = require('./src/config/database');

async function fixDB() {
  try {
    console.log("Vérification de la table messages...");
    const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'messages'");
    const columns = res.rows.map(r => r.column_name);
    console.log("Colonnes actuelles :", columns);
    
    if (columns.includes('sender') && !columns.includes('role')) {
      await query("ALTER TABLE messages RENAME COLUMN sender TO role");
      console.log("✅ La colonne 'sender' a été renommée en 'role'.");
    } else if (!columns.includes('role')) {
      await query("ALTER TABLE messages ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
      console.log("✅ La colonne 'role' a été ajoutée.");
    } else {
      console.log("✅ La colonne 'role' existe déjà !");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  }
}

fixDB();
