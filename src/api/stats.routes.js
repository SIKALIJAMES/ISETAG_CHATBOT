'use strict';
const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('./auth.routes');
const logger = require('../utils/logger');

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/stats/overview — KPI cards for dashboard
 */
router.get('/overview', async (req, res) => {
  try {
    const [
      todayMessages,
      activeConversations,
      escalations,
      faqMatchRate,
      totalFAQs,
    ] = await Promise.all([
      query(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE direction = 'in'
          AND sent_at >= CURRENT_DATE
      `),
      query(`SELECT COUNT(*) as count FROM conversations WHERE status = 'bot'`),
      query(`
        SELECT COUNT(*) as count
        FROM conversations
        WHERE status = 'escalated'
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      `),
      query(`
        SELECT
          COUNT(*) FILTER (WHERE faq_matched_id IS NOT NULL) AS matched,
          COUNT(*) AS total
        FROM messages
        WHERE direction = 'in'
          AND sent_at >= CURRENT_DATE - INTERVAL '7 days'
      `),
      query(`SELECT COUNT(*) as count FROM faqs WHERE is_active = TRUE`),
    ]);

    const matched = parseInt(faqMatchRate.rows[0].matched) || 0;
    const total = parseInt(faqMatchRate.rows[0].total) || 1;
    const matchRate = Math.round((matched / total) * 100);

    return res.json({
      today_messages: parseInt(todayMessages.rows[0].count),
      active_conversations: parseInt(activeConversations.rows[0].count),
      escalations_week: parseInt(escalations.rows[0].count),
      faq_match_rate: matchRate,
      total_faqs_active: parseInt(totalFAQs.rows[0].count),
    });
  } catch (err) {
    logger.error('GET /stats/overview error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/stats/messages-per-day — Last 14 days
 */
router.get('/messages-per-day', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        DATE(sent_at) as date,
        COUNT(*) FILTER (WHERE direction = 'in') AS incoming,
        COUNT(*) FILTER (WHERE direction = 'out') AS outgoing
      FROM messages
      WHERE sent_at >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `);

    return res.json({ data: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch message stats' });
  }
});

/**
 * GET /api/stats/top-faqs — Most matched FAQs
 */
router.get('/top-faqs', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        f.id,
        f.category,
        f.lang,
        LEFT(f.question, 80) as question,
        COUNT(m.id) AS match_count
      FROM faqs f
      JOIN messages m ON m.faq_matched_id = f.id
      WHERE m.sent_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY f.id
      ORDER BY match_count DESC
      LIMIT 10
    `);

    return res.json({ faqs: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch top FAQs' });
  }
});

/**
 * GET /api/stats/escalation-rate — For donut chart
 */
router.get('/escalation-rate', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'bot') AS bot_handled,
        COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
        COUNT(*) FILTER (WHERE status = 'closed') AS closed
      FROM conversations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const row = result.rows[0];
    return res.json({
      bot_handled: parseInt(row.bot_handled) || 0,
      escalated: parseInt(row.escalated) || 0,
      closed: parseInt(row.closed) || 0,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch escalation rate' });
  }
});

/**
 * GET /api/stats/language-breakdown
 */
router.get('/languages', async (req, res) => {
  try {
    const result = await query(`
      SELECT lang_detected, COUNT(*) as count
      FROM conversations
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY lang_detected
    `);
    return res.json({ languages: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch language stats' });
  }
});

module.exports = router;
