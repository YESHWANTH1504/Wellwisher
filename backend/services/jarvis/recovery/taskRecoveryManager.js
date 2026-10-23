/**
 * TaskRecoveryManager
 * Manages task idempotency, interrupted workflow resumption, and failure recovery.
 */
class TaskRecoveryManager {
  constructor() {
    this.inFlightWorkflows = new Map();
    this.completedIdempotencyKeys = new Set();
  }

  registerWorkflow(workflowId, plan, idempotencyKey = null) {
    if (idempotencyKey && this.completedIdempotencyKeys.has(idempotencyKey)) {
      return { duplicate: true, status: 'ALREADY_COMPLETED' };
    }

    const workflow = {
      workflowId,
      plan,
      idempotencyKey,
      currentStep: 0,
      totalSteps: plan.steps ? plan.steps.length : 1,
      status: 'IN_PROGRESS',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.inFlightWorkflows.set(workflowId, workflow);
    return { duplicate: false, workflow };
  }

  updateStep(workflowId, stepIndex) {
    const wf = this.inFlightWorkflows.get(workflowId);
    if (wf) {
      wf.currentStep = stepIndex;
      wf.updatedAt = new Date().toISOString();
    }
  }

  completeWorkflow(workflowId) {
    const wf = this.inFlightWorkflows.get(workflowId);
    if (wf) {
      wf.status = 'COMPLETED';
      wf.completedAt = new Date().toISOString();
      if (wf.idempotencyKey) {
        this.completedIdempotencyKeys.add(wf.idempotencyKey);
      }
      this.inFlightWorkflows.delete(workflowId);
    }
  }

  getRecoverableWorkflows() {
    return Array.from(this.inFlightWorkflows.values()).filter(w => w.status === 'IN_PROGRESS');
  }
}

module.exports = new TaskRecoveryManager();
