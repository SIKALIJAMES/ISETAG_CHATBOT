'use strict';
const express = require('express');
const router  = express.Router();
const { processMessage } = require('../services/ai-agent');
const { sendTextMessage } = require('../services/messenger');
const { triggerEscalation } = require('../services/escalation');
const {
  getHistory,
  addMessage,
  getLang,
  setLang,
  getName,
  setName,
  getOrientation,
  setOrientation,
  clearOrientation,
} = require('../services/session');
const orientationService = require('../services/orientation.service');
const { query } = require('../config/database');
const { sendContextualMedia } = require('../services/media-sender');

// Track consecutive AI errors per page-scoped user ID
const noMatchCount = {};

/**
 * Helper to record conversation and message exchange in DB & Redis history
 */
async function recordInteraction(dbIdentifier, userText, assistantText, lang, convData, prospectName) {
  await addMessage(dbIdentifier, 'user', userText);
  await addMessage(dbIdentifier, 'assistant', assistantText);

  let conversationId;
  if (convData) {
    conversationId = convData.id;
    await query(
      `UPDATE conversations
         SET last_message = $2, lang = $3,
             status = CASE WHEN status = 'escalated' THEN 'escalated' ELSE 'active' END,
             prospect_name = COALESCE($4, prospect_name),
             updated_at = NOW()
       WHERE id = $1`,
      [conversationId, userText, lang, prospectName]
    );
  } else {
    const insertRes = await query(
      `INSERT INTO conversations (user_phone, last_message, lang, status, prospect_name, updated_at)
       VALUES ($1, $2, $3, 'active', $4, NOW()) RETURNING id`,
      [dbIdentifier, userText, lang, prospectName]
    );
    conversationId = insertRes.rows[0].id;
  }

  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [conversationId, 'user', userText]
  );
  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [conversationId, 'assistant', assistantText]
  );

  return conversationId;
}


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

      // ── Language & Name resolution ───────────────────────────────────
      const redisLang = await getLang(dbIdentifier);
      const storedLang = (redisLang || dbLang || 'fr') === 'en' ? 'en' : 'fr';
      const prospectName = await getName(dbIdentifier);

      // ── Step A: Check if orientation questionnaire is active ─────────
      const activeOrientation = await getOrientation(dbIdentifier);

      if (activeOrientation && activeOrientation.active) {
        if (orientationService.isAbortRequest(userText)) {
          await clearOrientation(dbIdentifier);
          const abortMsg = orientationService.abortMessage(storedLang);
          await sendTextMessage(senderPsid, abortMsg);
          await recordInteraction(dbIdentifier, userText, abortMsg, storedLang, convData, prospectName);
          console.log(`[MESSENGER] 🛑 Orientation cancelled by ...${senderPsid.slice(-4)}`);
          return;
        }

        const sessionObj = { orientation: activeOrientation };
        const { text: orientText, done } = orientationService.advanceOrientation(sessionObj, userText, storedLang);

        if (done) {
          await clearOrientation(dbIdentifier);
          console.log(`[MESSENGER] 🎓 Orientation completed for ...${senderPsid.slice(-4)}`);
        } else {
          await setOrientation(dbIdentifier, sessionObj.orientation);
          console.log(`[MESSENGER] 🎓 Orientation step ${sessionObj.orientation.stepIndex}/${orientationService.STEPS.length} for ...${senderPsid.slice(-4)}`);
        }

        await sendTextMessage(senderPsid, orientText);
        await recordInteraction(dbIdentifier, userText, orientText, storedLang, convData, prospectName);

        if (done) {
          await sendContextualMedia(dbIdentifier, userText, orientText, storedLang);
        }
        return;
      }

      // ── Step B: Check if undecided student: start orientation quiz ────
      if (orientationService.isUndecided(userText)) {
        console.log(`[MESSENGER] 🧭 Undecided student detected (...${senderPsid.slice(-4)}) — starting orientation`);
        const sessionObj = { orientation: {} };
        const firstQuestion = orientationService.startOrientation(sessionObj, storedLang);
        await setOrientation(dbIdentifier, sessionObj.orientation);
        await sendTextMessage(senderPsid, firstQuestion);
        await recordInteraction(dbIdentifier, userText, firstQuestion, storedLang, convData, prospectName);
        return;
      }

      // ── Step C: Normal AI agent flow ──────────────────────────────────
      const history = await getHistory(dbIdentifier);
      const result = await processMessage(dbIdentifier, userText, storedLang, history, prospectName);

      const nameToSave = result.detectedName || null;
      if (nameToSave) {
        await setName(dbIdentifier, nameToSave);
        console.log(`[MESSENGER] 👤 Name saved for ...${senderPsid.slice(-4)}: "${nameToSave}"`);
      }

      if (result.lang) {
        await setLang(dbIdentifier, result.lang);
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
          await recordInteraction(dbIdentifier, userText, retryMsg, result.lang, convData, nameToSave || prospectName);
          return;
        }
      }

      // Normal reply
      noMatchCount[dbIdentifier] = 0;
      await sendTextMessage(senderPsid, result.text);
      await sendContextualMedia(dbIdentifier, userText, result.text, result.lang);

      const finalName = nameToSave || prospectName || null;
      await recordInteraction(dbIdentifier, userText, result.text, result.lang, convData, finalName);


    } catch (err) {
      console.error('[MESSENGER] Background error:', err.message);
    }
  });
});

module.exports = router;
