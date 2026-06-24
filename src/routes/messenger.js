'use strict';
const express = require('express');
const router  = express.Router();
const { processMessage } = require('../services/ai-agent');
const { sendTextMessage } = require('../services/messenger');
const { triggerEscalation } = require('../services/escalation');
const { getHistory, addMessage, getLang, setLang, getName, setName } = require('../services/session');
const { query } = require('../config/database');
const { sendContextualMedia } = require('../services/media-sender');

// Track consecutive AI errors per page-scoped user ID
const noMatchCount = {};

/**
 * GET — Webhook Verification (Facebook Messenger handshake)
 */
router.get('/messenger', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.MESSENGER_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken?.trim()) {
    console.log('[MESSENGER] ✅ Verified by Meta');
    return res.status(200).send(challenge);
  }
  console.warn(`[MESSENGER] ❌ Verification failed. Expected: '${expectedToken?.trim()}', Got: '${token}'`);
  res.status(403).send('Forbidden');
});

/**
 * POST — Receive messages from Messenger
 */
router.post('/messenger', async (req, res) => {
  // Acknowledge Messenger immediately to prevent retry storms
  res.status(200).send('EVENT_RECEIVED');

  if (req.body.object !== 'page') return;

  setImmediate(async () => {
    try {
      const entry = req.body.entry?.[0];
      const messagingEvent = entry?.messaging?.[0];

      if (!messagingEvent || !messagingEvent.message) return;

      const senderPsid = messagingEvent.sender.id;
      const dbIdentifier = `messenger:${senderPsid}`;

      // Ignore echoes or status updates
      if (messagingEvent.message.is_echo) return;

      let userText = '';
      if (messagingEvent.message.text) {
        userText = messagingEvent.message.text.trim();
      } else if (messagingEvent.message.attachments) {
        const audioAttachment = messagingEvent.message.attachments.find(att => att.type === 'audio');
        if (audioAttachment && audioAttachment.payload && audioAttachment.payload.url) {
          console.log(`[MESSENGER] 🎙️ Voice message from ...${senderPsid.slice(-4)}. Transcribing...`);
          const { transcribeMessengerAudio } = require('../services/audio.service');
          const transcript = await transcribeMessengerAudio(audioAttachment.payload.url);
          if (!transcript) {
            console.warn('[MESSENGER] ❌ Audio transcription failed.');
            const storedLang = await getLang(dbIdentifier);
            await sendTextMessage(senderPsid, storedLang === 'en'
              ? "🙏 Sorry, I couldn't understand your voice note. Could you type your question?"
              : "🙏 Désolé, je n'ai pas pu comprendre votre message vocal. Pouvez-vous écrire votre question ?"
            );
            return;
          }
          userText = transcript.trim();
          console.log(`[MESSENGER] 📝 Voice transcribed: "${userText}"`);
        } else {
          // Inform user about other media files
          const storedLang = await getLang(dbIdentifier);
          await sendTextMessage(senderPsid, storedLang === 'en'
            ? "🖼️ I can't read images or files yet. Please describe your question in text and I'll be happy to help!"
            : "🖼️ Je ne peux pas encore lire les images ou fichiers. Décrivez votre question en texte et je serai ravi de vous aider !"
          );
          return;
        }
      }

      if (!userText) return;

      console.log(`[MESSENGER] 📨 Message from ...${senderPsid.slice(-4)}: "${userText}"`);

      // ── Retrieve conversation details ───────────────────────────────
      const convRow = await query(
        'SELECT id, status, lang FROM conversations WHERE user_phone = $1 LIMIT 1',
        [dbIdentifier]
      );
      const convData = convRow.rows[0] || null;
      const dbLang = convData?.lang || null;

      // ── Check escalation ──────────────────────────────────────────────
      if (convData?.status === 'escalated') {
        console.log(`[MESSENGER] ⏩ Escalated session for ...${senderPsid.slice(-4)}. Saving message only.`);
        await addMessage(dbIdentifier, 'user', userText);
        await query(
          'UPDATE conversations SET last_message = $2, updated_at = NOW() WHERE id = $1',
          [convData.id, userText]
        );
        await query(
          'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
          [convData.id, 'user', userText]
        );
        return;
      }

      const redisLang = await getLang(dbIdentifier);
      const storedLang = redisLang || dbLang || null;

      // ── Fetch history ────────────────────────────────────────────────
      const history = await getHistory(dbIdentifier);

      // ── Fetch prospect name ──────────────────────────────────────────
      const prospectName = await getName(dbIdentifier);

      // ── Call AI agent ────────────────────────────────────────────────
      const result = await processMessage(dbIdentifier, userText, storedLang, history, prospectName);

      if (result.lang) {
        await setLang(dbIdentifier, result.lang);
      }

      // ── Save messages to Redis history ───────────────────────────────
      await addMessage(dbIdentifier, 'user', userText);
      await addMessage(dbIdentifier, 'assistant', result.text);

      const nameToSave = result.detectedName || null;
      if (nameToSave) {
        await setName(dbIdentifier, nameToSave);
        console.log(`[MESSENGER] 👤 Name saved for ...${senderPsid.slice(-4)}: "${nameToSave}"`);
      }

      // ── Handle escalation or reply ───────────────────────────────────
      if (result.needsEscalation) {
        noMatchCount[dbIdentifier] = (noMatchCount[dbIdentifier] || 0) + 1;

        if (noMatchCount[dbIdentifier] >= 3) {
          noMatchCount[dbIdentifier] = 0;
          await triggerEscalation({ phone: dbIdentifier, history, lang: result.lang });
          return;
        } else {
          const retryMsg = result.lang === 'en'
            ? "🤔 I'm having a bit of trouble right now. Could you rephrase your question? I'll do my best to help!"
            : "🤔 J'ai un peu de mal à répondre à ça. Pourriez-vous reformuler votre question ? Je ferai de mon mieux pour vous aider !";
          await sendTextMessage(senderPsid, retryMsg);
        }
      } else {
        noMatchCount[dbIdentifier] = 0;
        await sendTextMessage(senderPsid, result.text);
        // Automatically send relevant media (flyers/tarifs)
        await sendContextualMedia(dbIdentifier, userText, result.text, result.lang);
      }

      // ── Upsert conversation record in PostgreSQL ─────────────────────
      let conversationId;
      const finalName = nameToSave || prospectName || null;

      if (convData) {
        conversationId = convData.id;
        await query(
          `UPDATE conversations
             SET last_message = $2, lang = $3,
                 status = CASE WHEN status = 'escalated' THEN 'escalated' ELSE 'active' END,
                 prospect_name = COALESCE($4, prospect_name),
                 updated_at = NOW()
           WHERE id = $1`,
          [conversationId, userText, result.lang, finalName]
        );
      } else {
        const insertRes = await query(
          `INSERT INTO conversations (user_phone, last_message, lang, status, prospect_name, updated_at)
           VALUES ($1, $2, $3, 'active', $4, NOW()) RETURNING id`,
          [dbIdentifier, userText, result.lang, finalName]
        );
        conversationId = insertRes.rows[0].id;
      }

      // ── Save messages to PostgreSQL ──────────────────────────────────
      await query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'user', userText]
      );
      await query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, 'assistant', result.text]
      );

    } catch (err) {
      console.error('[MESSENGER] Background error:', err.message);
    }
  });
});

module.exports = router;
