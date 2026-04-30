'use strict';
const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('./auth.routes');
const logger = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/conversations — List conversations with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let sql = `
      SELECT c.id, c.user_phone_hash, c.session_id, c.status,
             c.lang_detected, c.summary, c.created_at, c.closed_at,
             COUNT(m.id) AS message_count
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { sql += ` AND c.status = $${idx++}`; params.push(status); }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);

    // Count total
    let countSql = 'SELECT COUNT(*) FROM conversations WHERE 1=1';
    const countParams = [];
    if (status) { countSql += ' AND status = $1'; countParams.push(status); }
    const countResult = await query(countSql, countParams);

    return res.json({
      conversations: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    logger.error('GET /conversations error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/conversations/:id — Get conversation with messages
 */
router.get('/:id', async (req, res) => {
  try {
    const convResult = await query(
      'SELECT * FROM conversations WHERE id = $1',
      [req.params.id]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const msgResult = await query(
      `SELECT m.*, f.question as faq_question, f.category as faq_category
       FROM messages m
       LEFT JOIN faqs f ON f.id = m.faq_matched_id
       WHERE m.conversation_id = $1
       ORDER BY m.sent_at ASC`,
      [req.params.id]
    );

    return res.json({
      conversation: convResult.rows[0],
      messages: msgResult.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * PATCH /api/conversations/:id/close — Close a conversation
 */
router.patch('/:id/close', async (req, res) => {
  try {
    const result = await query(
      `UPDATE conversations SET status = 'closed', closed_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    return res.json({ conversation: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to close conversation' });
  }
});

module.exports = router;
