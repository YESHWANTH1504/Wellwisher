const pool = require('../../config/db');

const VALID_PERMISSION_STATES = ['ASK_ALWAYS', 'AUTO_APPROVE', 'DISABLED'];

const DEFAULT_ACTION_PERMISSIONS = {
  get_schedule: 'AUTO_APPROVE',
  create_schedule: 'AUTO_APPROVE',
  update_schedule: 'AUTO_APPROVE',
  delete_schedule: 'ASK_ALWAYS',
  create_reminder: 'AUTO_APPROVE',
  update_reminder: 'AUTO_APPROVE',
  delete_reminder: 'ASK_ALWAYS',
  get_medications: 'AUTO_APPROVE',
  mark_medication_taken: 'AUTO_APPROVE',
  get_vitals: 'AUTO_APPROVE',
  get_hydration: 'AUTO_APPROVE',
  log_hydration: 'AUTO_APPROVE',
  get_sleep_mood: 'AUTO_APPROVE',
  get_wellness_summary: 'AUTO_APPROVE',
  get_journal: 'AUTO_APPROVE',
  create_journal: 'AUTO_APPROVE',
  save_memory: 'AUTO_APPROVE',
  save_health_data: 'ASK_ALWAYS', // Medical confirmation safety guardrail
  get_ai_preferences: 'AUTO_APPROVE',
  update_ai_preferences: 'AUTO_APPROVE',
  get_family: 'AUTO_APPROVE',
  send_family_notification: 'ASK_ALWAYS', // External message safety guardrail
  get_documents: 'AUTO_APPROVE',
  delete_document: 'ASK_ALWAYS',
  check_medication_conflicts: 'AUTO_APPROVE',
  get_health_trends: 'AUTO_APPROVE',
  get_health_alerts: 'AUTO_APPROVE',
  generate_doctor_briefing: 'AUTO_APPROVE',
  export_health_data: 'ASK_ALWAYS'
};

class AiPermissionRepository {
  /**
   * Get all autonomy permissions for a user, filling missing actions with safe defaults
   */
  static async getPermissions(userId) {
    if (!userId) throw new Error('userId is required');

    const [rows] = await pool.query(
      `SELECT action_key, permission_state FROM ai_action_permissions WHERE user_id = ?`,
      [userId]
    );

    const userPermissions = { ...DEFAULT_ACTION_PERMISSIONS };
    for (const row of rows) {
      userPermissions[row.action_key] = row.permission_state;
    }

    return userPermissions;
  }

  /**
   * Check a specific action permission state
   */
  static async checkPermission(userId, actionKey) {
    if (!userId || !actionKey) throw new Error('userId and actionKey are required');

    const [rows] = await pool.query(
      `SELECT permission_state FROM ai_action_permissions WHERE user_id = ? AND action_key = ? LIMIT 1`,
      [userId, actionKey]
    );

    if (rows.length > 0) {
      return rows[0].permission_state;
    }

    // Return default policy if not explicitly overridden
    return DEFAULT_ACTION_PERMISSIONS[actionKey] || 'ASK_ALWAYS';
  }

  /**
   * Set user permission for an action (Authorized strictly by user, immutable by LLM)
   */
  static async setPermission(userId, actionKey, permissionState) {
    if (!userId || !actionKey) throw new Error('userId and actionKey are required');

    if (!VALID_PERMISSION_STATES.includes(permissionState)) {
      throw new Error(`Invalid permission state: ${permissionState}. Must be one of: ${VALID_PERMISSION_STATES.join(', ')}`);
    }

    await pool.query(
      `INSERT INTO ai_action_permissions (user_id, action_key, permission_state)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE permission_state = VALUES(permission_state), updated_at = NOW()`,
      [userId, actionKey.trim(), permissionState]
    );

    return {
      userId,
      actionKey: actionKey.trim(),
      permissionState
    };
  }

  /**
   * Initialize default permissions for new user
   */
  static async initDefaultPermissions(userId) {
    if (!userId) throw new Error('userId is required');

    for (const [action, state] of Object.entries(DEFAULT_ACTION_PERMISSIONS)) {
      await pool.query(
        `INSERT IGNORE INTO ai_action_permissions (user_id, action_key, permission_state)
         VALUES (?, ?, ?)`,
        [userId, action, state]
      );
    }
  }
}

module.exports = {
  AiPermissionRepository,
  VALID_PERMISSION_STATES,
  DEFAULT_ACTION_PERMISSIONS
};
