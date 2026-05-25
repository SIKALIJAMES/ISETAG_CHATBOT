'use strict';
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SESSION_TTL = 86400;     // 24 h pour l'historique
const LANG_TTL    = 604800;    // 7 jours pour la langue (persiste les redéploiements)

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
 * Reset conversation history (but keep language preference)
 */
async function clearSession(phone) {
  try {
    await redis.del(`session:${phone}`);
  } catch (err) {
    console.error('[REDIS] clearSession error:', err.message);
  }
}

module.exports = {
  getHistory,
  addMessage,
  getLang,
  setLang,
  clearSession,
};
