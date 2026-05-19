'use strict';
const express = require('express');
const router = express.Router();
const { processMessage } = require('../services/ai-agent');
const { sendTextMessage } = require('../services/whatsapp');
const { triggerEscalation } = require('../services/escalation');
const { getHistory } = require('../services/session');
const { verifyHmac } = require('../middleware/hmac');
const { query } = require('../config/database');

// Track consecutive no-match per phone (in-memory, resets on restart)
const noMatchCount = {};

/**
 * GET — Webhook Verification (Meta handshake)
 */
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WEBHOOK] ✅ Verified by Meta');
    return res.status(200).send(challenge);
  }
  console.warn('[WEBHOOK] ❌ Verification failed');
  res.status(403).send('Forbidden');
});

/**
 * POST — Receive messages from WhatsApp
 * CRITICAL V2 FIX: respond 200 immediately, process async
 */
router.post('/whatsapp', async (req, res) => {
  console.log('[WEBHOOK] 🔔 POST received!', JSON.stringify(req.body).slice(0, 200));
  
  // ✅ Respond to Meta immediately (prevents webhook timeout)
  res.status(200).send('OK');

  // ⚙️ Process in background
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
        console.log(`[WEBHOOK] 🎙️ Voice message received from ...${phone.slice(-4)}. Transcribing...`);
        const { transcribeAudio } = require('../services/audio.service');
        const transcript = await transcribeAudio(message.audio.id, process.env.WHATSAPP_TOKEN);
        
        if (!transcript) {
          console.warn('[WEBHOOK] ❌ Audio transcription failed.');
          await sendTextMessage(phone, "🙏 Désolé, je n'ai pas pu comprendre votre message vocal. Pourriez-vous me l'écrire par texte ? / Sorry, I couldn't understand your voice note. Could you please type it?");
          return;
        }
        
        userText = transcript.trim();
        console.log(`[WEBHOOK] 📝 Voice transcribed to: "${userText}"`);
      } else {
        // Ignore other types (reactions, status updates, etc.)
        return;
      }

      if (!userText) return;

      console.log(`[WEBHOOK] 📨 Message from ...${phone.slice(-4)}: "${userText}"`);

      // 0. Check if conversation is already escalated
      const convCheck = await query('SELECT id, status, lang FROM conversations WHERE user_phone = $1 LIMIT 1', [phone]);
      if (convCheck.rows.length > 0 && convCheck.rows[0].status === 'escalated') {
        console.log(`[WEBHOOK] ⏩ Session is escalated for ...${phone.slice(-4)}. Saving message and skipping AI response.`);
        
        // Save user message to history so admin can see it in dashboard
        const sessionService = require('../services/session');
        await sessionService.addMessage(phone, 'user', userText);
        
        // Update database with latest message from student
        await query(
          `UPDATE conversations SET last_message = $2, updated_at = NOW() WHERE id = $1`,
          [convCheck.rows[0].id, userText]
        );
        return;
      }

      // 1. Call AI Agent (GPT-4o-mini + RAG)
      const result = await processMessage(phone, userText);

      // 2. Check confidence — escalate if too low AND repeated
      if (result.needsEscalation) {
        noMatchCount[phone] = (noMatchCount[phone] || 0) + 1;

        if (noMatchCount[phone] >= 2) {
          // Escalate to human
          noMatchCount[phone] = 0;
          const history = await getHistory(phone);
          await triggerEscalation({ phone, history, lang: result.lang });
          return;
        }
      } else {
        // Reset counter on successful answer
        noMatchCount[phone] = 0;
      }

      // 3. Send AI reply (Text)
      await sendTextMessage(phone, result.text);

      // 4. Upsert conversation record in PostgreSQL (without ON CONFLICT to avoid schema issues)
      const existing = await query('SELECT id, status FROM conversations WHERE user_phone = $1 LIMIT 1', [phone]);
      if (existing.rows.length > 0) {
        await query(
          `UPDATE conversations SET last_message = $2, lang = $3, status = CASE WHEN status = 'escalated' THEN 'escalated' ELSE 'active' END, updated_at = NOW() WHERE id = $1`,
          [existing.rows[0].id, userText, result.lang]
        );
      } else {
        await query(
          `INSERT INTO conversations (user_phone, last_message, lang, status, updated_at) VALUES ($1, $2, $3, 'active', NOW())`,
          [phone, userText, result.lang]
        );
      }

    } catch (err) {
      console.error('[WEBHOOK] Background error:', err.message);
    }
  });
});

module.exports = router;
