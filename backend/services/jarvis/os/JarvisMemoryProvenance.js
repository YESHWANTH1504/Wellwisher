const pool = require('../../../config/db');

const PROVENANCE_TYPES = {
  EXPLICIT_USER_FACT: 'EXPLICIT_USER_FACT',
  OBSERVED_FACT: 'OBSERVED_FACT',
  IMPORTED_FACT: 'IMPORTED_FACT',
  SYSTEM_STATE: 'SYSTEM_STATE',
  INFERRED_FACT: 'INFERRED_FACT',
  AI_DERIVED_FACT: 'AI_DERIVED_FACT'
};

const PRIVACY_LEVELS = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  CONFIDENTIAL: 'CONFIDENTIAL',
  RESTRICTED: 'RESTRICTED'
};

/**
 * JarvisMemoryProvenance
 * Manages verifiable audit trails, confidence scoring, provenance classification,
 * and memory corrections with duplicate suppression.
 */
class JarvisMemoryProvenance {
  /**
   * Save or update memory with strict provenance tracking
   */
  async recordMemory(userId, {
    id,
    memoryType = 'IMPORTANT_CONTEXT',
    memoryKey,
    memoryValue,
    source = 'USER_EXPLICIT',
    sourceType = PROVENANCE_TYPES.EXPLICIT_USER_FACT,
    confidence = 1.0,
    privacyLevel = PRIVACY_LEVELS.PRIVATE,
    userConfirmed = true,
    derivedFrom = [],
    expiresAt = null,
    metadata = {}
  }) {
    if (!userId) throw new Error('JarvisMemoryProvenance requires authenticated userId');
    const memoryId = id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const metadataJson = JSON.stringify({
      sourceType,
      userConfirmed,
      derivedFrom,
      ...metadata
    });

    // Check if a memory with the same key already exists to prevent duplicate creation
    const [existing] = await pool.query(
      'SELECT id, memory_value FROM ai_memories WHERE user_id = ? AND memory_key = ? LIMIT 1',
      [userId, memoryKey]
    );

    let actualId = (existing && existing.length > 0) ? existing[0].id : null;
    const isUpdate = (existing && existing.length > 0);
    const previousValue = isUpdate ? existing[0].memory_value : null;

    if (isUpdate) {
      await pool.query(
        `UPDATE ai_memories SET
          memory_value = ?,
          confidence_score = ?,
          source = ?,
          metadata = ?,
          last_observed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`,
        [memoryValue, confidence, source, metadataJson, actualId, userId]
      );
    } else {
      const [insertRes] = await pool.query(
        `INSERT INTO ai_memories (
          user_id, memory_type, memory_key, memory_value, source,
          confidence_score, metadata, last_observed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, memoryType, memoryKey, memoryValue, source, confidence, metadataJson]
      );
      actualId = insertRes.insertId;
    }

    // Record provenance audit trail in jarvis_memory_provenance
    const provId = `prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO jarvis_memory_provenance (
        id, user_id, memory_id, source, source_type, confidence, privacy_level,
        user_confirmed, derived_from, audit_action, previous_value, new_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provId,
        userId,
        actualId,
        source,
        sourceType,
        confidence,
        privacyLevel,
        userConfirmed ? 1 : 0,
        JSON.stringify(derivedFrom),
        isUpdate ? 'UPDATED' : 'CREATED',
        previousValue,
        memoryValue
      ]
    );

    return {
      id: actualId,
      userId,
      memoryType,
      memoryKey,
      memoryValue,
      sourceType,
      confidence,
      privacyLevel,
      userConfirmed,
      isUpdate
    };
  }

  /**
   * Correct or revise existing memory ("That's wrong", "Change that to X")
   */
  async correctMemory(userId, memoryKeyOrId, newValue, options = {}) {
    if (!userId) throw new Error('JarvisMemoryProvenance requires authenticated userId');

    // Find target memory
    const [rows] = await pool.query(
      'SELECT * FROM ai_memories WHERE user_id = ? AND (id = ? OR memory_key = ?) LIMIT 1',
      [userId, memoryKeyOrId, memoryKeyOrId]
    );

    if (!rows || rows.length === 0) {
      // Create new explicit memory if not found
      return this.recordMemory(userId, {
        memoryKey: memoryKeyOrId,
        memoryValue: newValue,
        sourceType: PROVENANCE_TYPES.EXPLICIT_USER_FACT,
        userConfirmed: true,
        confidence: 1.0,
        metadata: { correctionNote: options.reason || 'User corrected factual error' }
      });
    }

    const target = rows[0];
    const prevValue = target.memory_value;
    const targetMeta = typeof target.metadata === 'string' ? JSON.parse(target.metadata) : (target.metadata || {});

    targetMeta.lastCorrection = {
      correctedAt: new Date().toISOString(),
      previousValue: prevValue,
      reason: options.reason || 'USER_CORRECTION'
    };

    await pool.query(
      `UPDATE ai_memories SET
        memory_value = ?,
        confidence_score = 1.0,
        metadata = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
      [newValue, JSON.stringify(targetMeta), target.id, userId]
    );

    // Audit log
    const provId = `prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await pool.query(
      `INSERT INTO jarvis_memory_provenance (
        id, user_id, memory_id, source, source_type, confidence, privacy_level,
        user_confirmed, audit_action, previous_value, new_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        provId,
        userId,
        target.id,
        'USER_CORRECTION',
        PROVENANCE_TYPES.EXPLICIT_USER_FACT,
        1.0,
        'PRIVATE',
        1,
        'CORRECTED',
        prevValue,
        newValue
      ]
    );

    return {
      id: target.id,
      userId,
      memoryKey: target.memory_key,
      previousValue: prevValue,
      updatedValue: newValue,
      status: 'CORRECTED'
    };
  }

  /**
   * Delete or forget memory ("Forget that", "Don't remember this")
   */
  async forgetMemory(userId, memoryKeyOrId) {
    if (!userId) throw new Error('JarvisMemoryProvenance requires authenticated userId');
    const [rows] = await pool.query(
      'SELECT id, memory_value FROM ai_memories WHERE user_id = ? AND (id = ? OR memory_key = ?)',
      [userId, memoryKeyOrId, memoryKeyOrId]
    );

    if (rows && rows.length > 0) {
      const memId = rows[0].id;
      await pool.query('DELETE FROM ai_memories WHERE id = ? AND user_id = ?', [memId, userId]);

      // Record deletion in provenance audit
      const provId = `prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await pool.query(
        `INSERT INTO jarvis_memory_provenance (
          id, user_id, memory_id, source, source_type, confidence, privacy_level,
          user_confirmed, audit_action, previous_value, new_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          provId,
          userId,
          memId,
          'USER_FORGET_COMMAND',
          PROVENANCE_TYPES.EXPLICIT_USER_FACT,
          1.0,
          'PRIVATE',
          1,
          'DELETED',
          rows[0].memory_value,
          null
        ]
      );
      return { success: true, deletedId: memId };
    }
    return { success: false, message: 'Memory not found' };
  }

  /**
   * Retrieve provenance history for a memory
   */
  async getProvenanceHistory(userId, memoryId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      'SELECT * FROM jarvis_memory_provenance WHERE user_id = ? AND memory_id = ? ORDER BY created_at DESC, id DESC',
      [userId, memoryId]
    );
    return rows;
  }
}

const defaultMemoryProvenance = new JarvisMemoryProvenance();

module.exports = {
  JarvisMemoryProvenance,
  defaultMemoryProvenance,
  PROVENANCE_TYPES,
  PRIVACY_LEVELS
};
