'use strict';
const OpenAI = require('openai');
const { searchRelevant } = require('./embeddings');
const sessionService = require('./session');
const { franc } = require('franc');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
async function processMessage(phone, userText) {
  // Rate limit check
  if (isRateLimited(phone)) {
    return {
      text: '⏳ Vous envoyez trop de messages. Veuillez patienter une minute. / You are sending too many messages. Please wait a minute.',
      lang: 'fr',
      needsEscalation: false,
    };
  }

  try {
    // 1. Detect language
    const langCode = franc(userText, { minLength: 3 });
    const lang = langCode === 'eng' ? 'en' : 'fr';

    // 2. Get conversation history from Redis (last 15 messages)
    const history = await sessionService.getHistory(phone);

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
    const systemPrompt = `Tu es l'assistant virtuel officiel de l'ISETAG (Institut Supérieur d'Enseignement Technologique et de Gestion). Tu aides les étudiants et prospects 24h/24.

Ton comportement :
- Tu réponds TOUJOURS dans la langue de l'étudiant (langue détectée: ${lang === 'en' ? 'Anglais 🇬🇧' : 'Français 🇫🇷'})
- Tu es chaleureux, professionnel et jamais robotique
- Tu utilises le contexte de la conversation pour ne jamais reposer les mêmes questions
- Si on te salue, tu salues en retour et tu demandes comment tu peux aider
- Si tu n'es vraiment pas sûr d'une information, tu le dis honnêtement

Informations sur l'ISETAG (Garoua, Cameroun) :
- Filières : Génie Logiciel, Réseaux & Télécoms, Gestion des Entreprises, Marketing Digital
- Contact : +237 XXX XXX XXX
- Site : www.isetag.cm

${context ? `\n📚 CONTEXTE DEPUIS LA BASE DE CONNAISSANCE (utilise uniquement si pertinent) :\n${context}` : ''}`;

    // 5. Build messages array with history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: userText }
    ];

    // 6. Call GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    console.log(`[AI-AGENT] ✅ Response generated (${aiResponse.length} chars)`);

    // 7. Save exchange to Redis session
    await sessionService.addMessage(phone, 'user', userText);
    await sessionService.addMessage(phone, 'assistant', aiResponse);

    return {
      text: aiResponse,
      lang,
      needsEscalation: false,
    };

  } catch (err) {
    console.error('[AI-AGENT] Processing error:', err.message);

    // Graceful fallback — don't crash, signal escalation needed
    return {
      text: 'fr' === 'en'
        ? '😔 I encountered an error. A human advisor will assist you shortly.'
        : '😔 Une erreur est survenue. Un conseiller humain va vous assister très bientôt.',
      lang: 'fr',
      needsEscalation: true,
    };
  }
}

module.exports = { processMessage };
