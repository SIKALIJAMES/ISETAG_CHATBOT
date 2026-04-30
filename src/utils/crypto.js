'use strict';
const crypto = require('crypto');

/**
 * Hash a phone number with HMAC-SHA256 + salt for privacy
 * @param {string} phone - Raw phone number (e.g. +237600000000)
 * @returns {string} 64-char hex hash
 */
function hashPhone(phone) {
  const salt = process.env.PHONE_SALT || 'default_salt_change_me';
  return crypto.createHmac('sha256', salt).update(phone.trim()).digest('hex');
}

/**
 * Short version of hash for display (first 8 chars)
 */
function shortHash(phone) {
  return hashPhone(phone).slice(0, 8);
}

/**
 * Generate a random hex token
 * @param {number} bytes
 */
function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { hashPhone, shortHash, randomToken };
