'use strict';
const crypto = require('crypto');

/**
 * Verify that the request comes from Meta using HMAC-SHA256
 */
function verifyHmac(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    return res.status(401).send('Missing signature');
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[HMAC] WHATSAPP_APP_SECRET not set');
    return res.status(500).send('Server misconfiguration');
  }

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest('hex');

  if (signature !== expectedSig) {
    console.warn('[HMAC] Signature mismatch — possible spoofing attempt');
    return res.status(403).send('Invalid signature');
  }

  next();
}

module.exports = { verifyHmac };
