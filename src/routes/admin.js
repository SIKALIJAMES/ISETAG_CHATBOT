'use strict';
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { uploadKnowledge, searchRelevant } = require('../services/embeddings');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const pdf = require('pdf-parse');
const whatsapp = require('../services/whatsapp');
const messenger = require('../services/messenger');
const { getName } = require('../services/session');

/**
 * Dashboard Stats
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const conversations = await query('SELECT count(*) FROM conversations');
    const escalated = await query("SELECT count(*) FROM conversations WHERE status = 'escalated'");
    const totalKnowledge = await query('SELECT count(*) FROM knowledge_chunks');

    const totalCount = parseInt(conversations.rows[0].count) || 0;
    const escalatedCount = parseInt(escalated.rows[0].count) || 0;
    const knowledgeChunks = parseInt(totalKnowledge.rows[0].count) || 0;
    const resolutionRate = totalCount === 0 ? 100 : (100 - (escalatedCount / totalCount * 100));

    // Daily messages count (last 7 days)
    const activityQuery = await query(`
      SELECT TO_CHAR(created_at, 'DD/MM') as day, count(*) as count
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'DD/MM'), date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at) ASC
    `);

    // Language counts
    const langQuery = await query(`
      SELECT COALESCE(lang, 'fr') as lang, count(*) as count
      FROM conversations
      GROUP BY COALESCE(lang, 'fr')
    `);

    // Knowledge categories
    const catQuery = await query(`
      SELECT COALESCE(category, 'general') as category, count(*) as count
      FROM knowledge_chunks
      GROUP BY COALESCE(category, 'general')
    `);

    res.json({
      totalConversations: totalCount,
      escalatedCount,
      knowledgeChunks,
      resolutionRate,
      activity: activityQuery.rows.map(r => ({ label: r.day, value: parseInt(r.count) })),
      languages: langQuery.rows.map(r => ({ label: r.lang === 'en' ? 'Anglais' : 'Français', value: parseInt(r.count) })),
      categories: catQuery.rows.map(r => ({ label: r.category, value: parseInt(r.count) }))
    });
  } catch (err) {
    console.error('[ADMIN] Stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Knowledge Management: Upload PDF/Text
 */
router.post('/knowledge/upload', protect, upload.single('file'), async (req, res) => {
  const { category } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let text = '';
    if (file.mimetype === 'application/pdf') {
      const data = await pdf(file.buffer);
      text = data.text;
    } else {
      text = file.buffer.toString();
    }

    await uploadKnowledge(text, file.originalname, category);
    res.json({ message: 'Document vectorised and stored successfully' });
  } catch (err) {
    console.error('[ADMIN] Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Knowledge Management: Save raw text (with automatic overwrite of same title)
 */
router.post('/knowledge/text', protect, async (req, res) => {
  const { text, title, category } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const sourceName = title || 'Manual Entry';

  try {
    // Delete existing chunks with the same title to prevent duplication (Overwrite)
    await query('DELETE FROM knowledge_chunks WHERE source = $1', [sourceName]);
    await uploadKnowledge(text, sourceName, category || 'general');
    res.json({ message: 'Text vectorized and stored successfully' });
  } catch (err) {
    console.error('[ADMIN] Text upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get concatenated text content for a specific knowledge source (for editing)
 */
router.get('/knowledge/content', protect, async (req, res) => {
  const { source } = req.query;
  if (!source) return res.status(400).json({ error: 'No source provided' });

  try {
    const result = await query(
      'SELECT content FROM knowledge_chunks WHERE source = $1 ORDER BY created_at ASC, id ASC',
      [source]
    );
    const fullText = result.rows.map(r => r.content).join('\n\n');
    res.json({ source, text: fullText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Conversations list
 */
router.get('/conversations', protect, async (req, res) => {
  try {
    const result = await query('SELECT * FROM conversations ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get messages list for a specific conversation
 */
router.get('/conversations/:id/messages', protect, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Send manual reply to student on WhatsApp
 */
router.post('/conversations/:id/reply', protect, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  
  if (!text) return res.status(400).json({ error: 'No text provided' });
  
  try {
    // 1. Fetch conversation details
    const convoResult = await query('SELECT * FROM conversations WHERE id = $1', [id]);
    if (convoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const convo = convoResult.rows[0];
    
    // 2. Send via appropriate service (WhatsApp or Messenger)
    const isMessenger = convo.user_phone.startsWith('messenger:');
    if (isMessenger) {
      const recipientId = convo.user_phone.split(':')[1];
      await messenger.sendTextMessage(recipientId, text);
    } else {
      await whatsapp.sendTextMessage(convo.user_phone, text);
    }
    
    // 3. Save message to database
    await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [id, 'assistant', text]
    );
    
    // 4. Update last message state in conversation (mark status as escalated since it is manual intervention)
    await query(
      "UPDATE conversations SET last_message = $1, updated_at = NOW(), status = 'escalated' WHERE id = $2",
      [text, id]
    );
    
    res.json({ message: 'Reply sent successfully' });
  } catch (err) {
    console.error('[ADMIN] Reply sending error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Re-engage Bot (Resolve Escalation)
 */
router.post('/conversations/:id/resolve', protect, async (req, res) => {
  const { id } = req.params;
  try {
    await query("UPDATE conversations SET status = 'active', updated_at = NOW() WHERE id = $1", [id]);
    res.json({ message: 'Bot re-engaged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Clear all knowledge chunks
 */
router.delete('/knowledge', protect, async (req, res) => {
  try {
    await query('DELETE FROM knowledge_chunks');
    res.json({ message: 'All knowledge chunks cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * List unique knowledge documents/sources
 */
router.get('/knowledge', protect, async (req, res) => {
  try {
    const result = await query(
      `SELECT source, category, count(*) as chunks, MAX(created_at) as last_updated
       FROM knowledge_chunks
       GROUP BY source, category
       ORDER BY last_updated DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete a specific knowledge source
 */
router.delete('/knowledge/source', protect, async (req, res) => {
  const { source } = req.query;
  if (!source) return res.status(400).json({ error: 'No source provided' });

  try {
    await query('DELETE FROM knowledge_chunks WHERE source = $1', [source]);
    res.json({ message: `Source "${source}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/conversations/sync-names
 * Backfill: reads all conversations without a prospect_name in DB,
 * looks up Redis for a saved name, and writes it to the DB.
 * Call this once after deploy to recover names for existing conversations.
 */
router.post('/conversations/sync-names', protect, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, user_phone FROM conversations WHERE prospect_name IS NULL'
    );

    let updated = 0;
    for (const convo of result.rows) {
      const name = await getName(convo.user_phone);
      if (name) {
        await query(
          'UPDATE conversations SET prospect_name = $1 WHERE id = $2',
          [name, convo.id]
        );
        updated++;
      }
    }

    res.json({ message: `✅ Sync completed. ${updated} name(s) recovered from Redis.`, updated });
  } catch (err) {
    console.error('[ADMIN] sync-names error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/conversations/:id/name
 * Manually set or correct a prospect's name
 */
router.patch('/conversations/:id/name', protect, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'No name provided' });

  try {
    await query(
      'UPDATE conversations SET prospect_name = $1 WHERE id = $2',
      [name.trim(), id]
    );
    res.json({ message: `Name updated to "${name.trim()}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
