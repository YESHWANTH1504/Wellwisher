/**
 * MultimodalContextManager
 * Manages active visual context per user / session.
 * Enables natural follow-up questions ("What color is it?", "Read the text")
 * without requiring the user to re-upload or re-capture images.
 * Enforces strict TTL (default 10 minutes) and explicit forget commands.
 */

class MultimodalContextManager {
  constructor() {
    this.contexts = new Map(); // key: `${userId}:${sessionId || 'default'}`
    this.DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
  }

  _getKey(userId, sessionId = 'default') {
    return `${userId}:${sessionId || 'default'}`;
  }

  /**
   * Set active visual context
   */
  setActiveContext(userId, sessionId, contextData) {
    if (!userId) return;
    const key = this._getKey(userId, sessionId);
    this.contexts.set(key, {
      ...contextData,
      userId,
      sessionId: sessionId || 'default',
      storedAt: Date.now(),
      expiresAt: Date.now() + (contextData.ttlMs || this.DEFAULT_TTL_MS)
    });
  }

  /**
   * Get active visual context if not expired
   */
  getActiveContext(userId, sessionId) {
    if (!userId) return null;
    const key = this._getKey(userId, sessionId);
    const entry = this.contexts.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.contexts.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Check if session has active visual context
   */
  hasActiveContext(userId, sessionId) {
    return this.getActiveContext(userId, sessionId) !== null;
  }

  /**
   * Explicitly clear visual context (e.g. "Forget that image")
   */
  clearContext(userId, sessionId) {
    if (!userId) return false;
    const key = this._getKey(userId, sessionId);
    return this.contexts.delete(key);
  }

  /**
   * Clear all contexts for a user
   */
  clearUser(userId) {
    if (!userId) return;
    for (const key of this.contexts.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.contexts.delete(key);
      }
    }
  }
}

const multimodalContextManager = new MultimodalContextManager();

module.exports = {
  MultimodalContextManager,
  multimodalContextManager
};
