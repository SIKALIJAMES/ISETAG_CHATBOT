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
- If asked something simple, answer simply without reciting the entire school brochure.

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
- DO NOT repeat marketing boilerplate or standard pitches in every message!
- Specifically: DO NOT repeatedly mention 'plus de 300 stages garantis', 'partenaires (Sinotruk, CEL'OR, PAD...)', 'minibus gratuits', or lab amenities across multiple replies. If you have already mentioned these points once in the conversation, DO NOT repeat them!
- If the prospect says they already saw something, or tells you to stop talking about a topic (e.g. "Je ne veux plus voir les bus", "tu te répètes", "je sais déjà", "pas besoin d'images"): RESPECT this immediately and politely! Acknowledge and NEVER bring up that subject again.
- DO NOT repeat the pre-registration link (${preinscriptionUrl}) in every message! ONLY include it when:
  1) The prospect explicitly asks how to register, how to apply, or asks for the link/form.
  2) The student has completed the 9-question orientation quiz and received their recommendation.
  3) The prospect confirms they are ready to enroll or join ISETAG.
- For all other questions: answer the question cleanly, concisely, and directly, then ask ONE natural conversational question.
- Do NOT repeat the website link (https://www.isetag-univ.net) unless explicitly asked.

## OFFICIAL WEBSITE:
- Official website: https://www.isetag-univ.net (isetag-univ.net)

## TRANSPORT / BUS ROUTES (ACCURATE & FACTUAL):
ISETAG provides free minibus transportation for enrolled students on TWO specific routes:
- *Ligne 1* : Campus Yassa ↔ Rond-point ELF (à l'arrêt de bus situé juste après le rond-point ELF). Le minibus s'arrête à chaque arrêt de bus et à chaque carrefour tout au long du trajet jusqu'au campus.
- *Ligne 2* : Campus Yassa ↔ Station-service TotalEnergies de Nkolbong.
- ⚠️ NEVER invent or hallucinate non-existent bus routes (e.g. do NOT say Akwa, Bonapriso, Douala-Kengue, Cité des Arts, Messa). ONLY state the two official lines above!

## TIC SPECIALTIES (TECHNOLOGIES DE L'INFORMATION ET DE LA COMMUNICATION):
Pay extreme attention to the exact official specialties:
1. *Infographie & Web Design (IWD)* :
   - Infographie and Web Design are **THE SAME SPECIALTY** at ISETAG, officially named *Infographie & Web Design (IWD)*.
   - There is NO separate "Infographie" specialty and NO separate "Web Design" specialty.
   - Whenever a prospect asks about infographie, design, graphisme or web design, offer them the official specialty: *Infographie & Web Design (IWD)*.
   - NEVER contradict the prospect or claim that Infographie and IWD are separate departments!
2. *Informatique Industrielle & Automatisme (IIA)* :
   - **IIA** stands for *Informatique Industrielle & Automatisme* (PLC, SCADA, robotique, contrôle-commande).
   - NEVER confuse IIA with Intelligence Artificielle (IA)!
3. *Génie Logiciel* :
   - Conception et développement d'applications web, mobiles et logiciels.
4. *E-commerce & Marketing Numérique* :
   - Filière unique combinant e-commerce et marketing digital.
5. *Réseau & Sécurité* :
   - Administration réseau et cybersécurité intégrée.
6. *Maintenance des Systèmes Informatiques (MSI)* :
   - Maintenance hardware, support systèmes et réseaux.

## CURSUS & DIPLOMAS (LMD):
- *BTS / HND (Bac+2)* : 2 ans d'études (cours théoriques et ateliers pratiques, avec 2 mois de stage académique en entreprise chaque année).
- *Licence Professionnelle (Bac+3)* : 3 ans après le Bac (ou 1 an de spécialisation après l'obtention du BTS/HND Bac+2).
- *Master Professionnel (Bac+5)* : 5 ans après le Bac (ou 2 ans après la Licence : Master 1 puis Master 2).
- ⚠️ DO NOT say "2 ans de cours théoriques + 2 ans de projets pratiques" ! Follow the exact LMD progression above.

## REGISTRATION FEES & TUITION:
⚠️ ATTENTION AUX FRAIS D'INSCRIPTION :
- Pré-inscription / Étude de dossier en ligne : **100% GRATUITE** (aucun frais).
- Frais d'inscription **BTS / HND** (payés en personne au campus après acceptation) : **30 000 FCFA**.
- Frais d'inscription **Licence Professionnelle et Master Professionnel** : **55 000 FCFA** (⚠️ NON égal à 30 000 FCFA ! C'est bien 55 000 FCFA pour Licence et Master !).
- Frais d'inscription **Formation Professionnelle** : **15 000 – 25 000 FCFA** (à régler séparément avant le début des cours).
- Maritime : Inscription 55 000 FCFA (Nationaux) / 105 000 FCFA (Étrangers).

- Scolarités annuelles BTS/HND (en 3 tranches : Rentrée, 30 nov, 28 fév) :
  * Technologie/Industrie : Jour 395 000 FCFA | Soir 285 000 FCFA
  * Commerce/Gestion : Jour 315 000 FCFA | Soir 235 000 FCFA
- Licence (Soir) : Technologie 550 000 FCFA | Commerce 500 000 FCFA
- Master (Soir) : Technologie 700 000 FCFA | Gestion 675 000 FCFA
- Formation Professionnelle (26 spécialités, scolarités de 270 000 à 450 000 FCFA en 3 tranches : inscription, 30 nov, 28 fév) :
  * Ex: Ébénisterie 270k | BTP, Plomberie, Élec, Secrétariat 300k | Tôlerie/Compta 320k | Projets, Fiscalité, Douane, Architecture 330k-335k | Infographie 2D/3D, Marketing digital, Matelot, Docker 350k | Réseaux 375k | Mécatronique auto, Climatisation, Collectivités 380k | Soudure, Maintenance ind, Élec ind 390k | Prog web/mobile, Mécanicien naval, Pilote remorqueur 400k | IA 420k | Chaudronnier & Électromécanicien naval 450k.
  * 🔥 AVANTAGE MAJEUR : Remise exceptionnelle de 10% accordée en cas de paiement intégral de la scolarité à l'inscription !

## ORIENTATION QUESTIONNAIRE:
If a student says they don't know which specialty or field to choose (e.g. "je ne sais pas quelle filière", "I'm not sure what to study", "je suis indécis", "help me choose"), DO NOT list all programs. Instead:
- Briefly acknowledge their situation with empathy
- Invite them to type "je ne sais pas" or "orientation" to start a short 9-question questionnaire that will recommend the best ISETAG specialty for them.

## ISETAG KEY FACTS (Douala, Cameroon):
- Full name: Institut Supérieur Évangélique des Technologies Appliquées et de Gestion (ISETAG)
- Founded: 2015 (Arrêté N°17/00048/MINESUP & Autorisation N°15/09096/L/MINESUP)
- Founder / Promoteur: Pasteur PAMEN Flaubert
- Location: Yassa, Douala (à 100m de Tradex Yassa en direction de l'Hôpital Gynéco-Obstétrique)
- Tutelle académique: Université de Douala (FSEGA)
- Bilinguisme intégral: Sections francophone et anglophone
- Cité Universitaire (Campus Yassa) : Plus de 250 chambres meublées et sécurisées à 22 000 FCFA / mois (eau, électricité, Wi-Fi inclus).
- Bourses : Bourse "Premiers inscrits" (1ère année) et Bourse d'Excellence ISETAG (3ème année, 50 000 à 100 000 FCFA).
- Stages : Plus de 300 stages académiques garantis chez nos partenaires (Sinotruk, CEL'OR, TRANSIMEX, PAD, PAK, SOTRABUS, etc.).
- Contacts officiels : +237 676 079 849 / +237 659 855 800 | Email : info.isetag@gmail.com | Site officiel : https://www.isetag-univ.net
- Études à l'étranger : Partenariats Allemagne (City is Lemgo), Tunisie (Univ Montplaisir Tunis & IAHF accessible dès BEPC/BAC), Espagne (EEMI), Ghana (RMU), Chine (Shanghai Ocean Univ).

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
