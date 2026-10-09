const fs = require('fs');
const path = require('path');
const whatsapp = require('./whatsapp');
const messenger = require('./messenger');

// Base public URL of your Railway deployment
const BASE_URL = process.env.APP_URL || 'https://isetagchatbot-production.up.railway.app';
const MEDIA_DIR = path.join(__dirname, '../../public/media');

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA CATALOG
// ─────────────────────────────────────────────────────────────────────────────
const MEDIA = {
  tarif_bts_gestion_fr: {
    type: 'document',
    file: 'Fiche tarifaire BTS – Gestion.pdf',
    caption: '💼 Fiche tarifaire BTS — Commerce & Gestion (toutes filières)\n🌐 Site web : https://www.isetag.cm',
  },
  tarif_bts_gestion_en: {
    type: 'document',
    file: 'pricing sheet HND (Management and Commercial).pdf',
    caption: '💼 HND Pricing Sheet — Management & Commercial (all fields)\n🌐 Website: https://www.isetag.cm',
  },
  tarif_bts_tech_fr: {
    type: 'document',
    file: 'Fiche tarifaire BTS – Ingénierie et TIC.pdf',
    caption: '🏭 Fiche tarifaire BTS — Ingénierie & TIC (toutes filières)\n🌐 Site web : https://www.isetag.cm',
  },
  tarif_bts_tech_en: {
    type: 'document',
    file: 'pricing sheet HND (engeneering and technology).pdf',
    caption: '🏭 HND Pricing Sheet — Engineering & Technology (all fields)\n🌐 Website: https://www.isetag.cm',
  },
  tarif_licence_fr: {
    type: 'document',
    file: 'Fiche tarifaire License.pdf',
    caption: '🎓 Fiche tarifaire Licence Professionnelle (cours du soir)\n🌐 Site web : https://www.isetag.cm',
  },
  tarif_master_fr: {
    type: 'document',
    file: 'Fiche tarifaire Master.pdf',
    caption: '🎓 Fiche tarifaire Master Professionnel (cours du soir)\n🌐 Site web : https://www.isetag.cm',
  },
  flyer_fr: {
    type: 'document',
    file: 'flyer_general_français.pdf',
    caption: '📋 Brochure ISETAG — Toutes les formations\n🌐 Visitez notre site : https://www.isetag.cm',
  },
  flyer_en: {
    type: 'document',
    file: 'flyer_general_anglais.pdf',
    caption: '📋 ISETAG Brochure — All Programs\n🌐 Visit our website: https://www.isetag.cm',
  },
  residence: {
    type: 'image',
    file: 'residence.jpeg',
    caption: '🏠 *Résidence universitaire ISETAG (Campus Yassa)*\n• Plus de 250 chambres meublées et sécurisées\n• Tarif officiel : *22 000 FCFA / mois*\n• Eau, électricité et Wi-Fi haut débit inclus !\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  bus: {
    type: 'image',
    file: 'bus_isetag.jpeg',
    caption: '🚌 *Transport gratuit ISETAG (Douala)*\n• Minibus de ramassage gratuits pour nos étudiants\n• Desservent les grands carrefours de Douala jusqu\'au campus de Yassa.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  campus: {
    type: 'image',
    file: 'campus_isetag.jpeg',
    caption: '🏛️ *Campus ISETAG (Yassa, Douala)*\n• Situé à 100m de Tradex Yassa (vers l\'Hôpital Gynéco-Obstétrique)\n• Cadre moderne, sécurisé et propice aux études d\'excellence.\n🌐 Site web : https://www.isetag.cm',
  },
  maritime_photo: {
    type: 'image',
    file: 'maritime_port.jpeg',
    caption: '⚓ *Filière Maritime & Portuaire — ISETAG*\n• Double diplomation (Licence Pro) + certification internationale STCW 95\n• Uniformes et cours d\'anglais & chinois offerts\n• Stages garantis et mobilité internationale (Ghana / Chine)\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  electricite: {
    type: 'image',
    file: 'atelier_electricite.jpeg',
    caption: '⚡ *Atelier de Génie Électrique & Énergies Renouvelables*\n• Bancs d\'essais, alternateurs triphasés et instrumentation moderne\n• Formation pratique orientée vers les besoins de l\'industrie.\n🌐 Site web : https://www.isetag.cm',
  },
  bois: {
    type: 'image',
    file: 'atelier_bois.jpeg',
    caption: '🪵 *Atelier Pratique de Menuiserie & Ébénisterie*\n• Équipements industriels de découpe et de transformation du bois\n• Savoir-faire technique et compétences professionnelles d\'élite.\n🌐 Site web : https://www.isetag.cm',
  },
  bibliotheque: {
    type: 'image',
    file: 'bibliotheque.jpeg',
    caption: '📚 *Bibliothèque & Cadre d\'Études ISETAG*\n• Espace de lecture calme, riche en ouvrages spécialisés et Wi-Fi haut débit\n• Environnement studieux et encadrement d\'excellence.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  etranger: {
    type: 'image',
    file: 'etudier_etranger.jpeg',
    caption: '🌍 *Programme Étudier à l\'Étranger — ISETAG*\n• Partenariats universitaires : Allemagne, Tunisie, Espagne, Ghana, Chine\n• 1 à 2 ans au Cameroun puis poursuite à l\'international avec accompagnement Visa !\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN KEYWORD LISTS
// Only exact speciality names, acronyms, and synonyms — NO generic short words.
// ─────────────────────────────────────────────────────────────────────────────

// Gestion / Commerce / Management specialities
const GESTION_TERMS = [
  'gestion', 'comptabilit', 'cge', 'commerce', 'commercial', 'marketing',
  'mcv', 'banque', 'finance', 'bqf', 'logistique', 'transport', 'glt',
  'ressources humaines', 'rh ', ' rh,', 'grh', 'qualit', 'douane', 'transit',
  'assistant manager', 'communication des organisations',
  'fiscalit', 'collectivit', 'finances publiques', 'gestion des projets',
  'cin ', ' cin,', 'dot ', 'mts ', 'acc ', ' acc,', 'bkf ',
  // EN equivalents
  'accountan', 'human resource', 'supply chain', 'trade sale', 'banking',
  'customs', 'management studies',
];

// Engineering / Technology / TIC specialities
// ⚠️  'et' removed — it is a French word meaning "and" and causes false positives
const TECH_TERMS = [
  'informatique', 'génie logiciel', 'genie logiciel', 'igl', 'software',
  'réseau', 'reseaux', 'sécurité réseau', 'securite reseau',
  'télécommunication', 'telecommunication',
  'infographie', 'web design', 'iwd', 'multimédia', 'multimedia',
  'iia', 'informatique industrielle', 'automatisme',
  'maintenance des systèmes informatiques', 'maintenance informatique', 'msi',
  'electrotechnique', 'elt', 'électrique', 'electronique',
  'bâtiment', 'batiment', 'bat ', ' bat,', 'génie civil', 'genie civil',
  'travaux publics', 'tpu',
  'menuiserie', 'ébénisterie', 'ebenisterie', 'bois',
  'froid', 'climatisation',
  'fluides', 'plomberie', 'installation sanitaire',
  'chaudronnerie', 'soudure', 'chs',
  'mécanique', 'mecanique', 'mécatronique', 'mecatronique', 'mka',
  'maintenance industrielle', 'mip',
  'automobile', 'après-vente auto', 'mav',
  'fabrication mécanique', 'métallique',
  'pétrole', 'petroleum', 'mining', 'forage', 'drilling',
  'engineering', 'hardware',
  'e-commerce numérique', 'marketing numérique', 'digital marketing',
  'computer science', 'network', 'information technology',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function matchesAny(text, terms) {
  return terms.some(t => new RegExp(t, 'i').test(text));
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION — KEY RULES:
//   • Fee-trigger: check ONLY userText (not AI reply, it often mentions "frais" on its own)
//   • Domain: check userText + aiResponse (AI may echo back the confirmed speciality name)
//   • Residence: send if AI reply mentions résidence/chambre (means bot brought it up)
//     OR if user explicitly asked about it
//   • Flyer: only if user explicitly asks for a brochure
// ─────────────────────────────────────────────────────────────────────────────
function detectMediaKeys(userText, aiResponse, lang) {
  const isEn = lang === 'en';
  const keys = [];

  // ── 1. RÉSIDENCE ────────────────────────────────────────────────────
  // Send image if the USER asked OR if the BOT introduced the topic
  const residenceInUser = /r[eé]sidence|chambre|logement|dortoir|h[eé]berg|hostel|housing|room|accommodation|cit[eé] univ/i.test(userText);
  const residenceInBot  = /r[eé]sidence|chambre|logement|cit[eé] univ|hostel|dormitory/i.test(aiResponse);
  if (residenceInUser || residenceInBot) {
    keys.push('residence');
  }

  // ── 2. FLYER GÉNÉRAL ───────────────────────────────────────────────
  // Send the flyer if:
  // - The user explicitly asks for a brochure/flyer/pdf/document AND uses request verbs (envoyer, voir, send, etc.)
  // - OR the bot's response indicates it is sending or sharing the brochure/flyer
  const userAsksFlyer = /brochure|flyer|d[eé]pliant|affiche|pdf|document/i.test(userText) && 
                        /envoy|partag|envoi|donn|voir|recev|send|show|get|receive|look/i.test(userText);
  const botMentionsSendingFlyer = /je vous envoie (la |notre )?(brochure|dépliant|flyer)|voici (la |notre )?(brochure|dépliant|flyer)|i am sending (you )?(the |our )?(brochure|flyer|booklet)|here is (the |our )?(brochure|flyer|booklet)/i.test(aiResponse);

  if (userAsksFlyer || botMentionsSendingFlyer) {
    keys.push(isEn ? 'flyer_en' : 'flyer_fr');
  }

  // ── 3. TARIFS ──────────────────────────────────────────────────────
  // ONLY trigger when the USER's message contains a fee-related word.
  // Scanning the AI reply is intentionally excluded to avoid false positives.
  const userAsksFees = /tarif|scolarit[eé]|frais|paiement|tranche|combien[^\w]|co[uû]te|fee|tuition|payment|pricing|cost|price/i.test(userText);

  // KEY FIX: If user is asking about rooms/residence, do not send general tuition sheets
  // unless they also explicitly mention tuition/studies/school fees.
  let userAsksTuitionFees = userAsksFees;
  if (residenceInUser) {
    userAsksTuitionFees = /scolarit[eé]|bts|hnd|fili[eè]re/i.test(userText);
  }

  if (userAsksTuitionFees) {
    const domainContext = userText + ' ' + aiResponse;

    // KEY FIX: If context is maritime/portuary, do not send BTS sheets (no maritime sheet available yet)
    const MARITIME_TERMS = [
      'maritime', 'portuaire', 'navigation', 'marine', 'peche', 'aquaculture', 'nautique', 'ocean'
    ];
    const isMaritime = matchesAny(domainContext, MARITIME_TERMS);

    if (!isMaritime) {
      const isGestion = matchesAny(domainContext, GESTION_TERMS);
      const isTech    = matchesAny(domainContext, TECH_TERMS);

      // Priority: if both match (edge case), prefer domain that appears in userText alone
      const userGestion = matchesAny(userText, GESTION_TERMS);
      const userTech    = matchesAny(userText, TECH_TERMS);

      const isLicence = /licence|license|bachelor/i.test(domainContext);
      const isMaster  = /master/i.test(domainContext);

      if (isLicence && !isEn) {
        keys.push('tarif_licence_fr');
      } else if (isMaster && !isEn) {
        keys.push('tarif_master_fr');
      } else {
        if (userGestion || (isGestion && !userTech)) {
          keys.push(isEn ? 'tarif_bts_gestion_en' : 'tarif_bts_gestion_fr');
        }
        if (userTech || (isTech && !userGestion)) {
          keys.push(isEn ? 'tarif_bts_tech_en' : 'tarif_bts_tech_fr');
        }

        // If domain is ambiguous and user just said "frais"/"tarif" without specifying → send both
        if (!isGestion && !isTech) {
          keys.push(isEn ? 'tarif_bts_gestion_en' : 'tarif_bts_gestion_fr');
          keys.push(isEn ? 'tarif_bts_tech_en'    : 'tarif_bts_tech_fr');
        }
      }
    } else {
      console.log('[MEDIA-SENDER] ⚓ Maritime request detected. Skipping BTS general tuition sheets.');
    }
  }

  // ── 4. BUS & TRANSPORT ─────────────────────────────────────────────
  const userAsksBus = /bus|transport|navette|ramassage|minibus|d[eé]placement/i.test(userText);
  const botMentionsBus = /bus gratuit|ramassage gratuit|navette/i.test(aiResponse);
  if (userAsksBus || botMentionsBus) {
    keys.push('bus');
  }

  // ── 5. CAMPUS & LOCALISATION ───────────────────────────────────────
  const userAsksCampus = /o[uù] se trouve|localisation|situation|adresse|campus|b[aâ]timent|ressemble|visiter|o[uù] est (l'|cette )?[eé]cole|situe[^\w]|yassa/i.test(userText);
  if (userAsksCampus) {
    keys.push('campus');
  }

  // ── 6. MARITIME PHOTO ──────────────────────────────────────────────
  const userAsksMaritime = /maritime|portuaire|navigation|stcw|bateau|navire|quai/i.test(userText);
  if (userAsksMaritime && !residenceInUser && !userAsksBus) {
    keys.push('maritime_photo');
  }

  // ── 7. ATELIER ÉLECTRICITÉ & ÉNERGIES ───────────────────────────────
  const userAsksElec = /[eé]lectrotechnique|[eé]lectricit[eé]|[eé]nergie renouvelable|solaire|banc d'essai/i.test(userText);
  if (userAsksElec) {
    keys.push('electricite');
  }

  // ── 8. ATELIER BOIS & MENUISERIE ───────────────────────────────────
  const userAsksBois = /menuiserie|[eé]b[eé]nisterie|bois|charpente/i.test(userText);
  if (userAsksBois) {
    keys.push('bois');
  }

  // ── 9. BIBLIOTHÈQUE & CADRE DE TRAVAIL ─────────────────────────────
  const userAsksBiblio = /biblioth[eè]que|salle de lecture|cadre d'[eé]tude/i.test(userText);
  if (userAsksBiblio) {
    keys.push('bibliotheque');
  }

  // ── 10. ÉTUDES À L'ÉTRANGER ────────────────────────────────────────
  const userAsksEtranger = /[eé]tudier [aà] l'[eé]tranger|partenariat international|universit[eé]s? partenaires?|visa/i.test(userText);
  if (userAsksEtranger) {
    keys.push('etranger');
  }

  // Return at most 2 media files per message to avoid spamming WhatsApp
  return [...new Set(keys)].slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
async function sendContextualMedia(phone, userText, aiResponse, lang) {
  const keys = detectMediaKeys(userText, aiResponse, lang);
  if (keys.length === 0) return;

  const isMessenger = phone.startsWith('messenger:');
  const recipientId = isMessenger ? phone.split(':')[1] : phone;

  console.log(`[MEDIA] 📎 Sending ${keys.length} media file(s) to ...${recipientId.slice(-4)} (${isMessenger ? 'Messenger' : 'WhatsApp'}): [${keys.join(', ')}]`);

  for (const key of keys) {
    const media = MEDIA[key];
    if (!media) continue;

    // Check if the physical file exists on disk
    const localFilePath = path.join(MEDIA_DIR, media.file);
    if (!fs.existsSync(localFilePath)) {
      console.warn(`[MEDIA] ⚠️ Missing file on disk: "${media.file}" at ${localFilePath}. Skipping to avoid Meta 404.`);
      continue;
    }

    const url = `${BASE_URL}/media/${encodeURIComponent(media.file)}`;
    try {
      if (isMessenger) {
        if (media.type === 'image') {
          await messenger.sendImageMessage(recipientId, url);
        } else {
          await messenger.sendDocumentMessage(recipientId, url);
        }
      } else {
        if (media.type === 'image') {
          await whatsapp.sendImageMessage(recipientId, url, media.caption);
        } else {
          await whatsapp.sendDocumentMessage(recipientId, url, media.file, media.caption);
        }
      }
      console.log(`[MEDIA] ✅ Sent: ${media.file}`);
    } catch (err) {
      console.error(`[MEDIA] ❌ Failed to send ${media.file}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 600));
  }
}


module.exports = { sendContextualMedia };
