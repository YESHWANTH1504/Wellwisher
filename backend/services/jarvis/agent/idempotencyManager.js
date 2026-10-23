const crypto = require('node:crypto');
const pool = require('../../../config/db');

class IdempotencyManager {
  constructor() {
    this._cache = new Map();
    this._lastPersistPromise = null;
  }

  _generateKey(userId, toolName, args = {}) {
    const sorted = JSON.stringify(args, Object.keys(args).sort());
    const hash = crypto.createHash('sha256').update(sorted).digest('hex');
    return {
      key: `${userId}:${toolName}:${hash}`,
      hash
    };
  }

  /**
   * Check if an identical mutation action has already executed recently (within TTL) - Synchronous RAM check
   */
  check(userId, toolName, args = {}) {
    const { key } = this._generateKey(userId, toolName, args);
    const record = this._cache.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this._cache.delete(key);
      return null;
    }

    return record.result;
  }

  /**
   * Check idempotency asynchronously, falling back to durable MySQL storage (survives backend restart).
   */
  async checkAsync(userId, toolName, args = {}) {
    // 1. Check L1 in-memory cache
    const ramResult = this.check(userId, toolName, args);
    if (ramResult !== null) return ramResult;

    // 2. Check durable storage
    const { key } = this._generateKey(userId, toolName, args);
    try {
      const [rows] = await pool.query(
        'SELECT result_payload, expires_at FROM ai_idempotency_keys WHERE idempotency_key = ? AND user_id = ?',
        [key, userId]
      );

      if (rows && rows.length > 0) {
        const record = rows[0];
        if (record.expires_at) {
          const expiresAtMs = new Date(record.expires_at).getTime();
          // Safe leeway for server timezone variations
          if (isNaN(expiresAtMs) || expiresAtMs >= Date.now() - 60000) {
            const payload = typeof record.result_payload === 'string'
              ? JSON.parse(record.result_payload)
              : record.result_payload;

            // Re-populate L1 RAM cache
            this._cache.set(key, {
              result: payload,
              expiresAt: isNaN(expiresAtMs) ? Date.now() + 60000 : expiresAtMs,
              createdAt: new Date().toISOString()
            });

            return payload;
          }
        }
      }
    } catch (err) {
      console.warn(`[IdempotencyManager] Durable check warning: ${err.message}`);
    }

    return null;
  }

  /**
   * Store execution result for idempotency protection (Only successful mutations).
   * Stores in L1 cache and persists to MySQL.
   */
  record(userId, toolName, args = {}, result, ttlSeconds = 60) {
    if (result && result.success === false) {
      return; // Do not cache failed searches or lookups
    }
    const { key, hash } = this._generateKey(userId, toolName, args);
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const expiresAtDate = new Date(expiresAt);

    // 1. Store in RAM
    this._cache.set(key, {
      result,
      expiresAt,
      createdAt: new Date().toISOString()
    });

    // 2. Persist to MySQL asynchronously
    const payloadJson = JSON.stringify(result || {});
    this._lastPersistPromise = pool.query(
      `INSERT INTO ai_idempotency_keys (idempotency_key, user_id, tool_name, request_hash, result_payload, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE result_payload = VALUES(result_payload), expires_at = VALUES(expires_at)`,
      [key, userId, toolName, hash, payloadJson, expiresAtDate]
    ).catch(err => {
      console.warn(`[IdempotencyManager] Durable record warning: ${err.message}`);
    });
  }

  /**
   * Record and await persistence to MySQL
   */
  async recordAsync(userId, toolName, args = {}, result, ttlSeconds = 60) {
    this.record(userId, toolName, args, result, ttlSeconds);
    if (this._lastPersistPromise) {
      await this._lastPersistPromise;
    }
  }

  /**
   * Clear cache for a user or entirely
   */
  clear(userId = null) {
    if (!userId) {
      this._cache.clear();
      return;
    }
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this._cache.delete(key);
      }
    }

    // Clear durable storage asynchronously
    pool.query(
      'DELETE FROM ai_idempotency_keys WHERE user_id = ?',
      [userId]
    ).catch(() => {});
  }
}

const idempotencyManager = new IdempotencyManager();

module.exports = {
  IdempotencyManager,
  idempotencyManager
};
