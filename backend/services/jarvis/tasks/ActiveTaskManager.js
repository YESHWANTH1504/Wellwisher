const pool = require('../../../config/db');

const TASK_STATUSES = {
  QUEUED: 'QUEUED',
  PLANNING: 'PLANNING',
  WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  PAUSED: 'PAUSED',
  FAILED: 'FAILED',
  RECOVERING: 'RECOVERING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

/**
 * ActiveTaskManager
 * Tracks the in-flight or most recent user tasks, device operations, and conversational entities per session.
 * Provides durable MySQL persistence with in-memory L1 cache surviving process restarts.
 */
class ActiveTaskManager {
  constructor() {
    this.sessionTasks = new Map();
  }

  /**
   * Helper to persist task to ai_active_tasks in MySQL
   */
  async _persistTask(task, sessionId) {
    if (!task || !task.userId) return;
    const expiresAt = task.expiresAt
      ? new Date(task.expiresAt)
      : new Date(Date.now() + 30 * 60 * 1000);
    const candidateJson = JSON.stringify(task.candidates || []);
    const detailsJson = JSON.stringify(task.details || {});

    await pool.query(
      `INSERT INTO ai_active_tasks (
        id, user_id, session_id, task_id, task_type, status,
        referenced_entity_id, referenced_entity_type, candidate_entities,
        current_step, original_request, latest_request, context_metadata,
        version, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        session_id = VALUES(session_id),
        user_id = VALUES(user_id),
        task_id = VALUES(task_id),
        task_type = VALUES(task_type),
        status = VALUES(status),
        referenced_entity_id = VALUES(referenced_entity_id),
        referenced_entity_type = VALUES(referenced_entity_type),
        candidate_entities = VALUES(candidate_entities),
        current_step = VALUES(current_step),
        original_request = VALUES(original_request),
        latest_request = VALUES(latest_request),
        context_metadata = VALUES(context_metadata),
        version = version + 1,
        expires_at = VALUES(expires_at),
        updated_at = CURRENT_TIMESTAMP`,
      [
        task.id,
        task.userId,
        sessionId,
        task.id,
        task.type || 'UNKNOWN',
        task.status || 'STARTED',
        task.eventId || task.entityId || task.reminderId || null,
        task.entityType || task.type || null,
        candidateJson,
        task.currentStep || null,
        task.originalRequest || task.title || null,
        task.latestRequest || null,
        detailsJson,
        task.version || 1,
        expiresAt
      ]
    );
  }

  /**
   * Set or update the active task for a session (synchronous L1 cache update + async persistence)
   */
  setActiveTask(sessionId, taskData = {}) {
    if (!sessionId) return null;
    const userId = taskData.userId || null;
    const existing = this.getActiveTask(sessionId);
    const version = existing ? (existing.version || 1) + 1 : 1;
    const expiresAt = taskData.expiresAt ? new Date(taskData.expiresAt) : new Date(Date.now() + 30 * 60 * 1000);

    const task = {
      id: taskData.id || taskData.eventId || taskData.reminderId || (existing?.id) || `task_${Date.now()}`,
      eventId: taskData.eventId || taskData.entityId || taskData.scheduleId || taskData.id || (existing?.eventId) || null,
      entityId: taskData.entityId || taskData.eventId || taskData.scheduleId || taskData.id || (existing?.entityId) || null,
      reminderId: taskData.reminderId || (taskData.type === 'REMINDER' ? taskData.id : (existing?.reminderId || null)),
      userId,
      type: taskData.type || existing?.type || 'UNKNOWN',
      action: taskData.action || taskData.type || existing?.action || 'UNKNOWN',
      application: taskData.application || existing?.application || null,
      packageName: taskData.packageName || existing?.packageName || null,
      targetTime: taskData.targetTime || taskData.time || existing?.targetTime || null,
      time: taskData.time || taskData.targetTime || existing?.time || null,
      date: taskData.date || taskData.targetDate || existing?.date || null,
      timezone: taskData.timezone || existing?.timezone || null,
      title: taskData.title || existing?.title || null,
      candidates: taskData.candidates || existing?.candidates || [],
      status: taskData.status || 'STARTED', // PLANNED, AUTHORIZED, STARTED, EXECUTING, VERIFYING, COMPLETED, FAILED, CANCELLED
      verified: Boolean(taskData.verified),
      startedAt: taskData.startedAt || existing?.startedAt || Date.now(),
      updatedAt: Date.now(),
      attempts: (taskData.attempts || 1),
      lastError: taskData.lastError || null,
      details: taskData.details || existing?.details || {},
      version,
      expiresAt: expiresAt.toISOString(),
      originalRequest: taskData.originalRequest || existing?.originalRequest || null,
      latestRequest: taskData.latestRequest || null,
      currentStep: taskData.currentStep || null
    };

    this.sessionTasks.set(sessionId, task);
    if (userId) {
      this.sessionTasks.set(`user_${userId}`, task);
    }

    // Persist asynchronously to durable storage
    if (userId) {
      task._persistPromise = this._persistTask(task, sessionId).catch(err => {
        console.warn(`[ActiveTaskManager] Durable persist warning: ${err.message}`);
      });
    }

    return task;
  }

  /**
   * Set active task and await its database persistence
   */
  async setActiveTaskAsync(sessionId, taskData = {}) {
    const task = this.setActiveTask(sessionId, taskData);
    if (task && task._persistPromise) {
      await task._persistPromise;
    }
    return task;
  }

  /**
   * Get the active task for a session or user from L1 in-memory cache
   */
  getActiveTask(sessionId, userId = null) {
    let task = null;
    if (sessionId && this.sessionTasks.has(sessionId)) {
      task = this.sessionTasks.get(sessionId);
    } else if (userId && this.sessionTasks.has(`user_${userId}`)) {
      task = this.sessionTasks.get(`user_${userId}`);
    }

    if (task) {
      // Validate expiration
      if (task.expiresAt && new Date(task.expiresAt).getTime() < Date.now()) {
        this.clearActiveTask(sessionId, userId);
        return null;
      }
      return task;
    }
    return null;
  }

  /**
   * Load active task from durable storage (MySQL) if missing from in-memory cache.
   * Enables seamless recovery after backend restart.
   */
  async loadActiveTask(sessionId, userId = null) {
    const cached = this.getActiveTask(sessionId, userId);
    if (cached) return cached;

    try {
      let rows;
      if (sessionId && userId) {
        [rows] = await pool.query(
          `SELECT * FROM ai_active_tasks 
           WHERE session_id = ? AND user_id = ? 
           ORDER BY updated_at DESC LIMIT 1`,
          [sessionId, userId]
        );
      } else if (sessionId) {
        [rows] = await pool.query(
          `SELECT * FROM ai_active_tasks 
           WHERE session_id = ? 
           ORDER BY updated_at DESC LIMIT 1`,
          [sessionId]
        );
      } else if (userId) {
        [rows] = await pool.query(
          `SELECT * FROM ai_active_tasks 
           WHERE user_id = ? 
           ORDER BY updated_at DESC LIMIT 1`,
          [userId]
        );
      }

      if (rows && rows.length > 0) {
        const row = rows[0];
        // Check if expired using timestamp comparison
        if (row.expires_at) {
          const expTime = new Date(row.expires_at).getTime();
          if (!isNaN(expTime) && expTime < Date.now() - 60000) {
            return null;
          }
        }

        const candidates = Array.isArray(row.candidate_entities)
          ? row.candidate_entities
          : (typeof row.candidate_entities === 'string' ? JSON.parse(row.candidate_entities) : []);

        const details = typeof row.context_metadata === 'object' && row.context_metadata
          ? row.context_metadata
          : (typeof row.context_metadata === 'string' ? JSON.parse(row.context_metadata) : {});

        const restoredTask = {
          id: row.task_id || row.id,
          eventId: row.referenced_entity_id,
          entityId: row.referenced_entity_id,
          reminderId: row.task_type === 'REMINDER' ? row.referenced_entity_id : null,
          userId: row.user_id,
          type: row.task_type,
          action: row.task_type,
          status: row.status,
          candidates,
          currentStep: row.current_step,
          originalRequest: row.original_request,
          latestRequest: row.latest_request,
          title: row.original_request || details.title || null,
          version: row.version || 1,
          expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
          startedAt: new Date(row.created_at).getTime(),
          updatedAt: new Date(row.updated_at).getTime(),
          details
        };

        if (sessionId) this.sessionTasks.set(sessionId, restoredTask);
        if (userId) this.sessionTasks.set(`user_${userId}`, restoredTask);

        console.log(`[ActiveTaskManager] Restored durable task ${restoredTask.id} for user ${row.user_id} session ${sessionId}`);
        return restoredTask;
      }
    } catch (err) {
      console.warn(`[ActiveTaskManager] Error hydrating active task: ${err.message}`);
    }

    return null;
  }

  /**
   * Update the status of the active task
   */
  updateTaskStatus(sessionId, status, extra = {}) {
    const task = this.getActiveTask(sessionId);
    if (!task) return null;
    task.status = status;
    task.updatedAt = Date.now();
    task.version = (task.version || 1) + 1;
    if (extra.verified !== undefined) task.verified = extra.verified;
    if (extra.lastError !== undefined) task.lastError = extra.lastError;
    if (extra.details) Object.assign(task.details, extra.details);

    // Persist status change asynchronously
    pool.query(
      'UPDATE ai_active_tasks SET status = ?, updated_at = NOW() WHERE session_id = ?',
      [status, sessionId]
    ).catch(err => {
      console.warn(`[ActiveTaskManager] Failed to update task status in DB: ${err.message}`);
    });

    return task;
  }

  /**
   * Clear or finish active task
   */
  clearActiveTask(sessionId, userId = null) {
    if (sessionId) {
      this.sessionTasks.delete(sessionId);
    }
    if (userId) {
      this.sessionTasks.delete(`user_${userId}`);
    }

    // Remove or cancel from durable storage asynchronously
    if (sessionId && userId) {
      pool.query(
        'DELETE FROM ai_active_tasks WHERE session_id = ? AND user_id = ?',
        [sessionId, userId]
      ).catch(() => {});
    } else if (sessionId) {
      pool.query(
        'DELETE FROM ai_active_tasks WHERE session_id = ?',
        [sessionId]
      ).catch(() => {});
    } else if (userId) {
      pool.query(
        'DELETE FROM ai_active_tasks WHERE user_id = ?',
        [userId]
      ).catch(() => {});
    }
  }

  /**
   * Safely recover active tasks following process or backend restart.
   * If a task was in a destructive state (riskLevel >= 3 or action like CANCEL/DELETE) when interrupted,
   * it must NOT be resumed automatically; it transitions to WAITING_CONFIRMATION or FAILED.
   */
  async recoverTaskSafely(sessionId, userId) {
    const task = await this.loadActiveTask(sessionId, userId);
    if (!task) return null;

    if (task.status === 'EXECUTING' || task.status === 'PLANNING' || task.status === 'VERIFYING') {
      const isDangerous = (task.details && task.details.riskLevel >= 3) ||
        ['CANCEL_CURRENT_ACTION', 'DELETE', 'CANCEL'].includes(task.action) ||
        (task.title && task.title.toLowerCase().includes('delete'));

      if (isDangerous) {
        task.status = TASK_STATUSES.WAITING_CONFIRMATION;
        task.reauthorizationRequired = true;
        task.lastError = 'Task interrupted by system restart. Destructive action requires explicit reauthorization.';
      } else {
        task.status = TASK_STATUSES.RECOVERING;
      }
      await this._persistTask(task, sessionId);
    }
    return task;
  }
}

const activeTaskManager = new ActiveTaskManager();

module.exports = {
  ActiveTaskManager,
  activeTaskManager,
  TASK_STATUSES
};

