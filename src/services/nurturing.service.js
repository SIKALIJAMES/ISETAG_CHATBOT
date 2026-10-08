'use strict';
const { query } = require('../config/database');
const { sendTextMessage } = require('./whatsapp');
const { addMessage } = require('./session');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Run Nurturing Job
 * Sends a gentle 24h follow-up message to prospects who chatted with the bot
 * but haven't yet submitted a pre-registration.
 */
async function runNurturingJob(limit = 20) {
  const appUrl = process.env.APP_URL || 'https://isetagchatbot-production.up.railway.app';
  const formUrl = `${appUrl}/preinscription`;

  try {
    // Find eligible prospects:
    // - Active status (not escalated)
    // - WhatsApp numbers only
    // - Inactive for 24h to 7 days
    // - Never nurtured yet
    // - Not already in preinscriptions table
    const eligibleQuery = `
      SELECT c.id, c.user_phone, c.lang, c.prospect_name
      FROM conversations c
      WHERE c.status = 'active'
        AND c.nurtured_at IS NULL
        AND c.user_phone NOT LIKE 'messenger:%'
        AND c.updated_at <= NOW() - INTERVAL '24 hours'
        AND c.updated_at >= NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM preinscriptions p
          WHERE (p.phone IS NOT NULL AND RIGHT(p.phone, 8) = RIGHT(c.user_phone, 8))
             OR (p.whatsapp_phone IS NOT NULL AND RIGHT(p.whatsapp_phone, 8) = RIGHT(c.user_phone, 8))
        )
      ORDER BY c.updated_at ASC
      LIMIT $1
    `;

    const res = await query(eligibleQuery, [limit]);
    const candidates = res.rows;

    if (candidates.length === 0) {
      return { count: 0, message: 'Aucun prospect éligible à la relance pour le moment.' };
    }

    console.log(`[NURTURING] 🚀 Starting follow-up for ${candidates.length} prospect(s)...`);
    let sentCount = 0;

    for (const prospect of candidates) {
      const isEn = prospect.lang === 'en';
      const name = prospect.prospect_name ? ` ${prospect.prospect_name}` : '';

      const followUpText = isEn
        ? `Hello${name}! 😊 This is your virtual advisor at **ISETAG**.\n\n` +
          `Have you had a chance to check out our programs and admission details?\n\n` +
          `📌 *Reminder:* Online pre-registration is *100% FREE* and reserves your spot without commitment:\n` +
          `👉 ${formUrl}\n\n` +
          `Feel free to reply if you have questions or need guidance — I'm here to help! 🎓`
        : `Bonjour${name} ! 😊 C'est votre conseiller d'orientation **ISETAG**.\n\n` +
          `Avez-vous pu consulter nos filières et fiches tarifaires ?\n\n` +
          `📌 *Rappel :* La pré-inscription en ligne est *100% GRATUITE* et vous permet de réserver votre place sans engagement :\n` +
          `👉 ${formUrl}\n\n` +
          `N'hésitez pas si vous avez des questions ou besoin d'un conseil d'orientation, je reste à votre disposition ! 🎓`;

      try {
        await sendTextMessage(prospect.user_phone, followUpText);

        // Mark as nurtured in database
        await query(
          'UPDATE conversations SET nurtured_at = NOW() WHERE id = $1',
          [prospect.id]
        );

        // Record message in history & PostgreSQL
        await query(
          'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
          [prospect.id, 'assistant', followUpText]
        );
        await addMessage(prospect.user_phone, 'assistant', followUpText);

        sentCount++;
        console.log(`[NURTURING] ✅ Follow-up sent to ...${prospect.user_phone.slice(-4)}`);
      } catch (sendErr) {
        console.error(`[NURTURING] ❌ Failed to send to ...${prospect.user_phone.slice(-4)}:`, sendErr.message);
      }

      await delay(800);
    }

    return {
      count: sentCount,
      totalEligible: candidates.length,
      message: `${sentCount} message(s) de relance envoyé(s) avec succès.`,
    };

  } catch (err) {
    console.error('[NURTURING] Job error:', err.message);
    throw err;
  }
}

/**
 * Get Nurturing Stats
 */
async function getNurturingStats() {
  try {
    const nurturedRes = await query(
      `SELECT COUNT(*) FROM conversations WHERE nurtured_at IS NOT NULL`
    );
    const pendingRes = await query(`
      SELECT COUNT(*)
      FROM conversations c
      WHERE c.status = 'active'
        AND c.nurtured_at IS NULL
        AND c.user_phone NOT LIKE 'messenger:%'
        AND c.updated_at <= NOW() - INTERVAL '24 hours'
        AND c.updated_at >= NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM preinscriptions p
          WHERE (p.phone IS NOT NULL AND RIGHT(p.phone, 8) = RIGHT(c.user_phone, 8))
             OR (p.whatsapp_phone IS NOT NULL AND RIGHT(p.whatsapp_phone, 8) = RIGHT(c.user_phone, 8))
        )
    `);

    return {
      nurturedTotal: parseInt(nurturedRes.rows[0].count) || 0,
      pendingEligible: parseInt(pendingRes.rows[0].count) || 0,
    };
  } catch (err) {
    console.error('[NURTURING] Stats error:', err.message);
    return { nurturedTotal: 0, pendingEligible: 0 };
  }
}

module.exports = {
  runNurturingJob,
  getNurturingStats,
};
