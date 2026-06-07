'use strict';
const whatsapp = require('./whatsapp');
const messenger = require('./messenger');
const { query } = require('../config/database');
const fetch = require('node-fetch');

/**
 * Generate a concise summary of the conversation via GPT
 */
async function generateSummary(history, lang) {
  if (!history || history.length === 0) {
    return lang === 'en' ? 'Unresolved student question.' : 'Question étudiante sans réponse.';
  }

  const text = history.map(h =>
    `${h.role === 'user' ? 'Étudiant' : 'Bot'}: ${h.content}`
  ).join('\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Génère un résumé en 2-3 phrases MAX de cette conversation. Sois factuel et concis. Langue: ${lang === 'en' ? 'anglais' : 'français'}.\n\n${text}` }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.3 }
        })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Question non résolue.';
  } catch (err) {
    console.error('[ESCALATION] Summary error:', err.message);
    return lang === 'en' ? 'Unresolved question.' : 'Question non résolue.';
  }
}

/**
 * Trigger human escalation
 * 1. Summarise conversation
 * 2. Update conversation in DB to "escalated"
 * 3. Notify student
 * 4. Notify admin via WhatsApp
 */
async function triggerEscalation({ phone, history, lang }) {
  console.log(`[ESCALATION] Triggered for ${phone.slice(-4)}`);

  try {
    const summary = await generateSummary(history, lang);

    // 1. Update DB
    await query(
      `UPDATE conversations SET status = 'escalated', summary = $1 WHERE user_phone = $2`,
      [summary, phone]
    );

    // 2. Notify student
    const userMsg = lang === 'en'
      ? `🙏 Your question has been forwarded to an ISETAG advisor.\n\n📝 Summary: ${summary}\n\nWe'll get back to you shortly!`
      : `🙏 Votre question a été transmise à un conseiller ISETAG.\n\n📝 Résumé: ${summary}\n\nNous vous répondrons très bientôt !`;

    const isMessenger = phone.startsWith('messenger:');
    if (isMessenger) {
      const recipientId = phone.split(':')[1];
      await messenger.sendTextMessage(recipientId, userMsg);
    } else {
      await whatsapp.sendTextMessage(phone, userMsg);
    }

    // 3. Notify admin
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminPhone) {
      const adminMsg = `🚨 ISETAG — Escalade Requise\n${'─'.repeat(25)}\n📱 Étudiant: ...${phone.slice(-6)}\n🌐 Langue: ${lang}\n📝 Résumé: ${summary}\n🕐 ${new Date().toLocaleString('fr-FR')}\n${'─'.repeat(25)}\n↩️ Répondre manuellement sur WhatsApp`;
      await whatsapp.sendTextMessage(adminPhone, adminMsg);
      console.log('[ESCALATION] Admin notified');
    }

    return { escalated: true, summary };
  } catch (err) {
    console.error('[ESCALATION] Flow error:', err.message);
    throw err;
  }
}

module.exports = { triggerEscalation, generateSummary };
