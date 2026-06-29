'use strict';

/**
 * ══════════════════════════════════════════════════════════════
 *  ISETAG — Service d'Orientation Académique
 *  Guides undecided students through a structured questionnaire
 *  (parcours scolaire → intérêts → compétences → projet pro)
 *  and recommends the best-fitting ISETAG specialty.
 * ══════════════════════════════════════════════════════════════
 */

// ──────────────────────────────────────────────
//  QUESTIONNAIRE STEPS (bilingual)
// ──────────────────────────────────────────────
const STEPS = [
  // ── SECTION I : PARCOURS SCOLAIRE ──────────────────
  {
    id: 'fav_subjects',
    section: 'I',
    fr: '📚 *Section I — Ton Parcours Scolaire*\n\n*Question 1/9*\nQuelles matières aimais-tu le plus au secondaire ?\n_(Ex: mathématiques, français, physique, biologie, dessin, histoire…)_',
    en: '📚 *Section I — Your Academic Background*\n\n*Question 1/9*\nWhich subjects did you enjoy the most in secondary school?\n_(e.g. mathematics, French, physics, biology, drawing, history…)_',
  },
  {
    id: 'best_subjects',
    section: 'I',
    fr: '*Question 2/9*\nDans quelles matières réussissais-tu le mieux ?\n_(Celles où tu avais de bonnes notes ou te sentais à l\'aise)_',
    en: '*Question 2/9*\nIn which subjects did you perform best?\n_(Where you got good grades or felt confident)_',
  },
  {
    id: 'hard_subjects',
    section: 'I',
    fr: '*Question 3/9*\nQuelles matières trouvais-tu difficiles ?\n_(Sois honnête, c\'est pour mieux t\'orienter 😊)_',
    en: '*Question 3/9*\nWhich subjects did you find difficult?\n_(Be honest, it helps us guide you better 😊)_',
  },
  // ── SECTION II : INTÉRÊTS & GOÛTS ─────────────────
  {
    id: 'hobbies',
    section: 'II',
    fr: '🎯 *Section II — Tes Intérêts*\n\n*Question 4/9*\nQu\'aimes-tu faire pendant ton temps libre ?\n_(Ex: bricoler, dessiner, coder, vendre, lire, aider les autres, jouer à des jeux…)_',
    en: '🎯 *Section II — Your Interests*\n\n*Question 4/9*\nWhat do you like to do in your free time?\n_(e.g. building things, drawing, coding, selling, reading, helping people, gaming…)_',
  },
  {
    id: 'work_style',
    section: 'II',
    fr: '*Question 5/9*\nTu préfères travailler avec :\n\n1️⃣ Les chiffres (calculs, finances, stats)\n2️⃣ Les mots (écriture, communication, langues)\n3️⃣ Les personnes (vente, conseil, management)\n4️⃣ La technique (machines, réparations, électricité)\n5️⃣ Les idées (design, création, innovation)\n\nRéponds avec le(s) numéro(s) ou décris ta préférence.',
    en: '*Question 5/9*\nYou prefer working with:\n\n1️⃣ Numbers (calculations, finance, stats)\n2️⃣ Words (writing, communication, languages)\n3️⃣ People (sales, advising, management)\n4️⃣ Technology (machines, repairs, electricity)\n5️⃣ Ideas (design, creation, innovation)\n\nReply with the number(s) or describe your preference.',
  },
  {
    id: 'interest_domain',
    section: 'II',
    fr: '*Question 6/9*\nQuels domaines t\'intéressent le plus ?\n_(Ex: informatique, commerce, mécanique, maritime, énergie solaire, design, gestion, droit, logistique…)_',
    en: '*Question 6/9*\nWhich professional fields interest you the most?\n_(e.g. IT, business, mechanics, maritime, solar energy, design, management, law, logistics…)_',
  },
  // ── SECTION III : COMPÉTENCES ──────────────────────
  {
    id: 'skills',
    section: 'III',
    fr: '💡 *Section III — Tes Compétences*\n\n*Question 7/9*\nTu es à l\'aise avec (choisis tout ce qui s\'applique) :\n\nA — Le travail en équipe\nB — Le travail individuel\nC — La prise de parole / négociation\nD — L\'organisation et la planification\nE — L\'informatique / les outils numériques\nF — La rédaction et l\'expression écrite\n\nRéponds avec les lettres (ex: A, C, E)',
    en: '💡 *Section III — Your Skills*\n\n*Question 7/9*\nYou are comfortable with (choose all that apply):\n\nA — Teamwork\nB — Working independently\nC — Public speaking / negotiation\nD — Organization and planning\nE — Computers / digital tools\nF — Writing and communication\n\nReply with the letters (e.g. A, C, E)',
  },
  // ── SECTION IV : PROJET PROFESSIONNEL ─────────────
  {
    id: 'dream_job',
    section: 'IV',
    fr: '🚀 *Section IV — Ton Projet Professionnel*\n\n*Question 8/9*\nQuel métier souhaites-tu exercer plus tard ?\n_(Si tu n\'as pas encore d\'idée précise, décris le type de travail qui t\'attire)_',
    en: '🚀 *Section IV — Your Career Project*\n\n*Question 8/9*\nWhat job or career do you dream of having?\n_(If unsure, describe the type of work that appeals to you)_',
  },
  {
    id: 'study_duration',
    section: 'IV',
    fr: '*Question 9/9* _(Dernière question ! 🎉)_\nPrévois-tu :\n\n1️⃣ Travailler rapidement après un BTS/HND (2 ans)\n2️⃣ Continuer jusqu\'à la Licence/Bachelor (3 ans)\n3️⃣ Aller jusqu\'au Master (5 ans)\n4️⃣ Pas encore décidé\n\nRéponds avec le numéro correspondant.',
    en: '*Question 9/9* _(Last question! 🎉)_\nDo you plan to:\n\n1️⃣ Start working quickly after a BTS/HND (2 years)\n2️⃣ Continue to a Bachelor\'s Degree (3 years)\n3️⃣ Go all the way to a Master\'s (5 years)\n4️⃣ Not decided yet\n\nReply with the corresponding number.',
  },
];

