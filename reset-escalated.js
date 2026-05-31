const { query } = require('./src/config/database');

async function resetEscalated() {
  try {
    const res = await query("UPDATE conversations SET status = 'active' WHERE status = 'escalated'");
    console.log(`✅ Réinitialisation réussie. ${res.rowCount} conversation(s) repassée(s) en 'active'.`);
    process.exit(0);
  } catch (err) {
    console.error("Erreur lors de la réinitialisation :", err);
    process.exit(1);
  }
}

resetEscalated();
