'use strict';
const crypto = require('crypto');
const { query } = require('../config/db');
const sessionService = require('../services/session.service');
const nlpService = require('../services/nlp.service');
const faqService = require('../services/faq.service');
const audioService = require('../services/audio.service');
const escalationService = require('../services/escalation.service');
const { processMessage } = require('../services/ai-agent');
const { hashPhone, shortHash } = require('../utils/crypto');
const {
  buildTextMessage,
  buildButtonMessage,
  rateLimitMessage,
  escalatedSessionMessage,
  noMatchMessage,
  audioFallbackMessage,
  welcomePrefix,
} = require('../utils/formatter');
const logger = require('../utils/logger');
const fetch = require('node-fetch');

const WA_BASE_URL = 'https://graph.facebook.com/v20.0';

/**
 * GET /webhook/whatsapp — Webhook verification challenge
 */
async function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed — invalid token or mode');
  return res.sendStatus(403);
}

/**
 * POST /webhook/whatsapp — Main incoming message handler
 */
async function handleWebhook(req, res) {
  // Always acknowledge immediately to avoid Meta retries
  res.sendStatus(200);

  try {
    // Step 1: Verify HMAC-SHA256 signature
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(req.rawBody, signature)) {
      logger.warn('Invalid webhook signature — request rejected');
      return;
    }

    const body = req.body;
    if (!body?.object || body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages || value.messages.length === 0) return;

    const message = value.messages[0];
    const contactInfo = value.contacts?.[0];
    const phone = message.from;
    const msgId = message.id;
    const msgType = message.type;

    logger.info(`Incoming message from ${shortHash(phone)}: type=${msgType}`);

    // Step 2: Hash phone number
    const phoneHash = hashPhone(phone);

    // Step 3: Deduplication check via session
    const session = await sessionService.getSession(phoneHash);
    if (session.last_msg_id === msgId) {
      logger.warn(`Duplicate message ${msgId} — skipping`);
      return;
    }

    // Step 4: Rate limiting
    const isRateLimited = await sessionService.checkRateLimit(phoneHash);
    if (isRateLimited) {
      logger.warn(`Rate limit exceeded for ${shortHash(phone)}`);
      await sendMessage(buildTextMessage(phone, rateLimitMessage(session.lang || 'fr')));
      return;
    }

    // Step 5: Extract message content
    let userText = '';
    let msgTypeStored = 'text';

    if (msgType === 'audio') {
      msgTypeStored = 'audio';
      const transcript = await audioService.transcribeAudio(
        message.audio.id,
        process.env.WHATSAPP_TOKEN
      );

      if (!transcript) {
        await sendMessage(buildTextMessage(phone, audioFallbackMessage(session.lang || 'fr')));
        return;
      }

      userText = transcript;
      logger.info(`Audio transcribed: "${userText.slice(0, 80)}..."`);
    } else if (msgType === 'text') {
      userText = message.text?.body || '';
    } else if (msgType === 'interactive') {
      // Button reply
      userText = message.interactive?.button_reply?.title || message.interactive?.button_reply?.id || '';
    } else {
      // Unsupported type (image, sticker, etc.)
      const unsupportedMsg = session.lang === 'en'
        ? 'I can only process text messages and voice notes. Please type your question. 😊'
        : 'Je peux uniquement traiter les messages texte et vocaux. Veuillez écrire votre question. 😊';
      await sendMessage(buildTextMessage(phone, unsupportedMsg));
      return;
    }

    if (!userText.trim()) return;

    // Step 6: Detect language
    const detectedLang = nlpService.detectLang(userText);
    if (!session.lang || session.lang === 'fr') {
      session.lang = detectedLang;
    }

    // Update dedup ID
    session.last_msg_id = msgId;
    session.message_count = (session.message_count || 0) + 1;

    // Step 7: Find or create conversation in DB
    const conversationId = await getOrCreateConversation(phoneHash, session.lang);

    // Log incoming message
    await logMessage(conversationId, 'in', userText, msgTypeStored, null, null);

    // Step 8: Add to history
    sessionService.addToHistory(session, 'user', userText);

    // Step 9: If session is already escalated, just acknowledge
    if (session.is_escalated) {
      logger.info(`Session escalated — forwarding message from ${shortHash(phone)}`);
      await sendMessage(buildTextMessage(phone, escalatedSessionMessage(session.lang)));
      await sessionService.saveSession(phoneHash, session);
      return;
    }

    // Step 10: Check for escalation trigger words
    if (nlpService.isEscalationTrigger(userText)) {
      logger.info(`Escalation trigger detected from ${shortHash(phone)}`);
      await doEscalation({ phone, phoneHash, session, conversationId, lang: session.lang });
      await sessionService.saveSession(phoneHash, session);
      return;
    }

    // Step 11: Check for menu trigger
    const isFirstMessage = session.message_count <= 1;
    if (isFirstMessage || nlpService.isMenuTrigger(userText)) {
      session.step = 'menu';
      await sendWelcomeMenu(phone, session.lang);
      await sessionService.saveSession(phoneHash, session);
      await logMessage(conversationId, 'out', '[Interactive Menu]', 'interactive', null, null);
      return;
    }

    // Step 12: Check if button click for specific category
    const category = nlpService.detectCategory(userText);
    if (category && msgType === 'interactive') {
      const categoryFaqs = await faqService.getFAQsByCategory(category, session.lang);
      if (categoryFaqs.length > 0) {
        const faq = categoryFaqs[0];
        const answer = (isFirstMessage ? welcomePrefix(session.lang) : '') + faq.answer;
        await sendMessage(buildTextMessage(phone, answer));
        sessionService.addToHistory(session, 'assistant', faq.answer);
        await logMessage(conversationId, 'out', faq.answer, 'text', faq.id, 1.0);
        session.consecutive_no_match = 0;
        await sessionService.saveSession(phoneHash, session);
        return;
      }
    }

    // Step 13: Run AI Agent
    const result = await processMessage(phone, userText, session.lang, session.history || []);

    if (result.text && !result.needsEscalation) {
      const prefix = isFirstMessage ? welcomePrefix(session.lang) : '';
      const responseText = prefix + result.text;
      await sendMessage(buildTextMessage(phone, responseText));
      sessionService.addToHistory(session, 'assistant', result.text);
      await logMessage(conversationId, 'out', result.text, 'text', null, 1.0);
      session.consecutive_no_match = 0;
      logger.info(`AI Agent answered for ${shortHash(phone)}`);
    } else {
      // Escalation or error
      await doEscalation({ phone, phoneHash, session, conversationId, lang: session.lang });
      if (result.text && result.needsEscalation) {
        // Optionnel: On peut loguer l'erreur envoyée
        logger.error(`AI Agent Erreur ou Escalation requise`);
      }
    }

    await sessionService.saveSession(phoneHash, session);
  } catch (err) {
    logger.error('Webhook handler error:', err.message, err.stack);
  }
}

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

