const pool = require('../../../config/db');

/**
 * JarvisSemanticIndex
 * Personal semantic search engine indexing memories, entities, routines,
 * documents, and relationships with strict user isolation and privacy boundaries.
 */
class JarvisSemanticIndex {
  /**
   * Index or update an item in the personal semantic index
   */
  async indexItem(userId, {
    itemType, // 'MEMORY', 'ENTITY', 'EVENT', 'DOCUMENT', 'PHOTO', 'TASK'
    itemId,
    title,
    content = '',
    tags = [],
    privacyLevel = 'PRIVATE'
  }) {
    if (!userId) throw new Error('JarvisSemanticIndex requires authenticated userId');
    const indexId = `idx_${itemType.toLowerCase()}_${itemId}`;
    const tokens = this._tokenize(`${title} ${content} ${tags.join(' ')}`);

    await pool.query(
      `INSERT INTO jarvis_semantic_index (
        id, user_id, item_type, item_id, title, content, tokens, tags, privacy_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        content = VALUES(content),
        tokens = VALUES(tokens),
        tags = VALUES(tags),
        privacy_level = VALUES(privacy_level),
        updated_at = CURRENT_TIMESTAMP`,
      [
        indexId,
        userId,
        itemType,
        itemId,
        title,
        content,
        JSON.stringify(tokens),
        JSON.stringify(tags),
        privacyLevel
      ]
    );

    return { id: indexId, userId, itemType, itemId, title };
  }

  /**
   * Search across personal index, memories, world model entities, and calendar events
   */
  async search(userId, queryText, options = {}) {
    if (!userId || !queryText) return [];
    const cleanQuery = queryText.toLowerCase().trim();
    const queryTokens = this._tokenize(cleanQuery);
    const limit = options.limit || 10;
    const filterType = options.itemType || null;

    const results = [];

    // 1. Search jarvis_semantic_index table
    let sql = 'SELECT * FROM jarvis_semantic_index WHERE user_id = ?';
    const params = [userId];
    if (filterType) {
      sql += ' AND item_type = ?';
      params.push(filterType);
    }

    const [indexRows] = await pool.query(sql, params);
    for (const row of indexRows) {
      const titleLower = (row.title || '').toLowerCase();
      const contentLower = (row.content || '').toLowerCase();
      let matchScore = 0;

      if (titleLower.includes(cleanQuery)) matchScore += 10;
      if (contentLower.includes(cleanQuery)) matchScore += 5;

      for (const t of queryTokens) {
        if (titleLower.includes(t)) matchScore += 3;
        if (contentLower.includes(t)) matchScore += 1;
      }

      if (matchScore > 0) {
        results.push({
          itemId: row.item_id,
          itemType: row.item_type,
          title: row.title,
          content: row.content,
          score: matchScore,
          source: 'SEMANTIC_INDEX',
          privacyLevel: row.privacy_level
        });
      }
    }

    // 2. Direct search across jarvis_entities
    let entSql = 'SELECT * FROM jarvis_entities WHERE user_id = ?';
    const [entRows] = await pool.query(entSql, [userId]);
    for (const ent of entRows) {
      const name = (ent.display_name || '').toLowerCase();
      const propsStr = typeof ent.properties === 'string' ? ent.properties.toLowerCase() : JSON.stringify(ent.properties || {}).toLowerCase();
      let score = 0;

      if (name.includes(cleanQuery)) score += 12;
      for (const t of queryTokens) {
        if (name.includes(t)) score += 4;
        if (propsStr.includes(t)) score += 2;
      }

      if (score > 0 && !results.some(r => r.itemId === ent.id)) {
        results.push({
          itemId: ent.id,
          itemType: ent.entity_type,
          title: ent.display_name,
          content: propsStr,
          score,
          source: 'WORLD_MODEL_ENTITY',
          privacyLevel: ent.privacy_level
        });
      }
    }

    // 3. Direct search across ai_memories
    const [memRows] = await pool.query('SELECT * FROM ai_memories WHERE user_id = ?', [userId]);
    for (const mem of memRows) {
      const key = (mem.memory_key || '').toLowerCase();
      const val = (mem.memory_value || '').toLowerCase();
      let score = 0;

      if (key.includes(cleanQuery) || val.includes(cleanQuery)) score += 10;
      for (const t of queryTokens) {
        if (key.includes(t)) score += 3;
        if (val.includes(t)) score += 2;
      }

      if (score > 0 && !results.some(r => r.itemId === mem.id)) {
        results.push({
          itemId: mem.id,
          itemType: 'MEMORY',
          title: mem.memory_key,
          content: mem.memory_value,
          score,
          source: 'AI_MEMORY',
          confidence: parseFloat(mem.confidence_score) || 1.0
        });
      }
    }

    // 4. Direct search across routines/calendar
    const [calRows] = await pool.query('SELECT * FROM routines WHERE user_id = ?', [userId]);
    for (const cal of calRows) {
      const title = (cal.title || '').toLowerCase();
      let score = 0;
      if (title.includes(cleanQuery)) score += 8;
      for (const t of queryTokens) {
        if (title.includes(t)) score += 2;
      }

      if (score > 0 && !results.some(r => r.itemId === cal.id)) {
        results.push({
          itemId: cal.id,
          itemType: 'CALENDAR_EVENT',
          title: cal.title,
          content: `${cal.date} at ${cal.time}`,
          score,
          source: 'CALENDAR_ROUTINES'
        });
      }
    }

    // Sort descending by match score and apply limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  _tokenize(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }
}

const defaultSemanticIndex = new JarvisSemanticIndex();

module.exports = {
  JarvisSemanticIndex,
  defaultSemanticIndex
};
