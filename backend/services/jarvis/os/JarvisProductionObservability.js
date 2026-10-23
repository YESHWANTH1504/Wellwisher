/**
 * JarvisProductionObservability.js
 * Centralized structured observability engine for JARVIS OS.
 * Manages leveled logging (ERROR, WARN, INFO, DEBUG), structured JSON event emission,
 * and persistent security/action auditing without leaking sensitive payloads.
 */

const pool = require('../../../config/db');
const { config } = require('../../../config/productionConfig');

const LOG_LEVELS = Object.freeze({
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
});

const OBSERVABILITY_EVENTS = Object.freeze({
  REQUEST_RECEIVED: 'REQUEST_RECEIVED',
  INTENT_RESOLVED: 'INTENT_RESOLVED',
  MODEL_ROUTED: 'MODEL_ROUTED',
  CAPABILITY_SELECTED: 'CAPABILITY_SELECTED',
  ACTION_STARTED: 'ACTION_STARTED',
  ACTION_COMPLETED: 'ACTION_COMPLETED',
  ACTION_FAILED: 'ACTION_FAILED',
  VERIFICATION_STARTED: 'VERIFICATION_STARTED',
  VERIFICATION_COMPLETED: 'VERIFICATION_COMPLETED',
  WORKFLOW_STARTED: 'WORKFLOW_STARTED',
  WORKFLOW_COMPLETED: 'WORKFLOW_COMPLETED',
  WORKFLOW_FAILED: 'WORKFLOW_FAILED',
  PROACTIVE_TRIGGERED: 'PROACTIVE_TRIGGERED',
  OFFLINE_ENTERED: 'OFFLINE_ENTERED',
  OFFLINE_EXITED: 'OFFLINE_EXITED',
  SYNC_STARTED: 'SYNC_STARTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  PROVIDER_FAILED: 'PROVIDER_FAILED',
  DATABASE_FAILED: 'DATABASE_FAILED',
  AUTH_FAILED: 'AUTH_FAILED'
});

class JarvisProductionObservability {
  constructor(options = {}) {
    const configuredLevel = (options.logLevel || config.observability.logLevel || 'INFO').toUpperCase();
    this.currentLevel = LOG_LEVELS[configuredLevel] !== undefined ? LOG_LEVELS[configuredLevel] : LOG_LEVELS.INFO;
    this.isJson = options.enableJsonLogging !== undefined ? options.enableJsonLogging : config.observability.enableJsonLogging;
    this._listeners = new Set();
  }

  setLogLevel(level) {
    const upper = String(level).toUpperCase();
    if (LOG_LEVELS[upper] !== undefined) {
      this.currentLevel = LOG_LEVELS[upper];
    }
  }

  getLogLevelName() {
    for (const [key, val] of Object.entries(LOG_LEVELS)) {
      if (val === this.currentLevel) return key;
    }
    return 'INFO';
  }

  _shouldLog(level) {
    return level <= this.currentLevel;
  }

  _sanitizePayload(payload = {}) {
    if (!payload || typeof payload !== 'object') return payload;
    const sanitized = { ...payload };
    const sensitiveKeys = ['password', 'secret', 'token', 'authorization', 'apiKey', 'creditCard'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[MASKED]';
      }
    }
    return sanitized;
  }

  log(levelName, message, context = {}) {
    const levelVal = LOG_LEVELS[levelName] || LOG_LEVELS.INFO;
    if (!this._shouldLog(levelVal)) return;

    const safeContext = this._sanitizePayload(context);
    const entry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      requestId: safeContext.requestId || null,
      userId: safeContext.userId || null,
      component: safeContext.component || 'JARVIS_OS',
      details: safeContext
    };

    if (this.isJson) {
      console.log(JSON.stringify(entry));
    } else {
      console.log(`[${entry.timestamp}] [${entry.level}] [${entry.component}] ${message}`);
    }
  }

  error(message, context = {}) {
    this.log('ERROR', message, context);
  }

  warn(message, context = {}) {
    this.log('WARN', message, context);
  }

  info(message, context = {}) {
    this.log('INFO', message, context);
  }

  debug(message, context = {}) {
    this.log('DEBUG', message, context);
  }

  /**
   * Record a structured operational event
   */
  async recordEvent(eventType, component, payload = {}, options = {}) {
    const safePayload = this._sanitizePayload(payload);
    const userId = options.userId || safePayload.userId || 0;
    const requestId = options.requestId || safePayload.requestId || null;

    this.info(`[EVENT:${eventType}] [${component}]`, {
      eventType,
      component,
      userId,
      requestId,
      ...safePayload
    });

    // Notify listeners
    for (const listener of this._listeners) {
      try {
        listener({ eventType, component, payload: safePayload, userId, requestId, timestamp: new Date().toISOString() });
      } catch (_) {}
    }

    if (!this._recentLogs) this._recentLogs = [];
    this._recentLogs.unshift({ event: eventType, component, timestamp: new Date().toISOString() });
    if (this._recentLogs.length > 50) this._recentLogs.pop();

    // Persist to MySQL audit table if available
    if (options.persist !== false && userId) {
      const eventId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      try {
        await pool.query(
          `INSERT INTO jarvis_audit_events (event_id, user_id, request_id, event_type, component, payload)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [eventId, userId, requestId, eventType, component, JSON.stringify(safePayload)]
        );
      } catch (err) {
        // Do not crash primary execution if audit insert fails
        this.error(`Failed to persist audit event: ${err.message}`, { component, eventType });
      }
    }
  }

  getRecentLogs(limit = 10) {
    if (!this._recentLogs) this._recentLogs = [];
    return this._recentLogs.slice(0, limit);
  }

  formatTelemetryEvent(type, payload = {}) {
    const safe = { ...payload };
    const piiKeys = ['bloodPressure', 'privateNote', 'password', 'token', 'medical', 'condition'];
    for (const key of piiKeys) {
      delete safe[key];
    }
    return {
      type,
      timestamp: new Date().toISOString(),
      ...safe
    };
  }

  addListener(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

const defaultObservability = new JarvisProductionObservability();

module.exports = {

  JarvisProductionObservability,
  defaultObservability,
  LOG_LEVELS,
  OBSERVABILITY_EVENTS
};
