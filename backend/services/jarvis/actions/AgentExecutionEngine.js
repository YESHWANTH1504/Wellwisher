const { ActionPlan, ActionStep } = require('./ActionPlan');
const { RiskClassifier, RISK_LEVELS } = require('./RiskClassifier');
const EntityResolver = require('./EntityResolver');
const actionAuditLogger = require('./ActionAuditLogger');
const { PermissionManager } = require('./PermissionManager');
const { activeTaskManager, TASK_STATUSES } = require('../tasks/ActiveTaskManager');
const workflowVerifier = require('../workflow/workflowVerifier');
const { registry: toolRegistry } = require('../tools');
const { idempotencyManager } = require('../agent/idempotencyManager');
const SafetyAuthorizationAgent = require('../agent/specialized/SafetyAuthorizationAgent');

/**
 * AgentExecutionEngine
 * Authoritative 14-step Agent Execution Pipeline for Project JARVIS (Phase 7).
 * Strictly guarantees that no action claims success until verified against real-world observable state.
 */
class AgentExecutionEngine {
  constructor(options = {}) {
    this.safetyAgent = options.safetyAgent || new SafetyAuthorizationAgent();
    this.verifier = options.verifier || workflowVerifier;
    this.taskManager = options.taskManager || activeTaskManager;
    this.auditLogger = options.auditLogger || actionAuditLogger;
    this.idempotency = options.idempotency || idempotencyManager;
  }

