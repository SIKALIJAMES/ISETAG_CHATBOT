'use strict';
const { franc } = require('franc');
const logger = require('../utils/logger');

// Franc language codes for French and English
const LANG_MAP = {
  fra: 'fr',
  eng: 'en',
};

const MENU_TRIGGERS_FR = ['menu', 'aide', 'bonjour', 'salut', 'début', 'debut', 'start', 'accueil'];
const MENU_TRIGGERS_EN = ['menu', 'help', 'hello', 'hi', 'start', 'home'];
const ESCALATION_TRIGGERS = [
  'agent', 'humain', 'conseiller', 'human', 'person',
  'aide humaine', 'parler', 'speak', 'operator', 'support'
];

/**
 * Detect language from text using franc
 * @param {string} text
 * @returns {'fr'|'en'}
 */
function detectLang(text) {
  if (!text || text.trim().length < 5) return 'fr'; // Default to French

  const langCode = franc(text, { minLength: 3 });
  const mapped = LANG_MAP[langCode];

  if (!mapped) {
    // Simple heuristic fallback for very short texts
    const lowerText = text.toLowerCase();
    const frWords = ['je', 'le', 'la', 'les', 'de', 'du', 'un', 'une', 'est', 'sont', 'pour', 'avec', 'comment'];
    const enWords = ['i', 'the', 'is', 'are', 'for', 'with', 'how', 'what', 'when', 'where', 'do', 'can'];

    const tokens = lowerText.split(/\s+/);
    const frScore = tokens.filter(t => frWords.includes(t)).length;
    const enScore = tokens.filter(t => enWords.includes(t)).length;

    return enScore > frScore ? 'en' : 'fr';
  }

  return mapped;
}

/**
 * Check if message is a menu trigger
 */
function isMenuTrigger(text) {
  const lower = text.toLowerCase().trim();
  return (
    MENU_TRIGGERS_FR.some(t => lower.includes(t)) ||
    MENU_TRIGGERS_EN.some(t => lower.includes(t))
  );
}

/**
 * Check if message is an escalation trigger
 */
function isEscalationTrigger(text) {
  const lower = text.toLowerCase().trim();
  return ESCALATION_TRIGGERS.some(t => lower.includes(t));
}

/**
 * Detect category from button payload or text
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  if (lower.includes('admission') || lower.includes('inscri') || lower.includes('register') || lower.includes('apply')) return 'admission';
  if (lower.includes('frais') || lower.includes('fee') || lower.includes('scolarité') || lower.includes('tuition') || lower.includes('payer') || lower.includes('pay')) return 'frais';
  if (lower.includes('filière') || lower.includes('program') || lower.includes('formation') || lower.includes('cours') || lower.includes('étude') || lower.includes('study')) return 'filieres';
  if (lower.includes('date') || lower.includes('rentrée') || lower.includes('semester') || lower.includes('quand') || lower.includes('when')) return 'dates';
  if (lower.includes('contact') || lower.includes('téléphone') || lower.includes('phone') || lower.includes('adresse') || lower.includes('address')) return 'contacts';
  return null;
}

/**
 * Normalize text for keyword matching
 * - Lowercase, remove accents, trim, tokenize
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

/**
 * Tokenize normalized text
 */
function tokenize(text) {
  const normalized = normalizeText(text);
  return normalized.split(/\s+/).filter(t => t.length > 1);
}

module.exports = {
  detectLang,
  isMenuTrigger,
  isEscalationTrigger,
  detectCategory,
  normalizeText,
  tokenize,
};