/**
 * Verify Meta HMAC-SHA256 signature
 */
function verifySignature(rawBody, signature) {
  if (!signature) return false;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Send a WhatsApp message
 */
async function sendMessage(payload) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  try {
    const res = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`WhatsApp send failed [${res.status}]:`, errText);
    } else {
      logger.debug('WhatsApp message sent successfully');
    }
  } catch (err) {
    logger.error('WhatsApp send error:', err.message);
  }
}

/**
 * Send interactive welcome menu with buttons
 */
async function sendWelcomeMenu(phone, lang) {
  const header = lang === 'en'
    ? '🎓 Welcome to ISETAG University!'
    : '🎓 Bienvenue à l\'Université ISETAG !';
  const body = lang === 'en'
    ? 'How can I help you today? Choose a topic:'
    : 'Comment puis-je vous aider ? Choisissez un sujet :';

  // First message — 3 buttons (WhatsApp max)
  await sendMessage(buildButtonMessage(phone, header, body, [
    { title: '📋 Admissions', id: 'admission' },
    { title: '💰 Frais', id: 'frais' },
    { title: '📚 Filières', id: 'filieres' },
  ]));

  // Small delay then second message with 2 more options
  await new Promise(r => setTimeout(r, 800));

  const body2 = lang === 'en'
    ? 'More options:'
    : 'Plus d\'options :';

  await sendMessage(buildButtonMessage(phone, '📌 ISETAG', body2, [
    { title: '📅 Dates', id: 'dates' },
    { title: '📞 Contacts', id: 'contacts' },
  ]));
}

/**
 * Get or create conversation for this phone hash.
 * Uses an atomic upsert to prevent duplicate key errors
 * caused by Meta's parallel/retry webhook deliveries.
 */
async function getOrCreateConversation(phoneHash, lang) {
  // Atomic upsert: insert if no active 'bot' conversation exists,
  // otherwise do nothing — then fetch the existing row.
  await query(
    `INSERT INTO conversations (user_phone_hash, lang_detected, status)
     VALUES ($1, $2, 'bot')
     ON CONFLICT (user_phone_hash) DO NOTHING`,
    [phoneHash, lang]
  );

  const res = await query(
    `SELECT id FROM conversations WHERE user_phone_hash = $1 AND status = 'bot' ORDER BY created_at DESC LIMIT 1`,
    [phoneHash]
  );

  return res.rows[0].id;
}

/**
 * Log a message to the DB
 */
async function logMessage(conversationId, direction, content, msgType, faqId, confidence) {
  try {
    await query(
      `INSERT INTO messages (conversation_id, direction, content, msg_type, faq_matched_id, confidence)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [conversationId, direction, content, msgType, faqId || null, confidence || null]
    );
  } catch (err) {
    logger.error('Message log error:', err.message);
  }
}

/**
 * Perform escalation and update session
 */
async function doEscalation({ phone, phoneHash, session, conversationId, lang }) {
  try {
    await escalationService.triggerEscalation({
      phone,
      phoneHash,
      session,
      conversationId,
      lang,
    });

    session.is_escalated = true;
    session.agent_notified = true;

    await logMessage(conversationId, 'out', '[ESCALATED]', 'system', null, null);
    await query(`UPDATE conversations SET status = 'escalated' WHERE id = $1`, [conversationId]);
  } catch (err) {
    logger.error('Escalation error in handler:', err.message);
  }
}

module.exports = { verifyWebhook, handleWebhook };
