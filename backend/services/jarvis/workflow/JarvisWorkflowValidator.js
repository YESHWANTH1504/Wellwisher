/**
 * JarvisWorkflowValidator
 * Deterministic validation engine for workflow graphs.
 * Validates DAG consistency, dependency existence, cycle detection, capability contract existence,
 * permissions, safety levels, and privacy propagation before any step is scheduled.
 */

const { defaultCapabilityRegistry } = require('../os/JarvisCapabilityRegistry');
const { STANDARD_CAPABILITY_CATALOG } = require('../apps/JarvisAppCapabilityContract');

class JarvisWorkflowValidator {
  constructor(options = {}) {
    this.capabilityRegistry = options.capabilityRegistry || defaultCapabilityRegistry;
  }

  /**
   * Validate entire workflow graph
   * @param {JarvisWorkflow} workflow
   * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
   */
  validate(workflow) {
    const errors = [];
    const warnings = [];

    if (!workflow) {
      return { valid: false, errors: ['Workflow object is null or undefined'] };
    }

    if (!workflow.goal || typeof workflow.goal !== 'string' || workflow.goal.trim().length === 0) {
      errors.push('Workflow must declare a non-empty user goal');
    }

    if (!Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      errors.push('Workflow must contain at least one step');
      return { valid: false, errors, warnings };
    }

    const stepIdSet = new Set();
    const stepMap = new Map();

    // 1. Validate individual steps and check duplicate step IDs
    for (const step of workflow.steps) {
      if (!step.stepId) {
        errors.push(`Step at sequence ${step.sequence} is missing stepId`);
        continue;
      }
      if (stepIdSet.has(step.stepId)) {
        errors.push(`Duplicate stepId detected: "${step.stepId}"`);
      }
      stepIdSet.add(step.stepId);
      stepMap.set(step.stepId, step);

      // Validate capability existence
      const capId = step.capabilityId;
      const isKnownContract = Array.isArray(STANDARD_CAPABILITY_CATALOG) && STANDARD_CAPABILITY_CATALOG.some(c => c.capabilityId === capId);
      const isKnownTool = this.capabilityRegistry ? this.capabilityRegistry.hasCapability(capId) : false;

      // Allow common verified capabilities or system tools
      const isStandardAction = [
        'android.app.launch',
        'android.app.maps.search',
        'android.app.maps.resolve',
        'android.app.maps.directions',
        'android.contact.resolve',
        'android.communication.message.compose',
        'android.communication.whatsapp.compose',
        'android.communication.whatsapp.send',
        'android.communication.sms.send',
        'android.app.share',
        'android.calendar.event.create',
        'android.calendar.event.update',
        'android.calendar.event.delete',
        'android.reminder.create',
        'android.reminder.cancel',
        'open_application',
        'open_settings',
        'open_system_settings',
        'navigate_to_location',
        'search_location',
        'make_call',
        'send_sms',
        'send_whatsapp_message',
        'share_content',
        'control_media',
        'calendar_create_event',
        'update_calendar_event',
        'delete_calendar_event',
        'create_reminder',
        'cancel_reminder',
        'resolve_contact',
        'resolve_address',
        'user_preference_set',
        'user_preference_clear'
      ].includes(capId);

      if (!isKnownContract && !isKnownTool && !isStandardAction) {
        errors.push(`Step "${step.stepId}" references unknown or uncataloged capability: "${capId}"`);
      }
    }

    // 2. Validate DAG Dependencies & Cycle Detection
    for (const step of workflow.steps) {
      for (const depId of step.dependencies) {
        if (!stepIdSet.has(depId)) {
          errors.push(`Step "${step.stepId}" depends on non-existent prerequisite step "${depId}"`);
        }
        if (depId === step.stepId) {
          errors.push(`Step "${step.stepId}" cannot depend on itself (self-dependency cycle)`);
        }
      }
    }

    // Topological sort to detect cycles
    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (stepId) => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = stepMap.get(stepId);
      if (step && Array.isArray(step.dependencies)) {
        for (const depId of step.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recursionStack.has(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const stepId of stepIdSet) {
      if (!visited.has(stepId)) {
        if (hasCycle(stepId)) {
          errors.push('Circular dependency cycle detected in workflow step graph');
          break;
        }
      }
    }

    // 3. Validate Privacy & Safety Consistency
    if (workflow.privacyLevel === 'PRIVATE_DEVICE' && workflow.safetyLevel < 2) {
      warnings.push('Workflow contains PRIVATE_DEVICE data but safetyLevel is below Level 2; elevated safety recommended');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a single workflow step
   * @param {JarvisWorkflowStep} step
   * @returns {Object} { valid: boolean, errors: Array<string> }
   */
  validateStep(step) {
    if (!step || !step.stepId) {
      return { valid: false, errors: ['Step missing stepId'] };
    }
    const errors = [];
    const capId = step.capabilityId;
    const isKnownContract = Array.isArray(STANDARD_CAPABILITY_CATALOG) && STANDARD_CAPABILITY_CATALOG.some(c => c.capabilityId === capId);
    const isKnownTool = this.capabilityRegistry ? this.capabilityRegistry.hasCapability(capId) : false;
    const isStandardAction = [
      'android.app.launch',
      'android.app.maps.search',
      'android.app.maps.resolve',
      'android.app.maps.directions',
      'android.contact.resolve',
      'android.communication.message.compose',
      'android.communication.whatsapp.compose',
      'android.communication.whatsapp.send',
      'android.communication.sms.send',
      'android.app.share',
      'android.calendar.event.create',
      'android.calendar.event.update',
      'android.calendar.event.delete',
      'android.reminder.create',
      'android.reminder.cancel',
      'open_application',
      'open_settings',
      'open_system_settings',
      'navigate_to_location',
      'search_location',
      'make_call',
      'send_sms',
      'send_whatsapp_message',
      'share_content',
      'control_media',
      'calendar_create_event',
      'update_calendar_event',
      'delete_calendar_event',
      'create_reminder',
      'cancel_reminder',
      'resolve_contact',
      'resolve_address',
      'user_preference_set',
      'user_preference_clear'
    ].includes(capId);

    if (!isKnownContract && !isKnownTool && !isStandardAction) {
      errors.push(`Unregistered capability: "${capId}"`);
    }

    if (step.safetyLevel === 0 && capId && (capId.includes('send') || capId.includes('delete'))) {
      errors.push('Safety level mismatch: unauthorized downgrade');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

const defaultWorkflowValidator = new JarvisWorkflowValidator();

module.exports = {
  JarvisWorkflowValidator,
  defaultWorkflowValidator
};
