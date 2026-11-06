'use strict';
require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://isetag-chatbot.onrender.com/webhook/whatsapp';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// Paramètres de charge
const TOTAL_PROSPECTS = 500;       // 500 étudiants distincts
const CONCURRENCY_LIMIT = 5;       // 5 étudiants écrivent en parallèle pour respecter les quotas Groq
const DELAY_BETWEEN_QUESTIONS_MS = 2000; // 2s entre chaque message d'un même étudiant

// Banques de questions thématiques et réalistes
const FIRST_NAMES = [
  'Junior', 'Brenda', 'Arnaud', 'Christelle', 'Boris', 'Vanessa', 'Cedric', 'Carine',
  'Patrick', 'Diane', 'Emmanuel', 'Priscille', 'Marc', 'Fabiola', 'Yannick', 'Sandrine',
  'Kevin', 'Laure', 'Franck', 'Estelle', 'Joel', 'Audrey', 'Thierry', 'Muriel', 'Brice',
  'David', 'Grace', 'Michel', 'Ines', 'Gael', 'Rosine', 'Serge', 'Tatiana', 'Alain'
];

const QUESTION_CHAINS = [
  // Chaîne 1 : Inscription & Frais BTS
  [
    "Bonjour, je m'appelle {NAME}, je viens d'avoir mon BAC",
    "Quelles sont les filières disponibles en BTS chez vous ?",
    "Combien coûtent les frais de scolarité pour Génie Logiciel ?",
    "Est-ce qu'on peut payer la scolarité en plusieurs tranches ?",
    "Comment faire ma pré-inscription en ligne ?"
  ],
  // Chaîne 2 : Logement & Cité U
  [
    "Bonjour ! Est-ce que l'ISETAG dispose d'une cité universitaire ?",
    "C'est combien le prix d'une chambre par mois ?",
    "Est-ce que l'eau et le wifi sont inclus dans le loyer ?",
    "Où se trouve exactement le campus à Yassa ?"
  ],
  // Chaîne 3 : Orientation hésitante
  [
    "Salut, je suis un peu perdu et je ne sais pas quelle filière choisir",
    "J'aime l'informatique, les réseaux et dépanner des ordinateurs",
    "Y a-t-il des stages garantis pendant la formation ?",
    "Merci beaucoup pour vos conseils !"
  ],
  // Chaîne 4 : Cours du soir & Travailleurs
  [
    "Bonsoir, est-ce que vous proposez des formations en cours du soir ?",
    "Quels sont les horaires des cours du soir ?",
    "Combien coûte la Licence professionnelle en cours du soir ?",
    "Est-ce que le diplôme est le même que pour les cours de jour ?"
  ],
  // Chaîne 5 : Cursus anglophone (HND)
  [
    "Hello, my name is {NAME}. Do you have an English section?",
    "What are the available HND specialties in Technology?",
    "How much are the tuition fees for HND Software Engineering?",
    "Are international partnerships available for studies abroad?"
  ],
  // Chaîne 6 : Formation Professionnelle & Métiers
  [
    "Bonjour, proposez-vous des formations professionnelles rapides de moins d'un an ?",
    "Quelles sont les spécialités industrielles comme la soudure ou la mécatronique ?",
    "Est-ce vrai qu'il y a une réduction de 10% si on paie la totalité à l'inscription ?",
    "D'accord, quel numéro contacter pour parler avec un responsable ?"
  ]
];

function generateProspect(index) {
  const name = FIRST_NAMES[index % FIRST_NAMES.length] + ' ' + (index + 1);
  const phone = '237699' + String(100000 + index).slice(1);
  const chainTemplate = QUESTION_CHAINS[index % QUESTION_CHAINS.length];
  const messages = chainTemplate.map(msg => msg.replace('{NAME}', name));

  return { name, phone, messages };
}

