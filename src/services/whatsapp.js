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

/**
 * Upload an audio buffer to Meta and send it as a voice note
 */
async function sendAudioMessage(to, audioBuffer) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('[WHATSAPP] Missing credentials for audio send');
    return;
  }

  try {
    // Step 1: Upload media buffer to Meta Graph Media API
    console.log('[WHATSAPP] Uploading audio buffer to Meta Media API...');
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const header = `--${boundary}\r\n` +
                   `Content-Disposition: form-data; name="file"; filename="voice.mp3"\r\n` +
                   `Content-Type: audio/mpeg\r\n\r\n`;
    const footer = `\r\n--${boundary}\r\n` +
                   `Content-Disposition: form-data; name="messaging_product"\r\n\r\n` +
                   `whatsapp\r\n` +
                   `--${boundary}--\r\n`;
                   
    const body = Buffer.concat([
      Buffer.from(header, 'utf8'),
      audioBuffer,
      Buffer.from(footer, 'utf8')
    ]);

    const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body
    });

    const uploadResult = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(`Meta Media Upload failed: ${JSON.stringify(uploadResult)}`);
    }

    const mediaId = uploadResult.id;
    console.log(`[WHATSAPP] Media uploaded successfully, ID: ${mediaId}`);

    // Step 2: Send the audio message using the media ID
    const sendRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'audio',
        audio: { id: mediaId },
      }),
    });

    const sendResult = await sendRes.json();
    if (!sendRes.ok) {
      console.error('[WHATSAPP] Audio Send Error:', JSON.stringify(sendResult));
    } else {
      console.log('[WHATSAPP] Audio message sent successfully');
    }
    return sendResult;
  } catch (err) {
    console.error('[WHATSAPP] sendAudioMessage error:', err.message);
  }
}

module.exports = { sendTextMessage, sendAudioMessage };
