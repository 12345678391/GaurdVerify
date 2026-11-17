const crypto = require('crypto');

/**
 * Generate a Plivo Signature V3 for a given request.
 */
function generateV3Signature(method, fullUri, nonce, authToken, params = {}) {
  const parsed = new URL(fullUri);
  let baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

  // 1. Sort query parameters
  const qParams = {};
  parsed.searchParams.forEach((val, key) => {
    if (!qParams[key]) qParams[key] = [];
    qParams[key].push(val);
  });
  const qKeys = Object.keys(qParams).sort();
  const qParts = [];
  qKeys.forEach((k) => {
    qParams[k].sort().forEach((v) => qParts.push(`${k}=${v}`));
  });
  const qStr = qParts.join('&');
  const hasPostParams = Object.keys(params).length > 0;
  if (qStr.length > 0 || hasPostParams) {
    baseUrl += `?${qStr}`;
  }
  if (qStr.length > 0 && hasPostParams) {
    baseUrl += '.';
  }

  // 2. Sort post parameters
  const pKeys = Object.keys(params).sort();
  pKeys.forEach((k) => {
    baseUrl += `${k}${params[k]}`;
  });

  baseUrl += `.${nonce}`;
  const hmac = crypto.createHmac('sha256', authToken);
  return hmac.update(baseUrl).digest('base64');
}

/**
 * Generate a Plivo Signature V2 for a given request.
 */
function generateV2Signature(fullUri, nonce, authToken) {
  const parsed = new URL(fullUri);
  const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  const hmac = crypto.createHmac('sha256', authToken);
  return hmac.update(baseUrl + nonce).digest('base64');
}

module.exports = {
  generateV3Signature,
  generateV2Signature,
};
