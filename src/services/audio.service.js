'use strict';
const fetch = require('node-fetch');

/**
 * Transcribe a WhatsApp voice note using Google Gemini
 * @param {string} mediaId - WhatsApp media ID
 * @param {string} accessToken - WhatsApp access token
 * @returns {string|null} Transcription text or null on failure
 */
async function transcribeAudio(mediaId, accessToken) {
  try {
    console.log(`[AUDIO] Fetching media metadata from Meta for ID: ${mediaId}`);
    
    // Step 1: Get media download URL from Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Meta media URL fetch failed [${metaRes.status}]: ${errText}`);
    }

    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;

    if (!downloadUrl) {
      throw new Error('No download URL returned from Meta');
    }

    console.log('[AUDIO] Downloading WhatsApp audio file...');

    // Step 2: Download the audio file directly into buffer
    const audioRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!audioRes.ok) {
      throw new Error(`Audio download failed [${audioRes.status}]`);
    }

    const buffer = await audioRes.buffer();
    const contentType = audioRes.headers.get('content-type') || 'audio/ogg';
    const cleanMimeType = contentType.split(';')[0];
    
    console.log(`[AUDIO] Audio downloaded successfully: ${buffer.length} bytes (${cleanMimeType})`);

    // Step 3: Call Gemini to transcribe the audio natively (Multimodal)
    console.log('[AUDIO] Calling Gemini for native audio transcription...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: buffer.toString('base64')
              }
            },
            {
              text: "Transcris cette note vocale de manière très précise. Ne renvoie UNIQUEMENT que la transcription brute textuelle. N'ajoute aucune salutation, aucun commentaire, ni aucune introduction. Si l'audio est vide ou incompréhensible, réponds par '[incompréhensible]'."
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanText = text.trim();
    
    if (cleanText.toLowerCase().includes('[incompréhensible]')) {
      console.warn('[AUDIO] Audio marked as incomprehensible by Gemini.');
      return null;
    }

    console.log(`[AUDIO] Gemini native transcription: "${cleanText.slice(0, 100)}..."`);
    return cleanText;
  } catch (err) {
    console.error('[AUDIO] Native WhatsApp transcription error:', err.message);
    return null;
  }
}

/**
 * Transcribe a Facebook Messenger voice note using Google Gemini
 * @param {string} downloadUrl - Messenger audio attachment direct payload URL
 * @returns {string|null} Transcription text or null on failure
 */
async function transcribeMessengerAudio(downloadUrl) {
  try {
    console.log('[AUDIO] Downloading Messenger audio file...');
    
    const audioRes = await fetch(downloadUrl);
    if (!audioRes.ok) {
      throw new Error(`Audio download failed [${audioRes.status}]`);
    }

    const buffer = await audioRes.buffer();
    const contentType = audioRes.headers.get('content-type') || 'audio/mp4';
    const cleanMimeType = contentType.split(';')[0];
    
    console.log(`[AUDIO] Audio downloaded successfully: ${buffer.length} bytes (${cleanMimeType})`);

    // Call Gemini to transcribe
    console.log('[AUDIO] Calling Gemini for native audio transcription...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: buffer.toString('base64')
              }
            },
            {
              text: "Transcris cette note vocale de manière très précise. Ne renvoie UNIQUEMENT que la transcription brute textuelle. N'ajoute aucune salutation, aucun commentaire, ni aucune introduction. Si l'audio est vide ou incompréhensible, réponds par '[incompréhensible]'."
            }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanText = text.trim();
    
    if (cleanText.toLowerCase().includes('[incompréhensible]')) {
      console.warn('[AUDIO] Audio marked as incomprehensible by Gemini.');
      return null;
    }

    console.log(`[AUDIO] Gemini native transcription: "${cleanText.slice(0, 100)}..."`);
    return cleanText;
  } catch (err) {
    console.error('[AUDIO] Native Messenger transcription error:', err.message);
    return null;
  }
}

module.exports = {
  transcribeAudio,
  transcribeMessengerAudio
};
