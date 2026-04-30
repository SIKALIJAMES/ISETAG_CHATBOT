'use strict';
const fetch = require('node-fetch');
const { query } = require('../config/db');
const { generateSummary } = require('./faq.service');
const { shortHash } = require('../utils/crypto');
const { escalationUserMessage, escalationAdminMessage } = require('../utils/formatter');
const logger = require('../utils/logger');

const WA_BASE_URL = 'https://graph.facebook.com/v20.0';

/**
 * Send a WhatsApp message via Cloud API
 */
async function sendWhatsAppMessage(payload) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  const res = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error('WhatsApp send error:', err);
    throw new Error(`WhatsApp send failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Trigger escalation flow
 * 1. Summarize conversation
 * 2. Update DB (conversation + session)
 * 3. Notify user
 * 4. Notify admin
 */
async function triggerEscalation({ phone, phoneHash, session, conversationId, lang }) {
  logger.info(`Escalation triggered for ${shortHash(phone)}`);

  try {
    // Step 1: Generate summary
    const summary = await generateSummary(session.history, lang);

    // Step 2: Update DB
    await query(
      `UPDATE conversations SET status = 'escalated', summary = $1 WHERE id = $2`,
      [summary, conversationId]
    );

    // Step 3: Mark session as escalated (caller updates session in Redis)
    session.is_escalated = true;
    session.agent_notified = true;

    // Step 4: Notify user
    const userMsg = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        body: escalationUserMessage(lang, summary),
      },
    };
    await sendWhatsAppMessage(userMsg);

    // Step 5: Notify admin via WhatsApp
    const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminPhone) {
      const adminMsg = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: adminPhone,
        type: 'text',
        text: {
          body: escalationAdminMessage(shortHash(phone), summary, lang),
        },
      };

      try {
        await sendWhatsAppMessage(adminMsg);
        logger.info('Admin escalation notification sent');
      } catch (adminErr) {
        logger.error('Failed to send admin notification:', adminErr.message);
        // Don't throw — user has already been notified
      }
    }

    return { summary, escalated: true };
  } catch (err) {
    logger.error('Escalation flow error:', err.message);
    throw err;
  }
}

module.exports = { triggerEscalation, sendWhatsAppMessage };
