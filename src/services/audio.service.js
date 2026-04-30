'use strict';
const { OpenAI } = require('openai');
const fs = require('fs');
const fetch = require('node-fetch');
const logger = require('../utils/logger');

let openaiClient;

function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Transcribe a WhatsApp voice note using OpenAI Whisper
 * @param {string} mediaId - WhatsApp media ID
 * @param {string} accessToken - WhatsApp access token
 * @returns {string|null} Transcription text or null on failure
 */
async function transcribeAudio(mediaId, accessToken) {
  const tempPath = require('path').join(
    require('os').tmpdir(),
    `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.ogg`
  );

  try {
    // Step 1: Get media download URL from Meta Graph API
    const metaRes = await fetch(
      `https://graph.facebook.com/v20.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!metaRes.ok) {
      throw new Error(`Meta media URL fetch failed: ${metaRes.status}`);
    }

    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;

    if (!downloadUrl) {
      throw new Error('No download URL returned from Meta');
    }

    // Step 2: Download the audio file
    const audioRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!audioRes.ok) {
      throw new Error(`Audio download failed: ${audioRes.status}`);
    }

    const buffer = await audioRes.buffer();
    fs.writeFileSync(tempPath, buffer);

    logger.info(`Audio downloaded: ${buffer.length} bytes → ${tempPath}`);

    // Step 3: Transcribe with Whisper
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: undefined, // Auto-detect language
    });

    const text = transcription.text || '';
    logger.info(`Whisper transcription: "${text.slice(0, 100)}..."`);
    return text;
  } catch (err) {
    logger.error('Audio transcription error:', err.message);
    return null;
  } finally {
    // Always clean up temp file
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        logger.debug(`Temp audio file deleted: ${tempPath}`);
      }
    } catch (cleanupErr) {
      logger.warn('Temp file cleanup failed:', cleanupErr.message);
    }
  }
}

module.exports = { transcribeAudio, getOpenAI };
