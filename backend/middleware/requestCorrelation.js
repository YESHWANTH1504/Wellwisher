/**
 * requestCorrelation.js
 * Request Correlation ID middleware for end-to-end distributed tracing.
 * Captures incoming X-Request-Id or generates a unique correlation token.
 */

const crypto = require('crypto');

function generateRequestId() {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

const requestCorrelation = (req, res, next) => {
  const incomingId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = (typeof incomingId === 'string' && incomingId.trim().length > 0)
    ? incomingId.trim()
    : generateRequestId();

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

module.exports = {
  requestCorrelation,
  requestCorrelationMiddleware: requestCorrelation,
  generateRequestId
};

