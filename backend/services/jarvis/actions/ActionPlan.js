const crypto = require('crypto');
const { RiskClassifier, RISK_LEVELS, RISK_LEVEL_NAMES } = require('./RiskClassifier');

/**
 * ActionStep
 * Represents a single atomic step inside a structured ActionPlan.
 */
class ActionStep {
  constructor({
    stepId = null,
    tool,
    arguments: toolArgs = {},
    purpose = '',
    expectedStateChange = '',
    verification = {},
    rollback = null
  }) {
    if (!tool) throw new Error('ActionStep requires a valid "tool" name');
    this.stepId = stepId || `step_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.tool = tool;
    this.arguments = toolArgs;
    this.purpose = purpose;
    
    // Auto-classify step risk
    const riskInfo = RiskClassifier.classifyTool(this.tool, this.arguments);
    this.riskLevel = riskInfo.level;
    this.riskLevelName = riskInfo.name;
    
    this.expectedStateChange = expectedStateChange || `Execute ${this.tool} successfully`;
    this.verification = {
      strategy: verification.strategy || 'STATE_CHECK', // STATE_CHECK, DB_QUERY, NATIVE_POLL, SCREEN_DIFF, NONE
      target: verification.target || null,
      expected: verification.expected || null,
      ...verification
    };
    this.rollback = rollback; // { tool, arguments, description } or null
    this.status = 'PENDING'; // PENDING, EXECUTING, VERIFYING, COMPLETED, FAILED, SKIPPED, ROLLED_BACK
    this.executionResult = null;
    this.verificationResult = null;
    this.executedAt = null;
    this.verifiedAt = null;
    this.error = null;
  }

  toJSON() {
    return {
      stepId: this.stepId,
      tool: this.tool,
      arguments: this.arguments,
      purpose: this.purpose,
      riskLevel: this.riskLevel,
      riskLevelName: this.riskLevelName,
      expectedStateChange: this.expectedStateChange,
      verification: this.verification,
      rollback: this.rollback,
      status: this.status,
      executionResult: this.executionResult,
      verificationResult: this.verificationResult,
      executedAt: this.executedAt,
      verifiedAt: this.verifiedAt,
      error: this.error
    };
  }
}

/**
 * ActionPlan
 * Typed, deterministic multi-step plan for autonomous execution.
 */
class ActionPlan {
  constructor({
    planId = null,
    requestId = null,
    userId,
    sessionId,
    goal,
    steps = [],
    expectedOutcome = '',
    verificationStrategy = 'COMPREHENSIVE_STATE_CHECK',
    rollbackStrategy = 'STEPWISE_REVERSE',
    timeout = 30000,
    idempotencyKey = null
  }) {
    if (!userId) throw new Error('ActionPlan requires authenticated "userId"');
    if (!goal) throw new Error('ActionPlan requires a non-empty "goal"');

    this.planId = planId || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.requestId = requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.userId = userId;
    this.sessionId = sessionId || `session_${userId}_default`;
    this.goal = goal;
    this.expectedOutcome = expectedOutcome || goal;
    this.verificationStrategy = verificationStrategy;
    this.rollbackStrategy = rollbackStrategy;
    this.timeout = timeout;
    this.idempotencyKey = idempotencyKey || `${userId}_${this.requestId}_${this.planId}`;

    // Normalize and wrap steps
    this.steps = steps.map(s => (s instanceof ActionStep ? s : new ActionStep(s)));

    // Re-evaluate overall plan risk
    const planRisk = RiskClassifier.classifyPlan(this.steps);
    this.riskLevel = planRisk.riskLevel;
    this.riskLevelName = planRisk.riskLevelName;
    this.confirmationRequired = planRisk.confirmationRequired;
    this.confirmationReason = planRisk.confirmationReason;

    // Execution state
    this.status = this.confirmationRequired ? 'WAITING_CONFIRMATION' : 'PLANNING';
    this.currentStepIndex = 0;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.completedAt = null;
    this.confirmationToken = null;
    this.isConfirmed = false;
  }

  getCurrentStep() {
    if (this.currentStepIndex < this.steps.length) {
      return this.steps[this.currentStepIndex];
    }
    return null;
  }

  advanceStep() {
    this.currentStepIndex += 1;
    this.updatedAt = new Date().toISOString();
  }

  markConfirmed(token) {
    this.isConfirmed = true;
    this.confirmationToken = token;
    this.status = 'READY_TO_EXECUTE';
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      planId: this.planId,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      goal: this.goal,
      steps: this.steps.map(s => s.toJSON()),
      riskLevel: this.riskLevel,
      riskLevelName: this.riskLevelName,
      confirmationRequired: this.confirmationRequired,
      confirmationReason: this.confirmationReason,
      expectedOutcome: this.expectedOutcome,
      verificationStrategy: this.verificationStrategy,
      rollbackStrategy: this.rollbackStrategy,
      timeout: this.timeout,
      idempotencyKey: this.idempotencyKey,
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      isConfirmed: this.isConfirmed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }
}

module.exports = {
  ActionPlan,
  ActionStep
};
