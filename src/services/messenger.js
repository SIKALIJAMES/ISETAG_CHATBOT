'use strict';
const fetch = require('node-fetch');

const FB_BASE_URL = 'https://graph.facebook.com/v20.0';

/**
 * Send a text message via Messenger Send API
 */
async function sendTextMessage(recipientId, text) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('[MESSENGER] Missing Page Access Token');
    return;
  }

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[MESSENGER] API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[MESSENGER] Fetch error:', err.message);
  }
}

/**
 * Send an image via Messenger Send API (using a public URL)
 */
async function sendImageMessage(recipientId, imageUrl) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) return;

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[MESSENGER] Image API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[MESSENGER] Image Send error:', err.message);
  }
}

/**
 * Send a file/document via Messenger Send API (using a public URL)
 */
async function sendDocumentMessage(recipientId, docUrl) {
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  if (!token) return;

  try {
    const response = await fetch(`${FB_BASE_URL}/me/messages?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'file',
            payload: {
              url: docUrl,
              is_reusable: true
            }
          }
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[MESSENGER] Document API Error:', JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('[MESSENGER] Document Send error:', err.message);
  }
}

module.exports = {
  sendTextMessage,
  sendImageMessage,
  sendDocumentMessage
};
