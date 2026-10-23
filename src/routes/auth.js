'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { protect } = require('../middleware/auth');

// ─────────────────────────────────────────────
// Anti-Brute-Force & Rate-Limiting Engine
// ─────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

// Store failed attempts in memory: key -> { count, lockedUntil, firstAttempt }
const loginAttempts = new Map();

// Periodic cleanup every 10 minutes to prevent memory leaks
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.lockedUntil && now > record.lockedUntil) {
      loginAttempts.delete(key);
    } else if (!record.lockedUntil && now - record.firstAttempt > LOCKOUT_DURATION_MS) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip || req.socket?.remoteAddress || 'unknown';
}

function getAttemptRecord(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) return null;

  if (record.lockedUntil && now > record.lockedUntil) {
    loginAttempts.delete(key);
    return null;
  }
  if (!record.lockedUntil && now - record.firstAttempt > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(key);
    return null;
  }
  return record;
}

function recordFailedAttempt(key) {
  const now = Date.now();
  let record = getAttemptRecord(key);
  if (!record) {
    record = { count: 1, lockedUntil: null, firstAttempt: now };
  } else {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
    }
  }
  loginAttempts.set(key, record);
  return record;
}

function resetAttempts(key) {
  loginAttempts.delete(key);
}

/**
 * POST /api/auth/login
 * Hardened login with brute-force lockout by Email and IP
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const clientIp = getClientIp(req);

  if (!email || !password) {
    return res.status(400).json({ error: 'Adresse e-mail et mot de passe obligatoires.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailKey = `email:${normalizedEmail}`;
  const ipKey = `ip:${clientIp}`;

  // 1. Check if already locked by email or IP
  const emailRecord = getAttemptRecord(emailKey);
  const ipRecord = getAttemptRecord(ipKey);
  const activeLock = (emailRecord?.lockedUntil && emailRecord.lockedUntil > Date.now()) ? emailRecord :
                     (ipRecord?.lockedUntil && ipRecord.lockedUntil > Date.now()) ? ipRecord : null;

  if (activeLock) {
    const msRemaining = Math.max(0, activeLock.lockedUntil - Date.now());
    const minsRemaining = Math.ceil(msRemaining / (60 * 1000));
    const secondsRemaining = Math.ceil(msRemaining / 1000);
    return res.status(429).json({
      error: `Compte temporairement verrouillé suite à ${MAX_ATTEMPTS} tentatives infructueuses. Veuillez réessayer dans ${minsRemaining} minute(s).`,
      isLocked: true,
      retryAfterSeconds: secondsRemaining,
      lockedUntil: activeLock.lockedUntil
    });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];

    const isMatch = user && (await bcrypt.compare(password, user.password_hash));

    if (!isMatch) {
      const updatedEmailRec = recordFailedAttempt(emailKey);
      const updatedIpRec = recordFailedAttempt(ipKey);
      const currentAttempts = Math.max(updatedEmailRec.count, updatedIpRec.count);
      const remaining = Math.max(0, MAX_ATTEMPTS - currentAttempts);

      if (remaining === 0) {
        return res.status(429).json({
          error: `Trop de tentatives de connexion (5/5). Compte verrouillé pendant 15 minutes.`,
          isLocked: true,
          remainingAttempts: 0,
          retryAfterSeconds: 15 * 60,
          lockedUntil: Date.now() + LOCKOUT_DURATION_MS
        });
      }

      return res.status(401).json({
        error: 'Adresse e-mail ou mot de passe incorrect.',
        remainingAttempts: remaining,
        totalAllowed: MAX_ATTEMPTS
      });
    }

    // Success: reset rate limit tracking for this user and IP
    resetAttempts(emailKey);
    resetAttempts(ipKey);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email },
      message: 'Connexion réussie.'
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Une erreur interne est survenue.' });
  }
});

/**
 * GET /api/auth/verify
 * Allows frontend to verify if existing session/token is still valid
 */
router.get('/verify', protect, (req, res) => {
  res.json({
    valid: true,
    user: { id: req.user.id, email: req.user.email }
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie.' });
});

module.exports = router;

