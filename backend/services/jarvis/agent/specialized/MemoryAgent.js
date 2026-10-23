const { AiMemoryRepository } = require('../../../../repositories/ai/aiMemoryRepository');

/**
 * MemoryAgent
 * Manages short-term working memory and long-term user preferences with strict privacy boundaries.
 * Zero raw-audio persistence.
 */
class MemoryAgent {
  constructor(options = {}) {
    this.shortTermCache = new Map();
  }

  /**
   * Store short-term working session memory
   */
  setWorkingMemory(sessionId, key, value) {
    if (!sessionId) return;
    if (!this.shortTermCache.has(sessionId)) {
      this.shortTermCache.set(sessionId, new Map());
    }
    this.shortTermCache.get(sessionId).set(key, {
      value,
      updatedAt: Date.now()
    });
  }

  /**
   * Retrieve short-term working session memory
   */
  getWorkingMemory(sessionId, key) {
    if (!sessionId || !this.shortTermCache.has(sessionId)) return null;
    const sessionMap = this.shortTermCache.get(sessionId);
    if (!key) {
      const all = {};
      for (const [k, v] of sessionMap.entries()) {
        all[k] = v.value;
      }
      return all;
    }
    const item = sessionMap.get(key);
    return item ? item.value : null;
  }

  /**
   * Clear working memory on session close or key deletion
   */
  clearWorkingMemory(sessionId, key) {
    if (!sessionId || !this.shortTermCache.has(sessionId)) return;
    if (key) {
      this.shortTermCache.get(sessionId).delete(key);
    } else {
      this.shortTermCache.delete(sessionId);
    }
  }

  /**
   * Save an explicit user preference into long-term memory
   */
  async savePreference(userId, category, content) {
    if (!userId || !content) return null;
    try {
      return await AiMemoryRepository.create(userId, {
        category: category || 'preference',
        content: content.trim(),
        confidenceScore: 0.95
      });
    } catch {
      return null;
    }
  }

  /**
   * Search user memories
   */
  async getMemories(userId, query = '') {
    if (!userId) return [];
    try {
      return await AiMemoryRepository.search(userId, query);
    } catch {
      return [];
    }
  }
}

module.exports = MemoryAgent;
