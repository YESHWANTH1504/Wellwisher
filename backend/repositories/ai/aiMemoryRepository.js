const pool = require('../../config/db');

const VALID_MEMORY_TYPES = [
  'USER_PREFERENCE',
  'ROUTINE_PREFERENCE',
  'COMMUNICATION_PREFERENCE',
  'SCHEDULE_PREFERENCE',
  'ASSISTANT_PREFERENCE',
  'TEMPORARY_CONTEXT',
  'IMPORTANT_CONTEXT'
];

const VALID_SOURCES = ['USER_EXPLICIT', 'AGENT_INFERRED', 'SYSTEM_DERIVED'];

class AiMemoryRepository {
  /**
   * Create a new structured user memory
   */
  static async createMemory(userId, {
    memoryType = 'USER_PREFERENCE',
    memoryKey,
    memoryValue,
    source = 'USER_EXPLICIT',
    importance = 3,
    confidenceScore = 1.0,
    evidenceCount = 1,
    lastObservedAt = null,
    expiresAt = null,
    sourceReference = null,
    metadata
  } = {}) {
    if (!userId) throw new Error('userId is required');
    if (!memoryKey || !memoryValue) throw new Error('memoryKey and memoryValue are required');

    if (!VALID_MEMORY_TYPES.includes(memoryType)) {
      throw new Error(`Invalid memoryType: ${memoryType}. Must be one of: ${VALID_MEMORY_TYPES.join(', ')}`);
    }

    if (!VALID_SOURCES.includes(source)) {
      throw new Error(`Invalid source: ${source}. Must be one of: ${VALID_SOURCES.join(', ')}`);
    }

    const imp = Math.min(5, Math.max(1, parseInt(importance, 10) || 3));
    const conf = Math.min(1.0, Math.max(0.0, parseFloat(confidenceScore) || 1.0));
    const evCount = Math.max(1, parseInt(evidenceCount, 10) || 1);
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const [result] = await pool.query(
      `INSERT INTO ai_memories 
       (user_id, memory_type, memory_key, memory_value, source, importance, confidence_score, evidence_count, last_observed_at, expires_at, source_reference, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        memoryType,
        memoryKey.trim(),
        memoryValue.trim(),
        source,
        imp,
        conf,
        evCount,
        lastObservedAt ? new Date(lastObservedAt) : new Date(),
        expiresAt ? new Date(expiresAt) : null,
        sourceReference,
        metadataJson
      ]
    );

    return {
      id: result.insertId,
      userId,
      memoryType,
      memoryKey: memoryKey.trim(),
      memoryValue: memoryValue.trim(),
      source,
      importance: imp,
      confidenceScore: conf,
      evidenceCount: evCount,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Alias for createMemory for backwards compatibility
   */
  static async saveMemory(userId, data) {
    return this.createMemory(userId, data);
  }

  /**
   * Search user memories by keyword
   */
  static async searchMemories(userId, searchTerm) {
    if (!userId) throw new Error('userId is required');
    const term = (searchTerm || '').trim();
    if (!term) return this.getMemoriesByUser(userId);

    const [rows] = await pool.query(
      `SELECT * FROM ai_memories 
       WHERE user_id = ? AND (memory_key LIKE ? OR memory_value LIKE ?)
       ORDER BY importance DESC, updated_at DESC`,
      [userId, `%${term}%`, `%${term}%`]
    );
    return (rows || []).map(r => this._formatRow(r));
  }

  /**
   * Get all memories for a user, optionally filtered by memoryType
   */
  static async getMemoriesByUser(userId, { memoryType, source, limit = 50 } = {}) {
    if (!userId) throw new Error('userId is required');

    if (memoryType && !VALID_MEMORY_TYPES.includes(memoryType)) {
      throw new Error(`Invalid memoryType: ${memoryType}`);
    }

    let sql = 'SELECT * FROM ai_memories WHERE user_id = ?';
    const params = [userId];

    if (memoryType) {
      sql += ' AND memory_type = ?';
      params.push(memoryType);
    }

    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }

    sql += ' ORDER BY CASE source WHEN "USER_EXPLICIT" THEN 1 WHEN "AGENT_INFERRED" THEN 2 ELSE 3 END, importance DESC, updated_at DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 50);

    const [rows] = await pool.query(sql, params);
    return (rows || []).map(r => this._formatRow(r));
  }

  /**
   * Get single memory by ID with ownership verification
   */
  static async getMemoryById(id, userId) {
    if (!id || !userId) throw new Error('id and userId are required');
    const [rows] = await pool.query(
      `SELECT * FROM ai_memories WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, userId]
    );
    return rows && rows[0] ? this._formatRow(rows[0]) : null;
  }

  /**
   * Update memory value or importance
   */
  static async updateMemory(id, userId, { memoryValue, importance, confidenceScore, metadata } = {}) {
    if (!id || !userId) throw new Error('id and userId are required');
    
    const existing = await this.getMemoryById(id, userId);
    if (!existing) return false;

    const newValue = memoryValue !== undefined ? memoryValue.trim() : existing.memory_value;
    const newImp = importance !== undefined ? Math.min(5, Math.max(1, parseInt(importance, 10))) : existing.importance;
    const newConf = confidenceScore !== undefined ? Math.min(1.0, Math.max(0.0, parseFloat(confidenceScore))) : (existing.confidence_score || 1.0);
    const newMetadata = metadata !== undefined ? JSON.stringify(metadata) : (existing.metadata ? JSON.stringify(existing.metadata) : null);

    const [result] = await pool.query(
      `UPDATE ai_memories 
       SET memory_value = ?, importance = ?, confidence_score = ?, metadata = ?, updated_at = NOW() 
       WHERE id = ? AND user_id = ?`,
      [newValue, newImp, newConf, newMetadata, id, userId]
    );

    return (result && result.affectedRows > 0) || true;
  }

  /**
   * Delete memory with strict user scoping
   */
  static async deleteMemory(id, userId) {
    if (!id || !userId) throw new Error('id and userId are required');
    const [result] = await pool.query(
      `DELETE FROM ai_memories WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    return result ? result.affectedRows > 0 : false;
  }

  /**
   * Clear user memories (with optional inferred-only filter for privacy controls)
   */
  static async clearMemories(userId, { inferredOnly = false } = {}) {
    if (!userId) throw new Error('userId is required');
    if (inferredOnly) {
      const [result] = await pool.query(
        'DELETE FROM ai_memories WHERE user_id = ? AND source != ?',
        [userId, 'USER_EXPLICIT']
      );
      return result ? result.affectedRows : 0;
    }
    const [result] = await pool.query(
      'DELETE FROM ai_memories WHERE user_id = ?',
      [userId]
    );
    return result ? result.affectedRows : 0;
  }

  static _formatRow(r) {
    if (!r) return null;
    return {
      ...r,
      confidence_score: r.confidence_score !== undefined ? parseFloat(r.confidence_score) : 1.0,
      evidence_count: r.evidence_count !== undefined ? parseInt(r.evidence_count, 10) : 1,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
    };
  }
}

module.exports = {
  AiMemoryRepository,
  VALID_MEMORY_TYPES,
  VALID_SOURCES
};
