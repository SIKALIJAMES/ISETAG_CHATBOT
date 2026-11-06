'use strict';
require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');

// Configuration
const WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'https://isetag-chatbot.onrender.com/webhook/whatsapp';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// Scénarios d'utilisateurs réalistes
const TEST_USERS = [
  {
    name: 'Paul',
    phone: '237670000001',
    messages: [
      'Bonjour',
      'Quelles sont les filières en cycle BTS ?',
      'Combien coûte la scolarité en Génie Logiciel ?',
      'Comment faire pour s\'inscrire ?'
    ]
  },
  {
    name: 'Aline',
    phone: '237670000002',
    messages: [
      'Hello',
      'Avez-vous des chambres pour les étudiants ?',
      'C\'est combien par mois la cité U ?',
      'Où se trouve le campus exactement ?'
    ]
  },
  {
    name: 'Kevin',
    phone: '237670000003',
    messages: [
      'Salut, je ne sais pas trop quoi choisir après mon bac',
      'J\'aime l\'informatique et le dessin',
      'Est-ce qu\'il y a des stages garantis ?'
    ]
  },
  {
    name: 'Sarah',
    phone: '237670000004',
    messages: [
      'Bonjour, est-ce que vous proposez des cours du soir ?',
      'Quels sont les tarifs du soir pour la licence ?',
      'Merci beaucoup pour les informations'
    ]
  },
  {
    name: 'John',
    phone: '237670000005',
    messages: [
      'Hello, do you have an English section?',
      'What are the HND programs available?',
      'Thank you'
    ]
  }
];

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
                  id: `wamid.SIM_${phone}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
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

async function runMassiveTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 DÉBUT DU TEST DE CHARGE MULTI-UTILISATEURS`);
  console.log(`📡 Cible : ${WEBHOOK_URL}`);
  console.log(`👥 Utilisateurs simulés : ${TEST_USERS.length}`);
  console.log(`======================================================\n`);

  let totalSent = 0;
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (const user of TEST_USERS) {
    console.log(`\n💬 [Utilisateur ${user.name}] (...${user.phone.slice(-4)}) démarre sa discussion :`);
    
    for (const msg of user.messages) {
      totalSent++;
      const t0 = Date.now();
      try {
        process.stdout.write(`   ➡️  "${msg}" ... `);
        const res = await sendWebhookMessage(user.phone, user.name, msg);
        const duration = Date.now() - t0;

        if (res.status === 200) {
          successCount++;
          console.log(`✅ OK (${res.status}) [${duration}ms]`);
        } else {
          failCount++;
          console.log(`⚠️ Erreur (${res.status}) [${duration}ms]`);
        }
      } catch (err) {
        failCount++;
        console.log(`❌ Échec réseau: ${err.message}`);
      }

      // Petite pause réaliste entre deux questions d'un même étudiant (1.5s)
      await sleep(1500);
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n======================================================`);
  console.log(`📊 RÉSULTATS DU TEST MASSIF`);
  console.log(`======================================================`);
  console.log(`📤 Messages envoyés : ${totalSent}`);
  console.log(`✅ Succès reçus par Render : ${successCount}/${totalSent}`);
  console.log(`❌ Échecs : ${failCount}`);
  console.log(`⏱️ Durée totale : ${totalDuration}s`);
  console.log(`======================================================\n`);
  console.log(`👉 Tu peux aller voir sur ton Dashboard Admin :`);
  console.log(`   https://isetag-chatbot.onrender.com`);
  console.log(`   Toutes ces conversations et réponses y sont enregistrées !\n`);
}

runMassiveTest();

