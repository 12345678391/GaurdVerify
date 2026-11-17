const plivo = require('plivo');

/**
 * Reusable Express middleware for validating Plivo cryptographic webhook signatures.
 * Supports both Plivo Signature V3 (preferred) and Signature V2.
 * Rejects requests with missing or invalid signatures with HTTP 403 Forbidden.
 */
const validatePlivoWebhook = (req, res, next) => {
  const authToken = process.env.PLIVO_AUTH_TOKEN;

  // Fail closed if PLIVO_AUTH_TOKEN is missing or not configured
  if (!authToken || authToken.trim() === '' || authToken.includes('YOUR_')) {
    console.warn('[PlivoWebhookAuth] Webhook rejected: PLIVO_AUTH_TOKEN is not configured.');
    return res.status(403).json({
      success: false,
      message: 'Plivo webhook authentication failed: PLIVO_AUTH_TOKEN is not configured.',
    });
  }

  // Extract signature headers (case-insensitive in Express req.headers)
  const sigV3 = req.headers['x-plivo-signature-v3'];
  const nonceV3 = req.headers['x-plivo-signature-v3-nonce'];
  const sigV2 = req.headers['x-plivo-signature-v2'] || req.headers['x-plivo-signature'];
  const nonceV2 = req.headers['x-plivo-signature-v2-nonce'] || req.headers['x-plivo-signature-nonce'];

  // Reject if no Plivo signature headers are present
  if (!sigV3 && !sigV2) {
    console.warn('[PlivoWebhookAuth] Webhook rejected: Missing Plivo signature headers.');
    return res.status(403).json({
      success: false,
      message: 'Missing required Plivo webhook signature headers.',
    });
  }

  // Reconstruct candidate request URIs
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const requestUri = `${protocol}://${host}${req.originalUrl}`;
  const candidateUris = [requestUri];

  if (process.env.PLIVO_WEBHOOK_BASE_URL) {
    const configuredBase = process.env.PLIVO_WEBHOOK_BASE_URL.replace(/\/$/, '');
    const configuredUri = `${configuredBase}${req.originalUrl}`;
    if (!candidateUris.includes(configuredUri)) {
      candidateUris.push(configuredUri);
    }
  }

  const method = req.method.toUpperCase();
  const params = req.body || {};

  // 1. Try V3 Validation if V3 headers are present
  if (sigV3) {
    if (!nonceV3) {
      console.warn('[PlivoWebhookAuth] Webhook rejected: Missing X-Plivo-Signature-V3-Nonce.');
      return res.status(403).json({
        success: false,
        message: 'Missing required X-Plivo-Signature-V3-Nonce header.',
      });
    }

    try {
      for (const uri of candidateUris) {
        if (plivo.validateV3Signature(method, uri, nonceV3, authToken, sigV3, params)) {
          return next();
        }
      }
    } catch (err) {
      console.warn('[PlivoWebhookAuth] V3 signature validation error:', err.message);
    }

    console.warn('[PlivoWebhookAuth] Webhook rejected: Invalid Plivo V3 signature.');
    return res.status(403).json({
      success: false,
      message: 'Invalid Plivo V3 webhook signature.',
    });
  }

  // 2. Try V2 Validation if V2 headers are present
  if (sigV2) {
    if (!nonceV2) {
      console.warn('[PlivoWebhookAuth] Webhook rejected: Missing X-Plivo-Signature-V2-Nonce.');
      return res.status(403).json({
        success: false,
        message: 'Missing required X-Plivo-Signature-V2-Nonce header.',
      });
    }

    try {
      for (const uri of candidateUris) {
        if (plivo.validateSignature(uri, nonceV2, sigV2, authToken)) {
          return next();
        }
      }
    } catch (err) {
      console.warn('[PlivoWebhookAuth] V2 signature validation error:', err.message);
    }

    console.warn('[PlivoWebhookAuth] Webhook rejected: Invalid Plivo V2 signature.');
    return res.status(403).json({
      success: false,
      message: 'Invalid Plivo V2 webhook signature.',
    });
  }

  return res.status(403).json({
    success: false,
    message: 'Unsupported Plivo webhook signature format.',
  });
};

module.exports = { validatePlivoWebhook };
