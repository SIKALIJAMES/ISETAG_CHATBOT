'use strict';
const { sendTextMessage } = require('./whatsapp');
const { query } = require('../config/database');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Génère un résumé en 2-3 phrases MAX de cette conversation. Sois factuel et concis. Langue: ${lang === 'en' ? 'anglais' : 'français'}.`
        },
        { role: 'user', content: text }
      ],
      max_tokens: 150,
      temperature: 0.3
    });
    return completion.choices[0]?.message?.content || 'Question non résolue.';
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

    await sendTextMessage(phone, userMsg);

    // 3. Notify admin
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminPhone) {
      const adminMsg = `🚨 ISETAG — Escalade Requise\n${'─'.repeat(25)}\n📱 Étudiant: ...${phone.slice(-6)}\n🌐 Langue: ${lang}\n📝 Résumé: ${summary}\n🕐 ${new Date().toLocaleString('fr-FR')}\n${'─'.repeat(25)}\n↩️ Répondre manuellement sur WhatsApp`;
      await sendTextMessage(adminPhone, adminMsg);
      console.log('[ESCALATION] Admin notified');
    }

    return { escalated: true, summary };
  } catch (err) {
    console.error('[ESCALATION] Flow error:', err.message);
    throw err;
  }
}

module.exports = { triggerEscalation, generateSummary };
