const { RISK_LEVELS } = require('../tools/toolRegistry');

const AUTONOMY_LEVELS = {
  LEVEL_0_INFORM: 'LEVEL_0_INFORM',
  LEVEL_1_SUGGEST: 'LEVEL_1_SUGGEST',
  LEVEL_2_AUTO_EXECUTE: 'LEVEL_2_AUTO_EXECUTE',
  LEVEL_3_CONFIRM: 'LEVEL_3_CONFIRM',
  LEVEL_4_RESTRICTED: 'LEVEL_4_RESTRICTED'
};

class AutonomyManager {
  /**
   * Determine if a tool invocation can be auto-executed under the user's active autonomy level
   */
  static evaluateExecutionPolicy(tool, autonomyLevel = AUTONOMY_LEVELS.LEVEL_2_AUTO_EXECUTE) {
    // 1. Level 4 (Restricted): No mutations allowed at all
    if (autonomyLevel === AUTONOMY_LEVELS.LEVEL_4_RESTRICTED) {
      if (tool.riskLevel !== RISK_LEVELS.LOW) {
        return {
          canExecute: false,
          requiresConfirmation: false,
          blockedByAutonomy: true,
          message: 'This operation is restricted under your current Level 4 (Restricted) read-only security policy.'
        };
      }
    }

    // 2. Level 0 (Inform): Read only
    if (autonomyLevel === AUTONOMY_LEVELS.LEVEL_0_INFORM) {
      if (tool.riskLevel !== RISK_LEVELS.LOW) {
        return {
          canExecute: false,
          requiresConfirmation: true,
          blockedByAutonomy: false,
          message: `JARVIS is in Level 0 (Inform) mode. Would you like me to execute "${tool.name}"?`
        };
      }
    }

    // 3. Level 1 (Suggest) or Level 3 (Confirm): High and medium risk requires confirmation
    if (autonomyLevel === AUTONOMY_LEVELS.LEVEL_1_SUGGEST || autonomyLevel === AUTONOMY_LEVELS.LEVEL_3_CONFIRM) {
      if (tool.riskLevel !== RISK_LEVELS.LOW) {
        return {
          canExecute: false,
          requiresConfirmation: true,
          blockedByAutonomy: false,
          message: `Confirmation requested under ${autonomyLevel} policy.`
        };
      }
    }

    // 4. Level 2 (Auto Execute): High risk requires confirmation, low/medium can auto-execute
    if (tool.riskLevel === RISK_LEVELS.HIGH || tool.requiresConfirmation) {
      return {
        canExecute: false,
        requiresConfirmation: true,
        blockedByAutonomy: false,
        message: 'Explicit cryptographic confirmation required for high-risk operation.'
      };
    }

    return {
      canExecute: true,
      requiresConfirmation: false,
      blockedByAutonomy: false
    };
  }
}

module.exports = {
  AutonomyManager,
  AUTONOMY_LEVELS
};
