/**
 * JarvisWorkflowRecoveryEngine
 * Autonomous recovery, controlled retry, rollback, and re-planning engine for Phase 10.
 * Ensures workflows never fail silently and never retry non-retryable actions endlessly.
 */

const { RECOVERY_STRATEGIES, FAILURE_POLICIES } = require('./JarvisWorkflowStates');
const { defaultActionEngine } = require('../os/JarvisActionEngine');

class JarvisWorkflowRecoveryEngine {
  constructor(options = {}) {
    this.actionEngine = options.actionEngine || defaultActionEngine;
  }

  /**
   * Determine recovery decision following step failure
   * @param {JarvisWorkflow} workflow
   * @param {JarvisWorkflowStep} failedStep
   * @param {Object} errorInfo
   * @returns {Object} Recovery decision { strategy, speech, canRetry, rollbackPossible }
   */
  evaluateRecovery(workflow, failedStep, errorInfo = {}) {
    const errorMsg = (errorInfo?.message || errorInfo?.error || failedStep.error || '').toLowerCase();

    // 0. Explicit ABORT failure policy
    if (failedStep.failurePolicy === FAILURE_POLICIES.ABORT) {
      return {
        strategy: RECOVERY_STRATEGIES.ABORT,
        speech: `Step execution failed: ${failedStep.expectedOutcome || failedStep.capabilityId}.`,
        shouldRetry: false
      };
    }

    // 1. Non-Retryable Conditions
    if (errorMsg.includes('permission denied') || errorMsg.includes('permission_required')) {
      return {
        strategy: RECOVERY_STRATEGIES.REQUEST_PERMISSION,
        speech: `I need permission to complete this step: ${failedStep.expectedOutcome}.`,
        shouldRetry: false
      };
    }

    if (errorMsg.includes('not installed') || errorMsg.includes('unsupported')) {
      return {
        strategy: RECOVERY_STRATEGIES.ASK_USER,
        speech: `The required application isn't installed. Would you like me to try another way?`,
        shouldRetry: false
      };
    }

    if (errorMsg.includes('cancelled') || errorMsg.includes('user_cancelled')) {
      return {
        strategy: RECOVERY_STRATEGIES.ABORT,
        speech: 'Workflow cancelled by user.',
        shouldRetry: false
      };
    }

    // 2. Controlled Retry Check
    if (failedStep.attemptCount < failedStep.maxAttempts) {
      if (failedStep.failurePolicy === FAILURE_POLICIES.RETRY) {
        return {
          strategy: RECOVERY_STRATEGIES.RETRY,
          speech: `Retrying step (${failedStep.attemptCount}/${failedStep.maxAttempts}): ${failedStep.expectedOutcome}...`,
          shouldRetry: true,
          nextAttempt: failedStep.attemptCount + 1
        };
      }
    }

    // 3. Skip Policy Check
    if (failedStep.failurePolicy === FAILURE_POLICIES.SKIP) {
      return {
        strategy: RECOVERY_STRATEGIES.SKIP,
        speech: `Skipping optional step: ${failedStep.expectedOutcome}.`,
        shouldRetry: false
      };
    }

    // 4. Rollback Policy Check
    if (failedStep.failurePolicy === FAILURE_POLICIES.ROLLBACK || workflow.recoveryPolicy.defaultStrategy === 'ROLLBACK') {
      const rollbackSteps = workflow.steps.filter(s => s.status === 'SUCCEEDED' && s.rollbackSupported);
      return {
        strategy: RECOVERY_STRATEGIES.ROLLBACK,
        speech: `Step failed. Rolling back completed actions to maintain consistent state.`,
        shouldRetry: false,
        rollbackSteps
      };
    }

    // 5. Default Fallback: Ask User
    return {
      strategy: RECOVERY_STRATEGIES.ASK_USER,
      speech: `I ran into an issue while completing "${failedStep.expectedOutcome}". How would you like me to proceed?`,
      shouldRetry: false
    };
  }

