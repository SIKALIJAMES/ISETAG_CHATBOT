'use strict';
const { query } = require('../config/db');
const { getOpenAI } = require('./audio.service');
const { normalizeText, tokenize } = require('./nlp.service');
const logger = require('../utils/logger');

// In-memory FAQ cache
let faqCache = [];
let cacheLastRefreshed = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Load FAQs from database (cached for 10 minutes)
 */
async function loadFAQs(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && faqCache.length > 0 && (now - cacheLastRefreshed) < CACHE_TTL) {
    return faqCache;
  }

  try {
    const res = await query(
      'SELECT id, category, lang, keywords, question, answer FROM faqs WHERE is_active = TRUE ORDER BY id'
    );
    faqCache = res.rows;
    cacheLastRefreshed = now;
    logger.info(`FAQ cache refreshed: ${faqCache.length} FAQs loaded`);
    return faqCache;
  } catch (err) {
    logger.error('Failed to load FAQs from DB:', err.message);
    return faqCache; // Return stale cache on error
  }
}

/**
 * PASS 1 — Local keyword matching (FREE)
 * 
 * Score = matching_keywords / total_faq_keywords
 * Returns best match if score >= 0.4
 */
async function pass1Match(userText, lang) {
  const faqs = await loadFAQs();
  const userTokens = new Set(tokenize(userText));

  let bestMatch = null;
  let bestScore = 0;

  for (const faq of faqs) {
    // Filter by language if session lang is set
    if (lang && faq.lang && faq.lang !== lang) continue;
    if (!faq.keywords || faq.keywords.length === 0) continue;

    const faqTokens = faq.keywords.map(k => normalizeText(k));
    let matchCount = 0;

    for (const kw of faqTokens) {
      // Check if keyword (or its tokens) appear in user message tokens
      const kwTokens = tokenize(kw);
      const matches = kwTokens.filter(t => userTokens.has(t));
      if (matches.length > 0) matchCount++;
    }

    const score = faqTokens.length > 0 ? matchCount / faqTokens.length : 0;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = faq;
    }
  }

  logger.debug(`Pass 1 — best score: ${bestScore.toFixed(2)}, match: ${bestMatch?.id || 'none'}`);

  if (bestScore >= 0.4 && bestMatch) {
    return { faq: bestMatch, score: bestScore };
  }

  return { faq: null, score: bestScore };
}

/**
 * PASS 2 — GPT-4o-mini fallback
 * 
 * Only called when Pass 1 score < 0.4
 * Returns { faqId, confidence, intent, lang, needs_human }
 */
async function pass2GPT(userText, history, faqs) {
  const openai = getOpenAI();

  // Pre-filter top 15 FAQ candidates for context
  const faqContext = faqs.slice(0, 15).map(f => ({
    id: f.id,
    category: f.category,
    lang: f.lang,
    question: f.question,
    keywords: f.keywords,
  }));

  const systemPrompt = `Tu es l'assistant intelligent de l'université ISETAG (Cameroun). 
Ton rôle est d'aider les étudiants en français et en anglais.

Analyse le message et retourne UNIQUEMENT un JSON:
{
  "intent": string,      // admission|frais|filieres|dates|contacts|salutation|cloture|autre
  "lang": string,        // fr|en
  "faq_id": number|null, // ID de la FAQ correspondante si trouvée
  "confidence": float,   // 0.0 à 1.0
  "answer": string|null, // REPONSE DIRECTE si c'est une salutation, un remerciement ou une question simple.
  "needs_human": boolean // true seulement si la question est complexe et non listée dans les FAQs
}

IMPORTANT: Si l'étudiant dit "Bonjour", "Hello", "Merci", etc., réponds poliment dans sa langue dans le champ "answer" et mets "needs_human": false.
FAQs disponibles pour référence: ${JSON.stringify(faqContext)}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).slice(-3).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })),
    { role: 'user', content: userText },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(raw);

    logger.info(`Pass 2 GPT result: intent=${result.intent}, confidence=${result.confidence}`);
    return result;
  } catch (err) {
    logger.error('GPT Pass 2 error:', err.message);
    return { intent: 'autre', lang: 'fr', faq_id: null, confidence: 0, needs_human: true };
  }
}

/**
 * Main FAQ engine — Two-pass algorithm
 * @returns {{ answer: string|null, faqId: number|null, confidence: number, needsHuman: boolean }}
 */
async function runFAQEngine(userText, lang, history) {
  // Pass 1: Local keyword matching (Fast & Free)
  const { faq: p1Faq, score: p1Score } = await pass1Match(userText, lang);

  if (p1Faq) {
    return {
      answer: p1Faq.answer,
      faqId: p1Faq.id,
      confidence: p1Score,
      needsHuman: false,
      passUsed: 1,
    };
  }

  // Pass 2: GPT Intelligence (Natural language & Bilingualism)
  const faqs = await loadFAQs();
  const gptResult = await pass2GPT(userText, history, faqs);

  // If GPT found a matching FAQ
  if (gptResult.faq_id && gptResult.confidence >= 0.6) {
    const matchedFaq = faqs.find(f => f.id === gptResult.faq_id);
    if (matchedFaq) {
      return {
        answer: matchedFaq.answer,
        faqId: matchedFaq.id,
        confidence: gptResult.confidence,
        needsHuman: false,
        passUsed: 2,
      };
    }
  }

  // If GPT provided a direct conversational answer (Greetings, etc.)
  if (gptResult.answer && !gptResult.needs_human) {
    return {
      answer: gptResult.answer,
      faqId: null,
      confidence: gptResult.confidence || 0.9,
      needsHuman: false,
      passUsed: 2,
    };
  }

  // Both passes failed or human intervention needed
  return {
    answer: gptResult.answer || null,
    faqId: null,
    confidence: gptResult.confidence || 0,
    needsHuman: true,
    passUsed: 2,
  };
}

/**
 * Get FAQs by category for button responses
 */
async function getFAQsByCategory(category, lang) {
  const faqs = await loadFAQs();
  return faqs.filter(f =>
    f.category === category &&
    (f.lang === lang || f.lang === 'fr') // Fall back to FR if no EN
  ).slice(0, 3);
}

/**
 * Generate conversation summary via GPT (for escalation)
 */
async function generateSummary(history, lang) {
  if (!history || history.length === 0) {
    return lang === 'en'
      ? 'Student had a question that could not be answered by the bot.'
      : 'L\'étudiant avait une question sans réponse du bot.';
  }

  const openai = getOpenAI();
  const historyText = history
    .slice(-5)
    .map(h => `${h.role === 'user' ? 'Étudiant' : 'Bot'}: ${h.content}`)
    .join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Génère un résumé en 2-3 lignes maximum de cette conversation WhatsApp avec un étudiant de l'université ISETAG. Sois concis et factuel. Langue de réponse: ${lang === 'en' ? 'anglais' : 'français'}.`,
        },
        { role: 'user', content: historyText },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || 'Question non résolue.';
  } catch (err) {
    logger.error('Summary generation error:', err.message);
    return lang === 'en' ? 'Unresolved question.' : 'Question non résolue.';
  }
}

module.exports = {
  runFAQEngine,
  loadFAQs,
  getFAQsByCategory,
  generateSummary,
};
