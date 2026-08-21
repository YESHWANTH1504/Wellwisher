const { registry, EXECUTION_STATUS } = require('../tools');
const { confirmationManager } = require('./confirmationManager');
const { idempotencyManager } = require('./idempotencyManager');
const AgentVerifier = require('./agentVerifier');
const { AiAgentRunRepository } = require('../../../repositories/ai/aiAgentRunRepository');

class AgentExecutor {
  /**
   * Execute an agent plan through the Tool Registry with safety, verification, and audit logging
   */
  static async executePlan({ userId, agentRunId, plan, context, confirmationId }) {
    const results = [];

    for (const step of plan.steps) {
      // 1. Audit log planned step
      let stepRecord = null;
      try {
        stepRecord = await AiAgentRunRepository.addStep(userId, {
          agentRunId,
          stepNumber: step.stepNumber,
          toolName: step.toolName,
          status: 'RUNNING',
          inputJson: step.arguments
        });
      } catch (err) {
        console.warn('AgentExecutor: Step audit log warning:', err.message);
      }

      // 2. Check Idempotency Cache for mutation actions
      const cached = idempotencyManager.check(userId, step.toolName, step.arguments);
      if (cached) {
        results.push(cached);
        continue;
      }

      // 3. Handle Confirmation Token if supplied by client
      let isConfirmed = false;
      if (confirmationId) {
        const confValidation = confirmationManager.validateAndConsume(
          confirmationId,
          userId,
          step.toolName,
          step.arguments
        );

        if (!confValidation.valid) {
          return {
            status: EXECUTION_STATUS.FAILED,
            errorCode: confValidation.errorCode,
            message: confValidation.message,
            results
          };
        }
        isConfirmed = true;
      }

      // 4. Execute strictly through Tool Registry
      const execContext = {
        userId,
        agentRunId,
        isConfirmed
      };

      const toolResult = await registry.execute(step.toolName, execContext, step.arguments);

      // 5. Handle Waiting For Confirmation
      if (toolResult.status === EXECUTION_STATUS.WAITING_FOR_CONFIRMATION) {
        const token = confirmationManager.createToken({
          userId,
          agentRunId,
          tool: step.toolName,
          arguments: step.arguments
        });

        if (stepRecord) {
          await AiAgentRunRepository.updateStep(stepRecord.id, userId, {
            status: 'WAITING_FOR_CONFIRMATION'
          });
        }

        return {
          status: EXECUTION_STATUS.WAITING_FOR_CONFIRMATION,
          confirmationToken: token,
          toolName: step.toolName,
          message: toolResult.message,
          results
        };
      }

      // 6. Handle Tool Failure or Disabled
      if (!toolResult.success) {
        if (stepRecord) {
          await AiAgentRunRepository.updateStep(stepRecord.id, userId, {
            status: 'FAILED',
            errorMessage: toolResult.message
          });
        }

        return {
          status: toolResult.status || EXECUTION_STATUS.FAILED,
          errorCode: toolResult.errorCode || 'TOOL_EXECUTION_FAILED',
          message: toolResult.message,
          results
        };
      }

      // 7. Verify Mutation Integrity
      const verification = await AgentVerifier.verify(step.toolName, userId, toolResult, step.arguments);
      if (!verification.verified) {
        if (stepRecord) {
          await AiAgentRunRepository.updateStep(stepRecord.id, userId, {
            status: 'FAILED',
            errorMessage: verification.reason
          });
        }

        return {
          status: EXECUTION_STATUS.FAILED,
          errorCode: 'VERIFICATION_FAILED',
          message: verification.reason,
          results
        };
      }

      // 8. Record Step Completion & Cache Idempotency
      if (stepRecord) {
        await AiAgentRunRepository.updateStep(stepRecord.id, userId, {
          status: 'COMPLETED',
          outputJson: toolResult.data
        });
      }

      idempotencyManager.record(userId, step.toolName, step.arguments, toolResult);
      results.push(toolResult);
    }

    return {
      status: EXECUTION_STATUS.COMPLETED,
      results
    };
  }
}

module.exports = AgentExecutor;
