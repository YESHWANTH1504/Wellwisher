/**
 * JarvisOfflineOperationQueue
 * Durable MySQL-backed queue for safe offline operations (telemetry, feedback, analytics, sync metadata).
 *
 * CRITICAL SAFETY INVARIANT:
 * NEVER queue destructive or external actions (e.g. sending messages, placing calls, deleting records)
 * for automatic execution upon network reconnection.
 */

const pool = require('../../../config/db');

const QUEUE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED'
});

const SAFE_OFFLINE_OPERATIONS = new Set([
  'SYNC_TELEMETRY',
  'SYNC_FEEDBACK',
  'SYNC_ANALYTICS',
  'SYNC_METRICS',
  'SYNC_ROUTINE_STATS',
  'SYNC_METADATA'
]);

class JarvisOfflineOperationQueue {
  /**
   * Enqueue a safe offline operation
   */
  async enqueue(userId, {
    operation,
    payload = {},
    priority = 'NORMAL',
    privacyClass = 'LOCAL_ONLY',
    idempotencyKey = null
  }) {
    if (!userId) throw new Error('JarvisOfflineOperationQueue requires authenticated userId');
    if (!operation) throw new Error('Operation name is required');

    // Strict Safety Invariant Gate
    const opUpper = operation.toUpperCase();
    if (!SAFE_OFFLINE_OPERATIONS.has(opUpper)) {
      if (
        opUpper.includes('MESSAGE') ||
        opUpper.includes('CALL') ||
        opUpper.includes('DELETE') ||
        opUpper.includes('PAYMENT') ||
        opUpper.includes('WHATSAPP')
      ) {
        throw new Error(`CRITICAL SAFETY VIOLATION: Operation '${operation}' cannot be queued for autonomous execution.`);
      }
    }

    if (idempotencyKey) {
      const [existing] = await pool.query(
        'SELECT id, user_id, operation, idempotency_key, status FROM jarvis_offline_queue WHERE idempotency_key = ?',
        [idempotencyKey]
      );
      if (existing && existing.length > 0) {
        return {
          id: existing[0].id,
          userId: existing[0].user_id,
          operation: existing[0].operation,
          idempotencyKey: existing[0].idempotency_key,
          status: existing[0].status,
          duplicate: true
        };
      }
    }

    const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const finalKey = idempotencyKey || `key_${id}`;

    await pool.query(
      `INSERT INTO jarvis_offline_queue (
        id, user_id, operation, payload, priority, privacy_class, idempotency_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE retry_count = retry_count + 1`,
      [
        id,
        userId,
        operation,
        JSON.stringify(payload),
        priority,
        privacyClass,
        finalKey,
        QUEUE_STATUS.PENDING
      ]
    );

    return {
      id,
      userId,
      operation,
      idempotencyKey: finalKey,
      status: QUEUE_STATUS.PENDING
    };
  }

  /**
   * Get pending operations ready for synchronization
   */
  async getPendingOperations(userId, limit = 50) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM jarvis_offline_queue
       WHERE user_id = ? AND status = ?
       ORDER BY CASE priority WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 ELSE 3 END, created_at ASC
       LIMIT ?`,
      [userId, QUEUE_STATUS.PENDING, limit]
    );

    return rows.map(r => ({
      ...r,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
    }));
  }

  /**
   * Mark an operation as successfully synced
   */
  async markSynced(operationId) {
    await pool.query(
      `UPDATE jarvis_offline_queue
       SET status = ?, synced_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [QUEUE_STATUS.SYNCED, operationId]
    );
    return true;
  }

  /**
   * Mark an operation as failed with an error message
   */
  async markFailed(operationId, errorMessage) {
    await pool.query(
      `UPDATE jarvis_offline_queue
       SET status = ?, last_error = ?, retry_count = retry_count + 1
       WHERE id = ?`,
      [QUEUE_STATUS.FAILED, String(errorMessage), operationId]
    );
    return true;
  }

  /**
   * Get queue statistics for a user
   */
  async getStats(userId) {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM jarvis_offline_queue
       WHERE user_id = ?
       GROUP BY status`,
      [userId]
    );
    const stats = { PENDING: 0, SYNCING: 0, SYNCED: 0, FAILED: 0 };
    for (const r of rows) {
      stats[r.status] = Number(r.count);
    }
    return stats;
  }
}

const defaultOfflineOperationQueue = new JarvisOfflineOperationQueue();

module.exports = {
  JarvisOfflineOperationQueue,
  defaultOfflineOperationQueue,
  QUEUE_STATUS,
  SAFE_OFFLINE_OPERATIONS
};
