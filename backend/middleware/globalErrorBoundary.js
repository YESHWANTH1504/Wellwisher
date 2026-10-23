/**
 * globalErrorBoundary.js
 * Centralized production-grade error boundary middleware.
 * Standardizes API error formats, sanitizes stack traces in production,
 * and masks sensitive PII or credentials.
 */

const { config } = require('../config/productionConfig');

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /authorization/i
];

function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return 'An unexpected error occurred.';
  let sanitized = msg;
  // Redact key=value pairs matching any password/secret/pass/key/token/auth/credential variant
  sanitized = sanitized.replace(/([a-zA-Z0-9_\-.]*(?:password|secret|pass|key|token|auth|credential)[a-zA-Z0-9_\-.]*)\s*[:=]\s*([^\s,;]+)/gi, '$1=[REDACTED]');
  // Redact JWT tokens
  sanitized = sanitized.replace(/ey[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]*/g, '[REDACTED]');
  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(/([a-zA-Z0-9_\-\.]{16,})/g, '[REDACTED]');
    }
  }
  return sanitized;
}


const globalErrorBoundary = (err, req, res, next) => {
  const isProd = config.isProduction;
  const requestId = req.id || req.requestId || `err_${Date.now()}`;
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || err.errorCode || (statusCode === 404 ? 'NOT_FOUND' : (statusCode === 401 ? 'UNAUTHORIZED' : (statusCode === 403 ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR')));

  const clientMessage = sanitizeErrorMessage(err.message || 'Internal server error');

  // Log error with correlation ID
  console.error(`[ERROR_BOUNDARY] [${requestId}] [${statusCode}] [${errorCode}]: ${clientMessage}`);

  const errorResponse = {
    success: false,
    data: null,
    error: errorCode,
    message: clientMessage,
    requestId,
    timestamp: new Date().toISOString()
  };

  if (!isProd && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = {
  globalErrorBoundary,
  sanitizeErrorMessage
};
