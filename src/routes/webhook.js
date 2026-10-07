'use strict';
const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/ai-agent');
const { sendTextMessage } = require('../services/whatsapp');
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
const { verifyHmac } = require('../middleware/hmac');
const { query } = require('../config/database');
const { sendContextualMedia } = require('../services/media-sender');

// Track consecutive AI errors per phone (in-memory is fine for this counter)
const noMatchCount = {};

/**
 * Helper to record conversation and message exchange in DB & Redis history
 */
async function recordInteraction(phone, userText, assistantText, lang, convData, prospectName) {
  await addMessage(phone, 'user', userText);
  await addMessage(phone, 'assistant', assistantText);

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
      [phone, userText, lang, prospectName]
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
 * GET — Webhook Verification (Meta handshake)
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
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
      const entry = req.body?.entry?.[0];
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
        const storedLang = await getLang(phone);
        await sendTextMessage(phone, storedLang === 'en'
          ? "🖼️ I can't read images or files yet. Please describe your question in text and I'll be happy to help!"
          : "🖼️ Je ne peux pas encore lire les images ou fichiers. Décrivez votre question en texte et je serai ravi de vous aider !"
        );
        return;
      } else {
        return;
      }

      if (!userText) return;

      console.log(`[WEBHOOK] 📨 Message from ...${phone.slice(-4)}: "${userText}"`);

      // ── Fetch existing conversation ──────────────────────────────────
      const convRow = await query(
        'SELECT id, status, lang FROM conversations WHERE user_phone = $1 LIMIT 1',
        [phone]
      );
      const convData = convRow.rows[0] || null;
      const dbLang = convData?.lang || null;

      // ── Check escalation ─────────────────────────────────────────────
      if (convData?.status === 'escalated') {
        console.log(`[WEBHOOK] ⏩ Escalated session for ...${phone.slice(-4)}. Saving message only.`);
        await addMessage(phone, 'user', userText);
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
      const redisLang = await getLang(phone);
      const storedLang = (redisLang || dbLang || 'fr') === 'en' ? 'en' : 'fr';
      const prospectName = await getName(phone);

      // ── Step A: Check if orientation questionnaire is active ─────────
      const activeOrientation = await getOrientation(phone);

      if (activeOrientation && activeOrientation.active) {
        // User wants to cancel orientation
        if (orientationService.isAbortRequest(userText)) {
          await clearOrientation(phone);
          const abortMsg = orientationService.abortMessage(storedLang);
          await sendTextMessage(phone, abortMsg);
          await recordInteraction(phone, userText, abortMsg, storedLang, convData, prospectName);
          console.log(`[WEBHOOK] 🛑 Orientation cancelled by ...${phone.slice(-4)}`);
          return;
        }

        const sessionObj = { orientation: activeOrientation };
        const { text: orientText, done } = orientationService.advanceOrientation(sessionObj, userText, storedLang);

        if (done) {
          await clearOrientation(phone);
          console.log(`[WEBHOOK] 🎓 Orientation completed for ...${phone.slice(-4)}`);
        } else {
          await setOrientation(phone, sessionObj.orientation);
          console.log(`[WEBHOOK] 🎓 Orientation step ${sessionObj.orientation.stepIndex}/${orientationService.STEPS.length} for ...${phone.slice(-4)}`);
        }

        await sendTextMessage(phone, orientText);
        await recordInteraction(phone, userText, orientText, storedLang, convData, prospectName);

        if (done) {
          await sendContextualMedia(phone, userText, orientText, storedLang);
        }
        return;
      }

      // ── Step B: Check if undecided student: start orientation quiz ────
      if (orientationService.isUndecided(userText)) {
        console.log(`[WEBHOOK] 🧭 Undecided student detected (...${phone.slice(-4)}) — starting orientation`);
        const sessionObj = { orientation: {} };
        const firstQuestion = orientationService.startOrientation(sessionObj, storedLang);
        await setOrientation(phone, sessionObj.orientation);
        await sendTextMessage(phone, firstQuestion);
        await recordInteraction(phone, userText, firstQuestion, storedLang, convData, prospectName);
        return;
      }

      // ── Step C: Normal AI agent processing ───────────────────────────
      const history = await getHistory(phone);
      const result = await processMessage(phone, userText, storedLang, history, prospectName);

      // Persist detected name if found
      const nameToSave = result.detectedName || null;
      if (nameToSave) {
        await setName(phone, nameToSave);
        console.log(`[WEBHOOK] 👤 Name saved for ...${phone.slice(-4)}: "${nameToSave}"`);
      }

      // Persist detected language
      if (result.lang) {
        await setLang(phone, result.lang);
      }

      // ── Handle escalation or standard reply ──────────────────────────
      if (result.needsEscalation) {
        noMatchCount[phone] = (noMatchCount[phone] || 0) + 1;

        if (noMatchCount[phone] >= 3) {
          noMatchCount[phone] = 0;
          await triggerEscalation({ phone, history, lang: result.lang });
          return;
        } else {
          const retryMsg = result.lang === 'en'
            ? "🤔 I'm having a bit of trouble right now. Could you rephrase your question? I'll do my best to help!"
            : "🤔 J'ai un peu de mal à répondre à ça. Pourriez-vous reformuler votre question ? Je ferai de mon mieux pour vous aider !";
          await sendTextMessage(phone, retryMsg);
          await recordInteraction(phone, userText, retryMsg, result.lang, convData, nameToSave || prospectName);
          return;
        }
      }

      // Successful reply
      noMatchCount[phone] = 0;
      await sendTextMessage(phone, result.text);
      await sendContextualMedia(phone, userText, result.text, result.lang);

      const finalName = nameToSave || prospectName || null;
      await recordInteraction(phone, userText, result.text, result.lang, convData, finalName);

    } catch (err) {
      console.error('[WEBHOOK] Background error:', err.message);
    }
  });
});

module.exports = router;

