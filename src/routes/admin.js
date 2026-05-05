'use strict';
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { uploadKnowledge, searchRelevant } = require('../services/embeddings');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const pdf = require('pdf-parse');

/**
 * Dashboard Stats
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const conversations = await query('SELECT count(*) FROM conversations');
    const escalated = await query("SELECT count(*) FROM conversations WHERE status = 'escalated'");
    const totalKnowledge = await query('SELECT count(*) FROM knowledge_chunks');

    res.json({
      totalConversations: parseInt(conversations.rows[0].count),
      escalatedCount: parseInt(escalated.rows[0].count),
      knowledgeChunks: parseInt(totalKnowledge.rows[0].count),
      resolutionRate: 100 - (parseInt(escalated.rows[0].count) / parseInt(conversations.rows[0].count) * 100 || 0)
    });
  } catch (err) {
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

module.exports = router;
