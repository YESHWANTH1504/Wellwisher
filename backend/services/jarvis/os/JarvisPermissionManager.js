const pool = require('../../../config/db');
const { RiskClassifier, RISK_LEVELS } = require('../actions/RiskClassifier');

/**
 * JarvisPermissionManager
 * Enforces strict 4-level safety policies, authorization checks, and confirmation tokens.
 * Models can propose intents; only this layer authorizes execution.
 */
class JarvisPermissionManager {
  /**
   * Check authorization of a capability execution
   * @param {number} userId
   * @param {string} capabilityName
   * @param {Object} args
   * @param {boolean} isExplicitlyConfirmed
   */
  static async checkAuthorization(userId, capabilityName, args = {}, isExplicitlyConfirmed = false) {
    if (!userId) {
      return {
        authorized: false,
        requiresConfirmation: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Authenticated userId required for action execution.'
      };
    }

    // 1. Evaluate Risk Level via formal 4-level RiskClassifier
    const classification = RiskClassifier.classifyTool(capabilityName, args);

    // Level 0: Always permitted (Read-Only)
    if (classification.level === RISK_LEVELS.LEVEL_0_READ_ONLY) {
      return { authorized: true, requiresConfirmation: false, riskLevel: 0 };
    }

    // 2. Query user configured permission state from MySQL `ai_action_permissions`
    let permissionState = 'ASK_ALWAYS';
    try {
      const [rows] = await pool.query(
        'SELECT permission_state FROM ai_action_permissions WHERE user_id = ? AND action_key = ?',
        [userId, capabilityName]
      );
      if (rows && rows[0]) {
        permissionState = rows[0].permission_state;
      }
    } catch (_) {}

    // Check if explicitly disabled by user
    if (permissionState === 'DISABLED') {
      return {
        authorized: false,
        requiresConfirmation: false,
        errorCode: 'ACTION_DISABLED',
        message: `Action "${capabilityName}" is disabled by user security policy.`
      };
    }

    // Level 3 (Destructive/Irreversible) always requires confirmation unless explicitly confirmed
    if (classification.level === RISK_LEVELS.LEVEL_3_DESTRUCTIVE_SENSITIVE) {
      if (!isExplicitlyConfirmed) {
        const confirmationId = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return {
          authorized: false,
          requiresConfirmation: true,
          confirmationId,
          riskLevel: 3,
          message: `Action "${capabilityName}" is sensitive or destructive. Your explicit confirmation is required.`
        };
      }
    }

    // Level 2 / ASK_ALWAYS
    if (permissionState === 'ASK_ALWAYS' && classification.level >= RISK_LEVELS.LEVEL_2_MODIFICATION) {
      if (!isExplicitlyConfirmed && classification.requiresConfirmation) {
        const confirmationId = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return {
          authorized: false,
          requiresConfirmation: true,
          confirmationId,
          riskLevel: classification.level,
          message: `Action "${capabilityName}" requires confirmation before proceeding.`
        };
      }
    }

    return {
      authorized: true,
      requiresConfirmation: false,
      riskLevel: classification.level
    };
  }
}

module.exports = JarvisPermissionManager;
