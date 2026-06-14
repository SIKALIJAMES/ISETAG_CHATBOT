'use strict';
const { searchRelevant } = require('./embeddings');
const { franc } = require('franc');

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
 * @param {string} prospectName - Prospect's first name (from Redis), or null if unknown
 */
async function processMessage(phone, userText, storedLang, history = [], prospectName = null) {
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
        ? `- This is the FIRST message from this prospect. Their name is UNKNOWN.
- Start with a warm 1-line welcome, then IMMEDIATELY ask for their first name before anything else.
- Example: "Bienvenue à l'ISETAG ! Je suis votre conseiller virtuel. 😊 Pour mieux vous accompagner, puis-je avoir votre prénom ?"
- Do NOT answer any other question yet. Wait for the name first.`
        : prospectName
          ? `- This is an ONGOING conversation. The prospect's name is: **${prospectName}**. Use their name naturally in your replies (not every sentence, but warmly). DO NOT say Bonjour/Hello again.`
          : `- This is an ONGOING conversation. You do NOT yet know their name. If they just gave you their name in this message, extract it and use it immediately. Otherwise, weave in a polite request for their name at the end of your answer.`}

## 🚨 RULE #4 — NAME EXTRACTION (CRITICAL):
At the END of your response, on a new line, you MUST output a JSON tag like this:
<NAME_DETECTED>null</NAME_DETECTED>  ← if you did not detect a name in the user's message
<NAME_DETECTED>Jean</NAME_DETECTED>  ← if the user just told you their first name
Only extract a first name (1-2 words max). If unsure, output null.

## YOUR ROLE:
Warm, persuasive orientation counselor. Goals:
1. Answer the student's specific question accurately
2. Highlight 1-2 relevant ISETAG strengths (don't repeat the same ones every time)
3. End with ONE clear call-to-action or open question

## ISETAG KEY FACTS (Douala, Cameroon):
- 📍 Location: Yassa, Douala — 300m from TRADEX Yassa (between TRADEX and Gynéco-Obstétrique Hospital)
- 🎓 Programs & Specialties: 
  * Industry & Tech: Software Eng, Hardware Maint., Networks & Telecoms, IIA, Petroleum & Mining (Drilling), Civil Eng (Wood Works, Urban Planning), Electrical Power, Mechanical Eng, Automotive AI, Mechatronics.
  * Business & Management: Assistant Manager, HR, Logistics & Transport, Accountancy, Banking & Finance, Marketing, Trade-Sale.
  * Maritime & Port: Port Shipping Admin, Marine Eng, Marine Fisheries, Nautical Sciences, Aquaculture.
- 📋 Admission File (Constitution du dossier):
  * BTS: Baccalaureate/GCE A-Level, Pre-registration form, Birth cert copy, Diploma copy, Medical cert (<3 months), 4x4 photos, ID copy. File study: 10,000 CFA. No entrance exam (except Maritime).
  * LICENCE: Handwritten request, Registration form, Certified copies of Birth cert, BTS/Equivalent, Bac & transcripts, ID copy, two 4x4 photos, CV, Stamped A4 envelope.
- 🏅 Degrees: HND/BTS (2 yrs) → Bachelor/Licence (1 yr) → Master. State-recognized (MINESUP), University of Douala supervision.
- 🕒 Schedules & Fees (Tranches = Oct, Nov, Feb):
  * BTS (Level 1 & 2): Reg. fee: 30,000 FCFA. 
    - Industry & Tech: Day 395k (Tranches: 200k, 150k, 45k) | Evening 285k (Tranches: 150k, 100k, 35k).
    - Business & Mgt: Day 315k (Tranches: 150k, 100k, 65k) | Evening 235k (Tranches: 130k, 80k, 25k).
  * LICENCE (Evening ONLY): Reg. fee: 55,000 FCFA. Industry, Tech & Commerce: 550k (Tranches: 300k, 150k, 100k). Applied Management: 500k (Tranches: 250k, 150k, 100k).
  * Maritime & Port (Day ONLY, 4-yr duration): File study fee: 10,000 FCFA. Reg. fee: 55k (National) / 105k (Foreign).
    - National Tuition: 755,000 FCFA (Tranches: Sept 320k, Nov 250k, Feb 130k).
    - Foreign Tuition: 1,005,000 FCFA (Tranches: Sept 440k, Nov 330k, Feb 130k).
- 🎁 Advantages & Student Life: Scholarships (30,000 to 100,000 FCFA) from partners, 7% discount for first 100 students! Free student minibus, University hostel available (water, electricity, WIFI included), high-speed internet.
- 🌍 International Partners: Nuertingen Geislingen Univ. & Esslingen Univ. (Germany), Shanghai Ocean Univ. (China), Regional Maritime Univ. (Ghana).
- ⚓ Maritime Specifics: Admission by file study ONLY (no exam). Deadline: Sept 16. Double degree (2 yrs in Cameroon + 2 yrs Ghana/China), STCW 95 certification, free English/Chinese courses, free uniforms (cap + jacket).
- 🏆 Academic Excellence (Selling points): 89.23% Global Success Rate in 2024 (94.11% for HND, 88.93% for BTS). Officially ranked 4th National in its category & 5th National Overall by MINESUP (2021). 100% pass rate in Software Engineering, Networks, IIA, Accounting, Logistics, and Marketing!
- 📞 Contacts: +237 676 079 849 / 690 609 511 / 659 855 800
- 🌐 Website: www.isetag.cm

${context ? `\n## 📚 KNOWLEDGE BASE (use this for precise answers):\n${context}` : ''}`;

    // ── Build conversation for Gemini ─────────────────────────────────
    const fetch = require('node-fetch');
    const contents = [];
    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }
    contents.push({ role: 'user', parts: [{ text: userText }] });

    // ── Call Gemini Model ─────────────────────────────────────────
    // FIX #3: maxOutputTokens reduced from 1500 → 700 for shorter, focused WhatsApp responses
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.6,  // Slightly lower = more consistent, less "creative" off-topic
            maxOutputTokens: 700,  // Was 1500 → now 700 for WhatsApp-friendly length
          }
        })
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // ── Extract <NAME_DETECTED> tag from AI response ──────────────────
    const nameMatch = rawResponse.match(/<NAME_DETECTED>(.*?)<\/NAME_DETECTED>/i);
    const detectedName = (nameMatch && nameMatch[1] && nameMatch[1].trim() !== 'null')
      ? nameMatch[1].trim()
      : null;
    // Strip the tag from the visible reply
    const aiResponse = rawResponse.replace(/<NAME_DETECTED>.*?<\/NAME_DETECTED>/gi, '').trim();

    console.log(`[AI-AGENT] ✅ Response: ${aiResponse.length} chars | lang: ${lang} | name: ${detectedName || '(none)'}`);

    return { text: aiResponse, lang, needsEscalation: false, detectedName };

  } catch (err) {
    console.error('[AI-AGENT] Error:', err.message);
    return {
      text: isEnglish
        ? '😔 I encountered a technical issue. Our team will follow up with you shortly.'
        : '😔 Une erreur technique est survenue. Notre équipe vous contactera bientôt.',
      lang,
      needsEscalation: true,
      detectedName: null,
    };
  }
}

module.exports = { processMessage };
