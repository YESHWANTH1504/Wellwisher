/**
 * AutonomousWorkflowRuntime
 * Persistent runtime for long-running workflows supporting checkpoints, retries, idempotency, and rollback.
 */
class AutonomousWorkflowRuntime {
  constructor() {
    this.workflows = new Map();
    this.idempotencyKeys = new Set();
  }

  createWorkflow(userId, workflowType, steps = [], idempotencyKey = null) {
    if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
      return { duplicate: true, workflow: Array.from(this.workflows.values()).find(w => w.idempotencyKey === idempotencyKey) };
    }

    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const wf = {
      workflowId,
      userId,
      workflowType,
      steps,
      currentStep: 0,
      totalSteps: steps.length,
      completedSteps: [],
      status: 'PLANNED', // PLANNED, WAITING, RUNNING, WAITING_FOR_USER, PARTIALLY_COMPLETED, COMPLETED, FAILED, ROLLED_BACK, CANCELLED, EXPIRED
      idempotencyKey,
      retryCount: 0,
      lastSuccessfulStep: null,
      failureReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(workflowId, wf);
    if (idempotencyKey) {
      this.idempotencyKeys.add(idempotencyKey);
    }
    return { duplicate: false, workflow: wf };
  }

  advanceWorkflow(workflowId, stepEvidence = null) {
    const wf = this.workflows.get(workflowId);
    if (!wf) return null;

    wf.status = 'RUNNING';
    wf.completedSteps.push({
      stepIndex: wf.currentStep,
      stepName: wf.steps[wf.currentStep],
      evidence: stepEvidence,
      timestamp: new Date().toISOString()
    });

    wf.lastSuccessfulStep = wf.currentStep;
    wf.currentStep += 1;

    if (wf.currentStep >= wf.totalSteps) {
      wf.status = 'COMPLETED';
    }
    wf.updatedAt = new Date().toISOString();
    return wf;
  }

  rollbackWorkflow(workflowId, reason = 'USER_CANCELLED') {
    const wf = this.workflows.get(workflowId);
    if (!wf) return null;

    wf.status = 'ROLLED_BACK';
    wf.failureReason = reason;
    wf.updatedAt = new Date().toISOString();
    return wf;
  }
}

module.exports = new AutonomousWorkflowRuntime();