function sendWebhookMessage(phone, userName, text) {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '2353715448504856',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '237640797559',
                phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '1426952887169067'
              },
              contacts: [{ profile: { name: userName }, wa_id: phone }],
              messages: [
                {
                  from: phone,
                  id: `wamid.SIM500_${phone}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: text },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  const bodyStr = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json' };

  if (APP_SECRET) {
    const signature = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(bodyStr).digest('hex');
    headers['x-hub-signature-256'] = signature;
  }

  return fetch(WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: bodyStr
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Traite un étudiant complet (tous ses messages de conversation)
async function simulateStudent(student, studentIndex, stats) {
  console.log(`[Étudiant #${studentIndex + 1}/${TOTAL_PROSPECTS}] 👤 ${student.name} (${student.phone}) commence sa session...`);

  for (let i = 0; i < student.messages.length; i++) {
    const msg = student.messages[i];
    stats.totalSent++;
    const t0 = Date.now();

    try {
      const res = await sendWebhookMessage(student.phone, student.name, msg);
      const lat = Date.now() - t0;

      if (res.status === 200) {
        stats.success++;
        process.stdout.write(`  [${student.name}] Msg ${i + 1}/${student.messages.length} ✅ (${lat}ms)\n`);
      } else {
        stats.failed++;
        process.stdout.write(`  [${student.name}] Msg ${i + 1}/${student.messages.length} ⚠️ Status ${res.status}\n`);
      }
    } catch (err) {
      stats.failed++;
      process.stdout.write(`  [${student.name}] Msg ${i + 1} ❌ Erreur réseau: ${err.message}\n`);
    }

    // Pause réaliste entre deux questions d'un même étudiant
    await sleep(DELAY_BETWEEN_QUESTIONS_MS);
  }
}

async function runMegaTest() {
  console.log(`\n================================================================`);
  console.log(`🚀 TEST DE CHARGE MASSIF — 500 ÉTUDIANTS / CONVERSATIONS MULTI-TOURS`);
  console.log(`📡 URL Webhook : ${WEBHOOK_URL}`);
  console.log(`👥 Nombre total d'étudiants : ${TOTAL_PROSPECTS}`);
  console.log(`💬 Questions estimées : ~${TOTAL_PROSPECTS * 4} messages`);
  console.log(`⚡ Concurrence : ${CONCURRENCY_LIMIT} étudiants en parallèle`);
  console.log(`================================================================\n`);

  const stats = { totalSent: 0, success: 0, failed: 0 };
  const startTime = Date.now();

  // File d'attente concurrente
  let studentCursor = 0;

  async function worker(workerId) {
    while (studentCursor < TOTAL_PROSPECTS) {
      const currentIndex = studentCursor++;
      if (currentIndex >= TOTAL_PROSPECTS) break;

      const student = generateProspect(currentIndex);
      await simulateStudent(student, currentIndex, stats);
    }
  }

  // Démarrer les workers en parallèle
  const workers = [];
  for (let w = 0; w < CONCURRENCY_LIMIT; w++) {
    workers.push(worker(w));
  }

  await Promise.all(workers);

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n================================================================`);
  console.log(`🎉 TEST MASSIF TERMINÉ !`);
  console.log(`================================================================`);
  console.log(`📤 Total des messages envoyés : ${stats.totalSent}`);
  console.log(`✅ Messages reçus et traités avec succès : ${stats.success}`);
  console.log(`❌ Échecs : ${stats.failed}`);
  console.log(`⏱️ Temps total d'exécution : ${totalTimeSec} secondes`);
  console.log(`📈 Débit moyen : ${(stats.totalSent / (totalTimeSec || 1)).toFixed(2)} msg/sec`);
  console.log(`================================================================`);
  console.log(`\n👉 Ouvre ton Dashboard Admin :`);
  console.log(`   https://isetag-chatbot.onrender.com`);
  console.log(`   Tu y trouveras les 500 conversations complètes avec toutes les analyses IA !\n`);
}

runMegaTest();

