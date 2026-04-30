'use strict';
const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('./auth.routes');
const logger = require('../utils/logger');

const router = express.Router();

// All FAQ routes require auth
router.use(requireAuth);

/**
 * GET /api/faqs — List all FAQs with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { category, lang, active } = req.query;
    let sql = 'SELECT * FROM faqs WHERE 1=1';
    const params = [];
    let idx = 1;

    if (category) { sql += ` AND category = $${idx++}`; params.push(category); }
    if (lang) { sql += ` AND lang = $${idx++}`; params.push(lang); }
    if (active !== undefined) { sql += ` AND is_active = $${idx++}`; params.push(active === 'true'); }

    sql += ' ORDER BY category, lang, id';

    const result = await query(sql, params);
    return res.json({ faqs: result.rows, total: result.rowCount });
  } catch (err) {
    logger.error('GET /faqs error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

/**
 * GET /api/faqs/:id — Get single FAQ
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM faqs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'FAQ not found' });
    return res.json({ faq: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch FAQ' });
  }
});

/**
 * POST /api/faqs — Create new FAQ
 */
router.post('/', async (req, res) => {
  try {
    const { category, lang, keywords, question, answer, is_active } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({ error: 'category, question, and answer are required' });
    }

    const result = await query(
      `INSERT INTO faqs (category, lang, keywords, question, answer, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        category.toLowerCase(),
        lang || 'fr',
        keywords || [],
        question.trim(),
        answer.trim(),
        is_active !== undefined ? is_active : true,
      ]
    );

    logger.info(`FAQ created: #${result.rows[0].id} by admin ${req.admin.email}`);
    return res.status(201).json({ faq: result.rows[0] });
  } catch (err) {
    logger.error('POST /faqs error:', err.message);
    return res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

/**
 * PUT /api/faqs/:id — Update FAQ
 */
router.put('/:id', async (req, res) => {
  try {
    const { category, lang, keywords, question, answer, is_active } = req.body;

    const result = await query(
      `UPDATE faqs
       SET category = COALESCE($1, category),
           lang = COALESCE($2, lang),
           keywords = COALESCE($3, keywords),
           question = COALESCE($4, question),
           answer = COALESCE($5, answer),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        category?.toLowerCase(),
        lang,
        keywords,
        question?.trim(),
        answer?.trim(),
        is_active,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'FAQ not found' });

    logger.info(`FAQ #${req.params.id} updated by admin ${req.admin.email}`);
    return res.json({ faq: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

/**
 * PATCH /api/faqs/:id/toggle — Toggle active status
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const result = await query(
      'UPDATE faqs SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'FAQ not found' });
    return res.json({ faq: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to toggle FAQ' });
  }
});

/**
 * DELETE /api/faqs/:id — Delete FAQ
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM faqs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'FAQ not found' });
    logger.info(`FAQ #${req.params.id} deleted by admin ${req.admin.email}`);
    return res.json({ success: true, deleted_id: result.rows[0].id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

module.exports = router;
