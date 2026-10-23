const { defaultCapabilityRegistry, CAPABILITY_AVAILABILITY } = require('./JarvisCapabilityRegistry');
const JarvisPermissionManager = require('./JarvisPermissionManager');
const { JarvisVerificationEngine, VERIFICATION_STATES } = require('./JarvisVerificationEngine');
const { JarvisExecutionRuntime, ACTION_STATES } = require('./JarvisExecutionRuntime');
const { activeTaskManager } = require('../tasks/ActiveTaskManager');
const idempotencyManager = require('../agent/idempotencyManager');

/**
 * JarvisActionEngine
 * Trusted execution runtime executing structured capabilities.
 * Models may propose intents; only this layer validates, authorizes, executes,
 * observes, and authoritatively verifies every mutation.
 */
class JarvisActionEngine {
  constructor(options = {}) {
    this.capabilities = options.capabilities || defaultCapabilityRegistry;
  }

  /**
   * Execute a single action step
   */
  async executeAction(userId, capabilityName, args = {}, options = {}) {
    const runtime = new JarvisExecutionRuntime(null, {
      userId,
      sessionId: options.sessionId,
      timeoutMs: options.timeoutMs || 15000
    });

    runtime.transitionTo(ACTION_STATES.VALIDATING);

    // 1. Resolve Capability
    const capability = this.capabilities.getCapability(capabilityName);
    if (!capability) {
      runtime.transitionTo(ACTION_STATES.FAILED, { error: 'UNKNOWN_CAPABILITY' });
      return {
        success: false,
        status: ACTION_STATES.FAILED,
        errorCode: 'UNSUPPORTED_CAPABILITY',
        message: `Capability "${capabilityName}" is not supported.`
      };
    }

    // 2. Check Idempotency (if mutation)
    if (capability.risk > 0 && options.idempotencyKey) {
      const cached = await idempotencyManager.checkKey(options.idempotencyKey, userId);
      if (cached) {
        return {
          success: true,
          status: ACTION_STATES.SUCCEEDED,
          isCached: true,
          data: cached.result_payload
        };
      }
    }

    // 3. Safety Authorization Check
    runtime.transitionTo(ACTION_STATES.AWAITING_PERMISSION);
    const authCheck = await JarvisPermissionManager.checkAuthorization(
      userId,
      capabilityName,
      args,
      options.isConfirmed
    );

    if (!authCheck.authorized) {
      if (authCheck.requiresConfirmation) {
        runtime.transitionTo(ACTION_STATES.AWAITING_CONFIRMATION);
        return {
          success: false,
          status: ACTION_STATES.AWAITING_CONFIRMATION,
          requiresConfirmation: true,
          confirmationId: authCheck.confirmationId,
          riskLevel: authCheck.riskLevel,
          message: authCheck.message
        };
      }

      runtime.transitionTo(ACTION_STATES.FAILED);
      return {
        success: false,
        status: ACTION_STATES.FAILED,
        errorCode: authCheck.errorCode || 'UNAUTHORIZED_ACTION',
        message: authCheck.message
      };
    }

    // 4. Execution Stage
    runtime.transitionTo(ACTION_STATES.EXECUTING);
    let executionResult = null;

    try {
      const execContext = {
        userId,
        timezone: options.timezone || 'UTC',
        timeFormat: options.timeFormat || '12h',
        sessionId: options.sessionId,
        healthContext: options.healthContext,
        deviceStatus: options.deviceStatus
      };

      executionResult = await capability.executor(execContext, args);
    } catch (err) {
      runtime.transitionTo(ACTION_STATES.FAILED, { error: err.message });
      return {
        success: false,
        status: ACTION_STATES.FAILED,
        errorCode: 'EXECUTION_ERROR',
        message: err.message
      };
    }

    // 5. Observation & Verification Stage
    runtime.transitionTo(ACTION_STATES.OBSERVING);
    runtime.transitionTo(ACTION_STATES.VERIFYING);

    const verification = await JarvisVerificationEngine.verify(
      capabilityName,
      userId,
      executionResult,
      args
    );

    const isSuccess = verification.status === VERIFICATION_STATES.VERIFIED ||
      (verification.status === VERIFICATION_STATES.PENDING_DEVICE && executionResult.requiresNativeExecution);

    const finalState = isSuccess ? ACTION_STATES.SUCCEEDED : ACTION_STATES.FAILED;
    runtime.transitionTo(finalState, { verification });

    // Store in activeTaskManager
    if (isSuccess && options.sessionId) {
      const resData = executionResult?.data || executionResult || {};
      const entityId = resData.reminderId || resData.eventId || resData.id || verification.entityId;

      if (entityId) {
        activeTaskManager.setActiveTask(options.sessionId, {
          userId,
          id: entityId,
          eventId: entityId,
          reminderId: entityId,
          title: resData.title || args.title || 'Task',
          time: resData.time || args.time,
          date: resData.date || args.date,
          status: 'COMPLETED',
          verified: true
        });
      }
    }

    return {
      success: isSuccess,
      status: finalState,
      data: executionResult,
      verification,
      requiresNativeExecution: executionResult?.requiresNativeExecution || false
    };
  }
}

const defaultActionEngine = new JarvisActionEngine();

module.exports = {
  JarvisActionEngine,
  defaultActionEngine
};
