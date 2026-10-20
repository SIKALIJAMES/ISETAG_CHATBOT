'use strict';
const http = require('http');
const crypto = require('crypto');

const SECRET = process.env.META_APP_SECRET || 'secret_de_test_123';
const PORT = process.env.PORT || 3000;

function sendPost(headers, body) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(body, 'utf8');
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/webhook/whatsapp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        ...headers,
      },
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: resBody }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  if (!process.env.META_APP_SECRET) {
    console.error('❌ META_APP_SECRET non défini. Lance avec: $env:META_APP_SECRET="ton_secret" ; node test-hmac.js');
    process.exit(1);
  }
  console.log(`\n🧪 Lancement des tests HMAC sur http://127.0.0.1:${PORT}/webhook/whatsapp`);
  console.log('   (Assure-toi que le serveur tourne avec le MÊME META_APP_SECRET)\n');

  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '123', changes: [{ value: { messages: [] }, field: 'messages' }] }]
  });

  let failures = 0;
  try {
    // 1. Sans signature
    const test1 = await sendPost({}, payload);
    const ok1 = test1.status === 401;
    if (!ok1) failures++;
    console.log(`1️⃣ Requête SANS signature   : Status ${test1.status} (Attendu: 401) -> ${ok1 ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);

    // 2. Signature invalide
    const test2 = await sendPost({ 'x-hub-signature-256': 'sha256=invalidhash123456789' }, payload);
    const ok2 = test2.status === 403;
    if (!ok2) failures++;
    console.log(`2️⃣ Requête signature FAUSSE : Status ${test2.status} (Attendu: 403) -> ${ok2 ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);

    // 3. Signature valide
    const validSig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(Buffer.from(payload, 'utf8')).digest('hex');
    const test3 = await sendPost({ 'x-hub-signature-256': validSig }, payload);
    const ok3 = test3.status === 200;
    if (!ok3) failures++;
    console.log(`3️⃣ Requête signature VALIDE : Status ${test3.status} (Attendu: 200) -> ${ok3 ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);

    if (failures > 0) {
      console.log(`\n❌ ${failures} test(s) échoué(s). Vérifie que META_APP_SECRET est identique côté serveur et test.\n`);
      process.exit(1);
    }
    console.log('\n🏁 Les 3 tests sont passés !\n');
  } catch (err) {
    console.error('❌ Erreur lors du test (le serveur tourne-t-il sur le port ' + PORT + ' ?) :', err.message);
  }
}

runTests();
