const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production mode.');
    }
    // Development fallback with explicit console warning
    console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is not configured in .env. Using ephemeral development key.');
    return 'wellwisher_dev_ephemeral_jwt_secret_2026';
  }
  return secret.trim();
}

/**
 * Middleware to verify JWT token and enforce strict user scoping.
 * Rejects missing, invalid, or expired tokens with HTTP 401.
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token is required.',
      error: 'UNAUTHORIZED_NO_TOKEN'
    });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Malformed Bearer token.',
      error: 'UNAUTHORIZED_MALFORMED_TOKEN'
    });
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload: user ID missing.',
        error: 'UNAUTHORIZED_INVALID_PAYLOAD'
      });
    }

    // Attach authenticated user identity strictly from JWT
    req.userId = parseInt(decoded.id, 10);
    req.userEmail = decoded.email || '';
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication session expired. Please log in again.',
        error: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or corrupted authentication token.',
      error: 'TOKEN_INVALID'
    });
  }
};

module.exports = {
  verifyToken,
  getJwtSecret
};
