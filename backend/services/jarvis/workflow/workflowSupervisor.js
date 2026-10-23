/**
 * WorkflowSupervisor
 * Supervises active workflows, detects stalled operations, and coordinates health tracking.
 */
class WorkflowSupervisor {
  static inspectWorkflowHealth(workflow) {
    if (!workflow) return { status: 'NO_WORKFLOW' };

    const createdAt = new Date(workflow.createdAt).getTime();
    const ageSeconds = (Date.now() - createdAt) / 1000;

    if (workflow.status === 'RUNNING' && ageSeconds > 300) {
      return {
        status: 'STALLED',
        workflowId: workflow.workflowId,
        ageSeconds,
        recommendation: 'TRIGGER_RECOVERY_OR_ROLLBACK'
      };
    }

    return {
      status: workflow.status === 'COMPLETED' ? 'HEALTHY_COMPLETED' : 'HEALTHY_IN_PROGRESS',
      workflowId: workflow.workflowId,
      currentStep: workflow.currentStep,
      totalSteps: workflow.totalSteps
    };
  }
}

module.exports = WorkflowSupervisor;
