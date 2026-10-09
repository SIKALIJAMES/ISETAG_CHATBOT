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

  // ── NOUVEAUX ASSETS (images_brutes_1) ──────────────────────────────────────
  mecanique_auto: {
    type: 'image',
    file: 'atelier_mecanique_automobile.jpeg',
    caption: '🔧 *Atelier de Mécanique Automobile — ISETAG*\n• Plusieurs véhicules en maintenance simultanée\n• Combinaisons professionnelles, outillage complet et encadrement expert\n• Filières : BTS Mécanique Automobile & Mécatronique.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  mecanique_bus: {
    type: 'image',
    file: 'atelier_mecanique_pratique_bus.jpeg',
    caption: '🔧🚌 *Pratique sur Bus — Mécanique Automobile ISETAG*\n• Travaux pratiques directement sur minibus en conditions réelles\n• Étudiants encadrés en combinaison ISETAG officielle.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  informatique: {
    type: 'image',
    file: 'salle_informatique.jpeg',
    caption: '💻 *Salle Informatique ISETAG — Équipements Modernes*\n• Postes fixes + portables, réseau haut-débit, climatisation\n• Formations : IGL, IWD, MSI, Infographie, Télécoms.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  genie_electrique: {
    type: 'image',
    file: 'atelier_genie_electrique.jpeg',
    caption: '⚡ *Atelier Génie Électrique & Électronique — ISETAG*\n• Bancs d\'essai électriques, moteurs, câblage industriel\n• Filières : BTS Électrotechnique, Électronique & Automatisme.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  froid_clim: {
    type: 'image',
    file: 'atelier_froid_climatisation.jpeg',
    caption: '❄️ *Filière Froid & Climatisation — ISETAG*\n• Maintenance d\'unités de climatisation industrielle en conditions réelles\n• Compresseurs, serpentins, ventilateurs : pratique totale !\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  genie_civil: {
    type: 'image',
    file: 'atelier_genie_civil.jpeg',
    caption: '🏗️ *Atelier Génie Civil & Topographie — ISETAG*\n• Maquettes de ponts, plans architecturaux, théodolites et niveaux\n• BTS Bâtiment & Travaux Publics : formation complète terrain + bureau.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  biblio_isetag: {
    type: 'image',
    file: 'bibliotheque_isetag.jpeg',
    caption: '📚 *Bibliothèque ISETAG — Espaces de Lecture & Recherche*\n• Ouvrages spécialisés toutes filières, Wi-Fi haut débit\n• Étudiants en uniforme officiel dans un cadre studieux d\'excellence.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  salle_classe: {
    type: 'image',
    file: 'salle_classe_isetag.jpeg',
    caption: '🎓 *Salles de Cours ISETAG — Discipline & Excellence*\n• Uniformes officiels (blanc + casquette de marin) pour tous les étudiants\n• Ambiance académique sérieuse et cadre d\'apprentissage motivant.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  campus_facade: {
    type: 'image',
    file: 'campus_facade_isetag.jpeg',
    caption: '🏛️ *Campus ISETAG — Façade Principale (Yassa, Douala)*\n• Logo ISETAG visible à l\'entrée, bâtiments modernes multi-niveaux\n• Situé à 100m de Tradex Yassa, vers l\'Hôpital Gynéco-Obstétrique.\n🌐 Site web : https://www.isetag.cm',
  },
  mecatronique_moteur: {
    type: 'image',
    file: 'atelier_mecatronique_moteur.jpeg',
    caption: '⚙️ *Atelier Mécatronique — Moteurs Sectionnés ISETAG*\n• Travaux sur moteurs thermiques en coupe : pistons, cylindres, boîte de vitesses\n• Apprentissage complet par la pratique en atelier équipé.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  plomberie: {
    type: 'image',
    file: 'atelier_plomberie_fluides.jpeg',
    caption: '🚿 *Atelier Plomberie & Fluides — ISETAG*\n• Installation sanitaire complète : lavabo, toilettes, pompe à pression\n• Filières : BTS Installation Sanitaire & Maintenance des Systèmes Fluidiques.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  maritime_port_1: {
    type: 'image',
    file: 'maritime_etudiants_port_1.jpeg',
    caption: '⚓ *Étudiants Maritimes ISETAG au Port de Douala*\n• Uniformes marins officiels (veste blanche + casquette de capitaine) offerts\n• Stage au Port Autonome de Douala (PAD) avec grues et navires réels !\n• Double diplôme Licence + Certification Internationale STCW 95.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  maritime_port_2: {
    type: 'image',
    file: 'maritime_etudiants_port_2.jpeg',
    caption: '⚓ *Formation Maritime ISETAG — Immersion au Port de Douala*\n• Étudiants et enseignants sur le quai du port, navire "SPAR GEMINI" en arrière-plan\n• Stages garantis : PAD, PAK (Kribi), MSC, Kloe Shipping et plus.\n🌐 Plus d\'infos : https://www.isetag.cm',
  },
  maritime_port_3: {
    type: 'image',
    file: 'maritime_etudiants_port_3.jpeg',
    caption: '⚓ *Sciences Portuaires & Maritimes — ISETAG Douala*\n• Groupe d\'étudiants en uniforme marin sur le quai du Port Autonome de Douala\n• Filières : Navigation Maritime, Électromécanique Navale, Logistique Portuaire, Pêches.\n🌐 Plus d\'infos : https://www.isetag.cm',
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

  // -- 6. MARITIME PHOTOS (vraies photos du port avec etudiants en uniforme) --
  const userAsksMaritime = /maritime|portuaire|navigation|stcw|bateau|navire|quai|sciences portuaires|glpm|nautique/i.test(userText);
  if (userAsksMaritime && !residenceInUser && !userAsksBus) {
    keys.push('maritime_port_1');
    keys.push('maritime_port_2');
  }

  // ── 7. ATELIER ÉLECTRICITÉ & ÉNERGIES ───────────────────────────────
  const userAsksElec = /[eé]lectrotechnique|[eé]lectricit[eé]|[eé]nergie renouvelable|solaire|banc d'essai/i.test(userText);
  if (userAsksElec) {
    keys.push('electricite');
  }

  // -- 7b. PLOMBERIE & FLUIDES --
  const userAsksPlomberie = /plomberie|fluides|sanitaire|installation sanitaire|robinetterie|tuyauterie/i.test(userText);
  if (userAsksPlomberie) {
    keys.push('plomberie');
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
    keys.push('biblio_isetag'); // photo réelle avec étudiants
  }

  // ── 10. ÉTUDES À L'ÉTRANGER ────────────────────────────────────────
  const userAsksEtranger = /[eé]tudier [aà] l'[eé]tranger|partenariat international|universit[eé]s? partenaires?|visa/i.test(userText);
  if (userAsksEtranger) {
    keys.push('etranger');
  }

  // ── 11. MÉCANIQUE AUTOMOBILE & MÉCATRONIQUE ─────────────────────────
  const userAsksMecaAuto = /m[eé]canique automobile|m[eé]catronique|mav|mka|atelier m[eé]ca|r[eé]paration auto|moteur/i.test(userText);
  if (userAsksMecaAuto) {
    keys.push('mecanique_auto');
    keys.push('mecatronique_moteur');
  }

  // ── 12. INFORMATIQUE & MULTIMÉDIA ──────────────────────────────────
  const userAsksInfo = /informatique|salle machines|labo info|ordinateur|programmation|igl|iwd|msi|multimédia|infographie/i.test(userText);
  if (userAsksInfo) {
    keys.push('informatique');
  }

  // ── 13. GÉNIE ÉLECTRIQUE & ÉLECTRONIQUE ────────────────────────────
  const userAsksElecGenie = /g[eé]nie [eé]lectrique|[eé]lectronique|banc d'essai [eé]lectrique|câblage|elt|automatisme/i.test(userText);
  if (userAsksElecGenie) {
    keys.push('genie_electrique');
  }

  // ── 14. FROID & CLIMATISATION ──────────────────────────────────────
  const userAsksFroid = /froid|climatisation|clim|r[eé]frig[eé]ration|compresseur|maintenance clim/i.test(userText);
  if (userAsksFroid) {
    keys.push('froid_clim');
  }

  // ── 15. GÉNIE CIVIL & TOPOGRAPHIE ──────────────────────────────────
  const userAsksGenieCivil = /g[eé]nie civil|topographie|b[aâ]timent|travaux publics|tpu|construction|architecture/i.test(userText);
  if (userAsksGenieCivil) {
    keys.push('genie_civil');
  }

  // ── 16. SALLE DE CLASSE & VIE ACADÉMIQUE ───────────────────────────
  const userAsksSalle = /salle de classe|uniforme|vie [eé]tudiante|ambiance|cours magistral/i.test(userText);
  if (userAsksSalle) {
    keys.push('salle_classe');
  }

  // ── 17. CAMPUS FAÇADE / LOCALISATION PRÉCISE ───────────────────────
  const userAsksFacade = /fa[çc]ade|entr[eé]e principale|logo isetag|comment est l'[eé]cole/i.test(userText);
  if (userAsksFacade) {
    keys.push('campus_facade');
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
