'use strict';
const OpenAI = require('openai');
const { searchRelevant } = require('./embeddings');
const { franc } = require('franc');

const openai = new OpenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

// Rate limiting (20 msgs/minute per phone) using in-memory counter
const rateLimitMap = {};

function isRateLimited(phone) {
  const now = Date.now();
  if (!rateLimitMap[phone]) {
    rateLimitMap[phone] = { count: 1, resetAt: now + 60000 };
    return false;
  }
  if (now > rateLimitMap[phone].resetAt) {
    rateLimitMap[phone] = { count: 1, resetAt: now + 60000 };
    return false;
  }
  rateLimitMap[phone].count++;
  return rateLimitMap[phone].count > 20;
}

/**
 * Main AI Agent — Processes a message and returns a reply
 */
async function processMessage(phone, userText, lang, history = []) {
  // Rate limit check
  if (isRateLimited(phone)) {
    return {
      text: '⏳ Vous envoyez trop de messages. Veuillez patienter une minute. / You are sending too many messages. Please wait a minute.',
      lang: 'fr',
      needsEscalation: false,
    };
  }

  try {
    // 3. RAG: Semantic search in knowledge base
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

    // 4. Build system prompt
    const systemPrompt = `Tu es l'agent de marketing et d'orientation virtuel officiel de l'ISETAG (Institut Supérieur Évangélique des Technologies Appliquées et de Gestion) à Douala, Cameroun.
Ton rôle n'est pas seulement de donner des renseignements froids, mais d'agir comme un CONSEILLER EN ORIENTATION PERSUASIF ET ENGAGEANT. Ton objectif principal est d'enthousiasmer le prospect, de valoriser nos formations et de l'inciter activement à S'INSCRIRE ou à venir VISITER le campus !

Ton style de communication :
- Tu réponds TOUJOURS dans la langue de l'étudiant (langue détectée: ${lang === 'en' ? 'Anglais 🇬🇧' : 'Français 🇫🇷'})
- Ton ton est CHALEUREUX, DYNAMIQUE, RASSURANT et TRÈS CONVAINCANT (évite les tournures robotiques).
- Tu mets constamment en valeur les atouts majeurs de l'ISETAG (corps enseignant hautement qualifié, insertion professionnelle ultra-rapide, équipements modernes, ambiance académique saine et dynamique, diplômes nationaux reconnus par l'État).
- Tu structures tes messages avec des puces courtes et des emojis enthousiastes pour une lecture agréable sur WhatsApp.
- Tu termines TOUJOURS tes réponses par un "Appel à l'action" (Call-To-Action) ou une question ouverte pour guider le prospect vers l'étape suivante (ex: réserver une visite de campus à Douala, parler à un conseiller physique, ou lancer son inscription).
- Reste focalisé sur les objectifs d'avenir du candidat : demande-lui ses passions pour mieux l'orienter.

Informations sur l'ISETAG (Douala, Cameroun) :
- Filières phares : Génie Logiciel, Réseaux & Télécoms, Gestion des Entreprises, Marketing Digital (et autres formations professionnelles d'avenir).
- Site : www.isetag.cm

${context ? `\n📚 CONTEXTE DEPUIS LA BASE DE CONNAISSANCE (utilise ces informations pour répondre de manière convaincante et argumentée) :\n${context}` : ''}`;

    // 5. Format messages for Gemini API
    const fetch = require('node-fetch');
    const contents = [];
    for (const h of history) {
      contents.push({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] });
    }
    contents.push({ role: 'user', parts: [{ text: userText }] });

    // 6. Call Gemini 2.5 Flash (using a separate quota pool to avoid Gemini 3 blockages)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`[AI-AGENT] ✅ Response generated (${aiResponse.length} chars)`);

    return {
      text: aiResponse,
      lang,
      needsEscalation: false,
    };

  } catch (err) {
    console.error('[AI-AGENT] Processing error:', err.message);

    // Graceful fallback — don't crash, signal escalation needed
    return {
      text: `😔 Une erreur est survenue: ${err.message}`,
      lang: 'fr',
      needsEscalation: true,
    };
  }
}

module.exports = { processMessage };
