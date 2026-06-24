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
    const cleanedText = userText.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const isGreeting = /^(bonjour|bonsoir|salut|hello|hi|hey|yo|salutations)$/i.test(cleanedText) || 
                       (cleanedText.length < 25 && /^(bonjour|bonsoir|salut|hello|hi|hey|yo|salutations)\b/i.test(cleanedText));

    let greetingRule = '';
    if (isGreeting) {
      if (prospectName) {
        greetingRule = `- The user has sent a simple greeting. Respond with a simple, polite greeting back using their name: **${prospectName}** (e.g., "Bonjour ${prospectName} ! Comment puis-je vous aider aujourd'hui ?").
- DO NOT list programs, do NOT pitch the school strengths, and do NOT include any links (such as the website link) in your response. Keep it strictly to the greeting and a simple, friendly question.`;
      } else {
        greetingRule = `- The user has sent a simple greeting. Respond with a simple, polite greeting and ask for their first name.
- Example: "Bonjour ! Je suis votre conseiller virtuel. Pour mieux vous accompagner, puis-je avoir votre prenom ?"
- DO NOT list programs, do NOT pitch the school strengths, and do NOT include any links (such as the website link) in your response. Keep it strictly to the greeting and asking for their first name.`;
      }
    } else if (isFirstMessage) {
      greetingRule = `- This is the FIRST message from this prospect. Their name is UNKNOWN.
- Start with a warm 1-line welcome, then IMMEDIATELY ask for their first name before anything else.
- Example: "Bienvenue a l'ISETAG ! Je suis votre conseiller virtuel. Pour mieux vous accompagner, puis-je avoir votre prenom ?"
- Do NOT answer any other question yet. Wait for the name first.`;
    } else if (prospectName) {
      greetingRule = `- This is an ONGOING conversation. The prospect's name is: **${prospectName}**. Use their name naturally. DO NOT say Bonjour/Hello again.`;
    } else {
      greetingRule = `- This is an ONGOING conversation. You do NOT yet know their name. If they just gave it, extract and use it. Otherwise, weave in a polite request at the end.`;
    }

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
${greetingRule}

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
4. Do NOT repeat the website link (https://www.isetag.cm) in every message. Only include it when the user explicitly asks for the website, or when discussing online registration or application forms. Otherwise, omit the link.

## ISETAG KEY FACTS (Douala, Cameroon):

### 🏫 IDENTITY
- Full name: Institut Supérieur Évangélique des Technologies Appliquées et de Gestion (ISETAG)
- Founded: 2015 (10 years of training)
- Location: Between Tradex Yassa and the Hôpital Gynéco-Obstétrique et Pédiatrique de Douala — accessible by moto-taxi or taxi (100–200 FCFA)
- Type: Private, serious, committed higher education institution under the University of Douala and FSEGA (for management programs)
- Recognition: Diplomas (BTS, HND, Licence, Bachelor, Master) recognized nationally (MINESUP) and internationally — accepted by universities in Africa and Europe
- Languages: Fully bilingual — French-medium section AND English-medium section

### 📚 TRAINING CYCLES
BTS | HND | Licence | Bachelor Degree | Master

### 🎓 DOMAINS & SPECIALITIES

**1. Commerce – Gestion – Droit**
Marketing | Commerce et vente | Commerce international | Douane et transit
(Students learn: sales, negotiation, administration, time management, law)

**2. Technologies de l'Information et de la Communication (TIC)**
Génie logiciel | Infographie & Web Design | E-commerce | Marketing numérique | Intelligence artificielle
(Students learn: programming, network management, cybersecurity, modern digital tools)

**3. Industrie et Technologie**
Mécatronique | Menuiserie-Ébénisterie | Énergies renouvelables (solaire)
(Students learn: machine maintenance, fault detection, equipment repair, safety)

**4. Sciences Portuaires et Maritimes**
Électromécanique navale | Gestion logistique portuaire et maritime | Sciences nautiques
(Students learn: port supervision, vessel operations, transport/customs documents, maritime English)

### 💰 FEES (indicative — confirm at registration)
- BTS Reg fee: 30,000 FCFA
  * Industry & Tech: Day 395k (Tranches: 200k, 150k, 45k) | Evening 285k (Tranches: 150k, 100k, 35k)
  * Business & Mgt: Day 315k (Tranches: 150k, 100k, 65k) | Evening 235k (Tranches: 130k, 80k, 25k)
- LICENCE (Evening ONLY, Reg fee: 55,000 FCFA): Industry/Tech/Commerce 550k | Applied Mgt 500k
- Maritime (Day ONLY, 4-yr): Reg fee 55k (National) / 105k (Foreign). Tuition: 755k (National) / 1,005k (Foreign)
- Flexible payment: fees can be paid in multiple installments (moratoire available for financial difficulties)

### 🌍 INTERNATIONAL PARTNERS
- 🇪🇸 Spain: EEMI
- 🇹🇳 Tunisia: IAHF & Université Montplaisir Tunis
- 🇬🇭 Ghana: Regional Maritime University of Ghana
- 🇨🇳 China: Shanghai Ocean University

### 🏢 EMPLOYER PARTNERS (recruit ISETAG students annually)
Sinotruck | CEL'OR | TRANSIMEX | FIGEC | CANOCAM | SOTRABUS

### 🎁 KEY ADVANTAGES
- 🚌 Free student bus service within Douala to campus
- 🏠 University hostel: furnished rooms with WiFi, water & electricity included
- 📋 Day courses (8h–17h) OR Evening courses (17h30–21h30) — choose your schedule
- 🎓 300+ free academic internships via partner companies
- 💻 5+ air-conditioned multimedia labs, high-speed internet campus-wide
- 📚 Spacious, well-stocked library
- 🔬 Laboratories: Electrotechnics & Renewable Energies
- 🏛️ 30+ spacious, clean, ventilated classrooms + air-conditioned amphitheatres + canteens
- 🏆 Official BTS & HND exam sub-center (practical & theoretical)
- 💸 Partner scholarships: 30,000 to 100,000 FCFA available through partner institutions
- 🎓 Linguistic scholarship: new bacheliers (nouveaux bacheliers) can benefit from a 50,000 FCFA linguistic scholarship to help with language learning, international preparation, and job market competitiveness

### 📋 ADMISSION
- BTS/HND: Bac or GCE A-Level, pre-registration form, birth cert, diploma, medical cert, 4 photos, ID. File fee: 10,000 FCFA. No entrance exam (except Maritime).
- Licence: Handwritten request, registration form, BTS/equivalent certified copies, bac transcripts, ID, 2 photos, CV, stamped A4 envelope. Reg fee: 55,000 FCFA.
- Maritime: File study ONLY. Deadline: September 16. Double degree possible (2 yrs Cameroon + 2 yrs Ghana/China), STCW 95 certification.

### 🏅 ACADEMIC EXCELLENCE
- 89.23% global success rate (2024)
- Ranked 4th nationally by MINESUP (2021)
- 100% pass rate in: Software Engineering, Networks, Accounting, Logistics, Marketing

### 📞 CONTACTS
- Phones: +237 676 079 849 / 690 609 511 / 659 855 800
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
