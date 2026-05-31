'use strict';
const { searchRelevant } = require('./embeddings');
const { franc }          = require('franc');

// Rate limiting — 20 msgs/minute per phone
const rateLimitMap = {};
function isRateLimited(phone) {
  const now = Date.now();
  if (!rateLimitMap[phone] || now > rateLimitMap[phone].resetAt) {
    rateLimitMap[phone] = { count: 1, resetAt: now + 60000 };
    return false;
  }
  rateLimitMap[phone].count++;
  return rateLimitMap[phone].count > 20;
}

/**
 * Detect language from text.
 * Returns 'en', 'fr', or null (undecided — too short).
 * Uses franc for longer texts, keyword regex for short texts.
 */
function detectLanguage(text) {
  if (!text || text.trim().length < 4) return null;

  // Try franc first on longer texts
  if (text.trim().length >= 10) {
    const detected = franc(text, { minLength: 5 });
    if (detected === 'eng') return 'en';
    if (detected === 'fra') return 'fr';
  }

  // Keyword fallback for short/ambiguous texts
  const enPattern = /\b(hi|hello|hey|yes|no|please|thanks|thank|what|where|how|when|who|why|can|is|are|i|my|the|a|an|and|or|for|in|of|to|with|you|we|do|does|have|has|this|that|from|about|want|need|get|good|great|ok|okay|sure|sorry|help|pls|send|tell|show|its|it|am|at|by|if|so|but|been|not|more|some|all)\b/i;
  const frPattern = /\b(bonjour|bonsoir|salut|oui|non|merci|comment|quand|pourquoi|qui|quoi|je|tu|il|nous|vous|ils|mon|ma|mes|ton|ta|ses|est|sont|avoir|être|faire|aller|vouloir|pouvoir|savoir|voir|venir|votre|notre|leur|avec|pour|dans|sur|par|au|aux|du|des|les|une|ça|que|qui|mais|ou|donc|or|ni|car|bien|très|plus|aussi|encore|même)\b/i;

  if (enPattern.test(text) && !frPattern.test(text)) return 'en';
  if (frPattern.test(text) && !enPattern.test(text)) return 'fr';

  // Both or neither → return null (keep previously stored lang)
  return null;
}

/**
 * Main AI Agent — Processes a WhatsApp message and returns a reply.
 * @param {string} phone        - User's phone number
 * @param {string} userText     - The message they sent
 * @param {string} storedLang   - Language retrieved from Redis/DB (persists redeployments)
 * @param {Array}  history      - Last 15 messages from Redis
 */
