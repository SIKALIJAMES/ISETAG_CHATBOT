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

  const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[HMAC] META_APP_SECRET (or WHATSAPP_APP_SECRET) not set');
    return res.status(500).send('Server misconfiguration');
  }

  const payload = Buffer.isBuffer(req.rawBody)
    ? req.rawBody
    : (typeof req.rawBody === 'string' ? req.rawBody : '');

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    console.warn('[HMAC] Signature mismatch — possible spoofing attempt');
    return res.status(403).send('Invalid signature');
  }

  next();
}

module.exports = { verifyHmac };
