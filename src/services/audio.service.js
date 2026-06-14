'use strict';
const fetch = require('node-fetch');

/**
 * Transcribe audio using Groq Whisper API
 * @param {Buffer} buffer - Audio buffer
 * @param {string} filename - Filename with extension (e.g. 'audio.ogg')
 * @returns {string|null} Transcription text or null on failure
 */
async function transcribeWithGroq(buffer, filename) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error('GROQ_API_KEY not configured');

    // Use native Node.js 20 FormData + Blob (no extra package needed)
    const blob = new Blob([buffer], { type: 'audio/ogg' });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    // No language hint — Whisper auto-detects FR/EN perfectly

    console.log(`[AUDIO] Calling Groq Whisper (whisper-large-v3-turbo)...`);

    const res = await globalThis.fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[AUDIO] Groq Whisper error:', JSON.stringify(data));
      throw new Error(data.error?.message || `Groq error ${res.status}`);
    }

    const text = (data.text || '').trim();
    if (!text) return null;

    console.log(`[AUDIO] Groq transcription: "${text.slice(0, 100)}"`);
    return text;

  } catch (err) {
    console.error('[AUDIO] Groq Whisper transcription error:', err.message);
    return null;
  }
}

/**
 * Transcribe a WhatsApp voice note using Groq Whisper
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

    if (!downloadUrl) throw new Error('No download URL returned from Meta');

    console.log('[AUDIO] Downloading WhatsApp audio file...');

    // Step 2: Download the audio file
    const audioRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!audioRes.ok) throw new Error(`Audio download failed [${audioRes.status}]`);

    const buffer = await audioRes.buffer();
    console.log(`[AUDIO] Audio downloaded: ${buffer.length} bytes`);

    // Step 3: Transcribe with Groq Whisper
    return await transcribeWithGroq(buffer, 'audio.ogg');

  } catch (err) {
    console.error('[AUDIO] WhatsApp transcription error:', err.message);
    return null;
  }
}

/**
 * Transcribe a Facebook Messenger voice note using Groq Whisper
 * @param {string} downloadUrl - Messenger audio attachment direct URL
 * @returns {string|null} Transcription text or null on failure
 */
async function transcribeMessengerAudio(downloadUrl) {
  try {
    console.log('[AUDIO] Downloading Messenger audio file...');

    const audioRes = await fetch(downloadUrl);
    if (!audioRes.ok) throw new Error(`Audio download failed [${audioRes.status}]`);

    const buffer = await audioRes.buffer();
    console.log(`[AUDIO] Audio downloaded: ${buffer.length} bytes`);

    // Transcribe with Groq Whisper
    return await transcribeWithGroq(buffer, 'audio.mp4');

  } catch (err) {
    console.error('[AUDIO] Messenger transcription error:', err.message);
    return null;
  }
}

module.exports = {
  transcribeAudio,
  transcribeMessengerAudio
};
