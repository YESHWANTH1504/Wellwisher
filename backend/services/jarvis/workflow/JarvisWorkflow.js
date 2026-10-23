/**
 * JarvisWorkflow
 * Durable, observable multi-step autonomous workflow model for JARVIS OS.
 */

const { WORKFLOW_STATES, WORKFLOW_PRIORITY, STEP_STATES } = require('./JarvisWorkflowStates');
const JarvisWorkflowStep = require('./JarvisWorkflowStep');

class JarvisWorkflow {
  constructor(options = {}) {
    this.workflowId = options.workflowId || `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.userId = options.userId || null;
    this.sessionId = options.sessionId || null;
    this.goal = options.goal || '';
    this.status = options.status || WORKFLOW_STATES.CREATED;
    this.priority = options.priority || WORKFLOW_PRIORITY.NORMAL;
    this.currentStepId = options.currentStepId || null;
    this.totalSteps = typeof options.totalSteps === 'number' ? options.totalSteps : (typeof options.total_steps === 'number' ? options.total_steps : 0);
    this.completedSteps = typeof options.completedSteps === 'number' ? options.completedSteps : (typeof options.completed_steps === 'number' ? options.completed_steps : 0);

    // Steps array normalized to JarvisWorkflowStep instances
    this.steps = Array.isArray(options.steps)
      ? options.steps.map(s => (s instanceof JarvisWorkflowStep ? s : new JarvisWorkflowStep(s)))
      : [];
    if (this.steps.length > 0) {
      this.totalSteps = this.steps.length;
    }

    this.contextSnapshot = options.contextSnapshot ? { ...options.contextSnapshot } : {};
    this.entityLocks = Array.isArray(options.entityLocks) ? [...options.entityLocks] : [];
    this.requiredPermissions = Array.isArray(options.requiredPermissions) ? [...options.requiredPermissions] : [];
    this.safetyLevel = typeof options.safetyLevel === 'number' ? options.safetyLevel : 1;
    this.privacyLevel = options.privacyLevel || 'LOCAL_ONLY';

    this.confirmationPolicy = options.confirmationPolicy || { requiresUserApproval: false };
    this.timeoutPolicy = options.timeoutPolicy || {
      globalTimeoutMs: 60000,
      stepTimeoutMs: 15000,
      userResponseTimeoutMs: 45000
    };
    this.retryPolicy = options.retryPolicy || {
      maxAttempts: 3,
      backoffMs: 1000
    };
    this.recoveryPolicy = options.recoveryPolicy || {
      defaultStrategy: 'RETRY'
    };

    this.idempotencyKey = options.idempotencyKey || null;
    this.provenance = options.provenance || 'USER_VOICE';
    this.finalResult = options.finalResult || null;
    this.failureReason = options.failureReason || null;
    this.pendingAction = options.pendingAction || null;

    this.createdAt = options.createdAt || new Date().toISOString();
    this.updatedAt = options.updatedAt || new Date().toISOString();
  }

  getStep(stepId) {
    return this.steps.find(s => s.stepId === stepId) || null;
  }

  getNextReadyStep() {
    const completedSet = new Set(
      this.steps.filter(s => s.status === STEP_STATES.SUCCEEDED).map(s => s.stepId)
    );
    return this.steps.find(s => s.isReady(completedSet)) || null;
  }

  areAllStepsSucceeded() {
    return this.steps.length > 0 && this.steps.every(s => s.status === STEP_STATES.SUCCEEDED);
  }

  hasFailedSteps() {
    return this.steps.some(s => s.status === STEP_STATES.FAILED);
  }

  getCompletedStepsCount() {
    return this.steps.filter(s => s.status === STEP_STATES.SUCCEEDED).length;
  }

  addStep(step) {
    const s = step instanceof JarvisWorkflowStep ? step : new JarvisWorkflowStep(step);
    s.workflowId = this.workflowId;
    s.userId = this.userId;
    s.sequence = this.steps.length + 1;
    this.steps.push(s);
    this.totalSteps = this.steps.length;
    this.updatedAt = new Date().toISOString();
    return s;
  }

  toJSON() {
    return {
      workflowId: this.workflowId,
      userId: this.userId,
      sessionId: this.sessionId,
      goal: this.goal,
      status: this.status,
      priority: this.priority,
      currentStepId: this.currentStepId,
      totalSteps: this.totalSteps,
      completedSteps: this.completedSteps,
      steps: this.steps.map(s => s.toJSON()),
      contextSnapshot: this.contextSnapshot,
      entityLocks: this.entityLocks,
      requiredPermissions: this.requiredPermissions,
      safetyLevel: this.safetyLevel,
      privacyLevel: this.privacyLevel,
      confirmationPolicy: this.confirmationPolicy,
      timeoutPolicy: this.timeoutPolicy,
      retryPolicy: this.retryPolicy,
      recoveryPolicy: this.recoveryPolicy,
      idempotencyKey: this.idempotencyKey,
      provenance: this.provenance,
      finalResult: this.finalResult,
      failureReason: this.failureReason,
      pendingAction: this.pendingAction,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = JarvisWorkflow;
