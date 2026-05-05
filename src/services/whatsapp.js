'use strict';
const fetch = require('node-fetch');

const WA_BASE_URL = 'https://graph.facebook.com/v20.0';

/**
 * Send a text message via WhatsApp Cloud API
 */
async function sendTextMessage(to, text) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('[WHATSAPP] Missing credentials');
    return;
  }

  try {
    const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: { body: text },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[WHATSAPP] API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[WHATSAPP] Fetch error:', err.message);
  }
}

module.exports = { sendTextMessage };
