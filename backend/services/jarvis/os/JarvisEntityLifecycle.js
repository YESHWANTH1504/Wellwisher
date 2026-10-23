const pool = require('../../../config/db');

const LIFECYCLE_STATES = {
  CREATED: 'CREATED',
  DISCOVERED: 'DISCOVERED',
  SELECTED: 'SELECTED',
  REFERENCED: 'REFERENCED',
  MODIFIED: 'MODIFIED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED'
};

/**
 * JarvisEntityLifecycle
 * Tracks state progression of personal entities across conversation turns and lifecycle events.
 * Guarantees idempotency and prevents accidental duplicate creation on modifications.
 */
class JarvisEntityLifecycle {
  constructor() {
    this._lifecycleCache = new Map(); // Key: `${userId}:${entityId}`
  }

  /**
   * Track transition of an entity to a new lifecycle state
   */
  async transitionState(userId, entityId, targetState, metadata = {}) {
    if (!userId || !entityId) return null;
    const now = new Date().toISOString();

    const currentRecord = this._lifecycleCache.get(`${userId}:${entityId}`) || {
      entityId,
      userId,
      entityType: metadata.entityType || 'UNKNOWN',
      lifecycleState: LIFECYCLE_STATES.CREATED,
      createdAt: now,
      updatedAt: now,
      lastReferencedAt: now,
      source: metadata.source || 'SYSTEM',
      provenance: metadata.provenance || 'EXPLICIT_USER_FACT',
      confidence: metadata.confidence || 1.0,
      history: []
    };

    const previousState = currentRecord.lifecycleState;
    currentRecord.lifecycleState = targetState;
    currentRecord.updatedAt = now;
    currentRecord.lastReferencedAt = now;
    if (metadata.source) currentRecord.source = metadata.source;
    if (metadata.confidence) currentRecord.confidence = metadata.confidence;

    currentRecord.history.push({
      fromState: previousState,
      toState: targetState,
      timestamp: now,
      reason: metadata.reason || 'TRANSITION'
    });

    this._lifecycleCache.set(`${userId}:${entityId}`, currentRecord);

    // Update entity properties in MySQL jarvis_entities if present
    try {
      const [rows] = await pool.query('SELECT properties FROM jarvis_entities WHERE id = ? AND user_id = ?', [entityId, userId]);
      if (rows && rows.length > 0) {
        const props = typeof rows[0].properties === 'string' ? JSON.parse(rows[0].properties) : (rows[0].properties || {});
        props.lifecycleState = targetState;
        props.lastReferencedAt = now;
        props.history = currentRecord.history;

        await pool.query('UPDATE jarvis_entities SET properties = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [
          JSON.stringify(props),
          entityId,
          userId
        ]);
      }
    } catch (err) {
      console.warn('[JarvisEntityLifecycle] DB update warning:', err.message);
    }

    return currentRecord;
  }

  /**
   * Mark entity as referenced in conversation
   */
  async touchEntity(userId, entityId, metadata = {}) {
    return this.transitionState(userId, entityId, LIFECYCLE_STATES.REFERENCED, {
      ...metadata,
      reason: 'CONVERSATIONAL_REFERENCE'
    });
  }

  /**
   * Mark entity as selected from candidate list
   */
  async selectEntity(userId, entityId, metadata = {}) {
    return this.transitionState(userId, entityId, LIFECYCLE_STATES.SELECTED, {
      ...metadata,
      reason: 'ORDINAL_OR_EXPLICIT_SELECTION'
    });
  }

  /**
   * Retrieve current lifecycle status
   */
  getLifecycle(userId, entityId) {
    return this._lifecycleCache.get(`${userId}:${entityId}`) || null;
  }
}

const defaultEntityLifecycle = new JarvisEntityLifecycle();

module.exports = {
  JarvisEntityLifecycle,
  defaultEntityLifecycle,
  LIFECYCLE_STATES
};
