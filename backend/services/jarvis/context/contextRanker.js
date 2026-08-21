class ContextRanker {
  /**
   * Score and rank memories based on relevance, importance, and recency
   */
  static rankMemories(memories = [], queryText = '', { limit = 5 } = {}) {
    if (!Array.isArray(memories) || memories.length === 0) return [];

    const queryTokens = this.tokenize(queryText);

    const scored = memories.map(mem => {
      let score = 0;

      // 1. Importance Score (1-5 -> 10-50 pts)
      const importance = parseInt(mem.importance, 10) || 3;
      score += importance * 10;

      // 2. Keyword Relevance Score
      const memTokens = this.tokenize(`${mem.memory_key} ${mem.memory_value}`);
      let matchCount = 0;

      for (const token of queryTokens) {
        if (memTokens.includes(token)) {
          matchCount++;
        }
      }

      if (queryTokens.length > 0) {
        const overlapRatio = matchCount / queryTokens.length;
        score += Math.round(overlapRatio * 60); // Up to 60 pts
      }

      // 3. Exact substring match bonus
      const lowerKey = (mem.memory_key || '').toLowerCase();
      const lowerVal = (mem.memory_value || '').toLowerCase();
      const cleanQuery = (queryText || '').trim().toLowerCase();

      if (cleanQuery && (lowerVal.includes(cleanQuery) || lowerKey.includes(cleanQuery))) {
        score += 30;
      }

      // 4. Recency score (last 7 days gets +10)
      if (mem.created_at) {
        const ageDays = (Date.now() - new Date(mem.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays <= 7) score += 10;
      }

      return {
        ...mem,
        _relevanceScore: score
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b._relevanceScore - a._relevanceScore);

    // Bound to budget limit
    return scored.slice(0, limit);
  }

  static tokenize(str = '') {
    if (!str) return [];
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }
}

module.exports = ContextRanker;
