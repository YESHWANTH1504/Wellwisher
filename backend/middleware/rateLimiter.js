const rateLimit = require('express-rate-limit');

// General API rate limiter (prevents API scraping/flooding)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Stricter rate limiter for authentication endpoints (prevents credential brute-forcing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    error: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

// Rate limiter for AI endpoints (protects external LLM resource consumption)
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI request limit reached. Please wait a moment before sending another request.',
    error: 'AI_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  aiLimiter
};
