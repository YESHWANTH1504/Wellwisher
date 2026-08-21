const crypto = require('node:crypto');

class IdempotencyManager {
  constructor() {
    this._cache = new Map();
  }

  _generateKey(userId, toolName, args = {}) {
    const sorted = JSON.stringify(args, Object.keys(args).sort());
    const hash = crypto.createHash('sha256').update(sorted).digest('hex');
    return `${userId}:${toolName}:${hash}`;
  }

  /**
   * Check if an identical mutation action has already executed recently (within TTL)
   */
  check(userId, toolName, args = {}) {
    const key = this._generateKey(userId, toolName, args);
    const record = this._cache.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this._cache.delete(key);
      return null;
    }

    return record.result;
  }

  /**
   * Store execution result for idempotency protection
   */
  record(userId, toolName, args = {}, result, ttlSeconds = 60) {
    const key = this._generateKey(userId, toolName, args);
    this._cache.set(key, {
      result,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: new Date().toISOString()
    });
  }
}

const idempotencyManager = new IdempotencyManager();

module.exports = {
  IdempotencyManager,
  idempotencyManager
};
