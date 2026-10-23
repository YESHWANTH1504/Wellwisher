/**
 * ProductionEnvironmentValidator.js
 * Validates runtime environment configuration against production-grade security and reliability criteria.
 * Enforces fail-safe startup without printing sensitive secrets.
 */

const { config, ENV_MODES } = require('./productionConfig');

const FORBIDDEN_WEAK_SECRETS = new Set([
  'secret',
  'jwtsecret',
  'changeme',
  'change_me',
  'default',
  'password',
  '123456',
  '12345678',
  'wellwisher',
  'supersecret',
  'testsecret'
]);

class ProductionEnvironmentValidator {
  validate(envOrConfig = {}) {
    const isEnvObj = envOrConfig.NODE_ENV !== undefined || envOrConfig.JWT_SECRET !== undefined;
    const cfg = isEnvObj ? this._normalizeEnv(envOrConfig) : envOrConfig;
    return ProductionEnvironmentValidator.validate(cfg);
  }

  enforceOrThrow(envOrConfig = {}) {
    const isEnvObj = envOrConfig.NODE_ENV !== undefined || envOrConfig.JWT_SECRET !== undefined;
    const cfg = isEnvObj ? this._normalizeEnv(envOrConfig) : envOrConfig;
    const res = ProductionEnvironmentValidator.validate(cfg);
    if (!res.valid) {
      throw new Error(`PRODUCTION CONFIGURATION FATAL ERROR:\n${res.errors.join('\n')}`);
    }
    return res;
  }

  getSanitizedConfig(envObj = {}) {
    const sanitized = {};
    for (const [key, val] of Object.entries(envObj)) {
      if (typeof val === 'string' && val.length > 0) {
        if (/secret|password|key|token/i.test(key)) {
          sanitized[key] = `[REDACTED ${val.length} chars]`;
        } else {
          sanitized[key] = val;
        }
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  _normalizeEnv(env) {
    return {
      env: (env.NODE_ENV || 'development').toLowerCase(),
      jwt: {
        secret: env.JWT_SECRET || '',
        minSecretLength: 32
      },
      database: {
        host: env.DB_HOST || '127.0.0.1',
        name: env.DB_NAME || 'wellwisher',
        password: env.DB_PASSWORD || ''
      },
      cors: {
        allowedOrigins: env.ALLOWED_ORIGINS ? [env.ALLOWED_ORIGINS] : []
      },
      rateLimits: { generalMaxRequests: 100 },
      observability: { logLevel: 'INFO' }
    };
  }

  /**
   * Validate runtime configuration
   * @param {Object} [cfg] - Configuration object (defaults to productionConfig.config)
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  static validate(cfg = config) {
    const errors = [];
    const warnings = [];

    const isProd = cfg.env === ENV_MODES.PRODUCTION || cfg.env === 'production';

    // 1. JWT Secret Validation
    if (!cfg.jwt || !cfg.jwt.secret) {
      errors.push('CRITICAL: JWT_SECRET environment variable is missing.');
    } else {
      const secretStr = String(cfg.jwt.secret).trim();
      const minLen = cfg.jwt.minSecretLength || 32;
      if (secretStr.length < minLen) {
        errors.push(`CRITICAL: JWT_SECRET must be at least ${minLen} characters long in production mode. (received ${secretStr.length} chars)`);
      }
      if (FORBIDDEN_WEAK_SECRETS.has(secretStr.toLowerCase())) {
        errors.push('CRITICAL: JWT_SECRET uses an insecure, common dictionary phrase.');
      }
    }

    // 2. Database Configuration Validation
    if (!cfg.database || !cfg.database.host) {
      errors.push('CRITICAL: DB_HOST is not specified.');
    }
    if (!cfg.database || !cfg.database.name) {
      errors.push('CRITICAL: DB_NAME is not specified.');
    }
    if (isProd) {
      if (!cfg.database || !cfg.database.password || cfg.database.password.trim() === '') {
        errors.push('CRITICAL: Database password cannot be empty in production mode.');
      } else if (FORBIDDEN_WEAK_SECRETS.has(String(cfg.database.password).toLowerCase())) {
        errors.push('CRITICAL: DB_PASSWORD uses an insecure placeholder password.');
      }
    }

    // 3. CORS origin check
    if (isProd && cfg.cors && Array.isArray(cfg.cors.allowedOrigins)) {
      if (cfg.cors.allowedOrigins.includes('*')) {
        errors.push('SECURITY VIOLATION: Wildcard CORS origin (*) is forbidden in production mode.');
      }
    }

    // 4. Rate Limiting Limits
    if (cfg.rateLimits && cfg.rateLimits.generalMaxRequests <= 0) {
      errors.push('Configuration error: generalMaxRequests must be positive.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Asserts environment is production ready. Throws with clean message if validation fails.
   * Never prints secrets!
   */
  static assertReady(cfg = config) {
    const result = ProductionEnvironmentValidator.validate(cfg);
    if (!result.valid) {
      const formattedErrors = result.errors.map(e => `  - ${e}`).join('\n');
      throw new Error(`[ENVIRONMENT_VALIDATION_FAILED] Production startup halted due to configuration errors:\n${formattedErrors}`);
    }
    return result;
  }
}

module.exports = {
  ProductionEnvironmentValidator
};
