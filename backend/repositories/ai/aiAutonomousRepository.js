const db = require('../../config/db');

class AiAutonomousRepository {
  /**
   * Register or update device background session
   */
  static async registerDevice({
    userId,
    deviceId,
    deviceName = 'Primary Device',
    platform = 'ANDROID',
    wakeWordEnabled = true,
    backgroundActive = true,
    batteryOptimizationIgnored = false,
    pushToken = null
  }) {
    const existing = await this.getDevice(userId, deviceId);
    if (existing) {
      await db.query(
        `UPDATE jarvis_devices
         SET device_name = ?, platform = ?, wake_word_enabled = ?, background_active = ?,
             battery_optimization_ignored = ?, push_token = ?, last_active_at = NOW()
         WHERE user_id = ? AND device_id = ?`,
        [
          deviceName,
          platform,
          wakeWordEnabled ? 1 : 0,
          backgroundActive ? 1 : 0,
          batteryOptimizationIgnored ? 1 : 0,
          pushToken,
          userId,
          deviceId
        ]
      );
      return await this.getDevice(userId, deviceId);
    }

    const id = `jdev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.query(
      `INSERT INTO jarvis_devices
       (id, user_id, device_id, device_name, platform, wake_word_enabled, background_active, battery_optimization_ignored, push_token, last_active_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        id,
        userId,
        deviceId,
        deviceName,
        platform,
        wakeWordEnabled ? 1 : 0,
        backgroundActive ? 1 : 0,
        batteryOptimizationIgnored ? 1 : 0,
        pushToken
      ]
    );

    return await this.getDevice(userId, deviceId);
  }

  static async getDevice(userId, deviceId) {
    const [rows] = await db.query(
      `SELECT * FROM jarvis_devices WHERE user_id = ? AND device_id = ? LIMIT 1`,
      [userId, deviceId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async listUserDevices(userId) {
    const [rows] = await db.query(
      `SELECT * FROM jarvis_devices WHERE user_id = ? ORDER BY last_active_at DESC`,
      [userId]
    );
    return rows || [];
  }

  /**
   * Create an autonomous task / reminder / scheduled job
   */
  static async createTask({
    userId,
    title,
    taskType = 'REMINDER',
    scheduleTime = null,
    cronExpression = null,
    payload = {},
    status = 'PENDING'
  }) {
    const id = `jtask_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    await db.query(
      `INSERT INTO jarvis_tasks
       (id, user_id, title, task_type, schedule_time, cron_expression, status, payload, result, last_run_at, next_run_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NOW())`,
      [
        id,
        userId,
        title,
        taskType,
        scheduleTime,
        cronExpression,
        status,
        payloadStr,
        scheduleTime
      ]
    );

    return await this.getTaskById(userId, id);
  }

  static async getTaskById(userId, taskId) {
    const [rows] = await db.query(
      `SELECT * FROM jarvis_tasks WHERE user_id = ? AND id = ? LIMIT 1`,
      [userId, taskId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  static async listTasks(userId, status = null) {
    let sql = `SELECT * FROM jarvis_tasks WHERE user_id = ?`;
    const params = [userId];
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC`;
    const [rows] = await db.query(sql, params);
    return rows || [];
  }

  static async updateTaskStatus(userId, taskId, status, result = null) {
    const resultStr = result ? (typeof result === 'string' ? result : JSON.stringify(result)) : null;
    await db.query(
      `UPDATE jarvis_tasks
       SET status = ?, result = ?, last_run_at = NOW()
       WHERE user_id = ? AND id = ?`,
      [status, resultStr, userId, taskId]
    );
    return await this.getTaskById(userId, taskId);
  }

  static async getPendingTasksDue(dueBefore = new Date().toISOString()) {
    const [rows] = await db.query(
      `SELECT * FROM jarvis_tasks
       WHERE status = 'PENDING' AND (schedule_time <= ? OR schedule_time IS NULL)
       ORDER BY schedule_time ASC LIMIT 50`,
      [dueBefore]
    );
    return rows || [];
  }

  /**
   * Autonomous Execution Runs
   */
  static async recordExecutionRun({
    userId,
    triggerSource = 'WAKE_WORD_VOICE',
    inputText = '',
    intent = 'GENERAL_CONVERSATION',
    status = 'SUCCESS',
    executionSteps = [],
    responseText = '',
    durationMs = 0
  }) {
    const id = `jrun_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const stepsStr = typeof executionSteps === 'string' ? executionSteps : JSON.stringify(executionSteps);

    await db.query(
      `INSERT INTO jarvis_execution_runs
       (id, user_id, trigger_source, input_text, intent, status, execution_steps, response_text, duration_ms, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        userId,
        triggerSource,
        inputText,
        intent,
        status,
        stepsStr,
        responseText,
        durationMs
      ]
    );

    return id;
  }

  static async listRecentRuns(userId, limit = 20) {
    const [rows] = await db.query(
      `SELECT * FROM jarvis_execution_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows || [];
  }

  /**
   * Actionable Notifications
   */
  static async createNotification({
    userId,
    title,
    body,
    notificationType = 'ACTIONABLE_REMINDER',
    actionButtons = []
  }) {
    const id = `jnotif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const actionsStr = typeof actionButtons === 'string' ? actionButtons : JSON.stringify(actionButtons);

    await db.query(
      `INSERT INTO jarvis_notifications
       (id, user_id, title, body, notification_type, action_buttons, is_read, is_delivered, delivered_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, NOW(), NOW())`,
      [
        id,
        userId,
        title,
        body,
        notificationType,
        actionsStr
      ]
    );

    return {
      id,
      userId,
      title,
      body,
      notificationType,
      actionButtons,
      isRead: false,
      isDelivered: true,
      createdAt: new Date().toISOString()
    };
  }

  static async listNotifications(userId, limit = 30) {
    const [rows] = await db.query(
      `SELECT * FROM jarvis_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit]
    );
    return rows || [];
  }
}

module.exports = AiAutonomousRepository;
