const AgentVerifier = require('./agentVerifier');
const ActionVerifier = require('./actionVerifier');

const VERIFICATION_STATUS = {
  SUCCESS: 'SUCCESS',
  PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
  FAILED: 'FAILED',
  REQUIRES_CONFIRMATION: 'REQUIRES_CONFIRMATION',
  REQUIRES_CLARIFICATION: 'REQUIRES_CLARIFICATION'
};

class WorkflowVerifier {
  static get STATUS() {
    return VERIFICATION_STATUS;
  }

  /**
   * Determine overall workflow verification status from executed steps
   */
  static verifyWorkflow(executedSteps = [], options = {}) {
    if (!Array.isArray(executedSteps) || executedSteps.length === 0) {
      if (options.requiresConfirmation) return VERIFICATION_STATUS.REQUIRES_CONFIRMATION;
      if (options.requiresClarification) return VERIFICATION_STATUS.REQUIRES_CLARIFICATION;
      return VERIFICATION_STATUS.SUCCESS;
    }

    let successCount = 0;
    let failureCount = 0;
    let clarificationCount = 0;
    let confirmationCount = 0;

    for (const step of executedSteps) {
      const res = step.result || {};
      const data = res.data || res;

      if (data.requiresConfirmation || res.requiresConfirmation) {
        confirmationCount++;
      } else if (data.requiresClarification || res.requiresClarification) {
        clarificationCount++;
      } else if (res.success === false || data.success === false || res.error || data.error) {
        failureCount++;
      } else if (res.success === true || data.success === true) {
        successCount++;
      } else {
        // Neutral or informative
        successCount++;
      }
    }

    if (confirmationCount > 0) return VERIFICATION_STATUS.REQUIRES_CONFIRMATION;
    if (clarificationCount > 0) return VERIFICATION_STATUS.REQUIRES_CLARIFICATION;
    if (failureCount === 0) return VERIFICATION_STATUS.SUCCESS;
    if (successCount > 0 && failureCount > 0) return VERIFICATION_STATUS.PARTIAL_SUCCESS;
    return VERIFICATION_STATUS.FAILED;
  }

  /**
   * Authoritatively verify an individual database or native action
   */
  static async verifyStep(toolName, userId, toolResult = {}, inputArgs = {}) {
    // 1. Verify against database persistence if applicable
    const dbVerification = await AgentVerifier.verify(toolName, userId, toolResult, inputArgs);
    if (!dbVerification.verified) {
      return {
        verified: false,
        status: VERIFICATION_STATUS.FAILED,
        reason: dbVerification.reason
      };
    }

    // 2. Verify native action payload
    const actionVerification = ActionVerifier.verifyAction({
      action: toolName,
      target: inputArgs?.appName || inputArgs?.title || toolName,
      result: toolResult
    });

    return {
      verified: actionVerification.verified,
      status: actionVerification.verified ? VERIFICATION_STATUS.SUCCESS : VERIFICATION_STATUS.FAILED,
      reason: actionVerification.failureReason,
      evidence: actionVerification.evidence
    };
  }
}

module.exports = {
  WorkflowVerifier,
  VERIFICATION_STATUS
};
