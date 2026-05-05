'use strict';
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SESSION_TTL = 86400; // 24 hours

/**
 * Get last 15 messages from Redis
 */
async function getHistory(phone) {
  const key = `session:${phone}`;
  try {
    const history = await redis.lrange(key, 0, 14);
    return (history || []).reverse(); // Oldest first
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
    await redis.ltrim(key, 0, 14); // Keep only 15
    await redis.expire(key, SESSION_TTL);
  } catch (err) {
    console.error('[REDIS] Add message error:', err.message);
  }
}

/**
 * Reset conversation
 */
async function clearSession(phone) {
  const key = `session:${phone}`;
  await redis.del(key);
}

module.exports = {
  getHistory,
  addMessage,
  clearSession,
};