  /**
   * Main entry point to execute an ActionPlan through the verified execution pipeline.
   */
  async executePlan(actionPlan, context = {}) {
    if (!(actionPlan instanceof ActionPlan)) {
      throw new Error('AgentExecutionEngine requires an instance of ActionPlan');
    }

    const userId = actionPlan.userId;
    const sessionId = actionPlan.sessionId;

    // Step 1: Active Task Registration
    actionPlan.status = TASK_STATUSES.PLANNING;
    await this.taskManager.setActiveTaskAsync(sessionId, {
      id: actionPlan.planId,
      userId,
      type: 'AUTONOMOUS_ACTION_PLAN',
      action: actionPlan.goal,
      status: actionPlan.status,
      currentStep: actionPlan.currentStepIndex,
      originalRequest: actionPlan.goal,
      details: {
        planId: actionPlan.planId,
        riskLevel: actionPlan.riskLevel,
        riskLevelName: actionPlan.riskLevelName,
        stepCount: actionPlan.steps.length
      }
    });

    // Step 2: Risk & Safety Authorization
    if (actionPlan.confirmationRequired && !actionPlan.isConfirmed) {
      actionPlan.status = TASK_STATUSES.WAITING_CONFIRMATION;
      const authCheck = this.safetyAgent.checkAuthorization(
        userId,
        actionPlan.steps[0]?.tool || 'multi_step_plan',
        actionPlan.steps[0]?.arguments || {},
        false
      );

      actionPlan.confirmationToken = authCheck.confirmationId;
      await this.taskManager.setActiveTaskAsync(sessionId, {
        id: actionPlan.planId,
        userId,
        status: TASK_STATUSES.WAITING_CONFIRMATION,
        details: { confirmationId: authCheck.confirmationId }
      });

      await this.auditLogger.logStep({
        requestId: actionPlan.requestId,
        planId: actionPlan.planId,
        userId,
        stepId: 'plan_auth',
        tool: 'safety_authorization',
        args: { goal: actionPlan.goal },
        riskLevel: actionPlan.riskLevel,
        confirmationStatus: 'WAITING_CONFIRMATION',
        executionStatus: 'PAUSED',
        verificationStatus: 'PENDING'
      });

      return {
        success: false,
        requiresConfirmation: true,
        confirmationId: authCheck.confirmationId,
        riskLevel: actionPlan.riskLevel,
        riskLevelName: actionPlan.riskLevelName,
        plan: actionPlan.toJSON(),
        message: `Action requires explicit confirmation: ${actionPlan.confirmationReason || 'Destructive or sensitive action.'}`
      };
    }

    // Step 3: Sequential Execution Loop with Verification
    actionPlan.status = TASK_STATUSES.EXECUTING;
    const executionResults = [];

    for (let i = actionPlan.currentStepIndex; i < actionPlan.steps.length; i++) {
      const step = actionPlan.steps[i];
      step.status = TASK_STATUSES.EXECUTING;
      step.executedAt = new Date().toISOString();

      // Check step permission requirements
      const permCheck = PermissionManager.checkPermission(step.tool, context.permissions || {});
      if (!permCheck.allowed) {
        step.status = TASK_STATUSES.FAILED;
        step.error = permCheck.explanation;
        actionPlan.status = TASK_STATUSES.FAILED;

        await this.auditLogger.logStep({
          requestId: actionPlan.requestId,
          planId: actionPlan.planId,
          userId,
          stepId: step.stepId,
          tool: step.tool,
          args: step.arguments,
          riskLevel: step.riskLevel,
          executionStatus: 'PERMISSION_DENIED',
          verificationStatus: 'FAILED',
          failureReason: permCheck.explanation
        });

        return {
          success: false,
          verified: false,
          stepId: step.stepId,
          tool: step.tool,
          error: 'PERMISSION_DENIED',
          message: permCheck.explanation,
          plan: actionPlan.toJSON()
        };
      }

      // Check step idempotency
      const cached = await this.idempotency.checkAsync(userId, step.tool, step.arguments);
      if (cached) {
        step.status = TASK_STATUSES.COMPLETED;
        step.executionResult = cached;
        step.verificationResult = { verified: true, source: 'IDEMPOTENCY_CACHE' };
        executionResults.push(step.executionResult);
        continue;
      }

      // Execute tool through toolRegistry
      let rawResult;
      try {
        const toolDef = toolRegistry.get(step.tool);
        if (!toolDef) {
          throw new Error(`Tool "${step.tool}" is not registered in ToolRegistry.`);
        }
        rawResult = await toolDef.execute({ ...context, userId, sessionId }, step.arguments);
        step.executionResult = rawResult;
      } catch (execErr) {
        step.status = TASK_STATUSES.FAILED;
        step.error = execErr.message;
        actionPlan.status = TASK_STATUSES.FAILED;

        await this.auditLogger.logStep({
          requestId: actionPlan.requestId,
          planId: actionPlan.planId,
          userId,
          stepId: step.stepId,
          tool: step.tool,
          args: step.arguments,
          riskLevel: step.riskLevel,
          executionStatus: 'EXECUTION_FAILED',
          verificationStatus: 'FAILED',
          failureReason: execErr.message
        });

        return {
          success: false,
          verified: false,
          stepId: step.stepId,
          tool: step.tool,
          error: execErr.message,
          message: `Failed executing ${step.tool}: ${execErr.message}`,
          plan: actionPlan.toJSON()
        };
      }

      // Step 4: Real-World State Verification
      step.status = TASK_STATUSES.VERIFYING;
      const verification = await this.verifier.verifyStep(userId, step, rawResult);
      step.verificationResult = verification;
      step.verifiedAt = new Date().toISOString();

      if (!verification.verified) {
        step.status = TASK_STATUSES.FAILED;
        actionPlan.status = TASK_STATUSES.FAILED;

        await this.auditLogger.logStep({
          requestId: actionPlan.requestId,
          planId: actionPlan.planId,
          userId,
          stepId: step.stepId,
          tool: step.tool,
          args: step.arguments,
          riskLevel: step.riskLevel,
          executionStatus: 'EXECUTED_UNVERIFIED',
          verificationStatus: 'VERIFICATION_FAILED',
          failureReason: verification.reason || 'Target system did not reflect expected state change.'
        });

        // Trigger rollback if configured
        let rollbackResult = null;
        if (step.rollback && step.rollback.tool) {
          try {
            const rollbackTool = toolRegistry.get(step.rollback.tool);
            if (rollbackTool) {
              rollbackResult = await rollbackTool.execute({ ...context, userId, sessionId }, step.rollback.arguments || {});
              step.status = 'ROLLED_BACK';
            }
          } catch (rbErr) {
            console.warn(`[AgentExecutionEngine] Rollback failed for step ${step.stepId}: ${rbErr.message}`);
          }
        }

        return {
          success: false,
          verified: false,
          status: 'VERIFICATION_FAILED',
          stepId: step.stepId,
          tool: step.tool,
          rollback: rollbackResult ? 'ROLLED_BACK' : 'NO_ROLLBACK',
          reason: verification.reason || 'Real-world state verification failed.',
          message: `I attempted to ${step.purpose || step.tool}, but I could not verify that the action took effect in the system.`,
          plan: actionPlan.toJSON()
        };
      }

      // Verification succeeded
      step.status = TASK_STATUSES.COMPLETED;
      this.idempotency.record(userId, step.tool, step.arguments, rawResult);
      await this.auditLogger.logStep({
        requestId: actionPlan.requestId,
        planId: actionPlan.planId,
        userId,
        stepId: step.stepId,
        tool: step.tool,
        args: step.arguments,
        riskLevel: step.riskLevel,
        executionStatus: 'COMPLETED',
        verificationStatus: 'VERIFIED'
      });

      executionResults.push(rawResult);
      actionPlan.advanceStep();
    }

    // Step 5: Final Plan Completion
    actionPlan.status = TASK_STATUSES.COMPLETED;
    actionPlan.completedAt = new Date().toISOString();

    await this.taskManager.setActiveTaskAsync(sessionId, {
      id: actionPlan.planId,
      userId,
      status: TASK_STATUSES.COMPLETED,
      verified: true,
      currentStep: actionPlan.steps.length,
      details: {
        completedSteps: actionPlan.steps.length,
        executionResults
      }
    });

    return {
      success: true,
      verified: true,
      status: TASK_STATUSES.COMPLETED,
      planId: actionPlan.planId,
      results: executionResults,
      plan: actionPlan.toJSON(),
      message: `Successfully executed and verified ${actionPlan.goal}.`
    };
  }
}

module.exports = AgentExecutionEngine;
