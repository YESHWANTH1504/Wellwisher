/**
 * JarvisWorkflowStep
 * Explicit, observable, and verifiable workflow step model.
 */

const { STEP_STATES, FAILURE_POLICIES } = require('./JarvisWorkflowStates');

class JarvisWorkflowStep {
  constructor(options = {}) {
    this.stepId = options.stepId || `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.workflowId = options.workflowId || null;
    this.userId = options.userId || null;
    this.sequence = typeof options.sequence === 'number' ? options.sequence : 1;
    this.capabilityId = options.capabilityId || 'unknown_capability';
    this.domain = options.domain || 'GENERAL';
    this.targetApp = options.targetApp || null;
    this.targetEntity = options.targetEntity || null;
    this.inputs = options.inputs ? { ...options.inputs } : {};
    this.expectedOutcome = options.expectedOutcome || '';
    this.verificationStrategy = options.verificationStrategy || 'AUTOMATIC';
    this.dependencies = Array.isArray(options.dependencies) ? [...options.dependencies] : [];
    this.status = options.status || STEP_STATES.PENDING;
    this.attemptCount = options.attemptCount || 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.failurePolicy = options.failurePolicy || FAILURE_POLICIES.RETRY;
    this.rollbackSupported = Boolean(options.rollbackSupported);
    this.rollbackStrategy = options.rollbackStrategy || null;
    this.safetyLevel = typeof options.safetyLevel === 'number' ? options.safetyLevel : 1;
    this.affinity = options.affinity || 'BACKGROUND_SAFE'; // BACKGROUND_SAFE, FOREGROUND_REQUIRED, USER_REQUIRED
    
    this.result = options.result || null;
    this.verificationResult = options.verificationResult || null;
    this.error = options.error || null;
    this.startedAt = options.startedAt || null;
    this.completedAt = options.completedAt || null;
    this.createdAt = options.createdAt || new Date().toISOString();
    this.updatedAt = options.updatedAt || new Date().toISOString();
  }

  isReady(completedStepIds = new Set()) {
    if (this.status !== STEP_STATES.PENDING && this.status !== STEP_STATES.BLOCKED) {
      return false;
    }
    if (this.dependencies.length === 0) {
      return true;
    }
    return this.dependencies.every(depId => completedStepIds.has(depId));
  }

  markExecuting() {
    this.status = STEP_STATES.EXECUTING;
    this.attemptCount += 1;
    this.startedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  markSucceeded(result, verification = null) {
    this.status = STEP_STATES.SUCCEEDED;
    this.result = result;
    this.verificationResult = verification;
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  markFailed(error, verification = null) {
    this.status = STEP_STATES.FAILED;
    this.error = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
    this.verificationResult = verification;
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  markSkipped(reason = 'PREREQUISITE_FAILED') {
    this.status = STEP_STATES.SKIPPED;
    this.error = reason;
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  markCancelled(reason = 'WORKFLOW_CANCELLED') {
    this.status = STEP_STATES.CANCELLED;
    this.error = reason;
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      stepId: this.stepId,
      workflowId: this.workflowId,
      userId: this.userId,
      sequence: this.sequence,
      capabilityId: this.capabilityId,
      domain: this.domain,
      targetApp: this.targetApp,
      targetEntity: this.targetEntity,
      inputs: this.inputs,
      expectedOutcome: this.expectedOutcome,
      verificationStrategy: this.verificationStrategy,
      dependencies: this.dependencies,
      status: this.status,
      attemptCount: this.attemptCount,
      maxAttempts: this.maxAttempts,
      failurePolicy: this.failurePolicy,
      rollbackSupported: this.rollbackSupported,
      rollbackStrategy: this.rollbackStrategy,
      safetyLevel: this.safetyLevel,
      affinity: this.affinity,
      result: this.result,
      verificationResult: this.verificationResult,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = JarvisWorkflowStep;
