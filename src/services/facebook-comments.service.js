'use strict';
const fetch = require('node-fetch');
const { query } = require('../config/database');
const messenger = require('./messenger');

// ── Rate limiters ────────────────────────────────────────────────────────────

// Hourly rolling rate-limiter for public replies (max 20 per hour)
const publicRepliesTimestamps = [];
const MAX_PUBLIC_REPLIES_PER_HOUR = 20;

function canSendPublicReply() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  while (publicRepliesTimestamps.length > 0 && publicRepliesTimestamps[0] < oneHourAgo) {
    publicRepliesTimestamps.shift();
  }
  return publicRepliesTimestamps.length < MAX_PUBLIC_REPLIES_PER_HOUR;
}

function recordPublicReplySent() {
  publicRepliesTimestamps.push(Date.now());
}

// FIX #3: Hourly rolling rate-limiter for LLM classification calls
// Prevents Groq quota exhaustion on viral posts (also protects WhatsApp bot)
const classifyTimestamps = [];

function canClassifyWithLLM() {
  const maxPerHour = parseInt(process.env.COMMENT_CLASSIFY_MAX_PER_HOUR) || 60;
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  while (classifyTimestamps.length > 0 && classifyTimestamps[0] < oneHourAgo) {
    classifyTimestamps.shift();
  }
  return classifyTimestamps.length < maxPerHour;
}

function recordClassifyCall() {
  classifyTimestamps.push(Date.now());
}

/**
 * Helper to pause execution non-blockingly
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// FIX #3: Regex to detect comments that are only emojis, tags (@mentions), or whitespace
const TRIVIAL_COMMENT_REGEX = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\s]|@[\w.]+)+$/u;
const ONLY_EMOJIS_OR_PRAISE = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]|merci|bravo|felicitations|félicitations|amen|top|cool|ok|super)+$/iu;

/**
 * Classify comment intent via LLM (Groq / Llama)
 * Returns 'demande_info' | 'reclamation' | 'autre'
 */
async function classifyCommentIntent(text) {
  if (!text || typeof text !== 'string') return 'autre';

  const cleanText = text.trim();

  // FIX #3: Skip LLM for comments < 3 chars or that are only emojis/tags
  if (cleanText.length < 3) return 'autre';
  if (TRIVIAL_COMMENT_REGEX.test(cleanText)) return 'autre';
  if (ONLY_EMOJIS_OR_PRAISE.test(cleanText)) return 'autre';

  // FIX #3: Check LLM classification rate limit before calling Groq
  if (!canClassifyWithLLM()) {
    console.warn('[FB-COMMENTS] ⏳ LLM classification ceiling reached. Falling back to heuristics.');
    return heuristicClassify(cleanText);
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    console.warn('[FB-COMMENTS] GROQ_API_KEY missing, defaulting to heuristic intent classification');
    return heuristicClassify(cleanText);
  }

  const systemPrompt = `Tu es le classificateur officiel de la page Facebook de l'université ISETAG Douala (Cameroun).
Ta mission est de classifier le commentaire d'un internaute sous une publication en EXACTEMENT une seule de ces 3 catégories :

1. demande_info : L'internaute pose une question ou demande des détails sur l'ISETAG (ex: prix, scolarité, filières, BTS, HND, Licence, Master, inscription, rentrée, dortoir, situation géographique, diplômes, etc.).
2. reclamation : L'internaute se plaint, critique agressivement, insulte, accuse d'arnaque ou signale un litige non résolu.
3. autre : Simple remerciement, félicitation ("bravo", "merci", "amen", "🔥"), tag d'ami sans question, salutation isolée, spam ou hors-sujet.

RÈGLE ABSOLUE : Réponds STRICTEMENT avec l'un de ces 3 mots : demande_info, reclamation, ou autre. Aucun autre mot, aucune ponctuation.`;

  try {
    recordClassifyCall();
    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanText }
        ],
        max_tokens: 15,
        temperature: 0.1,
      })
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    if (answer?.includes('reclamation')) return 'reclamation';
    if (answer?.includes('demande_info')) return 'demande_info';
    if (answer?.includes('autre')) return 'autre';

    return heuristicClassify(cleanText);
  } catch (err) {
    console.warn('[FB-COMMENTS] LLM classification error, falling back to heuristics:', err.message);
    return heuristicClassify(cleanText);
  }
}

/**
 * Heuristic fallback in case LLM is temporarily unreachable
 */
