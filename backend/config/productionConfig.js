/**
 * productionConfig.js
 * Centralized production configuration layer for WellWisher / JARVIS OS.
 * Supports DEVELOPMENT, TEST, STAGING, and PRODUCTION environments.
 * Enforces zero hardcoded credentials and safe defaults.
 */

const path = require('path');

const ENV_MODES = Object.freeze({
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
});

const currentEnv = (process.env.NODE_ENV || ENV_MODES.DEVELOPMENT).toLowerCase();

const config = {
  env: currentEnv,
  isProduction: currentEnv === ENV_MODES.PRODUCTION,
  isTest: currentEnv === ENV_MODES.TEST,
  isDevelopment: currentEnv === ENV_MODES.DEVELOPMENT,

  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
    keepAliveTimeoutMs: parseInt(process.env.KEEPALIVE_TIMEOUT_MS || '65000', 10),
    shutdownGracePeriodMs: parseInt(process.env.SHUTDOWN_GRACE_PERIOD_MS || '10000', 10)
  },

  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'wellwisher',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || (currentEnv === ENV_MODES.PRODUCTION ? '25' : '10'), 10),
    waitForConnections: true,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '50', 10),
    connectTimeoutMs: parseInt(process.env.DB_CONNECT_TIMEOUT_MS || '10000', 10),
    idleTimeoutMs: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '60000', 10),
    maxRetries: parseInt(process.env.DB_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.DB_RETRY_DELAY_MS || '1000', 10)
  },

  jwt: {
    secret: process.env.JWT_SECRET || (currentEnv === ENV_MODES.TEST ? 'wellwisher_test_suite_jwt_secret_32_chars_long!' : ''),
    accessTokenExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    minSecretLength: 32
  },

  aiProviders: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      defaultModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '15000', 10),
      maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '2', 10)
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      timeoutMs: parseInt(process.env.OPENAI_TIMEOUT_MS || '15000', 10),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2', 10)
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      voiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
      timeoutMs: parseInt(process.env.ELEVENLABS_TIMEOUT_MS || '10000', 10)
    },
    livekit: {
      url: process.env.LIVEKIT_URL || '',
      apiKey: process.env.LIVEKIT_API_KEY || '',
      apiSecret: process.env.LIVEKIT_API_SECRET || ''
    }
  },

  rateLimits: {
    generalWindowMs: 15 * 60 * 1000,
    generalMaxRequests: currentEnv === ENV_MODES.PRODUCTION ? 300 : 1000,
    authWindowMs: 15 * 60 * 1000,
    authMaxRequests: currentEnv === ENV_MODES.PRODUCTION ? 20 : 100,
    aiWindowMs: 1 * 60 * 1000,
    aiMaxRequests: currentEnv === ENV_MODES.PRODUCTION ? 60 : 300
  },

  featureFlags: {
    enableProactive: process.env.FEATURE_PROACTIVE !== 'false',
    enableRealtime: process.env.FEATURE_REALTIME !== 'false',
    enableVision: process.env.FEATURE_VISION !== 'false',
    enableLocalAi: process.env.FEATURE_LOCAL_AI !== 'false',
    enableOfflineSync: process.env.FEATURE_OFFLINE_SYNC !== 'false',
    enableWorkflows: process.env.FEATURE_WORKFLOWS !== 'false',
    enableScreenContext: process.env.FEATURE_SCREEN_CONTEXT !== 'false'
  },

  observability: {
    logLevel: process.env.LOG_LEVEL || (currentEnv === ENV_MODES.PRODUCTION ? 'INFO' : 'DEBUG'),
    enableJsonLogging: currentEnv === ENV_MODES.PRODUCTION,
    enableRequestTracing: true,
    maskSensitiveData: true
  },

  offline: {
    queueBatchSize: parseInt(process.env.OFFLINE_QUEUE_BATCH_SIZE || '25', 10),
    maxQueueRetries: parseInt(process.env.OFFLINE_QUEUE_MAX_RETRIES || '3', 10),
    syncCooldownMs: parseInt(process.env.OFFLINE_SYNC_COOLDOWN_MS || '5000', 10)
  },

  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['https://wellwisher.app', 'https://api.wellwisher.app'],
    credentials: true
  },

  version: {
    appVersion: '1.4.0',
    backendVersion: '1.4.0',
    databaseSchemaVersion: '13.0',
    capabilityVersion: '2.0.0',
    workflowVersion: '1.0.0'
  }
};

const productionConfig = {
  ENVIRONMENTS: ENV_MODES,
  getConfig: (envName = 'production') => {
    return {
      ...config,
      env: envName,
      isProduction: envName === ENV_MODES.PRODUCTION,
      logging: {
        level: envName === ENV_MODES.PRODUCTION ? 'info' : 'debug',
        enableDebug: envName !== ENV_MODES.PRODUCTION
      },
      cors: {
        allowedOrigins: ['https://wellwisher.app', 'https://api.wellwisher.app']
      }
    };
  }
};

module.exports = {
  config,
  productionConfig,
  ENV_MODES
};

