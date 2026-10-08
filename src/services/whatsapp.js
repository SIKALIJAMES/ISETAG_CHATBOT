'use strict';
const fetch = require('node-fetch');

const WA_BASE_URL = 'https://graph.facebook.com/v20.0';

/**
 * Clean markdown and format text properly for WhatsApp:
 * - Converts markdown headers (#, ##, ###) into bold *Title*
 * - Strips markdown dividers (---, ___, ***)
 * - Converts markdown bold (**text** or ***text***) into WhatsApp bold (*text*)
 * - Cleans up stray asterisks and space-padded bold syntax
 * - Normalizes consecutive linebreaks
 */
function formatForWhatsApp(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Remove markdown horizontal rules (e.g. ---, ___, ***)
  cleaned = cleaned.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 2. Convert markdown headers (# Title, ## Title, ### Title) to bold WhatsApp (*Title*)
  cleaned = cleaned.replace(/^[ \t]*#{1,6}\s*(.+)$/gm, '*$1*');

  // 3. Convert triple asterisks (bold + italic) to WhatsApp bold: ***text*** -> *text*
  cleaned = cleaned.replace(/\*\*\*\s*([^\*\n]+?)\s*\*\*\*/g, '*$1*');

  // 4. Convert double asterisks (standard markdown bold) to single asterisks (WhatsApp bold)
  cleaned = cleaned.replace(/\*\*\s*([^\*\n]+?)\s*\*\*/g, '*$1*');

  // 5. Clean up any remaining double asterisks
  cleaned = cleaned.replace(/\*\*/g, '*');

  // 6. Fix WhatsApp bold syntax where space prevents bolding: "* text *" -> "*text*"
  cleaned = cleaned.replace(/(?<=\s|^)\*\s+([^\*\n]+?)\s+\*(?=\s|$)/g, '*$1*');

  // 7. Clean up excessive consecutive blank lines (more than 2 -> 2)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

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

  const formattedText = formatForWhatsApp(text);

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
        text: { body: formattedText },
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

/**
 * Send an image from a public URL
 */
async function sendImageMessage(to, imageUrl, caption = '') {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) return;
  try {
    const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl, caption },
      }),
    });
    const result = await response.json();
    if (!response.ok) console.error('[WHATSAPP] Image send error:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('[WHATSAPP] sendImageMessage error:', err.message);
  }
}

/**
 * Send a document (PDF) from a public URL
 */
async function sendDocumentMessage(to, docUrl, filename, caption = '') {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) return;
  try {
    const response = await fetch(`${WA_BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: { link: docUrl, filename, caption },
      }),
    });
    const result = await response.json();
    if (!response.ok) console.error('[WHATSAPP] Document send error:', JSON.stringify(result));
    return result;
  } catch (err) {
    console.error('[WHATSAPP] sendDocumentMessage error:', err.message);
  }
}

module.exports = { sendTextMessage, sendAudioMessage, sendImageMessage, sendDocumentMessage, formatForWhatsApp };