// ──────────────────────────────────────────────
//  ORIENTATION DETECTION
//  Detects when the user says they don't know what to study
// ──────────────────────────────────────────────
const UNDECIDED_TRIGGERS_FR = [
  'je ne sais pas', 'je sais pas', 'pas sure', 'pas sûr', 'pas sûre',
  'indécis', 'indecis', 'pas décidé', 'pas decide', 'hesit', 'hésit',
  'quelle filière', 'quelle filiere', 'quel domaine choisir', 'quoi choisir',
  'aide moi choisir', 'aide moi à choisir', 'je ne sais pas quoi faire',
  'pas encore décidé', 'perdu', 'lost', 'orientat', 'conseil',
  'je ne sais pas quelle', 'm\'orienter', 'm orienter', 'choisir ma filiere',
  'choisir une filiere', 'choisir filiere', 'quelle formation', 'laquelle choisir',
];
const UNDECIDED_TRIGGERS_EN = [
  'don\'t know', 'dont know', 'not sure', 'undecided', 'no idea',
  'which course', 'which program', 'which field', 'help me choose',
  'what to study', 'what should i study', 'confused', 'lost',
  'orientation', 'guidance', 'advise me', 'not decided',
];

/**
 * Returns true if the user's message suggests they don't know what to study.
 * @param {string} text
 * @returns {boolean}
 */
function isUndecided(text) {
  if (!text) return false;
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (
    UNDECIDED_TRIGGERS_FR.some(t => lower.includes(t)) ||
    UNDECIDED_TRIGGERS_EN.some(t => lower.includes(t))
  );
}

// ──────────────────────────────────────────────
//  START ORIENTATION SESSION
// ──────────────────────────────────────────────
/**
 * Initialises the orientation flow on the session.
 * @param {object} session  — the Redis session object
 * @param {string} lang     — 'fr' | 'en'
 * @returns {string}  The first question to send
 */
function startOrientation(session, lang) {
  session.orientation = {
    active: true,
    stepIndex: 0,
    answers: {},
  };

  const intro = lang === 'en'
    ? `🎓 *ISETAG Academic Orientation*\n\nNo worries! I'm here to help you find the right path.\nI'll ask you *9 short questions* about your background, interests, and goals.\nBased on your answers, I'll recommend the ISETAG specialty that suits you best.\n\nLet's start! ⬇️\n\n`
    : `🎓 *Orientation Académique ISETAG*\n\nPas de panique ! Je suis là pour t\'aider à trouver ta voie.\nJe vais te poser *9 courtes questions* sur ton parcours, tes intérêts et tes objectifs.\nEn fonction de tes réponses, je te recommanderai la filière ISETAG qui te correspond.\n\nC'est parti ! ⬇️\n\n`;

  return intro + STEPS[0][lang];
}

