'use strict';
const { searchRelevant } = require('./embeddings');
const { franc } = require('franc');

// Rate limiting (20 msgs/minute per phone)
const rateLimitMap = {};
function isRateLimited(phone) {
  const now = Date.now();
  if (!rateLimitMap[phone]) { rateLimitMap[phone] = { count: 1, resetAt: now + 60000 }; return false; }
  if (now > rateLimitMap[phone].resetAt) { rateLimitMap[phone] = { count: 1, resetAt: now + 60000 }; return false; }
  rateLimitMap[phone].count++;
  return rateLimitMap[phone].count > 20;
}

// In-memory language memory per phone (persists across messages until server restart)
// For multi-instance setups this should go to Redis, but works perfectly on Railway single instance
const langMemory = {};

/**
 * Detect language from text using franc.
 * Returns 'en' or 'fr'. Defaults to 'fr' if undecided.
 */
function detectLanguage(text) {
  if (!text || text.trim().length < 5) return null; // Too short to detect reliably
  const detected = franc(text, { minLength: 3 });
  // franc returns ISO 639-3 codes: 'eng' = English, 'fra' = French
  if (detected === 'eng') return 'en';
  if (detected === 'fra') return 'fr';
  // For short English-looking words, do a simple keyword check
  const enWords = /\b(hi|hello|hey|yes|no|please|thanks|what|where|how|when|who|can|is|are|i|my|the|a|an|and|or|for|in|of|to|with|you|we|do|does|have|has|this|that|from|about|want|need|get|good|great|ok|okay|sure|sorry|help)\b/i;
  if (enWords.test(text)) return 'en';
  return 'fr'; // Default to French
}

/**
 * Main AI Agent — Processes a message and returns a reply
 */
async function processMessage(phone, userText, passedLang, history = []) {
  // Rate limit check
  if (isRateLimited(phone)) {
    return {
      text: '⏳ Vous envoyez trop de messages. Veuillez patienter 1 minute. / You are sending too many messages. Please wait 1 minute.',
      lang: langMemory[phone] || 'fr',
      needsEscalation: false,
    };
  }

  // ── Language detection & memory ──────────────────────────────────────
  // 1. Detect language from current message
  const detectedLang = detectLanguage(userText);

  // 2. Update language memory: if detected with confidence, store it
  if (detectedLang) {
    langMemory[phone] = detectedLang;
  }

  // 3. Final language = detected > passed > stored > default French
  const lang = detectedLang || passedLang || langMemory[phone] || 'fr';
  langMemory[phone] = lang; // Always keep memory up to date

  console.log(`[AI-AGENT] 🌐 Language for ...${phone.slice(-4)}: ${lang} (detected: ${detectedLang}, stored: ${langMemory[phone]})`);

  try {
    // ── RAG: Semantic search ─────────────────────────────────────────────
    let context = '';
    try {
      const chunks = await searchRelevant(userText, 5);
      if (chunks.length > 0) {
        context = chunks.map(c => c.content).join('\n---\n');
        console.log(`[AI-AGENT] 🔍 Found ${chunks.length} relevant knowledge chunks`);
      }
    } catch (ragErr) {
      console.warn('[AI-AGENT] RAG search failed (knowledge base may be empty):', ragErr.message);
    }

    // ── System prompt ────────────────────────────────────────────────────
    const isEnglish = lang === 'en';
    const systemPrompt = `You are the official virtual orientation and marketing advisor for ISETAG (Institut Supérieur Évangélique des Technologies Appliquées et de Gestion) in Douala, Cameroon.

## YOUR ABSOLUTE #1 RULE — LANGUAGE:
The student's language is: **${isEnglish ? 'ENGLISH 🇬🇧' : 'FRENCH 🇫🇷'}**.
You MUST respond EXCLUSIVELY in ${isEnglish ? 'ENGLISH' : 'FRENCH'}.
NEVER mix languages. NEVER switch to the other language mid-reply.
If the student writes in English → respond 100% in English.
If the student writes in French → respond 100% in French.
This rule OVERRIDES everything else.

## YOUR ROLE:
You are a PERSUASIVE, WARM, and ENGAGING orientation counselor. Your goal is to:
1. Answer the student's question with accurate, helpful information
2. Highlight ISETAG's strengths and get them excited about enrolling
3. Guide them toward the next action: visiting campus, calling, or enrolling

## CONVERSATION MEMORY:
You are in an ONGOING conversation. You have the previous messages below as context.
- DO NOT introduce yourself again if you already did so earlier in the conversation
- DO NOT say "Bonjour/Hello" again after the first message — jump straight to the answer
- Remember what was said before and build naturally on it
- Detect and adapt to the student's needs based on their previous questions

## COMMUNICATION STYLE:
- Warm, dynamic, encouraging, and very persuasive
- Use short bullet points and relevant emojis for WhatsApp readability
- ALWAYS end with a Call-To-Action or open question to move the conversation forward
- Keep responses focused and not overly long — quality over quantity

## ISETAG KEY INFO (Douala, Cameroon):
- Location: Yassa, Douala — 300m from TRADEX Yassa, between TRADEX and the Gynéco-Obstétrique Hospital
- Programs: Software Engineering, Networks & Telecoms, Business Management, Digital Marketing, Maritime & Port Management, Civil Engineering, Mechanical Engineering, QHSE, HR, Accounting
- Admission: Open to all Baccalauréat / GCE A-Level holders. No entrance exam (except Maritime). No minimum grade required. Rolling admissions.
- Degrees: BTS, Licence (Bachelor), Master — all State-recognized (MINESUP) under University of Douala supervision
- Maritime specialty: double degree (2 years Cameroon + 2 years abroad in Ghana or China), 100% job placement rate, STCW 95 certification, free English/Chinese courses, uniforms provided
- Contacts: +237 676 079 849 / 690 609 511 / 659 855 800
- Website: www.isetag.cm

${context ? `\n## KNOWLEDGE BASE CONTEXT (use this to give precise, credible answers):\n${context}` : ''}`;

    // ── Format conversation history for Gemini ───────────────────────────
    const fetch = require('node-fetch');
    const contents = [];
    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: userText }] });

    // ── Call Gemini 2.5 Flash ────────────────────────────────────────────
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.65, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[AI-AGENT] ✅ Response generated (${aiResponse.length} chars, lang: ${lang})`);

    return { text: aiResponse, lang, needsEscalation: false };

  } catch (err) {
    console.error('[AI-AGENT] Processing error:', err.message);
    return {
      text: isEnglish
        ? `😔 An error occurred. Our team will contact you shortly.`
        : `😔 Une erreur est survenue. Notre équipe vous contactera bientôt.`,
      lang,
      needsEscalation: true,
    };
  }
}

module.exports = { processMessage };
