/**
 * JarvisAnticipatoryExecutor
 * Phase 11 Proactive Workflow Bridge.
 * Packages proactive decisions into durable ProactiveWorkflowProposal structures
 * and delegates execution strictly to the verified Phase 10 JarvisWorkflowEngine.
 * Does NOT execute device actions or side-effects directly.
 */

const { defaultWorkflowEngine } = require('../workflow/JarvisWorkflowEngine');
const JarvisWorkflow = require('../workflow/JarvisWorkflow');
const JarvisWorkflowStep = require('../workflow/JarvisWorkflowStep');
const { WORKFLOW_STATES, STEP_STATES } = require('../workflow/JarvisWorkflowStates');
const { defaultWorkflowValidator } = require('../workflow/JarvisWorkflowValidator');
const { PROACTIVE_DECISION_LEVELS } = require('./JarvisProactivePolicyEngine');

class JarvisAnticipatoryExecutor {
  constructor(options = {}) {
    this.workflowEngine = options.workflowEngine || defaultWorkflowEngine;
    this.workflowValidator = options.workflowValidator || defaultWorkflowValidator;
  }

  /**
   * Instantiate and handle proactive workflow proposal according to Decision Level
   * @param {number} userId
   * @param {Object} proposal
   * @param {Object} policyDecision { decisionLevel, requiresConfirmation }
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async handleProposal(userId, proposal = {}, policyDecision = {}, options = {}) {
    if (!proposal.workflowProposal) {
      return {
        success: true,
        workflowCreated: false,
        decisionLevel: policyDecision.decisionLevel,
        message: proposal.speechText || 'Suggestion noted.'
      };
    }

    const wp = proposal.workflowProposal;
    const workflowId = `wf_proactive_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 1. Construct durable JarvisWorkflow model
    const workflow = new JarvisWorkflow({
      workflowId,
      userId,
      goal: wp.goal || proposal.title,
      provenance: 'PROACTIVE_ANTICIPATION',
      priority: proposal.priority || 'NORMAL',
      safetyLevel: proposal.safetyLevel || 1,
      privacyLevel: proposal.privacyLevel || 'LOCAL_ONLY'
    });

    // 2. Add Steps
    const steps = Array.isArray(wp.steps) ? wp.steps : [];
    for (const s of steps) {
      workflow.addStep(new JarvisWorkflowStep({
        stepId: s.stepId || `step_${workflow.steps.length + 1}`,
        sequence: s.sequence || workflow.steps.length + 1,
        capabilityId: s.capabilityId,
        inputs: s.inputs || {},
        expectedOutcome: s.expectedOutcome || s.capabilityId,
        dependencies: s.dependencies || []
      }));
    }

    // 3. Validate DAG using Phase 10 Validator
    const validation = this.workflowValidator.validate(workflow);
    const isValidDAG = validation.valid === true || validation.isValid === true;
    if (!isValidDAG) {
      return {
        success: false,
        error: 'INVALID_PROACTIVE_WORKFLOW_DAG',
        details: validation.errors
      };
    }

    // 4. Handle based on Decision Level (A–E)
    const level = policyDecision.decisionLevel;

    // LEVEL C — PREPARE: Save workflow in READY state, pre-stage context, but do not trigger side effects
    if (level === PROACTIVE_DECISION_LEVELS.PREPARE) {
      workflow.status = WORKFLOW_STATES.READY;
      if (this.workflowEngine._activeWorkflows) {
        this.workflowEngine._activeWorkflows.set(workflow.workflowId, workflow);
      }
      await this.workflowEngine.persistWorkflow(workflow);
      return {
        success: true,
        workflowCreated: true,
        workflowId,
        status: WORKFLOW_STATES.READY,
        decisionLevel: level,
        prepared: true,
        message: `Prepared workflow for: ${workflow.goal}`
      };
    }

    // LEVEL D — ASK: Pause in AWAITING_CONFIRMATION awaiting user affirmative voice response
    if (level === PROACTIVE_DECISION_LEVELS.ASK) {
      workflow.status = WORKFLOW_STATES.AWAITING_CONFIRMATION;
      workflow.pendingAction = {
        type: 'PROACTIVE_CONFIRMATION',
        question: proposal.speechText,
        proposalId: proposal.dedupKey
      };
      if (this.workflowEngine._activeWorkflows) {
        this.workflowEngine._activeWorkflows.set(workflow.workflowId, workflow);
      }
      await this.workflowEngine.persistWorkflow(workflow);
      return {
        success: true,
        workflowCreated: true,
        workflowId,
        status: WORKFLOW_STATES.AWAITING_CONFIRMATION,
        decisionLevel: level,
        question: proposal.speechText,
        workflow
      };
    }

    // LEVEL E — EXECUTE: Dispatch directly into Phase 10 Workflow Engine
    if (level === PROACTIVE_DECISION_LEVELS.EXECUTE) {
      const execResult = await this.workflowEngine.executeWorkflow(workflow, options);
      return {
        success: true,
        workflowCreated: true,
        workflowId,
        status: execResult.status,
        decisionLevel: level,
        executionResult: execResult
      };
    }

    return {
      success: true,
      workflowCreated: false,
      decisionLevel: level,
      message: proposal.speechText
    };
  }
}

const defaultAnticipatoryExecutor = new JarvisAnticipatoryExecutor();

module.exports = {
  JarvisAnticipatoryExecutor,
  defaultAnticipatoryExecutor
};
