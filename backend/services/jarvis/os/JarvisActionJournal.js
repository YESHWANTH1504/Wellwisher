/**
 * JarvisActionJournal.js
 * Authoritative side-effect journal for JARVIS OS Action Engine.
 * Enforces transaction-level idempotency, tracking every mutation from
 * REQUESTED -> AUTHORIZED -> EXECUTING -> VERIFYING -> COMPLETED / FAILED.
 * Prevents duplicate side-effects during network retries or post-crash recovery.
 */

const pool = require('../../../config/db');

const ACTION_JOURNAL_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  AUTHORIZED: 'AUTHORIZED',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERTED: 'REVERTED'
});

class JarvisActionJournal {
  generateIdempotencyKey(userId, actionType, payload = {}) {
    const raw = `${userId}:${actionType}:${JSON.stringify(payload)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `idem_${Math.abs(hash)}_${actionType.toLowerCase()}`;
  }

  async recordAction(userId, actionData = {}) {
    return JarvisActionJournal.recordRequest(userId, actionData);
  }

  async updateStatus(actionId, status, options = {}) {
    if (status === ACTION_JOURNAL_STATUS.COMPLETED || status === 'COMPLETED') {
      return JarvisActionJournal.markCompleted(actionId, options.result || {}, options.verificationState || 'VERIFIED');
    } else if (status === ACTION_JOURNAL_STATUS.FAILED || status === 'FAILED') {
      return JarvisActionJournal.markFailed(actionId, options.failureReason || 'Failed');
    } else {
      return pool.query(
        `UPDATE jarvis_action_journal SET status = ? WHERE action_id = ?`,
        [status, actionId]
      );
    }
  }

  async getAction(actionId) {
    const [rows] = await pool.query('SELECT * FROM jarvis_action_journal WHERE action_id = ?', [actionId]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async getActionForUser(userId, actionId) {
    const [rows] = await pool.query(
      'SELECT * FROM jarvis_action_journal WHERE user_id = ? AND action_id = ?',
      [userId, actionId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async getRecentActions(userId, limit = 10) {
    const [rows] = await pool.query(
      'SELECT * FROM jarvis_action_journal WHERE user_id = ? ORDER BY requested_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows || [];
  }

  /**
   * Record a side-effect request into the journal
   * If idempotency key already exists, returns existing entry.
   */
  static async recordRequest(userId, actionData = {}) {
    if (!userId) throw new Error('recordRequest requires userId');
    if (!actionData.capabilityId) throw new Error('recordRequest requires capabilityId');

    const idempotencyKey = actionData.idempotencyKey || `act_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Check for existing action with identical idempotencyKey
    const existing = await JarvisActionJournal.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) {
      return { duplicate: true, isDuplicate: true, ...existing, action: existing };
    }

    const actionId = actionData.actionId || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const workflowId = actionData.workflowId || null;
    const stepId = actionData.stepId || null;
    const capabilityId = actionData.capabilityId;
    const entityId = actionData.entityId || null;
    const payload = JSON.stringify(actionData.actionPayload || actionData.payload || {});

    await pool.query(
      `INSERT INTO jarvis_action_journal (
        action_id, user_id, workflow_id, step_id, capability_id, entity_id,
        action_payload, idempotency_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actionId,
        userId,
        workflowId,
        stepId,
        capabilityId,
        entityId,
        payload,
        idempotencyKey,
        ACTION_JOURNAL_STATUS.REQUESTED
      ]
    );

    return {
      actionId,
      action_id: actionId,
      userId,
      user_id: userId,
      workflowId,
      capabilityId,
      capability_id: capabilityId,
      entityId,
      entity_id: entityId,
      idempotencyKey,
      idempotency_key: idempotencyKey,
      status: ACTION_JOURNAL_STATUS.REQUESTED,
      isDuplicate: false,
      duplicate: false
    };
  }

  static async findByIdempotencyKey(userId, idempotencyKey) {
    const [rows] = await pool.query(
      'SELECT * FROM jarvis_action_journal WHERE user_id = ? AND idempotency_key = ?',
      [userId, idempotencyKey]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async markExecuting(actionId) {
    await pool.query(
      `UPDATE jarvis_action_journal
       SET status = ?, started_at = NOW()
       WHERE action_id = ?`,
      [ACTION_JOURNAL_STATUS.EXECUTING, actionId]
    );
  }

  static async markCompleted(actionId, result = {}, verificationState = 'VERIFIED') {
    await pool.query(
      `UPDATE jarvis_action_journal
       SET status = ?, completed_at = NOW(), execution_result = ?, verification_state = ?
       WHERE action_id = ?`,
      [ACTION_JOURNAL_STATUS.COMPLETED, JSON.stringify(result), verificationState, actionId]
    );
  }


  static async markFailed(actionId, failureReason) {
    await pool.query(
      `UPDATE jarvis_action_journal
       SET status = ?, completed_at = NOW(), failure_reason = ?, verification_state = 'FAILED'
       WHERE action_id = ?`,
      [ACTION_JOURNAL_STATUS.FAILED, String(failureReason).substring(0, 500), actionId]
    );
  }

  static async getInterruptedActions(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM jarvis_action_journal
       WHERE user_id = ? AND status IN ('REQUESTED', 'AUTHORIZED', 'EXECUTING', 'VERIFYING')
       ORDER BY requested_at ASC`,
      [userId]
    );
    return rows || [];
  }
}

const defaultActionJournal = new JarvisActionJournal();

module.exports = {
  JarvisActionJournal,
  defaultActionJournal,
  ACTION_JOURNAL_STATUS
};
