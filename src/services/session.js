'use strict';
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SESSION_TTL = 86400;     // 24 h pour l'historique
const LANG_TTL    = 604800;    // 7 jours pour la langue (persiste les redéploiements)
const NAME_TTL    = 2592000;   // 30 jours pour le prénom du prospect

/**
 * Get last 15 messages from Redis (oldest first)
 */
async function getHistory(phone) {
  const key = `session:${phone}`;
  try {
    const history = await redis.lrange(key, 0, 14);
    return (history || []).reverse();
  } catch (err) {
    console.error('[REDIS] Get history error:', err.message);
    return [];
  }
}

/**
 * Add message to Redis session
 */
async function addMessage(phone, role, content) {
  const key = `session:${phone}`;
  const msg = { role, content, ts: Date.now() };
  try {
    await redis.lpush(key, msg);
    await redis.ltrim(key, 0, 14); // Keep only 15 messages
    await redis.expire(key, SESSION_TTL);
  } catch (err) {
    console.error('[REDIS] Add message error:', err.message);
  }
}

/**
 * Get stored language preference for a phone number
 * Survives server restarts and redeployments
 */
async function getLang(phone) {
  try {
    return await redis.get(`lang:${phone}`) || null;
  } catch (err) {
    console.error('[REDIS] getLang error:', err.message);
    return null;
  }
}

/**
 * Persist language preference for a phone number (7 days TTL)
 */
async function setLang(phone, lang) {
  try {
    await redis.set(`lang:${phone}`, lang, { ex: LANG_TTL });
  } catch (err) {
    console.error('[REDIS] setLang error:', err.message);
  }
}

/**
 * Get stored prospect name for a phone number
 */
async function getName(phone) {
  try {
    return await redis.get(`name:${phone}`) || null;
  } catch (err) {
    console.error('[REDIS] getName error:', err.message);
    return null;
  }
}

/**
 * Persist prospect name for a phone number (30 days TTL)
 */
async function setName(phone, name) {
  try {
    await redis.set(`name:${phone}`, name, { ex: NAME_TTL });
  } catch (err) {
    console.error('[REDIS] setName error:', err.message);
  }
}

const ORIENTATION_TTL = 3600; // 1 heure

/**
 * Get orientation state for a user
 */
async function getOrientation(phone) {
  try {
    const raw = await redis.get(`orientation:${phone}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error('[REDIS] getOrientation error:', err.message);
    return null;
  }
}

/**
 * Persist orientation state for a user (1 hour TTL)
 */
async function setOrientation(phone, orientationState) {
  try {
    await redis.set(`orientation:${phone}`, orientationState, { ex: ORIENTATION_TTL });
  } catch (err) {
    console.error('[REDIS] setOrientation error:', err.message);
  }
}

/**
 * Clear orientation state for a user
 */
async function clearOrientation(phone) {
  try {
    await redis.del(`orientation:${phone}`);
  } catch (err) {
    console.error('[REDIS] clearOrientation error:', err.message);
  }
}

/**
 * Reset conversation history (but keep language preference and name)
 */
async function clearSession(phone) {
  try {
    await redis.del(`session:${phone}`);
  } catch (err) {
    console.error('[REDIS] clearSession error:', err.message);
  }
}

/**
 * Get all media keys already sent to a user in the current session
 */
async function getSentMedia(phone) {
  try {
    const members = await redis.smembers(`sent_media:${phone}`);
    return Array.isArray(members) ? members : [];
  } catch (err) {
    console.error('[REDIS] getSentMedia error:', err.message);
    return [];
  }
}

/**
 * Record a media key as sent to a user (expires after 24h)
 */
async function addSentMedia(phone, mediaKey) {
  const key = `sent_media:${phone}`;
  try {
    await redis.sadd(key, mediaKey);
    await redis.expire(key, SESSION_TTL);
  } catch (err) {
    console.error('[REDIS] addSentMedia error:', err.message);
  }
}

/**
 * Check if a media key was already sent to a user
 */
async function hasMediaBeenSent(phone, mediaKey) {
  try {
    const isMember = await redis.sismember(`sent_media:${phone}`, mediaKey);
    return Boolean(isMember);
  } catch (err) {
    console.error('[REDIS] hasMediaBeenSent error:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────────
//  Webhook Idempotency / Message Deduplication
// ─────────────────────────────────────────────
const inMemoryDedup = new Map();
const DEDUP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupMemoryDedup() {
  const now = Date.now();
  for (const [id, expiry] of inMemoryDedup.entries()) {
    if (expiry <= now) inMemoryDedup.delete(id);
  }
}

/**
 * Deduplicate incoming webhook messages (10 minutes TTL).
 * Uses local fast memory first, then Upstash Redis SET NX for distributed safety.
 * Returns true if message is NEW (not seen before).
 * Returns false if message is a DUPLICATE (already processed).
 */
async function markMessageProcessed(messageId) {
  if (!messageId) return true;

  const now = Date.now();
  // 1. Fast in-memory check
  if (inMemoryDedup.has(messageId)) {
    if (inMemoryDedup.get(messageId) > now) {
      return false; // Duplicate found in memory
    }
  }

  // Record in memory
  inMemoryDedup.set(messageId, now + DEDUP_TTL_MS);
  if (inMemoryDedup.size > 2000) cleanupMemoryDedup();

  // 2. Distributed Redis check (survives worker reloads/multi-instances)
  try {
    const key = `msg_dedup:${messageId}`;
    const res = await redis.set(key, '1', { nx: true, ex: 600 });
    // In @upstash/redis, returns 'OK' or true if newly set, null if key already existed
    if (res === null) {
      return false; // Key was already set in Redis
    }
    return true;
  } catch (err) {
    console.warn('[REDIS] Dedup fallback to memory:', err.message);
    return true; // Memory check passed, so proceed
  }
}

module.exports = {
  getHistory,
  addMessage,
  getLang,
  setLang,
  getName,
  setName,
  getOrientation,
  setOrientation,
  clearOrientation,
  clearSession,
  getSentMedia,
  addSentMedia,
  hasMediaBeenSent,
  markMessageProcessed,
};


