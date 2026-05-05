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

      // Ignore non-text events (status updates, reactions, etc.)
      if (!message || message.type !== 'text') return;

      const phone    = message.from;
      const userText = message.text.body.trim();

      console.log(`[WEBHOOK] 📨 Message from ...${phone.slice(-4)}: "${userText}"`);

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

      // 3. Send AI reply
      await sendTextMessage(phone, result.text);

      // 4. Upsert conversation record in PostgreSQL
      await query(
        `INSERT INTO conversations (user_phone, last_message, lang, status, updated_at)
         VALUES ($1, $2, $3, 'active', NOW())
         ON CONFLICT (user_phone)
         DO UPDATE SET last_message = $2, lang = $3, status = CASE WHEN conversations.status = 'escalated' THEN 'escalated' ELSE 'active' END, updated_at = NOW()`,
        [phone, userText, result.lang]
      );

    } catch (err) {
      console.error('[WEBHOOK] Background error:', err.message);
    }
  });
});

module.exports = router;
