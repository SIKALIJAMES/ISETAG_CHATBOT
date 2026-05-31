'use strict';
const express = require('express');
const router  = express.Router();
const { processMessage }                    = require('../services/ai-agent');
const { sendTextMessage }                   = require('../services/whatsapp');
const { triggerEscalation }                 = require('../services/escalation');
const { getHistory, addMessage, getLang, setLang } = require('../services/session');
const { verifyHmac }                        = require('../middleware/hmac');
const { query }                             = require('../config/database');

// Track consecutive AI errors per phone (in-memory is fine for this counter)
const noMatchCount = {};

/**
 * GET — Webhook Verification (Meta handshake)
 */
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
    console.log('[WEBHOOK] ✅ Verified by Meta');
    return res.status(200).send(challenge);
  }
  console.warn(`[WEBHOOK] ❌ Verification failed. Expected: '${process.env.WHATSAPP_VERIFY_TOKEN?.trim()}', Got: '${token}'`);
  res.status(403).send('Forbidden');
});

/**
 * POST — Receive messages from WhatsApp
 * FIX: respond 200 immediately, process async
 */
router.post('/whatsapp', async (req, res) => {
  console.log('[WEBHOOK] 🔔 POST received!', JSON.stringify(req.body).slice(0, 200));

  // ✅ Acknowledge Meta immediately (prevents retry storms)
  res.status(200).send('OK');

  setImmediate(async () => {
    try {
      const entry   = req.body?.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const message = changes?.messages?.[0];

      if (!message) return;

      const phone = message.from;
      let userText = '';

      if (message.type === 'text') {
        userText = message.text.body.trim();
      } else if (message.type === 'audio') {
        console.log(`[WEBHOOK] 🎙️ Voice message from ...${phone.slice(-4)}. Transcribing...`);
        const { transcribeAudio } = require('../services/audio.service');
        const transcript = await transcribeAudio(message.audio.id, process.env.WHATSAPP_TOKEN);
        if (!transcript) {
          console.warn('[WEBHOOK] ❌ Audio transcription failed.');
          await sendTextMessage(phone,
            "🙏 Désolé, je n'ai pas pu comprendre votre message vocal. Pouvez-vous écrire votre question ? / Sorry, I couldn't understand your voice note. Could you type your question?"
          );
          return;
        }
        userText = transcript.trim();
        console.log(`[WEBHOOK] 📝 Voice transcribed: "${userText}"`);
      } else if (message.type === 'image' || message.type === 'document' || message.type === 'video') {
        // FIX #7: Inform user instead of silently ignoring media messages
        const storedLang = await getLang(phone);
        await sendTextMessage(phone, storedLang === 'en'
          ? "🖼️ I can't read images or files yet. Please describe your question in text and I'll be happy to help!"
          : "🖼️ Je ne peux pas encore lire les images ou fichiers. Décrivez votre question en texte et je serai ravi de vous aider !"
        );
        return;
      } else {
        // Ignore reactions, status updates, etc.
        return;
      }

      if (!userText) return;

      console.log(`[WEBHOOK] 📨 Message from ...${phone.slice(-4)}: "${userText}"`);

      // ── FIX #2: Single SQL query (was 2 identical queries before) ──────
      // Gets: id, status, lang — all we need in one round-trip
      const convRow = await query(
        'SELECT id, status, lang FROM conversations WHERE user_phone = $1 LIMIT 1',
        [phone]
      );
      const convData   = convRow.rows[0] || null;
      const dbLang     = convData?.lang || null;

      // ── Check escalation ───────────────────────────────────────────────
      if (convData?.status === 'escalated') {
        console.log(`[WEBHOOK] ⏩ Escalated session for ...${phone.slice(-4)}. Saving message only.`);
        await addMessage(phone, 'user', userText);
        await query(
          'UPDATE conversations SET last_message = $2, updated_at = NOW() WHERE id = $1',
          [convData.id, userText]
        );
        return;
      }

      // ── FIX #1: Language from Redis (survives redeployments) ───────────
      const redisLang  = await getLang(phone);
      const storedLang = redisLang || dbLang || null;

      // ── Fetch history ─────────────────────────────────────────────────
      const history = await getHistory(phone);

      // ── Call AI agent ─────────────────────────────────────────────────
      const result = await processMessage(phone, userText, storedLang, history);

      // ── FIX #1: Persist detected language to Redis for next messages ───
      if (result.lang) {
        await setLang(phone, result.lang);
      }

      // ── Save messages to Redis history ────────────────────────────────
      await addMessage(phone, 'user',      userText);
      await addMessage(phone, 'assistant', result.text);

      // ── FIX #4: Handle escalation BEFORE sending the AI error message ─
      if (result.needsEscalation) {
        noMatchCount[phone] = (noMatchCount[phone] || 0) + 1;

        if (noMatchCount[phone] >= 3) {
          // FIX: threshold raised to 3 (was 2) to avoid false escalations on timeouts
          noMatchCount[phone] = 0;
          await triggerEscalation({ phone, history, lang: result.lang });
          return; // ← Do NOT send the error text, escalation message is enough
        } else {
          // Not escalating yet — send a polite "retry" message instead of the raw error
          const retryMsg = result.lang === 'en'
            ? "🤔 I'm having a bit of trouble right now. Could you rephrase your question? I'll do my best to help!"
            : "🤔 J'ai un peu de mal à répondre à ça. Pourriez-vous reformuler votre question ? Je ferai de mon mieux pour vous aider !";
          await sendTextMessage(phone, retryMsg);
        }
      } else {
        // ── Normal successful reply ───────────────────────────────────
        noMatchCount[phone] = 0;
        await sendTextMessage(phone, result.text);
      }

      // ── Upsert conversation record in PostgreSQL ──────────────────────
      let conversationId;
      if (convData) {
        conversationId = convData.id;
        await query(
          `UPDATE conversations
             SET last_message = $2, lang = $3,
                 status = CASE WHEN status = 'escalated' THEN 'escalated' ELSE 'active' END,
                 updated_at = NOW()
           WHERE id = $1`,
          [conversationId, userText, result.lang]
        );
      } else {
        const insertRes = await query(
          `INSERT INTO conversations (user_phone, last_message, lang, status, updated_at)
           VALUES ($1, $2, $3, 'active', NOW()) RETURNING id`,
          [phone, userText, result.lang]
        );
        conversationId = insertRes.rows[0].id;
      }

      // ── Save messages to PostgreSQL for Admin Dashboard ───────────────
      await query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'user', userText]
      );
      await query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'assistant', result.text]
      );

    } catch (err) {
      console.error('[WEBHOOK] Background error:', err.message);
    }
  });
});

module.exports = router;
