'use strict';
const { searchRelevant } = require('./embeddings');
const { franc } = require('franc');
const fetch = require('node-fetch');
const { formatForWhatsApp } = require('./whatsapp');

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

  // Note: "ok", "okay", "cool" are universal and deliberately excluded from enPattern
  const enPattern = /\b(hi|hello|hey|yes|no|please|thanks|thank|what|where|how|when|who|why|can|is|are|i|my|the|a|an|and|or|for|in|of|to|with|you|we|do|does|have|has|this|that|from|about|want|need|get|good|great|sure|sorry|help|pls|send|tell|show|its|it|am|at|by|if|so|but|been|not|more|some|all)\b/i;
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

  // Language resolution — maintain conversation continuity
  const detectedLang = detectLanguage(userText);
  let lang = storedLang || 'fr';

  if (!storedLang) {
    lang = detectedLang || 'fr';
  } else if (detectedLang && detectedLang !== storedLang) {
    // Only switch language if message is substantial (>= 15 chars) or explicitly asking for a language switch
    const isExplicitSwitch = /\b(speak english|in english|parler anglais|parle anglais|en anglais|parlez français|speak french|in french)\b/i.test(userText);
    if (userText.trim().length >= 15 || isExplicitSwitch) {
      lang = detectedLang;
    }
  }
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

    const preinscriptionUrl = (process.env.APP_URL || 'https://isetagchatbot-production.up.railway.app') + '/preinscription';

    const systemPrompt = `You are the official virtual orientation advisor for ISETAG (Institut Superieur Evangelique des Technologies Appliquees et de Gestion) in Douala, Cameroon.

## RULE #1 — LANGUAGE (NON-NEGOTIABLE):
The student's language is: *${isEnglish ? 'ENGLISH' : 'FRENCH'}*
You MUST respond 100% in ${isEnglish ? 'ENGLISH' : 'FRENCH'}.
NEVER mix languages. NEVER switch unless the user explicitly speaks to you in the other language. This overrides all other rules.

## RULE #2 — LENGTH & STYLE (NON-NEGOTIABLE):
- Keep responses SHORT, NATURAL and FOCUSED — maximum 3-4 bullet points or 2-3 short paragraphs.
- WhatsApp readers scan quickly. Long walls of text are ignored.
- If asked something simple, answer simply without repeating the entire school brochure.

## RULE #3 — GREETING:
${greetingRule}

## RULE #4 — NAME EXTRACTION (CRITICAL):
At the END of your response, on a new line, you MUST output:
<NAME_DETECTED>null</NAME_DETECTED>  if you did not detect a name
<NAME_DETECTED>Jean</NAME_DETECTED>  if the user just told you their first name
Only extract a first name (1-2 words max). If unsure, output null.

## RULE #5 — WHATSAPP FORMATTING (CRITICAL):
- WhatsApp uses single asterisks for bold: *mot en gras* (NEVER use double asterisks **mot**).
- NEVER use markdown headers (# or ## or ###). Use *Titre* instead.
- NEVER use markdown horizontal dividers (---).
- Keep bullet points clean with simple hyphens (- ) or emojis.

## RULE #6 — ANTI-REPETITION & NATURAL DIALOGUE (CRITICAL):
- DO NOT repeat the pre-registration link (${preinscriptionUrl}) in every message!
- ONLY include the pre-registration link when:
  1) The prospect explicitly asks how to register, how to apply, or asks for the link/form.
  2) The student has completed the 9-question orientation quiz and received their recommendation.
  3) The prospect confirms they are ready to enroll or join ISETAG.
- For all other questions (e.g. campus location, school start date/rentrée, tuition fees, student residence/logement, bus, diploma recognition): DO NOT include the pre-registration link! Answer the question cleanly and directly, then ask a simple conversational question.
- NEVER repeat the exact same promotional bullet points (Sinotruck, CEL'OR, 300 stages, bus gratuit) across consecutive responses. Keep the dialogue fresh and focused on the student's question.

## YOUR ROLE:
Warm, persuasive orientation counselor. Goals:
1. Answer the student's specific question accurately and concisely
2. Highlight 1 relevant ISETAG strength when helpful
3. End with ONE clear open question to keep the conversation flowing
4. Do NOT repeat the website link (https://www.isetag.cm) in every message.

## PRE-REGISTRATION POLICY:
The pre-registration form is 100% FREE online at: ${preinscriptionUrl}
- There are NO fees to pre-register. File study (étude de dossier) is completely free for BTS and Licence.
- The 30,000 FCFA registration fee is paid IN PERSON at ISETAG ONLY AFTER the student's file is accepted.

## ORIENTATION QUESTIONNAIRE:
If a student says they don't know which specialty or field to choose (e.g. "je ne sais pas quelle filière", "I'm not sure what to study", "je suis indécis", "help me choose"), DO NOT list all programs. Instead:
- Briefly acknowledge their situation with empathy
- Tell them you have a personalised orientation tool
- Invite them to type "je ne sais pas" or "orientation" to start a short 9-question questionnaire that will recommend the best ISETAG specialty for them.
- Example (FR): "Pas de souci ! 😊 Tape *orientation* ou *je ne sais pas* pour démarrer ton bilan d'orientation personnalisé en 9 questions."
- Example (EN): "No worries! 😊 Type *orientation* or *I don't know* to start your personalised 9-question orientation quiz."

## ISETAG KEY FACTS (Douala, Cameroon):

### 🏫 IDENTITY
- Full name: Institut Supérieur Évangélique des Technologies Appliquées et de Gestion (ISETAG)
- Founded: 2015 (Arrêté N°17/00048/MINESUP & Autorisation N°15/09096/L/MINESUP)
- Founder / Promoteur: Pasteur PAMEN Flaubert
- Location: Yassa, Douala (à 100m de Tradex Yassa en direction de l'Hôpital Gynéco-Obstétrique) — accessible en taxi/moto (100–200 FCFA)
- Type: Établissement supérieur privé d'excellence sous la tutelle de l'Université de Douala (FSEGA)
- Recognition: Diplômes accrédités MINESUP et reconnus à l'international
- Languages: Bilingue intégral (Sections francophone et anglophone)

### 📚 TRAINING CYCLES
BTS | HND | Licences Professionnelles / Bachelor | Masters Professionnels | Cursus Maritime International (4 ans) | Formations Certifiantes (4 à 9 mois)

### 🎓 DOMAINS & SPECIALITIES

**1. Commerce – Gestion – Droit (BTS / HND / Licence / Master)**
Marketing Commerce Vente | Commerce International | Douane et Transit | Banque et Finance | Comptabilité et Gestion | Logistique & Transport | Gestion des Projets | GRH | Fiscalité

**2. Technologies de l'Information et de la Communication (TIC)**
Génie Logiciel | Infographie & Web Design | E-commerce | Marketing Numérique | Intelligence Artificielle | Réseaux et Sécurité Informatique | Maintenance Informatique

**3. Industrie et Technologie**
Génie Civil (Bâtiment & Travaux Publics) | Mécatronique & Automobile | Énergies Renouvelables (Solaire) | Électrotechnique | Chaudronnerie & Soudure | Froid & Climatisation | Menuiserie-Ébénisterie

**4. Sciences Portuaires et Maritimes (4 ans, STCW 95)**
Électromécanique navale | Gestion logistique portuaire et maritime | Sciences nautiques | Pêches maritimes & Aquaculture | Sécurité des plateformes pétrolières (SSPPM)
(Double diplôme Licence + certificat international STCW 95, cours d'anglais/chinois offerts, uniformes offerts, stages garantis)

**5. Formations Certifiantes Express (4 à 9 mois — 75% pratique)**
Formation courte jour/soir pour acquérir un métier d'élite rapidement :
Mécanique auto, Soudure homologuée, Électricité bâtiment/industrielle, Marketing digital, Programmation web/mobile, Infographie 2D/3D, IA, Docker, Chaudronnerie navale, Douane-transit, Comptabilité informatisée.

### 💰 FEES (indicative)
⚠️ ÉTUDE DE DOSSIER :
- Étude de dossier 100% GRATUITE pour BTS, HND, Licence et Certifiant (aucun frais de dépôt).
- Seul le maritime demande 10 000 FCFA de frais d'étude de dossier (nationaux).
- Frais d'inscription BTS/HND : 30 000 FCFA (payés en personne après acceptation).
- Frais d'inscription Licence/Master : 55 000 FCFA.

- BTS/HND Scolarité annuelle (payable en 3 tranches : Rentrée, 30 nov, 28 fév) :
  * Technologie/Industrie : Jour 395k (200k, 150k, 45k) | Soir 285k (150k, 100k, 35k)
  * Commerce/Gestion : Jour 315k (150k, 100k, 65k) | Soir 235k (130k, 80k, 25k)
- LICENCE (Soir) : Technologie 550k | Commerce 500k
- MASTER (Soir) : Technologie 700k | Gestion 675k
- Maritime (Jour 4 ans) : Scolarité 755k / an (Nationaux) | 1 005k / an (Étrangers)

### 🌍 ÉTUDIER À L'ÉTRANGER (PARTENARIATS INTERNATIONAUX)
Formule : 1 à 2 ans à l'ISETAG à Douala, puis poursuite à l'international avec accompagnement visa :
- 🇩🇪 Allemagne : City is Lemgo (Gestion & TIC — niveau BAC / Licence)
- 🇹🇳 Tunisie : Université Montplaisir Tunis & IAHF (Tous domaines / Gestion & TIC — accessible dès le BEPC / Probatoire / BAC !)
- 🇪🇸 Espagne : EEMI (Gestion & TIC — niveau BAC / Licence)
- 🇬🇭 Ghana : Regional Maritime University (Maritime — niveau BAC)
- 🇨🇳 Chine : Shanghai Ocean University (Maritime — niveau BAC)

### 🏢 ENTREPRISES PARTENAIRES (Plus de 50 partenaires)
Sinotruk, CEL'OR, TRANSIMEX, PAD (Port Autonome de Douala), PAK (Port de Kribi), SOTRABUS, UBA, FIGEC, CANOCAM, MSC, Kloe Shipping, SCS...

### 🎁 AVANTAGES CLÉS
- 🚌 Minibus gratuits pour le ramassage des étudiants sur Douala vers Yassa
- 🏠 Cité Universitaire (Campus Yassa) : Plus de 250 chambres meublées et sécurisées. PRIX EXACT : 22 000 FCFA / mois (eau, électricité et Wi-Fi inclus). Photo envoyée automatiquement.
- 🎓 Bourses partenaires : 30 000 à 100 000 FCFA pour les 100 premiers inscrits !
- 🎓 Bourse linguistique de 50 000 FCFA pour les nouveaux bacheliers
- 💼 Plus de 300 stages académiques garantis chez nos partenaires
- 💻 Plus de 5 salles informatiques climatisées, fibre optique, labos énergies renouvelables
- 🏆 Sous-centre agréé des examens nationaux BTS et HND

### 📞 CONTACTS OFFICIELS
- Téléphones / WhatsApp : +237 676 079 849 / 659 855 800 / 694 490 614 / 699 787 818
- Email : info.isetag@gmail.com
- Sites : www.isetag-univ.net / www.isetag.cm

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

    // Call Groq API (active production model: openai/gpt-oss-120b)
    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
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
    const rawAiResponse = rawResponse.replace(/<NAME_DETECTED>.*?<\/NAME_DETECTED>/gi, '').trim();
    const aiResponse = formatForWhatsApp(rawAiResponse);

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