// ──────────────────────────────────────────────
//  ADVANCE QUESTIONNAIRE
// ──────────────────────────────────────────────
/**
 * Records the current answer, advances to the next step.
 * @param {object} session
 * @param {string} userText  — the user's answer
 * @param {string} lang
 * @returns {{ text: string, done: boolean, answers: object }}
 */
function advanceOrientation(session, userText, lang) {
  const orient = session.orientation;
  const currentStep = STEPS[orient.stepIndex];

  // Store the answer
  orient.answers[currentStep.id] = userText.trim();

  orient.stepIndex += 1;

  // More questions remain?
  if (orient.stepIndex < STEPS.length) {
    return {
      text: STEPS[orient.stepIndex][lang],
      done: false,
      answers: orient.answers,
    };
  }

  // All questions answered — generate recommendation
  orient.active = false;
  const recommendation = generateRecommendation(orient.answers, lang);
  return {
    text: recommendation,
    done: true,
    answers: orient.answers,
  };
}

// ──────────────────────────────────────────────
//  RECOMMENDATION ENGINE
// ──────────────────────────────────────────────
/**
 * Analyses collected answers and returns a personalised recommendation.
 * Uses a keyword-scoring approach across all ISETAG domains.
 * @param {object} answers
 * @param {string} lang
 * @returns {string}
 */
