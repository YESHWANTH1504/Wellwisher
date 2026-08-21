const { AiMemoryRepository } = require('../../../../repositories/ai/aiMemoryRepository');
const ContextRanker = require('../contextRanker');

class MemoryRetriever {
  /**
   * Hybrid retrieval for user memories (Keyword + Importance + Recency)
   * Extensible for future embedding/vector search plugins.
   */
  static async retrieve(userId, requestText = '', { limit = 5 } = {}) {
    // 1. Fetch user memories
    const allMemories = await AiMemoryRepository.getMemoriesByUser(userId, { limit: 50 });

    if (allMemories.length === 0) {
      return {
        count: 0,
        memories: []
      };
    }

    // 2. Rank memories against request context
    const ranked = ContextRanker.rankMemories(allMemories, requestText, { limit });

    return {
      count: ranked.length,
      memories: ranked
    };
  }
}

module.exports = MemoryRetriever;
