/**
 * JarvisProactivePolicyEngine
 * Phase 11 Proactive Action Policy & Decision Gate.
 * Enforces Decision Levels (A-E), Proactive Modes (OFF, ASSISTED, BALANCED, PROACTIVE),
 * Risk boundaries, Reversibility requirements, and absolute prohibitions.
 */

const PROACTIVE_DECISION_LEVELS = Object.freeze({
  OBSERVE: 'OBSERVE', // Level A: Internal tracking only, no user-facing output
  SUGGEST: 'SUGGEST', // Level B: Informational speech / banner
  PREPARE: 'PREPARE', // Level C: Stage draft / pre-fetch context without side-effects
  ASK: 'ASK',         // Level D: Request user confirmation before execution
  EXECUTE: 'EXECUTE'  // Level E: Autonomous execution for explicitly authorized low-risk actions
});

const PROACTIVE_MODES = Object.freeze({
  OFF: 'OFF',             // No proactive user-facing actions
  ASSISTED: 'ASSISTED',   // Informational suggestions only (Observe, Suggest)
  BALANCED: 'BALANCED',   // Prepare low-risk context, ask before side effects (Observe, Suggest, Prepare, Ask)
  PROACTIVE: 'PROACTIVE'  // Execute explicitly authorized reversible low-risk actions (All levels)
});

const PROACTIVE_RISK_LEVELS = Object.freeze({
  ZERO_RISK: 'ZERO_RISK', // Read-only observation, briefing assembly
  LOW: 'LOW',             // Reversible local reminder creation, local cache update
  MEDIUM: 'MEDIUM',       // App opening, calendar mutations
  HIGH: 'HIGH'            // External communication, phone call, file sharing, deletion
});

class JarvisProactivePolicyEngine {
  /**
   * Determine authoritative Decision Level (A–E) based on policy dimensions
   * @param {Object} proposal
   * @param {Object} preferences
   * @returns {{ decisionLevel: string, isPermitted: boolean, requiresConfirmation: boolean, reason: string }}
   */
  static evaluatePolicy(proposal = {}, preferences = {}) {
    const mode = (preferences.proactiveMode || PROACTIVE_MODES.BALANCED).toUpperCase();
    const authorizedCategories = Array.isArray(preferences.authorizedCategories)
      ? preferences.authorizedCategories
      : ['LOCAL_REMINDERS', 'BRIEFING_PREP'];

    const {
      candidateType = 'GENERAL',
      confidenceScore = 0.5,
      safetyLevel = 1,
      privacyLevel = 'LOCAL_ONLY',
      riskLevel = PROACTIVE_RISK_LEVELS.LOW,
      isReversible = true,
      hasExplicitUserAuthorization = false
    } = proposal;

    // 1. Mode: OFF -> Strictly Observe only
    if (mode === PROACTIVE_MODES.OFF) {
      return {
        decisionLevel: PROACTIVE_DECISION_LEVELS.OBSERVE,
        isPermitted: false,
        requiresConfirmation: false,
        reason: 'Proactive assistance mode is set to OFF.'
      };
    }

    // 2. Absolute Prohibitions (Never execute autonomously under any mode or confidence)
    const isProhibitedAutonomous = (
      riskLevel === PROACTIVE_RISK_LEVELS.HIGH ||
      safetyLevel >= 2 || // Safety Level 2 (Communication/Call/Send) or Level 3 (Destructive)
      candidateType === 'COMMUNICATION_SEND' ||
      candidateType === 'PHONE_CALL' ||
      candidateType === 'DATA_DELETION' ||
      candidateType === 'FINANCIAL' ||
      candidateType === 'CREDENTIAL_TRANSFER'
    );

    if (isProhibitedAutonomous) {
      // Must fall back to ASK or SUGGEST
      return {
        decisionLevel: PROACTIVE_DECISION_LEVELS.ASK,
        isPermitted: true,
        requiresConfirmation: true,
        reason: 'Action involves external communication, destructive effects, or Safety Level 2/3 and requires explicit confirmation.'
      };
    }

    // 3. Mode: ASSISTED -> Max Level is SUGGEST
    if (mode === PROACTIVE_MODES.ASSISTED) {
      return {
        decisionLevel: PROACTIVE_DECISION_LEVELS.SUGGEST,
        isPermitted: true,
        requiresConfirmation: false,
        reason: 'Assisted mode permits informational suggestions only.'
      };
    }

    // 4. Mode: BALANCED -> PREPARE or ASK
    if (mode === PROACTIVE_MODES.BALANCED) {
      // If preparation without side-effect, permit PREPARE
      if (riskLevel === PROACTIVE_RISK_LEVELS.ZERO_RISK || candidateType === 'PREPARE_CONTEXT') {
        return {
          decisionLevel: PROACTIVE_DECISION_LEVELS.PREPARE,
          isPermitted: true,
          requiresConfirmation: false,
          reason: 'Balanced mode prepares low-risk context staging.'
        };
      }
      return {
        decisionLevel: PROACTIVE_DECISION_LEVELS.ASK,
        isPermitted: true,
        requiresConfirmation: true,
        reason: 'Balanced mode requests confirmation prior to executing side-effects.'
      };
    }

    // 5. Mode: PROACTIVE -> EXECUTE only if all criteria pass
    if (mode === PROACTIVE_MODES.PROACTIVE) {
      const isAuthorizedCategory = authorizedCategories.includes(candidateType) || hasExplicitUserAuthorization;
      const isHighConfidence = confidenceScore >= 0.85;
      const isSafeForExecution = (
        safetyLevel <= 1 &&
        (riskLevel === PROACTIVE_RISK_LEVELS.LOW || riskLevel === PROACTIVE_RISK_LEVELS.ZERO_RISK) &&
        isReversible === true &&
        isAuthorizedCategory &&
        isHighConfidence
      );

      if (isSafeForExecution) {
        return {
          decisionLevel: PROACTIVE_DECISION_LEVELS.EXECUTE,
          isPermitted: true,
          requiresConfirmation: false,
          reason: 'Proactive mode allows autonomous execution for verified, reversible, high-confidence, explicitly authorized low-risk action.'
        };
      }

      // If not fully eligible for autonomous execution, fall back to ASK
      return {
        decisionLevel: PROACTIVE_DECISION_LEVELS.ASK,
        isPermitted: true,
        requiresConfirmation: true,
        reason: 'Action does not meet all criteria for autonomous execution; asking user confirmation.'
      };
    }

    // Default safe fallback
    return {
      decisionLevel: PROACTIVE_DECISION_LEVELS.SUGGEST,
      isPermitted: true,
      requiresConfirmation: false,
      reason: 'Default fallback to suggestion.'
    };
  }
}

module.exports = {
  JarvisProactivePolicyEngine,
  PROACTIVE_DECISION_LEVELS,
  PROACTIVE_MODES,
  PROACTIVE_RISK_LEVELS
};
