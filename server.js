'use strict';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const webhookRoutes = require('./src/routes/webhook');
const adminRoutes = require('./src/routes/admin');
const authRoutes = require('./src/routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Capture rawBody for HMAC signature verification (must come before json parser)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', version: '2.0.0', env: process.env.NODE_ENV });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════╗
║    🚀  ISETAG CHATBOT  V2  🚀        ║
╠══════════════════════════════════════╣
║  📡 Webhook : /webhook/whatsapp      ║
║  🔐 Admin   : /api/admin             ║
║  ❤️  Health  : /health               ║
║  🌍 Env     : ${(process.env.NODE_ENV || 'development').padEnd(22)}║
╚══════════════════════════════════════╝
  `);
});