async function processMessage(phone, userText, storedLang, history = []) {
  // Rate limit check
  if (isRateLimited(phone)) {
    return {
      text: '⏳ Vous envoyez trop de messages. Veuillez patienter 1 minute. / You are sending too many messages. Please wait 1 minute.',
      lang: storedLang || 'fr',
      needsEscalation: false,
    };
  }

  // ── Language resolution ────────────────────────────────────────────────
  // Priority: detected from current message > stored from Redis/DB > French default
  const detectedLang = detectLanguage(userText);
  const lang = detectedLang || storedLang || 'fr';
  const isEnglish = lang === 'en';

  console.log(`[AI-AGENT] 🌐 Lang for ...${phone.slice(-4)}: ${lang} (detected=${detectedLang}, stored=${storedLang})`);

  try {
    // ── RAG: Find relevant knowledge base chunks ───────────────────────
    let context = '';
    try {
      const chunks = await searchRelevant(userText, 5);
      if (chunks.length > 0) {
        context = chunks.map(c => c.content).join('\n---\n');
        console.log(`[AI-AGENT] 🔍 RAG: ${chunks.length} chunks found`);
      }
    } catch (ragErr) {
      console.warn('[AI-AGENT] RAG unavailable (knowledge base may be empty):', ragErr.message);
    }

    // ── System prompt ─────────────────────────────────────────────────
    const isFirstMessage = history.length === 0;
    const systemPrompt = `You are the official virtual orientation advisor for ISETAG (Institut Supérieur Évangélique des Technologies Appliquées et de Gestion) in Douala, Cameroon.

## 🚨 RULE #1 — LANGUAGE (NON-NEGOTIABLE):
The student's language is: **${isEnglish ? 'ENGLISH 🇬🇧' : 'FRENCH 🇫🇷'}**
You MUST respond 100% in ${isEnglish ? 'ENGLISH' : 'FRENCH'}.
NEVER mix languages. NEVER switch. This overrides all other rules.

## 🚨 RULE #2 — LENGTH (NON-NEGOTIABLE):
- Keep responses SHORT and FOCUSED — maximum 3-4 bullet points or 2-3 short paragraphs.
- WhatsApp readers scan quickly. Long walls of text are ignored.
- If asked something simple → answer simply. Don't list everything ISETAG offers every time.

## 🚨 RULE #3 — GREETING:
${isFirstMessage
  ? '- This is the FIRST message. Greet briefly (1 line max) then answer.'
  : '- This is an ONGOING conversation. DO NOT say Bonjour/Hello again. Jump straight to the answer.'}

## YOUR ROLE:
Warm, persuasive orientation counselor. Goals:
1. Answer the student's specific question accurately
2. Highlight 1-2 relevant ISETAG strengths (don't repeat the same ones every time)
3. End with ONE clear call-to-action or open question

## ISETAG KEY FACTS (Douala, Cameroon):
- 📍 Location: Yassa, Douala — 300m from TRADEX Yassa (between TRADEX and Gynéco-Obstétrique Hospital)
- 🎓 Programs: Software Engineering, Networks & Telecoms, Business Management, Digital Marketing, Maritime & Port Management, Civil Engineering, Mechanical Engineering, QHSE, HR, Accounting
- 📋 Admission: Open to Baccalauréat / GCE A-Level holders. No entrance exam (except Maritime). No minimum grade. Rolling admissions.
- 🏅 Degrees: BTS → Licence → Master. All State-recognized (MINESUP), under University of Douala supervision.
- 🕒 Schedules & Fees:
  * BTS Level 1 & 2: Available in BOTH Day classes (Cours du jour) and Evening classes (Cours du soir). The tuition fees DIFFER between Day and Evening classes.
  * Level 3 (Licence) & Master: Available ONLY in Evening classes (Cours du soir). Fees are fixed.
  * Maritime & Port Programs: Available ONLY in Day classes (Cours du jour) for all levels.
- ⚓ Maritime: Double degree (2 yrs Cameroon + 2 yrs in Ghana/China), 100% job placement, STCW 95, free English/Chinese courses.
- 📞 Contacts: +237 676 079 849 / 690 609 511 / 659 855 800
- 🌐 Website: www.isetag.cm

${context ? `\n## 📚 KNOWLEDGE BASE (use this for precise answers):\n${context}` : ''}`;

    // ── Build conversation for Gemini ─────────────────────────────────
    const fetch    = require('node-fetch');
    const contents = [];
    for (const h of history) {
      contents.push({
        role:  h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: userText }] });

    // ── Call Gemini 2.5 Flash ─────────────────────────────────────────
    // FIX #3: maxOutputTokens reduced from 1500 → 700 for shorter, focused WhatsApp responses
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature:      0.6,  // Slightly lower = more consistent, less "creative" off-topic
            maxOutputTokens:  700,  // Was 1500 → now 700 for WhatsApp-friendly length
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[AI-AGENT] ✅ Response: ${aiResponse.length} chars | lang: ${lang}`);

    return { text: aiResponse, lang, needsEscalation: false };

  } catch (err) {
    console.error('[AI-AGENT] Error:', err.message);
    return {
      text: isEnglish
        ? '😔 I encountered a technical issue. Our team will follow up with you shortly.'
        : '😔 Une erreur technique est survenue. Notre équipe vous contactera bientôt.',
      lang,
      needsEscalation: true,
    };
  }
}

module.exports = { processMessage };
