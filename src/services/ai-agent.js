'use strict';
const { searchRelevant } = require('./embeddings');
const { franc } = require('franc');
const fetch = require('node-fetch');

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
 */
function detectLanguage(text) {
  if (!text || text.trim().length < 4) return null;

  if (text.trim().length >= 10) {
    const detected = franc(text, { minLength: 5 });
    if (detected === 'eng') return 'en';
    if (detected === 'fra') return 'fr';
  }

  const enPattern = /\b(hi|hello|hey|yes|no|please|thanks|thank|what|where|how|when|who|why|can|is|are|i|my|the|a|an|and|or|for|in|of|to|with|you|we|do|does|have|has|this|that|from|about|want|need|get|good|great|ok|okay|sure|sorry|help|pls|send|tell|show|its|it|am|at|by|if|so|but|been|not|more|some|all)\b/i;
  const frPattern = /\b(bonjour|bonsoir|salut|oui|non|merci|comment|quand|pourquoi|qui|quoi|je|tu|il|nous|vous|ils|mon|ma|mes|ton|ta|ses|est|sont|avoir|etre|faire|aller|vouloir|pouvoir|savoir|voir|venir|votre|notre|leur|avec|pour|dans|sur|par|au|aux|du|des|les|une|ca|que|qui|mais|ou|donc|or|ni|car|bien|tres|plus|aussi|encore|meme)\b/i;

  if (enPattern.test(text) && !frPattern.test(text)) return 'en';
  if (frPattern.test(text) && !enPattern.test(text)) return 'fr';

  return null;
}

