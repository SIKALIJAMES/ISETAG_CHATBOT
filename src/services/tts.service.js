'use strict';
const fetch = require('node-fetch');

/**
 * Generate Speech MP3 Buffer from Text using Google TTS (Free Translation API)
 * @param {string} text - The text to speak
 * @param {string} lang - Language code ('fr' or 'en')
 * @returns {Promise<Buffer>} MP3 Audio buffer
 */
async function textToSpeech(text, lang = 'fr') {
  try {
    // Truncate to 180 characters to respect Google Translate API length limits safely
    let cleanText = text.trim();
    if (cleanText.length > 180) {
      cleanText = cleanText.slice(0, 180) + '...';
    }

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${lang}&client=tw-ob`;
    console.log(`[TTS] Synthesizing audio for text (${cleanText.length} chars) in lang: ${lang}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Google TTS API returned status: ${response.status}`);
    }

    const buffer = await response.buffer();
    return buffer;
  } catch (err) {
    console.error('[TTS] Synthesis failed:', err.message);
    throw err;
  }
}

module.exports = { textToSpeech };
