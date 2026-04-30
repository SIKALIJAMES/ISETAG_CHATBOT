'use strict';
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');

const SESSION_TTL = 1800; // 30 minutes

function sessionKey(phoneHash) {
  return `session:${phoneHash}`;
}

function rateLimitKey(phoneHash) {
  return `ratelimit:${phoneHash}`;
}

/**
 * Load session from Redis; creates a new one if it doesn't exist
 */
async function getSession(phoneHash) {
  const redis = getRedis();
  const key = sessionKey(phoneHash);

  try {
    const data = await redis.get(key);
    if (data) {
      // Refresh TTL on access
      await redis.expire(key, SESSION_TTL);
      return typeof data === 'string' ? JSON.parse(data) : data;
    }
  } catch (err) {
    logger.warn('Redis get session error:', err.message);
  }

  // Create fresh session
  return createSession(phoneHash);
}

/**
 * Create and persist a new session
 */
async function createSession(phoneHash) {
  const session = {
    step: 'welcome',
    lang: 'fr',
    history: [],
    is_escalated: false,
    agent_notified: false,
    last_msg_id: null,
    consecutive_no_match: 0,
    created_at: new Date().toISOString(),
    message_count: 0,
  };

  await saveSession(phoneHash, session);
  return session;
}

/**
 * Save session to Redis with TTL
 */
async function saveSession(phoneHash, session) {
  const redis = getRedis();
  const key = sessionKey(phoneHash);

  try {
    await redis.set(key, JSON.stringify(session), { ex: SESSION_TTL });
  } catch (err) {
    logger.error('Redis save session error:', err.message);
  }
}

/**
 * Delete / reset a session
 */
async function deleteSession(phoneHash) {
  const redis = getRedis();
  try {
    await redis.del(sessionKey(phoneHash));
  } catch (err) {
    logger.warn('Redis delete session error:', err.message);
  }
}

/**
 * Check rate limit — max 10 messages per 60 seconds
 * @returns {boolean} true if rate limited (exceeded)
 */
async function checkRateLimit(phoneHash) {
  const redis = getRedis();
  const key = rateLimitKey(phoneHash);

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 60); // Set TTL on first message
    }
    return count > 10;
  } catch (err) {
    logger.warn('Redis rate limit check error:', err.message);
    return false; // Fail open — don't block on Redis error
  }
}

/**
 * Add a message to session history (keep last 5 for GPT context)
 */
function addToHistory(session, role, content) {
  session.history = session.history || [];
  session.history.push({ role, content, ts: Date.now() });
  if (session.history.length > 5) {
    session.history = session.history.slice(-5);
  }
}

module.exports = {
  getSession,
  saveSession,
  deleteSession,
  checkRateLimit,
  addToHistory,
};