/**
 * Main AI Agent — Processes a WhatsApp/Messenger message and returns a reply.
 * Uses Groq API (Llama 3.3-70b) — free tier: 14,400 requests/day
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

  // Language resolution
  const detectedLang = detectLanguage(userText);
  const lang = detectedLang || storedLang || 'fr';
  const isEnglish = lang === 'en';

  console.log(`[AI-AGENT] Lang for ...${phone.slice(-4)}: ${lang} (detected=${detectedLang}, stored=${storedLang})`);

  try {
    // RAG: Find relevant knowledge base chunks
    let context = '';
    try {
      const chunks = await searchRelevant(userText, 5);
      if (chunks.length > 0) {
        context = chunks.map(c => c.content).join('\n---\n');
        console.log(`[AI-AGENT] RAG: ${chunks.length} chunks found`);
      }
    } catch (ragErr) {
      console.warn('[AI-AGENT] RAG unavailable:', ragErr.message);
    }

    // System prompt
    const isFirstMessage = history.length === 0;
    const systemPrompt = `You are the official virtual orientation advisor for ISETAG (Institut Superieur Evangelique des Technologies Appliquees et de Gestion) in Douala, Cameroon.

## RULE #1 — LANGUAGE (NON-NEGOTIABLE):
The student's language is: **${isEnglish ? 'ENGLISH' : 'FRENCH'}**
You MUST respond 100% in ${isEnglish ? 'ENGLISH' : 'FRENCH'}.
NEVER mix languages. NEVER switch. This overrides all other rules.

## RULE #2 — LENGTH (NON-NEGOTIABLE):
- Keep responses SHORT and FOCUSED — maximum 3-4 bullet points or 2-3 short paragraphs.
- WhatsApp readers scan quickly. Long walls of text are ignored.
- If asked something simple, answer simply.

## RULE #3 — GREETING:
${isFirstMessage
    ? `- This is the FIRST message from this prospect. Their name is UNKNOWN.
- Start with a warm 1-line welcome, then IMMEDIATELY ask for their first name before anything else.
- Example: "Bienvenue a l'ISETAG ! Je suis votre conseiller virtuel. Pour mieux vous accompagner, puis-je avoir votre prenom ?"
- Do NOT answer any other question yet. Wait for the name first.`
    : prospectName
      ? `- This is an ONGOING conversation. The prospect's name is: **${prospectName}**. Use their name naturally. DO NOT say Bonjour/Hello again.`
      : `- This is an ONGOING conversation. You do NOT yet know their name. If they just gave it, extract and use it. Otherwise, weave in a polite request at the end.`}

## RULE #4 — NAME EXTRACTION (CRITICAL):
At the END of your response, on a new line, you MUST output:
<NAME_DETECTED>null</NAME_DETECTED>  if you did not detect a name
<NAME_DETECTED>Jean</NAME_DETECTED>  if the user just told you their first name
Only extract a first name (1-2 words max). If unsure, output null.

## YOUR ROLE:
Warm, persuasive orientation counselor. Goals:
1. Answer the student's specific question accurately
2. Highlight 1-2 relevant ISETAG strengths
3. End with ONE clear call-to-action or open question

## ISETAG KEY FACTS (Douala, Cameroon):
- Location: Yassa, Douala — 300m from TRADEX Yassa
- Programs: Software Eng, Hardware Maint., Networks, IIA, Petroleum, Civil Eng, Electrical, Mechanical, Automotive AI, Mechatronics, Assistant Manager, HR, Logistics, Accountancy, Banking, Marketing, Trade-Sale, Port Shipping, Marine Eng, Fisheries, Nautical Sciences, Aquaculture.
- Admission File (BTS): Bac/GCE A-Level, Pre-registration form, Birth cert, Diploma, Medical cert, 4x4 photos, ID. File study: 10,000 CFA. No entrance exam (except Maritime).
- Admission File (LICENCE): Handwritten request, Registration form, Certified copies of Birth cert, BTS/Equivalent, Bac transcripts, ID, two 4x4 photos, CV, Stamped A4 envelope.
- Degrees: HND/BTS (2 yrs) then Bachelor/Licence (1 yr) then Master. State-recognized (MINESUP).
- BTS Fees (Reg fee: 30,000 FCFA):
  * Industry & Tech: Day 395k (Tranches: 200k, 150k, 45k) | Evening 285k (Tranches: 150k, 100k, 35k).
  * Business & Mgt: Day 315k (Tranches: 150k, 100k, 65k) | Evening 235k (Tranches: 130k, 80k, 25k).
- LICENCE (Evening ONLY, Reg fee: 55,000 FCFA): Industry/Tech/Commerce 550k | Applied Mgt 500k.
- Maritime (Day ONLY, 4-yr): Reg fee 55k (National)/105k (Foreign). National tuition: 755k. Foreign: 1,005k.
- Advantages: Scholarships (30,000 to 100,000 FCFA) from partners, 7% discount for first 100 students! Free student minibus, University hostel (water, electricity, WIFI included), high-speed internet.
- International Partners: Nuertingen Geislingen Univ. & Esslingen Univ. (Germany), Shanghai Ocean Univ. (China), Regional Maritime Univ. (Ghana).
- Maritime Specifics: Admission by file study ONLY. Deadline: Sept 16. Double degree (2 yrs Cameroon + 2 yrs Ghana/China), STCW 95 certification, free English/Chinese courses, free uniforms.
- Academic Excellence: 89.23% Global Success Rate in 2024. Ranked 4th National by MINESUP (2021). 100% pass rate in Software Engineering, Networks, IIA, Accounting, Logistics, and Marketing!
- Contacts: +237 676 079 849 / 690 609 511 / 659 855 800
- Website: www.isetag.cm

${context ? `\n## KNOWLEDGE BASE (use this for precise answers):\n${context}` : ''}`;

    // Build messages in OpenAI/Groq format
    const messages = [{ role: 'system', content: systemPrompt }];
    for (const h of history) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    }
    messages.push({ role: 'user', content: userText });

    // Call Groq API (free tier: 14,400 req/day for llama-3.3-70b-versatile)
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    console.log(`[AI-AGENT] Calling Groq (${groqModel})...`);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages,
        max_tokens: 700,
        temperature: 0.6,
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const rawResponse = data.choices?.[0]?.message?.content || '';

    // Extract <NAME_DETECTED> tag
    const nameMatch = rawResponse.match(/<NAME_DETECTED>(.*?)<\/NAME_DETECTED>/i);
    const detectedName = (nameMatch && nameMatch[1] && nameMatch[1].trim() !== 'null')
      ? nameMatch[1].trim()
      : null;
    const aiResponse = rawResponse.replace(/<NAME_DETECTED>.*?<\/NAME_DETECTED>/gi, '').trim();

    console.log(`[AI-AGENT] Response: ${aiResponse.length} chars | lang: ${lang} | name: ${detectedName || '(none)'}`);

    return { text: aiResponse, lang, needsEscalation: false, detectedName };

  } catch (err) {
    console.error('[AI-AGENT] Error:', err.message);
    return {
      text: isEnglish
        ? 'I encountered a technical issue. Our team will follow up with you shortly.'
        : 'Une erreur technique est survenue. Notre equipe vous contactera bientot.',
      lang,
      needsEscalation: true,
      detectedName: null,
    };
  }
}

module.exports = { processMessage };
