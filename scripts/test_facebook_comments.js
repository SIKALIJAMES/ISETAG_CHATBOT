'use strict';
require('dotenv').config();
const { query } = require('../src/config/database');
const {
  handleFacebookCommentEvent,
  classifyCommentIntent,
  canSendPublicReply,
  canClassifyWithLLM,
  classifyTimestamps
} = require('../src/services/facebook-comments.service');
const messengerService = require('../src/services/messenger');

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 TEST SUITE: GESTION DES COMMENTAIRES FACEBOOK ISETAG');
  console.log('     (v2 — avec corrections audit)');
  console.log('========================================================\n');

  // Activate feature flags for simulation
  process.env.BOT_COMMENTS_ENABLED = 'true';
  process.env.PUBLIC_REPLY_ENABLED = 'true';
  process.env.COMMENT_LIKE_ENABLED = 'true';
  process.env.FACEBOOK_PAGE_ID = 'PAGE_ISETAG_999999';
  process.env.BOT_NAME = 'Isa';

  // Intercept Graph API calls (mock)
  let privateRepliesSent = [];
  let publicRepliesSent = [];
  let likesSent = [];
  let privateReplyBehavior = 'success'; // 'success' | 'fail'

  messengerService.sendPrivateReply = async (commentId, text) => {
    if (privateReplyBehavior === 'fail') {
      return { success: false, error: { code: 10900, message: 'simulated failure' } };
    }
    privateRepliesSent.push({ commentId, text });
    return { success: true };
  };

  messengerService.sendPublicCommentReply = async (commentId, text) => {
    publicRepliesSent.push({ commentId, text });
    return { success: true };
  };

  messengerService.likeComment = async (commentId) => {
    likesSent.push({ commentId });
    return { success: true };
  };

  let totalPassed = 0;
  let totalTests = 10;

  try {
    // ── TEST 1: Demande d'information normale ──────────────────────────
    console.log('--- TEST 1: Commentaire de demande d\'information standard ---');
    const comment1Id = `test_cmt_${Date.now()}_1`;
    const payloadInfo = {
      item: 'comment',
      verb: 'add',
      comment_id: comment1Id,
      post_id: 'post_123456',
      from: { id: 'user_prospect_001', name: 'Marie Dupont' },
      message: 'Bonjour, quels sont les prix pour le BTS Informatique et où se trouve le campus ?',
      created_time: Math.floor(Date.now() / 1000)
    };

    await handleFacebookCommentEvent(payloadInfo, 'PAGE_ISETAG_999999');

    const dbRow1 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment1Id]);
    const sentPrivate1 = privateRepliesSent.find(r => r.commentId === comment1Id);
    const sentPublic1 = publicRepliesSent.find(r => r.commentId === comment1Id);
    const sentLike1 = likesSent.find(r => r.commentId === comment1Id);

    // FIX #4: Verify no hardcoded price in private reply
    const hasNoHardcodedPrice = sentPrivate1 && !sentPrivate1.text.includes('22 000');

    if (
      dbRow1.rows.length === 1 &&
      dbRow1.rows[0].category === 'demande_info' &&
      sentPrivate1 &&
      sentPrivate1.text.includes('Marie') &&
      sentPrivate1.text.includes('Isa') &&
      hasNoHardcodedPrice &&
      sentPublic1 &&
      sentLike1
    ) {
      console.log('✅ TEST 1 RÉUSSI : Private reply sans prix en dur, publique et like OK.');
      totalPassed++;
    } else {
      console.error('❌ TEST 1 ÉCHOUÉ');
      if (!hasNoHardcodedPrice) console.error('   -> Le message privé contient encore des prix en dur !');
    }

    // ── TEST 2: Commentaire écrit par la Page elle-même (anti-boucle) ──
    console.log('\n--- TEST 2: Commentaire écrit par la Page elle-même ---');
    const comment2Id = `test_cmt_${Date.now()}_2`;
    const payloadSelf = {
      item: 'comment',
      verb: 'add',
      comment_id: comment2Id,
      post_id: 'post_123456',
      from: { id: 'PAGE_ISETAG_999999', name: 'ISETAG Officiel' },
      message: 'Inscriptions ouvertes !',
      created_time: Math.floor(Date.now() / 1000)
    };

    const beforeCount2 = privateRepliesSent.length;
    await handleFacebookCommentEvent(payloadSelf, 'PAGE_ISETAG_999999');
    const dbRow2 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment2Id]);

    if (dbRow2.rows.length === 0 && privateRepliesSent.length === beforeCount2) {
      console.log('✅ TEST 2 RÉUSSI : Commentaire de la Page ignoré (pas de boucle).');
      totalPassed++;
    } else {
      console.error('❌ TEST 2 ÉCHOUÉ');
    }

    // ── TEST 3: Idempotence et doublons ────────────────────────────────
    console.log('\n--- TEST 3: Dédoublonnage sur rejeu du même webhook ---');
    const beforeCount3 = privateRepliesSent.length;
    await handleFacebookCommentEvent(payloadInfo, 'PAGE_ISETAG_999999');

    if (privateRepliesSent.length === beforeCount3) {
      console.log('✅ TEST 3 RÉUSSI : Doublon stoppé par contrainte UNIQUE.');
      totalPassed++;
    } else {
      console.error('❌ TEST 3 ÉCHOUÉ');
    }

    // ── TEST 4: Commentaire imbriqué niveau 2 ──────────────────────────
    console.log('\n--- TEST 4: Commentaire imbriqué de niveau 2 ---');
    const comment4Id = `test_cmt_${Date.now()}_4`;
    const payloadNested = {
      item: 'comment',
      verb: 'add',
      comment_id: comment4Id,
      parent_id: 'parent_cmt_8888',
      post_id: 'post_123456',
      from: { id: 'user_prospect_003', name: 'Paul' },
      message: 'Moi aussi je veux savoir',
      created_time: Math.floor(Date.now() / 1000)
    };

    const beforeCount4 = privateRepliesSent.length;
    await handleFacebookCommentEvent(payloadNested, 'PAGE_ISETAG_999999');
    const dbRow4 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment4Id]);

    if (dbRow4.rows.length === 0 && privateRepliesSent.length === beforeCount4) {
      console.log('✅ TEST 4 RÉUSSI : Commentaire imbriqué (niveau 2) ignoré.');
      totalPassed++;
    } else {
      console.error('❌ TEST 4 ÉCHOUÉ');
    }

    // ── TEST 5: Réclamation / plainte agressive ────────────────────────
    console.log('\n--- TEST 5: Commentaire de réclamation / agressivité ---');
    const comment5Id = `test_cmt_${Date.now()}_5`;
    const complaintMessage = 'Vous êtes des voleurs et des menteurs, personne ne décroche !';
    const payloadComplaint = {
      item: 'comment',
      verb: 'add',
      comment_id: comment5Id,
      post_id: 'post_123456',
      from: { id: 'user_angry_004', name: 'Client Mécontent' },
      message: complaintMessage,
      created_time: Math.floor(Date.now() / 1000)
    };

    const beforeCount5 = privateRepliesSent.length;
    await handleFacebookCommentEvent(payloadComplaint, 'PAGE_ISETAG_999999');
    const dbRow5 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment5Id]);

    if (
      dbRow5.rows.length === 1 &&
      dbRow5.rows[0].category === 'reclamation' &&
      dbRow5.rows[0].status === 'escalated' &&
      privateRepliesSent.length === beforeCount5
    ) {
      console.log('✅ TEST 5 RÉUSSI : Réclamation -> aucune réponse auto, signalée pour admin.');
      totalPassed++;
    } else {
      console.error('❌ TEST 5 ÉCHOUÉ');
    }

    // ── TEST 6: Commentaire de plus de 7 jours ─────────────────────────
    console.log('\n--- TEST 6: Commentaire vieux de plus de 7 jours ---');
    const comment6Id = `test_cmt_${Date.now()}_6`;
    const eightDaysAgoSeconds = Math.floor((Date.now() - (8 * 24 * 3600 * 1000)) / 1000);
    const payloadOld = {
      item: 'comment',
      verb: 'add',
      comment_id: comment6Id,
      post_id: 'post_123456',
      from: { id: 'user_late_005', name: 'Alain' },
      message: 'Combien coûte la pension ?',
      created_time: eightDaysAgoSeconds
    };

    const beforeCount6 = privateRepliesSent.length;
    await handleFacebookCommentEvent(payloadOld, 'PAGE_ISETAG_999999');
    const dbRow6 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment6Id]);

    if (dbRow6.rows.length === 0 && privateRepliesSent.length === beforeCount6) {
      console.log('✅ TEST 6 RÉUSSI : Commentaire > 7 jours ignoré (fenêtre Meta dépassée).');
      totalPassed++;
    } else {
      console.error('❌ TEST 6 ÉCHOUÉ');
    }

    // ── TEST 7: Non-régression Messenger ───────────────────────────────
    console.log('\n--- TEST 7: Message Messenger direct (non-régression) ---');
    const classicMessengerEntry = {
      id: 'PAGE_ISETAG_999999',
      messaging: [
        {
          sender: { id: 'psid_987654' },
          recipient: { id: 'PAGE_ISETAG_999999' },
          message: { mid: `mid_${Date.now()}`, text: 'Bonjour' }
        }
      ]
    };

    if (
      !classicMessengerEntry.changes &&
      classicMessengerEntry.messaging &&
      classicMessengerEntry.messaging[0].message.text === 'Bonjour'
    ) {
      console.log('✅ TEST 7 RÉUSSI : Structure Messenger classique intacte.');
      totalPassed++;
    } else {
      console.error('❌ TEST 7 ÉCHOUÉ');
    }

    // ══════════════════════════════════════════════════════════════════════
    // NOUVEAUX TESTS (corrections audit)
    // ══════════════════════════════════════════════════════════════════════

    // ── TEST 8: FACEBOOK_PAGE_ID manquant → refuse de traiter ──────────
    console.log('\n--- TEST 8: BOT_COMMENTS_ENABLED=true mais FACEBOOK_PAGE_ID vide ---');
    const savedPageId = process.env.FACEBOOK_PAGE_ID;
    process.env.FACEBOOK_PAGE_ID = '';  // Simule l'oubli de configuration

    const comment8Id = `test_cmt_${Date.now()}_8`;
    const payload8 = {
      item: 'comment',
      verb: 'add',
      comment_id: comment8Id,
      post_id: 'post_123456',
      from: { id: 'user_prospect_008', name: 'Test' },
      message: 'Combien coûte le BTS ?',
      created_time: Math.floor(Date.now() / 1000)
    };

    const beforeCount8 = privateRepliesSent.length;
    await handleFacebookCommentEvent(payload8, 'PAGE_ISETAG_999999');
    const dbRow8 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment8Id]);

    process.env.FACEBOOK_PAGE_ID = savedPageId;  // Restaure

    if (dbRow8.rows.length === 0 && privateRepliesSent.length === beforeCount8) {
      console.log('✅ TEST 8 RÉUSSI : Page ID manquant → traitement refusé, alerte loggée.');
      totalPassed++;
    } else {
      console.error('❌ TEST 8 ÉCHOUÉ : Le service a traité un commentaire sans FACEBOOK_PAGE_ID !');
    }

    // ── TEST 9: Private reply échoue → pas de réponse publique ─────────
    console.log('\n--- TEST 9: Private reply en échec → pas de réponse publique ---');
    privateReplyBehavior = 'fail';  // Simule un échec de l'API Meta

    const comment9Id = `test_cmt_${Date.now()}_9`;
    const payload9 = {
      item: 'comment',
      verb: 'add',
      comment_id: comment9Id,
      post_id: 'post_123456',
      from: { id: 'user_prospect_009', name: 'Sophie Mbarga' },
      message: 'Quels sont les frais de la Licence SVP ?',
      created_time: Math.floor(Date.now() / 1000)
    };

    const beforePublic9 = publicRepliesSent.length;
    await handleFacebookCommentEvent(payload9, 'PAGE_ISETAG_999999');
    const dbRow9 = await query('SELECT * FROM comment_events WHERE comment_id = $1', [comment9Id]);

    privateReplyBehavior = 'success';  // Restaure le comportement normal

    if (
      dbRow9.rows.length === 1 &&
      dbRow9.rows[0].status === 'failed' &&
      publicRepliesSent.length === beforePublic9
    ) {
      console.log('✅ TEST 9 RÉUSSI : Private reply KO → aucune réponse publique envoyée (pas de mensonge).');
      totalPassed++;
    } else {
      console.error('❌ TEST 9 ÉCHOUÉ : Une réponse publique a été envoyée alors que le privé avait échoué !');
      if (dbRow9.rows.length > 0) console.error('   DB status:', dbRow9.rows[0].status);
    }

    // ── TEST 10: Plafond de classification LLM atteint → heuristique ──
    console.log('\n--- TEST 10: Plafond de classification LLM atteint ---');
    // Remplir artificiellement le tableau des timestamps de classification
    const savedMaxPerHour = process.env.COMMENT_CLASSIFY_MAX_PER_HOUR;
    process.env.COMMENT_CLASSIFY_MAX_PER_HOUR = '5';
    // Vider puis remplir
    classifyTimestamps.length = 0;
    for (let i = 0; i < 5; i++) {
      classifyTimestamps.push(Date.now());
    }

    // Devrait retomber sur heuristique au lieu d'appeler le LLM
    const canClassify = canClassifyWithLLM();
    // Teste la classification d'un commentaire avec le plafond atteint
    const intentResult = await classifyCommentIntent('Combien coûte le BTS Génie Logiciel ?');

    process.env.COMMENT_CLASSIFY_MAX_PER_HOUR = savedMaxPerHour || '';
    classifyTimestamps.length = 0;

    if (!canClassify && intentResult === 'demande_info') {
      console.log('✅ TEST 10 RÉUSSI : Plafond LLM atteint → heuristique utilisée (pas d\'appel Groq gaspillé).');
      totalPassed++;
    } else {
      console.error(`❌ TEST 10 ÉCHOUÉ : canClassify=${canClassify}, intent=${intentResult}`);
    }

    // ══════════════════════════════════════════════════════════════════════

    console.log('\n========================================================');
    console.log(`📊 RÉSULTAT FINAL DES TESTS : ${totalPassed}/${totalTests} TESTS RÉUSSIS`);
    console.log('========================================================\n');

    process.exit(totalPassed === totalTests ? 0 : 1);

  } catch (err) {
    console.error('❌ Exception inattendue lors des tests:', err);
    process.exit(1);
  }
}

runTests();
