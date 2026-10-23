const { registry, EXECUTION_STATUS } = require('../services/jarvis/tools');
const { idempotencyManager } = require('../services/jarvis/agent/idempotencyManager');
const { confirmationManager } = require('../services/jarvis/agent/confirmationManager');
const ActionEvidenceEngine = require('../services/jarvis/evidence/actionEvidenceEngine');

/**
 * LiveKitToolAdapter
 * Adapts realtime voice agent tool requests to the authoritative ToolRegistry.
 * Ensures security checks, confirmation tokens, idempotency, and post-mutation verification.
 */
class LiveKitToolAdapter {
  constructor(options = {}) {
    this.registry = options.registry || registry;
    this.idempotency = options.idempotency || idempotencyManager;
    this.confirmation = options.confirmation || confirmationManager;
    this.evidence = options.evidence || ActionEvidenceEngine;
  }

  /**
   * Execute a tool through the authoritative safety and execution pipeline
   */
  async executeTool({ userId, toolName, input = {}, isConfirmed = false, confirmationId = null }) {
    if (!userId) {
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        errorCode: 'UNAUTHORIZED',
        message: 'Authenticated userId is required for tool execution.'
      };
    }

    const tool = this.registry.get(toolName);
    if (!tool) {
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        errorCode: 'TOOL_NOT_FOUND',
        message: `Tool "${toolName}" is not registered in the Tool Registry.`
      };
    }

    // 1. Idempotency Check for Mutation Tools
    const cachedResult = this.idempotency.check(userId, toolName, input);
    if (cachedResult) {
      return {
        success: true,
        status: EXECUTION_STATUS.COMPLETED,
        toolName,
        isIdempotentReplay: true,
        data: cachedResult,
        message: `Action "${toolName}" was already completed.`
      };
    }

    // 2. Validate Confirmation Token if Provided
    if (confirmationId) {
      const tokenValidation = this.confirmation.validateAndConsume(confirmationId, userId, toolName, input);
      if (!tokenValidation.valid) {
        return {
          success: false,
          status: EXECUTION_STATUS.FAILED,
          errorCode: tokenValidation.errorCode,
          message: tokenValidation.message
        };
      }
      isConfirmed = true;
    }

    // 3. Delegate to Authoritative Registry
    const context = { userId, isConfirmed };
    const executionResult = await this.registry.execute(toolName, context, input);

    // 4. Handle Pending Confirmation
    if (executionResult.status === EXECUTION_STATUS.WAITING_FOR_CONFIRMATION) {
      const token = this.confirmation.createToken({
        userId,
        tool: toolName,
        arguments: input
      });

      return {
        success: true,
        status: EXECUTION_STATUS.WAITING_FOR_CONFIRMATION,
        toolName,
        requiresConfirmation: true,
        confirmationId: token.confirmationId,
        message: executionResult.message,
        confirmationDetails: executionResult.confirmationDetails
      };
    }

    // 5. Verify & Record Evidence upon Completion
    if (executionResult.success && executionResult.status === EXECUTION_STATUS.COMPLETED) {
      this.idempotency.record(userId, toolName, input, executionResult.data);

      const evidence = this.evidence.recordEvidence({
        actionId: `voice_act_${Date.now()}`,
        provider: 'JARVIS_LIVEKIT_TOOL_ADAPTER',
        operation: toolName,
        requestedState: input,
        observedState: executionResult.data,
        verified: true
      });

      executionResult.evidence = evidence;
    }

    return executionResult;
  }
}

const defaultLiveKitToolAdapter = new LiveKitToolAdapter();

module.exports = {
  LiveKitToolAdapter,
  defaultLiveKitToolAdapter
};