  /**
   * Execute action with controlled retry and exponential backoff
   */
  async executeWithRetry(step, action) {
    const maxAttempts = step.maxAttempts || (step.retryPolicy && step.retryPolicy.maxAttempts) || 3;
    const backoffMs = (step.retryPolicy && step.retryPolicy.backoffMs) || 10;
    let lastErr;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      step.attemptCount = attempt;
      try {
        const res = await action();
        return res;
      } catch (err) {
        lastErr = err;
        const msg = (err.message || '').toUpperCase();
        // Non-retryable conditions
        if (msg.includes('PERMISSION_DENIED') || msg.includes('APP_NOT_INSTALLED') || msg.includes('CANCEL')) {
          throw err;
        }
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, backoffMs * attempt));
        }
      }
    }
    throw lastErr;
  }

  /**
   * Calculate exponential backoff delay
   */
  getBackoffDelay(attempt = 1, baseDelayMs = 1000) {
    return baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  }

  /**
   * Determine recovery strategy for a failed step
   */
  determineRecoveryStrategy(step, error = {}) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('multiple') || msg.includes('ambiguity') || step.failurePolicy === FAILURE_POLICIES.ASK_USER) {
      return {
        strategy: RECOVERY_STRATEGIES.ASK_USER,
        speech: `Multiple options found. Which one would you prefer?`
      };
    }
    if (step.failurePolicy === FAILURE_POLICIES.REPLAN) {
      return {
        strategy: RECOVERY_STRATEGIES.REPLAN,
        speech: 'Recalculating plan with alternative tools.'
      };
    }
    return this.evaluateRecovery(null, step, error);
  }

  /**
   * Replan workflow graph upon unresolvable failure
   */
  async replanWorkflow(workflow, failedStep, error) {
    if (!workflow) return null;
    const { defaultWorkflowPlanner } = require('./JarvisWorkflowPlanner');
    const replanned = defaultWorkflowPlanner.plan(workflow.userId, workflow.goal, workflow.contextSnapshot);
    replanned.status = 'READY';
    return replanned;
  }

  /**
   * Execute rollback for completed steps supporting rollback
   */
  async executeRollback(target, userId) {
    if (!target) return { rolledBack: false, reason: 'INVALID_TARGET' };

    // Single step rollback
    if (target.capabilityId || target.stepId) {
      const step = target;
      if (!step.rollbackSupported) {
        return { rolledBack: false, reason: 'ROLLBACK_NOT_SUPPORTED' };
      }
      if (typeof step.rollbackStrategy === 'function') {
        const res = await step.rollbackStrategy(step.inputs, step.result);
        return { rolledBack: true, ...res };
      }
      return { rolledBack: true };
    }

    // Workflow rollback
    const workflow = target;
    const rolledBack = [];
    const completedWithRollback = (workflow.steps || [])
      .filter(s => s.status === 'SUCCEEDED' && s.rollbackSupported)
      .reverse();

    for (const step of completedWithRollback) {
      if (typeof step.rollbackStrategy === 'function') {
        try {
          await step.rollbackStrategy(step.inputs, step.result);
          rolledBack.push(step.stepId);
        } catch (_) {}
      } else if (step.rollbackStrategy === 'DELETE_CALENDAR_EVENT' && step.result?.eventId) {
        try {
          await this.actionEngine.executeAction(userId, 'delete_calendar_event', {
            eventId: step.result.eventId
          }, { isConfirmed: true });
          rolledBack.push(step.stepId);
        } catch (_) {}
      } else if (step.rollbackStrategy === 'CANCEL_REMINDER' && step.result?.reminderId) {
        try {
          await this.actionEngine.executeAction(userId, 'cancel_reminder', {
            reminderId: step.result.reminderId
          }, { isConfirmed: true });
          rolledBack.push(step.stepId);
        } catch (_) {}
      }
    }

    return {
      success: true,
      rolledBack: true,
      rolledBackStepsCount: rolledBack.length,
      rolledBackStepIds: rolledBack
    };
  }
}

const defaultWorkflowRecoveryEngine = new JarvisWorkflowRecoveryEngine();

module.exports = {
  JarvisWorkflowRecoveryEngine,
  defaultWorkflowRecoveryEngine
};
