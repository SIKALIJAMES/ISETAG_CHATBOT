'use strict';
require('dotenv').config();
require('./src/config/env'); // Validate env vars on startup

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');

const logger = require('./src/utils/logger');
const { query } = require('./src/config/db');
const { runMigrations } = require('./migrations/run');
const { runSeed } = require('./migrations/seed');
const { loadFAQs } = require('./src/services/faq.service');
const { verifyWebhook, handleWebhook } = require('./src/webhooks/whatsapp');
const { router: authRouter } = require('./src/api/auth.routes');
const faqsRouter = require('./src/api/faqs.routes');
const conversationsRouter = require('./src/api/conversations.routes');
const statsRouter = require('./src/api/stats.routes');

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// ──────────────────────────────────────────────
// Security & Middleware
// ──────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://isetag-dashboard.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

app.use(cookieParser());

// Capture raw body for HMAC verification BEFORE JSON parsing
app.use((req, res, next) => {
  if (req.path === '/webhook/whatsapp' && req.method === 'POST') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch { req.body = {}; }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});
app.use('/api', apiLimiter);

// ──────────────────────────────────────────────
// Request logging
// ──────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path !== '/health') {
      logger.info(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
    }
  });
  next();
});

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────

// Health check (no auth required)
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'ISETAG Chatbot API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      db: 'connected',
    });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// WhatsApp Webhook (no auth — Meta calls this directly)
app.get('/webhook/whatsapp', verifyWebhook);
app.post('/webhook/whatsapp', handleWebhook);

// Dashboard API (JWT protected inside each router)
app.use('/api/auth', authRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/stats', statsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────────────────────────────────────
// Cron Jobs
// ──────────────────────────────────────────────

// Refresh FAQ cache every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    await loadFAQs(true);
    logger.info('FAQ cache refreshed by cron');
  } catch (err) {
    logger.error('FAQ cache refresh cron error:', err.message);
  }
});

// ──────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────
async function bootstrap() {
  try {
    logger.info('🚀 Starting ISETAG Chatbot...');

    // Run DB migrations
    await runMigrations();

    // Seed initial data if DB is empty
    await runSeed();

    // Pre-load FAQ cache
    await loadFAQs(true);

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ Server running on http://0.0.0.0:${PORT}`);
      logger.info(`📡 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
      logger.info(`🔐 Dashboard API: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
  }
}

bootstrap();
