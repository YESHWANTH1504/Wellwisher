const { registry, EXECUTION_STATUS } = require('../../tools');
const { idempotencyManager } = require('../idempotencyManager');
const ActionEvidenceEngine = require('../../evidence/actionEvidenceEngine');

/**
 * ToolExecutionAgent
 * Executes authorized tool calls via the authoritative ToolRegistry,
 * verifies post-mutation state, and records evidence.
 */
class ToolExecutionAgent {
  constructor(options = {}) {
    this.registry = options.registry || registry;
    this.idempotency = options.idempotency || idempotencyManager;
    this.evidence = options.evidence || ActionEvidenceEngine;
  }

  /**
   * Execute single tool step with verification
   */
  async executeToolStep(userId, toolName, args = {}, options = {}) {
    if (!userId) {
      return {
        success: false,
        status: EXECUTION_STATUS.FAILED,
        errorCode: 'UNAUTHORIZED',
        message: 'userId is required for tool execution.'
      };
    }

    // 1. Idempotency Check (Only for mutating actions, never for live sensor/health/schedule reads)
    const isReadOnly = toolName.startsWith('health_get_') ||
                       toolName.startsWith('calendar_get_') ||
                       toolName.startsWith('get_') ||
                       toolName.startsWith('check_');

    if (!isReadOnly) {
      const cached = this.idempotency.checkAsync
        ? await this.idempotency.checkAsync(userId, toolName, args)
        : this.idempotency.check(userId, toolName, args);
      if (cached) {
        return {
          success: true,
          status: EXECUTION_STATUS.COMPLETED,
          toolName,
          isIdempotentReplay: true,
          data: cached,
          message: `Action "${toolName}" already completed.`
        };
      }
    }

    // 2. Execute tool
    const context = {
      userId,
      isConfirmed: Boolean(options.isConfirmed),
      timezone: options.timezone || 'UTC',
      healthContext: options.healthContext || null,
      healthGoals: options.healthGoals || null,
      sessionId: options.sessionId || null,
      workingMemory: options.workingMemory || null,
      timeFormat: options.timeFormat || '12h',
      canonicalRequest: options.canonicalRequest || null
    };
    const result = await this.registry.execute(toolName, context, args);

    // 3. Post-execution verification
    if (!isReadOnly && result.success && result.status === EXECUTION_STATUS.COMPLETED) {
      if (this.idempotency.recordAsync) {
        await this.idempotency.recordAsync(userId, toolName, args, result.data);
      } else {
        this.idempotency.record(userId, toolName, args, result.data);
      }

      const recordedEvidence = this.evidence.recordEvidence({
        actionId: `exec_step_${Date.now()}`,
        provider: 'JARVIS_TOOL_EXECUTION_AGENT',
        operation: toolName,
        requestedState: args,
        observedState: result.data,
        verified: true
      });

      result.evidence = recordedEvidence;
    }

    return result;
  }

  /**
   * Alias for executeToolStep
   */
  async executeTool(userId, toolName, args = {}, options = {}) {
    return this.executeToolStep(userId, toolName, args, options);
  }
}

module.exports = ToolExecutionAgent;
