'use strict';
const { sendImageMessage, sendDocumentMessage } = require('./whatsapp');

// Base public URL of your Railway deployment
const BASE_URL = process.env.APP_URL || 'https://isetag-chatbot-production.up.railway.app';

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA CATALOG
// Filenames MUST exactly match what is in public/media/
// ─────────────────────────────────────────────────────────────────────────────
const MEDIA = {
  // ── Tarifs BTS Gestion (Francophone) ──────────────────────────────
  tarif_bts_gestion_fr: {
    type: 'document',
    file: 'Fiche tarifaire BTS – Gestion.pdf',
    caption: '💼 Fiche tarifaire BTS — Commerce & Gestion (toutes filières)',
  },
  // ── Tarifs HND Management (Anglophone) ────────────────────────────
  tarif_bts_gestion_en: {
    type: 'document',
    file: 'pricing sheet HND (Management and Commercial).pdf',
    caption: '💼 HND Pricing Sheet — Management & Commercial (all fields)',
  },
  // ── Tarifs BTS Ingénierie & TIC (Francophone) ─────────────────────
  tarif_bts_tech_fr: {
    type: 'document',
    file: 'Fiche tarifaire BTS – Ingénierie et TIC.pdf',
    caption: '🏭 Fiche tarifaire BTS — Ingénierie & TIC (toutes filières)',
  },
  // ── Tarifs HND Engineering & Technology (Anglophone) ──────────────
  tarif_bts_tech_en: {
    type: 'document',
    file: 'pricing sheet HND (engeneering and technology).pdf',
    caption: '🏭 HND Pricing Sheet — Engineering & Technology (all fields)',
  },
  // ── Flyer général (Francophone) ───────────────────────────────────
  flyer_fr: {
    type: 'document',
    file: 'flyer_general_français.pdf',
    caption: '📋 Brochure ISETAG — Toutes les formations',
  },
  // ── Flyer général (Anglophone) ────────────────────────────────────
  flyer_en: {
    type: 'document',
    file: 'flyer_general_anglais.pdf',
    caption: '📋 ISETAG Brochure — All Programs',
  },
  // ── Résidence universitaire ───────────────────────────────────────
  residence: {
    type: 'image',
    file: 'residence.jpg',
    caption: '🏠 Résidence universitaire ISETAG — chambre meublée avec WIFI, eau & électricité inclus !',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN KEYWORD MAPS
// These cover ALL speciality names, acronyms and synonyms for each domain.
// ─────────────────────────────────────────────────────────────────────────────

// Every speciality in the Gestion/Commerce/Management domain
const GESTION_KEYWORDS = [
  // Generic
  'gestion', 'commerce', 'commercial', 'management', 'business', 'administrative',
  // Speciality names (FR)
  'comptabilit', 'cge', 'marketing', 'mcv', 'banque', 'finance', 'bqf',
  'logistique', 'transport', 'glt', 'ressources humaines', 'rh', 'grh',
  'qualit', 'douane', 'transit', 'assistant manager', 'communication des organisations',
  'fiscalit', 'collectivit', 'administration des collectivit', 'finances publiques',
  'gestion des projets', 'gestion des syst',
  // Acronyms
  'cin', 'dot', 'glт', 'mts', 'acc', 'bkf',
  // EN equivalents
  'accountan', 'human resource', 'logistics', 'supply chain', 'banking',
  'trade', 'sales', 'customs',
];

// Every speciality in the Industry, Engineering & TIC domain
const TECH_KEYWORDS = [
  // Generic
  'informatique', 'g[eé]nie', 'ing[eé]nierie', 'technolog', 'technique', 'engineering',
  'tic', 'technology', 'industriel',
  // Speciality names (FR)
  'g[eé]nie logiciel', 'igl', 'software',
  'r[eé]seau', 'r[eé]seaux', 's[eé]curit[eé]', 't[eé]l[eé]com', 'telecommunication',
  'infographie', 'web design', 'iwd', 'multimédia', 'multimedia',
  'iia', 'informatique industrielle', 'automatisme',
  'maintenance des syst[eè]mes informatiques', 'msi',
  'electrotechnique', 'ET', '[eé]lectrique', '[eé]lectronique',
  'b[aâ]timent', 'bat', 'construction', 'travaux publics', 'tpu',
  'menuiserie', 'eb[eé]nisterie', 'bois',
  'froid', 'climatisation',
  'fluides', 'plomberie', 'installation sanitaire',
  'chaudronnerie', 'soudure', 'chs',
  'm[eé]canique', 'mécatronique', 'mka', 'mip', 'm[eé]catronique',
  'automobile', 'mav', 'apr[eè]s.vente',
  'fabrication', 'm[eé]tallique',
  'p[eé]trole', 'p[eé]trolier', 'mining', 'forage', 'drilling',
  'g[eé]nie civil', 'civil engineering',
  'e-commerce', 'marketing num[eé]rique', 'digital marketing',
  // Acronyms
  'res', 'igl', 'iwd', 'iia', 'msi', 'mka', 'mip', 'mav', 'chs', 'bat', 'tpu',
  'et ', 'elt ',
  // EN equivalents
  'software engineer', 'network', 'hardware', 'computer', 'mechanic',
  'electrical', 'civil', 'industrial', 'petroleum', 'information system',
];

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test a string against an array of keyword patterns (strings or regexes).
 */
function matchesAny(text, patterns) {
  return patterns.some(p => {
    if (p instanceof RegExp) return p.test(text);
    return new RegExp(p, 'i').test(text);
  });
}

/**
 * Decide which media keys to send based on the conversation context.
 * @param {string} userText   - Message from the prospect
 * @param {string} aiResponse - Bot reply text
 * @param {string} lang       - 'fr' or 'en'
 * @returns {string[]} list of MEDIA keys
 */
function detectMediaKeys(userText, aiResponse, lang) {
  const combined = userText + ' ' + aiResponse;
  const isEn = lang === 'en';
  const keys = [];

  // ── Résidence ─────────────────────────────────────────────────────
  if (/r[eé]sidence|chambre|logement|dortoir|h[eé]berg|housing|room|accommodation|dormi/i.test(combined)) {
    keys.push('residence');
  }

  // ── Flyer général ─────────────────────────────────────────────────
  if (/brochure|flyer|d[eé]pliant|pr[eé]sentation g[eé]n[eé]rale|toutes les fili[eè]res|all program|voir toutes/i.test(combined)) {
    keys.push(isEn ? 'flyer_en' : 'flyer_fr');
  }

  // ── Tarifs BTS Gestion/Commerce ──────────────────────────────────
  // Trigger: talking about fees/tarifs + any gestion speciality
  const talkingAboutFees = /tarif|scolarit[eé]|frais|paiement|tranche|combien|co[uû]te|fee|tuition|payment|pricing|cost|price/i.test(combined);

  if (talkingAboutFees && matchesAny(combined, GESTION_KEYWORDS)) {
    keys.push(isEn ? 'tarif_bts_gestion_en' : 'tarif_bts_gestion_fr');
  }

  // ── Tarifs BTS Ingénierie & TIC ───────────────────────────────────
  if (talkingAboutFees && matchesAny(combined, TECH_KEYWORDS)) {
    keys.push(isEn ? 'tarif_bts_tech_en' : 'tarif_bts_tech_fr');
  }

  // Deduplicate
  return [...new Set(keys)];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Automatically send relevant media files after a bot text reply.
 * @param {string} phone      - Prospect's phone number
 * @param {string} userText   - Message from the prospect
 * @param {string} aiResponse - Bot reply text
 * @param {string} lang       - 'fr' or 'en'
 */
async function sendContextualMedia(phone, userText, aiResponse, lang) {
  const keys = detectMediaKeys(userText, aiResponse, lang);
  if (keys.length === 0) return;

  console.log(`[MEDIA] 📎 Sending ${keys.length} media file(s) to ...${phone.slice(-4)}: [${keys.join(', ')}]`);

  for (const key of keys) {
    const media = MEDIA[key];
    if (!media) continue;

    const url = `${BASE_URL}/media/${encodeURIComponent(media.file)}`;

    try {
      if (media.type === 'image') {
        await sendImageMessage(phone, url, media.caption);
      } else {
        await sendDocumentMessage(phone, url, media.file, media.caption);
      }
      console.log(`[MEDIA] ✅ Sent: ${media.file}`);
    } catch (err) {
      console.error(`[MEDIA] ❌ Failed to send ${media.file}:`, err.message);
    }

    // Small delay between files to avoid WhatsApp API rate limits
    await new Promise(r => setTimeout(r, 600));
  }
}

module.exports = { sendContextualMedia };