function generateRecommendation(answers, lang) {
  const allText = Object.values(answers).join(' ').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ── Domain scoring ─────────────────────────────────────────────
  const scores = {
    tic: 0,         // TIC — Informatique, Web, IA
    commerce: 0,    // Commerce, Marketing, Droit
    industrie: 0,   // Mécatronique, Menuiserie, Énergies renouvelables
    maritime: 0,    // Maritime, Logistique portuaire
  };

  // TIC signals
  const ticWords = [
    'informatique', 'code', 'coder', 'programmation', 'programmer', 'logiciel',
    'reseau', 'internet', 'web', 'site', 'design', 'graphisme', 'infographie',
    'intelligence artificielle', 'ia', 'ai', 'numerique', 'digital', 'e-commerce',
    'marketing digital', 'application', 'ordinateur', 'computer', 'tech',
    'software', 'developer', 'cybersecurite', 'cybersecurity', 'ideees', 'ideas',
    'creation', 'creer', 'inventer', '5', 'e',
  ];
  // Commerce signals
  const commerceWords = [
    'commerce', 'vente', 'marketing', 'gestion', 'management', 'administration',
    'droit', 'law', 'negociation', 'negotiation', 'finance', 'comptabilite',
    'accounting', 'entreprendre', 'business', 'client', 'communication',
    'parler', 'persuader', 'douane', 'transit', 'import', 'export',
    'international', 'chiffres', 'numbers', '1', '3', 'c',
  ];
  // Industrie signals
  const industrieWords = [
    'mecanique', 'mecatronique', 'mechatronic', 'electricite', 'electricity',
    'electronique', 'electronic', 'solaire', 'solar', 'energie', 'energy',
    'renouvelable', 'renewable', 'menuiserie', 'bois', 'wood', 'bricoler',
    'bricolage', 'reparer', 'repair', 'machine', 'moteur', 'motor',
    'industrie', 'industry', 'technique', 'technical', 'atelier', '4',
  ];
  // Maritime signals
  const maritimeWords = [
    'maritime', 'bateau', 'ship', 'navire', 'port', 'mer', 'sea', 'ocean',
    'logistique', 'logistics', 'transport', 'douane', 'transit', 'cargo',
    'navigation', 'nautique', 'nautical', 'electromecan', 'electromecanique',
    'navale', 'naval', 'international',
  ];

  for (const w of ticWords)       { if (allText.includes(w)) scores.tic       += 2; }
  for (const w of commerceWords)  { if (allText.includes(w)) scores.commerce  += 2; }
  for (const w of industrieWords) { if (allText.includes(w)) scores.industrie += 2; }
  for (const w of maritimeWords)  { if (allText.includes(w)) scores.maritime  += 2; }

  // ── Work style modifier (question 5) ───────────────────────────
  const workStyle = (answers.work_style || '').toLowerCase();
  if (workStyle.includes('1') || workStyle.includes('chiffre') || workStyle.includes('number')) {
    scores.commerce += 3;
  }
  if (workStyle.includes('5') || workStyle.includes('idee') || workStyle.includes('idea') || workStyle.includes('creation')) {
    scores.tic += 3;
  }
  if (workStyle.includes('4') || workStyle.includes('technique') || workStyle.includes('technical')) {
    scores.industrie += 3;
    scores.maritime  += 2;
  }
  if (workStyle.includes('3') || workStyle.includes('personne') || workStyle.includes('people')) {
    scores.commerce  += 3;
    scores.maritime  += 2;
  }
  if (workStyle.includes('2') || workStyle.includes('mot') || workStyle.includes('word')) {
    scores.commerce += 2;
    scores.tic      += 1;
  }

  // ── Study duration modifier (question 9) ───────────────────────
  const duration = (answers.study_duration || '').toLowerCase();
  if (duration.includes('1') || duration.includes('bts') || duration.includes('hnd')) {
    // No change — all options available
  }
  if (duration.includes('4') || duration.includes('master')) {
    // Master exists for all domains — small boost to tic & commerce
    scores.tic      += 1;
    scores.commerce += 1;
  }

  // ── Pick winner ────────────────────────────────────────────────
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top    = ranked[0][0];
  const second = ranked[1][0];

  // ── Domain descriptions ────────────────────────────────────────
  const domainDetails = {
    fr: {
      tic: {
        name: '💻 Technologies de l\'Information et de la Communication (TIC)',
        specialties: 'Génie Logiciel · Infographie & Web Design · E-commerce · Marketing Numérique · Intelligence Artificielle',
        why: 'Tu as un profil créatif/technique. Ces filières te permettront de coder, concevoir des sites web, créer des applications ou piloter des campagnes numériques.',
        careers: 'Développeur web, Designer UI/UX, Responsable e-commerce, Data Analyst, Ingénieur en IA',
        duration: 'BTS/HND (2 ans) · Licence (3 ans) · Master (5 ans)',
      },
      commerce: {
        name: '📊 Commerce – Gestion – Droit',
        specialties: 'Marketing · Commerce et Vente · Commerce International · Douane & Transit',
        why: 'Tu as un sens du relationnel et des aptitudes pour le commerce. Tu sauras négocier, vendre, gérer et communiquer avec les autres.',
        careers: 'Commercial, Responsable marketing, Gestionnaire, Juriste d\'entreprise, Agent en douane',
        duration: 'BTS/HND (2 ans) · Licence (3 ans) · Master (5 ans)',
      },
      industrie: {
        name: '⚙️ Industrie et Technologie',
        specialties: 'Mécatronique · Menuiserie-Ébénisterie · Énergies Renouvelables (solaire)',
        why: 'Tu es manuel, technique et tu aimes comprendre comment les choses fonctionnent. Ces filières sont faites pour toi !',
        careers: 'Technicien en mécatronique, Électricien, Technicien solaire, Menuisier/Ébéniste, Technicien de maintenance',
        duration: 'BTS/HND (2 ans)',
      },
      maritime: {
        name: '⚓ Sciences Portuaires et Maritimes',
        specialties: 'Électromécanique Navale · Gestion Logistique Portuaire & Maritime · Sciences Nautiques',
        why: 'Le secteur maritime te correspond : tu aimes le transport, la logistique, et tu es attisé par les métiers du port et de la mer.',
        careers: 'Gestionnaire logistique, Agent maritime, Technicien naval, Officier de navigation',
        duration: 'Cursus de 4 ans (double diplôme possible avec le Ghana ou la Chine)',
      },
    },
    en: {
      tic: {
        name: '💻 Information & Communication Technologies (ICT)',
        specialties: 'Software Engineering · Graphic Design & Web Design · E-commerce · Digital Marketing · Artificial Intelligence',
        why: 'You have a creative/technical profile. These programs will let you code, design websites, build apps, or manage digital campaigns.',
        careers: 'Web Developer, UI/UX Designer, E-commerce Manager, Data Analyst, AI Engineer',
        duration: 'HND (2 yrs) · Bachelor\'s (3 yrs) · Master\'s (5 yrs)',
      },
      commerce: {
        name: '📊 Business – Management – Law',
        specialties: 'Marketing · Sales & Commerce · International Business · Customs & Transit',
        why: 'You have strong people skills and a business mindset. You\'ll excel at negotiating, selling, managing, and communicating.',
        careers: 'Sales Representative, Marketing Manager, Business Administrator, Customs Agent, Lawyer',
        duration: 'HND (2 yrs) · Bachelor\'s (3 yrs) · Master\'s (5 yrs)',
      },
      industrie: {
        name: '⚙️ Industry & Technology',
        specialties: 'Mechatronics · Carpentry/Joinery · Renewable Energies (Solar)',
        why: 'You\'re hands-on, technical, and love understanding how things work. These programs are made for you!',
        careers: 'Mechatronics Technician, Electrician, Solar Technician, Carpenter, Maintenance Technician',
        duration: 'HND (2 yrs)',
      },
      maritime: {
        name: '⚓ Port & Maritime Sciences',
        specialties: 'Naval Electromechanics · Port & Maritime Logistics · Nautical Sciences',
        why: 'Maritime suits you: you\'re drawn to transport, logistics, and the world of ports and seafaring.',
        careers: 'Logistics Manager, Maritime Agent, Naval Technician, Navigation Officer',
        duration: '4-year program (double degree possible with Ghana or China)',
      },
    },
  };

  const d = domainDetails[lang];
  const topDomain    = d[top];
  const secondDomain = d[second];

  // ── Build recommendation message ──────────────────────────────
  const formUrl = `${process.env.APP_URL || 'https://isetag.cm'}/preinscription`;

  if (lang === 'en') {
    return `✅ *Your Orientation Result*\n\n` +
      `Based on your answers, here is my personalised recommendation:\n\n` +
      `🥇 *Primary recommendation:*\n` +
      `*${topDomain.name}*\n` +
      `📌 Specialties: ${topDomain.specialties}\n` +
      `💬 Why? ${topDomain.why}\n` +
      `👔 Careers: ${topDomain.careers}\n` +
      `📅 Duration: ${topDomain.duration}\n\n` +
      `🥈 *You could also consider:*\n` +
      `*${secondDomain.name}*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🚀 *Ready to secure your spot?*\n` +
      `Submit your FREE pre-registration online — no payment required, no commitment:\n` +
      `👉 ${formUrl}\n\n` +
      `📋 Questions about *${topDomain.name}*, admissions, or fees? Just ask!\n` +
      `📞 Call us: *+237 676 079 849 / 690 609 511*`;
  }

  return `✅ *Résultat de ton Orientation*\n\n` +
    `En fonction de tes réponses, voici ma recommandation personnalisée :\n\n` +
    `🥇 *Recommandation principale :*\n` +
    `*${topDomain.name}*\n` +
    `📌 Spécialités : ${topDomain.specialties}\n` +
    `💬 Pourquoi ? ${topDomain.why}\n` +
    `👔 Métiers visés : ${topDomain.careers}\n` +
    `📅 Durée : ${topDomain.duration}\n\n` +
    `🥈 *Tu pourrais aussi envisager :*\n` +
    `*${secondDomain.name}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚀 *Prêt(e) à réserver ta place ?*\n` +
    `Dépose ta pré-inscription GRATUITEMENT en ligne — sans frais, sans engagement :\n` +
    `👉 ${formUrl}\n\n` +
    `📋 Besoin d'infos sur *${topDomain.name}*, les admissions ou les frais ? Demande-moi !\n` +
    `📞 Nous appeler : *+237 676 079 849 / 690 609 511*`;
}

// ──────────────────────────────────────────────
//  ABORT MESSAGE (if user wants to stop)
// ──────────────────────────────────────────────
const ABORT_TRIGGERS = ['stop', 'annuler', 'cancel', 'quitter', 'quit', 'exit', 'arreter', 'arrete', 'non merci'];

function isAbortRequest(text) {
  const lower = text.toLowerCase().trim();
  return ABORT_TRIGGERS.some(t => lower.includes(t));
}

function abortMessage(lang) {
  return lang === 'en'
    ? '🔄 Orientation cancelled. No worries — feel free to ask me anything about ISETAG programs whenever you\'re ready!'
    : '🔄 Orientation annulée. Pas de problème — tu peux me poser toute question sur les filières ISETAG quand tu veux !';
}

// ──────────────────────────────────────────────
//  PROGRESS BAR HELPER
// ──────────────────────────────────────────────
function progressBar(stepIndex, total) {
  const filled = Math.round((stepIndex / total) * 10);
  return '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${stepIndex}/${total}`;
}

module.exports = {
  STEPS,
  isUndecided,
  isAbortRequest,
  startOrientation,
  advanceOrientation,
  abortMessage,
  progressBar,
};
