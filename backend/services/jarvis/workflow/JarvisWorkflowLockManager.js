/**
 * JarvisWorkflowLockManager
 * Prevents conflicting concurrent mutations on resources (calendar routines, contacts, device settings).
 * Enforces strict user isolation and automatic TTL expiration.
 */

const pool = require('../../../config/db');

class JarvisWorkflowLockManager {
  constructor() {
    this._memLocks = new Map(); // Key: `${userId}:${resourceType}:${resourceId}`
  }

  _getKey(userId, resourceType, resourceId) {
    return `${userId}:${resourceType}:${resourceId}`;
  }

  /**
   * Acquire exclusive resource lock
   */
  async acquireLock(userId, workflowId, resourceType, resourceId, ttlMs = 60000) {
    if (!userId || !workflowId || !resourceType || !resourceId) {
      return { acquired: false, reason: 'INVALID_LOCK_PARAMETERS' };
    }

    const key = this._getKey(userId, resourceType, resourceId);
    const now = Date.now();

    // Check memory cache first
    const existing = this._memLocks.get(key);
    if (existing && existing.expiresAt > now && existing.workflowId !== workflowId) {
      return {
        acquired: false,
        reason: 'RESOURCE_LOCKED_BY_OTHER_WORKFLOW',
        holderWorkflowId: existing.workflowId,
        expiresInMs: existing.expiresAt - now
      };
    }

    const lockId = `lock_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(now + ttlMs);

    this._memLocks.set(key, {
      lockId,
      workflowId,
      userId,
      resourceType,
      resourceId,
      expiresAt: now + ttlMs
    });

    // Persist in MySQL jarvis_workflow_locks
    try {
      await pool.query(`
        INSERT INTO jarvis_workflow_locks (lock_id, workflow_id, user_id, resource_type, resource_id, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE workflow_id = VALUES(workflow_id), expires_at = VALUES(expires_at)
      `, [lockId, workflowId, userId, resourceType, resourceId, expiresAt]);
    } catch (_) {}

    return { acquired: true, lockId, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Check if resource is currently locked by another workflow
   */
  async isLocked(userId, resourceType, resourceId, currentWorkflowId = null) {
    const key = this._getKey(userId, resourceType, resourceId);
    const now = Date.now();
    const existing = this._memLocks.get(key);

    if (existing && existing.expiresAt > now) {
      if (currentWorkflowId && existing.workflowId === currentWorkflowId) {
        return false; // Owned by current workflow
      }
      return true;
    }
    return false;
  }

  /**
   * Release a specific lock held by a workflow
   */
  async releaseLock(userId, workflowId, resourceType, resourceId) {
    const key = this._getKey(userId, resourceType, resourceId);
    this._memLocks.delete(key);
    try {
      await pool.query('DELETE FROM jarvis_workflow_locks WHERE user_id = ? AND resource_type = ? AND resource_id = ?', [userId, resourceType, resourceId]);
    } catch (_) {}
    return true;
  }

  /**
   * Release all locks held by a workflow
   */
  async releaseLocks(workflowId) {
    if (!workflowId) return true;

    for (const [key, lock] of this._memLocks.entries()) {
      if (lock.workflowId === workflowId) {
        this._memLocks.delete(key);
      }
    }

    try {
      await pool.query('DELETE FROM jarvis_workflow_locks WHERE workflow_id = ?', [workflowId]);
    } catch (_) {}
    return true;
  }
}

const defaultWorkflowLockManager = new JarvisWorkflowLockManager();

module.exports = {
  JarvisWorkflowLockManager,
  defaultWorkflowLockManager
};