function heuristicClassify(text) {
  const lower = text.toLowerCase();
  
  // Reclamations / insults
  const complaintWords = ['voleur', 'escroc', 'arnaque', 'rembourse', 'nul', 'plainte', 'mensonge', 'inadmissible', 'incompétent'];
  if (complaintWords.some(w => lower.includes(w))) {
    return 'reclamation';
  }

  // Info requests
  const infoWords = ['prix', 'combien', 'frais', 'scolarité', 'cout', 'filière', 'filiere', 'bts', 'licence', 'master', 'hnd', 'inscription', 'rentrée', 'rentree', 'dossier', 'bourses', 'ou se trouve', 'localisation', 'contact', 'condition', 'renseignement', 'details', 'détail', 'inbox', 'intéressé', 'interesse'];
  if (infoWords.some(w => lower.includes(w)) || lower.includes('?')) {
    return 'demande_info';
  }

  return 'autre';
}

/**
 * Pick a varied, polite public reply message
 */
function getRandomPublicReply(firstName) {
  const namePrefix = firstName ? `${firstName} ` : '';
  const templates = [
    `Bonjour ${namePrefix}! Nous venons de vous envoyer tous les détails en message privé 📩🎓`,
    `Bonjour ${namePrefix}! Retrouvez nos informations détaillées directement dans vos messages privés 💬✨`,
    `Bonjour ${namePrefix}! Nous vous avons répondu en privé pour vous guider au mieux 📩👍`,
    `Bonjour ${namePrefix}! Consultez votre boîte de messagerie, les détails vous y attendent 📩🎓`,
    `Bonjour ${namePrefix}! Vos informations sont bien envoyées en privé 📩`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Main processor for Facebook Feed webhook events (Page comments)
 */
async function handleFacebookCommentEvent(changeValue, entryId) {
  try {
    const isCommentsEnabled = process.env.BOT_COMMENTS_ENABLED === 'true';
    if (!isCommentsEnabled) {
      return;
    }

    // FIX #1: Refuse to process if FACEBOOK_PAGE_ID is not configured
    const pageId = process.env.FACEBOOK_PAGE_ID;
    if (!pageId || pageId.trim() === '') {
      console.error('[FB-COMMENTS] 🚫 CRITICAL: BOT_COMMENTS_ENABLED=true but FACEBOOK_PAGE_ID is empty! Refusing to process. Set FACEBOOK_PAGE_ID in your .env to your Facebook Page ID.');
      return;
    }

    // 1. Validate change event structure
    if (changeValue.item !== 'comment' || changeValue.verb !== 'add') {
      return;
    }

    const commentId = changeValue.comment_id;
    const postId = changeValue.post_id;
    const fromId = changeValue.from?.id;
    const fromName = changeValue.from?.name || '';
    const commentText = changeValue.message || '';
    const parentId = changeValue.parent_id;
    const createdTime = changeValue.created_time;

    if (!commentId) return;

    // 2. Ignore comments authored by the Page itself (anti-loop)
    if (fromId && fromId === pageId) {
      console.log(`[FB-COMMENTS] ⏩ Ignored comment ...${commentId.slice(-6)} authored by Page itself`);
      return;
    }

    // 3. Ignore second-level comments (nested replies)
    if (parentId && parentId !== postId && parentId !== commentId) {
      console.log(`[FB-COMMENTS] ⏩ Ignored level-2 reply ...${commentId.slice(-6)} (parent: ...${parentId.slice(-6)})`);
      return;
    }

    // 4. Ignore comments older than 7 days (Meta private reply window limit)
    if (createdTime) {
      const commentTimeMs = typeof createdTime === 'number'
        ? (createdTime < 1e11 ? createdTime * 1000 : createdTime)
        : new Date(createdTime).getTime();

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (!isNaN(commentTimeMs) && Date.now() - commentTimeMs > sevenDaysMs) {
        console.log(`[FB-COMMENTS] ⏩ Ignored comment ...${commentId.slice(-6)} older than 7 days`);
        return;
      }
    }

    // 5. Atomic Idempotence Check with DB UNIQUE constraint (ON CONFLICT DO NOTHING)
    const insertRes = await query(
      `INSERT INTO comment_events (comment_id, post_id, from_id, created_at, status)
       VALUES ($1, $2, $3, NOW(), 'processing')
       ON CONFLICT (comment_id) DO NOTHING
       RETURNING id`,
      [commentId, postId, fromId]
    );

    if (!insertRes.rows.length) {
      console.log(`[FB-COMMENTS] ⚠️ Duplicate webhook event for comment ...${commentId.slice(-6)} ignored`);
      return;
    }

    const recordId = insertRes.rows[0].id;

    // 6. Intent classification (with rate-limiting built into classifyCommentIntent)
    const intent = await classifyCommentIntent(commentText);
    console.log(`[FB-COMMENTS] 🏷️ Comment ...${commentId.slice(-6)} classified as: [${intent}]`);

    // 7. Route action based on intent
    if (intent === 'reclamation') {
      await query(
        `UPDATE comment_events
         SET category = 'reclamation',
             status = 'escalated',
             complaint_text = $2,
             processed_at = NOW()
         WHERE id = $1`,
        [recordId, commentText]
      );
      console.warn(`[FB-COMMENTS] 🚨 Reclamation flagged on comment ...${commentId.slice(-6)}. Logged for human attention.`);
      return;
    }

    if (intent === 'autre') {
      await query(
        `UPDATE comment_events
         SET category = 'autre',
             status = 'ignored',
             processed_at = NOW()
         WHERE id = $1`,
        [recordId]
      );
      return;
    }

    // ── intent === 'demande_info' ──────────────────────────────────────────
    const firstName = fromName ? fromName.split(' ')[0] : '';
    const botName = process.env.BOT_NAME || 'Isa';

    // FIX #4: Private reply without hardcoded prices — ask which program interests them
    const privateGreeting = firstName ? `Bonjour ${firstName} ! ` : 'Bonjour ! ';
    const privateReplyText = `${privateGreeting}Je suis ${botName}, l'assistant virtuel de l'ISETAG 🎓.\n\nJ'ai vu votre commentaire sous notre publication ! Pour vous orienter au mieux, dites-moi :\n\n👉 Quelle filière ou quel sujet vous intéresse ?\n(ex : Génie Logiciel, BTS, Licence, frais de scolarité, hébergement, pré-inscription...)\n\nJe suis là pour répondre à toutes vos questions ! 💬`;

    // A. Send Private Reply (Inbox conversation starter)
    const privateRes = await messenger.sendPrivateReply(commentId, privateReplyText);
    const privateSuccess = privateRes?.success ?? false;

    // B. Like comment (optional)
    if (process.env.COMMENT_LIKE_ENABLED === 'true') {
      await messenger.likeComment(commentId);
    }

    // FIX #2: Send public reply ONLY if private reply succeeded
    // Never tell the prospect "on vous a écrit en privé" if the private reply actually failed
    let publicSuccess = false;
    if (privateSuccess && process.env.PUBLIC_REPLY_ENABLED === 'true') {
      if (canSendPublicReply()) {
        // Random non-blocking delay between 3 to 8 seconds to mimic natural interaction
        const delayMs = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        await sleep(delayMs);

        const publicReplyText = getRandomPublicReply(firstName);
        const publicRes = await messenger.sendPublicCommentReply(commentId, publicReplyText);
        publicSuccess = publicRes?.success ?? false;

        if (publicSuccess) {
          recordPublicReplySent();
          console.log(`[FB-COMMENTS] 💬 Public reply posted to ...${commentId.slice(-6)} (delay ${delayMs}ms)`);
        }
      } else {
        console.warn(`[FB-COMMENTS] ⏳ Hourly public reply ceiling reached (20/hr). Private reply only.`);
      }
    } else if (!privateSuccess) {
      console.warn(`[FB-COMMENTS] ⚠️ Private reply failed for ...${commentId.slice(-6)}. No public reply sent (would be misleading).`);
    }

    // D. Update DB status
    const finalStatus = privateSuccess ? (publicSuccess ? 'replied_both' : 'replied_private') : 'failed';
    await query(
      `UPDATE comment_events
       SET category = 'demande_info',
           status = $2,
           processed_at = NOW()
       WHERE id = $1`,
      [recordId, finalStatus]
    );

    console.log(`[FB-COMMENTS] ✅ Processed comment ...${commentId.slice(-6)} -> status: ${finalStatus}`);

  } catch (err) {
    console.error('[FB-COMMENTS] Error processing comment event:', err.message);
  }
}

module.exports = {
  handleFacebookCommentEvent,
  classifyCommentIntent,
  canSendPublicReply,
  canClassifyWithLLM,
  classifyTimestamps,
  publicRepliesTimestamps
};
