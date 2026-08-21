const pool = require('../../config/db');
const crypto = require('node:crypto');

class AiBehaviorPatternRepository {
  /**
   * Record or increment observed behavior pattern
   */
  static async recordObservation(userId, {
    patternType,
    patternKey,
    patternValue,
    confidence = 0.50,
    minObservationsToActivate = 5,
    minConfidenceToActivate = 0.75,
    source = 'HABIT_ENGINE',
    metadata
  } = {}) {
    if (!userId || !patternType || !patternKey) throw new Error('userId, patternType, and patternKey are required.');

    const [existingRows] = await pool.query(
      `SELECT * FROM ai_behavior_patterns 
       WHERE user_id = ? AND pattern_type = ? AND pattern_key = ? LIMIT 1`,
      [userId, patternType, patternKey]
    );

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      const newCount = (existing.evidence_count || 1) + 1;
      const newConf = Math.min(0.99, parseFloat(existing.confidence_score || 0.5) + 0.1);
      const newStatus = (newCount >= minObservationsToActivate && newConf >= minConfidenceToActivate) ? 'ACTIVE' : 'OBSERVING';

      await pool.query(
        `UPDATE ai_behavior_patterns 
         SET pattern_value = ?, evidence_count = ?, confidence_score = ?, status = ?, last_observed_at = NOW(), updated_at = NOW() 
         WHERE id = ? AND user_id = ?`,
        [patternValue, newCount, newConf, newStatus, existing.id, userId]
      );

      return { ...existing, evidence_count: newCount, confidence_score: newConf, status: newStatus, pattern_value: patternValue };
    }

    const id = `pat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const initialStatus = (1 >= minObservationsToActivate && confidence >= minConfidenceToActivate) ? 'ACTIVE' : 'OBSERVING';

    await pool.query(
      `INSERT INTO ai_behavior_patterns 
       (id, user_id, pattern_type, pattern_key, pattern_value, confidence_score, evidence_count, status, source, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        patternType,
        patternKey,
        patternValue,
        confidence,
        1,
        initialStatus,
        source,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return {
      id,
      userId,
      pattern_type: patternType,
      pattern_key: patternKey,
      pattern_value: patternValue,
      confidence_score: confidence,
      evidence_count: 1,
      status: initialStatus
    };
  }

  /**
   * Get active behavior patterns for a user
   */
  static async getActivePatterns(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM ai_behavior_patterns WHERE user_id = ? AND status = 'ACTIVE' ORDER BY confidence_score DESC`,
      [userId]
    );
    return rows || [];
  }
}

module.exports = {
  AiBehaviorPatternRepository
};
