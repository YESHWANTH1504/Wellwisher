const pool = require('../../../config/db');

/**
 * ActionAuditLogger
 * Creates durable action audit records in MySQL with automatic redaction of sensitive credentials,
 * passwords, OTPs, images, and private payloads.
 */
class ActionAuditLogger {
  constructor() {
    this._tableReady = false;
    this._initTable();
  }

  async _initTable() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS jarvis_action_audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          request_id VARCHAR(64) NOT NULL,
          plan_id VARCHAR(64) NOT NULL,
          user_id INT NOT NULL,
          step_id VARCHAR(64) NOT NULL,
          tool VARCHAR(100) NOT NULL,
          arguments_redacted JSON,
          risk_level INT NOT NULL,
          confirmation_status VARCHAR(50) DEFAULT 'NOT_REQUIRED',
          execution_status VARCHAR(50) NOT NULL,
          verification_status VARCHAR(50) NOT NULL,
          failure_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_audit_user (user_id),
          INDEX idx_audit_request (request_id),
          INDEX idx_audit_plan (plan_id)
        ) ENGINE=InnoDB;
      `);
      this._tableReady = true;
    } catch (err) {
      console.warn(`[ActionAuditLogger] Table init warning: ${err.message}`);
    }
  }

  /**
   * Redacts sensitive keys from arguments object
   */
  static redactArguments(args = {}) {
    if (!args || typeof args !== 'object') return {};
    const sensitiveKeys = [
      'password', 'passcode', 'pin', 'token', 'otp', 'secret', 'auth',
      'screenshot', 'image', 'photo', 'base64', 'imagebase64', 'rawimage',
      'messagetext', 'sms_body', 'body', 'content'
    ];

    const cleaned = {};
    for (const [k, v] of Object.entries(args)) {
      const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sensitiveKeys.includes(lowerKey)) {
        cleaned[k] = '[REDACTED_SENSITIVE_DATA]';
      } else if (typeof v === 'string' && v.length > 200) {
        cleaned[k] = v.substring(0, 50) + `... [TRUNCATED_${v.length}_BYTES]`;
      } else if (typeof v === 'object' && v !== null) {
        cleaned[k] = ActionAuditLogger.redactArguments(v);
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }

  /**
   * Log an audit step to the database
   */
  async logStep({
    requestId,
    planId,
    userId,
    stepId,
    tool,
    args = {},
    riskLevel = 0,
    confirmationStatus = 'NOT_REQUIRED',
    executionStatus = 'PENDING',
    verificationStatus = 'UNVERIFIED',
    failureReason = null
  }) {
    if (!userId || !tool) return null;
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const redacted = ActionAuditLogger.redactArguments(args);

    try {
      if (!this._tableReady) {
        await this._initTable();
      }
      await pool.query(
        `INSERT INTO jarvis_action_audit_logs (
          id, request_id, plan_id, user_id, step_id, tool,
          arguments_redacted, risk_level, confirmation_status,
          execution_status, verification_status, failure_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auditId,
          requestId || 'req_unknown',
          planId || 'plan_unknown',
          userId,
          stepId || 'step_0',
          tool,
          JSON.stringify(redacted),
          riskLevel,
          confirmationStatus,
          executionStatus,
          verificationStatus,
          failureReason
        ]
      );
      return auditId;
    } catch (err) {
      console.warn(`[ActionAuditLogger] Failed to write audit record: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch audit history for a user
   */
  async getAuditHistory(userId, limit = 20) {
    if (!userId) return [];
    try {
      const [rows] = await pool.query(
        `SELECT id, request_id, plan_id, tool, arguments_redacted, risk_level,
                confirmation_status, execution_status, verification_status, failure_reason, created_at
         FROM jarvis_action_audit_logs
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, limit]
      );
      return rows;
    } catch (err) {
      console.warn(`[ActionAuditLogger] Error reading audit history: ${err.message}`);
      return [];
    }
  }
}

module.exports = new ActionAuditLogger();
