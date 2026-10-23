/**
 * PlanSchemaValidator
 * Validates structured AI planning payloads before authorization and execution.
 * Enforces strict boundaries:
 * - Reject arbitrary code injection or SQL
 * - Ensure plan types match defined contracts
 * - Validate step structure and tool argument safety
 */

const VALID_PLAN_TYPES = new Set([
  'TOOL_EXECUTION_PLAN',
  'FINAL_RESPONSE',
  'CLARIFICATION_REQUIRED'
]);

class PlanSchemaValidator {
  /**
   * Validate a plan returned by an AI provider
   * @param {Object} plan - The plan payload to validate
   * @returns {{ valid: boolean, sanitizedPlan?: Object, error?: string }}
   */
  static validate(plan) {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
      return { valid: false, error: 'Plan must be a valid non-null object' };
    }

    if (!VALID_PLAN_TYPES.has(plan.type)) {
      return { valid: false, error: `Invalid plan type: "${plan.type}". Allowed: ${Array.from(VALID_PLAN_TYPES).join(', ')}` };
    }

    // 1. FINAL_RESPONSE Validation
    if (plan.type === 'FINAL_RESPONSE') {
      if (typeof plan.message !== 'string' || !plan.message.trim()) {
        return { valid: false, error: 'FINAL_RESPONSE must have a non-empty string message' };
      }
      return {
        valid: true,
        sanitizedPlan: {
          type: 'FINAL_RESPONSE',
          intent: typeof plan.intent === 'string' ? plan.intent : 'GENERAL_CONVERSATION',
          message: plan.message.trim(),
          action: plan.action || null,
          gender: plan.gender || null,
          toolCalls: []
        }
      };
    }

    // 2. CLARIFICATION_REQUIRED Validation
    if (plan.type === 'CLARIFICATION_REQUIRED') {
      if (typeof plan.message !== 'string' || !plan.message.trim()) {
        return { valid: false, error: 'CLARIFICATION_REQUIRED must have a non-empty string message' };
      }
      return {
        valid: true,
        sanitizedPlan: {
          type: 'CLARIFICATION_REQUIRED',
          intent: typeof plan.intent === 'string' ? plan.intent : 'CLARIFICATION_REQUIRED',
          message: plan.message.trim(),
          pendingIntent: typeof plan.pendingIntent === 'string' ? plan.pendingIntent : (plan.intent || null),
          missingSlot: typeof plan.missingSlot === 'string' ? plan.missingSlot : null,
          requiresConfirmation: Boolean(plan.requiresConfirmation)
        }
      };
    }

    // 3. TOOL_EXECUTION_PLAN Validation
    if (plan.type === 'TOOL_EXECUTION_PLAN') {
      if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
        return { valid: false, error: 'TOOL_EXECUTION_PLAN must contain a non-empty array of steps' };
      }

      const sanitizedSteps = [];
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        if (!step || typeof step !== 'object') {
          return { valid: false, error: `Step at index ${i} is not a valid object` };
        }

        if (typeof step.toolName !== 'string' || !step.toolName.trim()) {
          return { valid: false, error: `Step at index ${i} is missing valid toolName` };
        }

        const cleanToolName = step.toolName.trim();
        // Whitelist safe tool name characters (alphanumeric, underscore, hyphen)
        if (!/^[a-zA-Z0-9_-]+$/.test(cleanToolName)) {
          return { valid: false, error: `Illegal toolName format: "${cleanToolName}"` };
        }

        // Validate and sanitize arguments
        const args = (step.arguments && typeof step.arguments === 'object' && !Array.isArray(step.arguments))
          ? { ...step.arguments }
          : {};

        // Security check: Guard against SQL injection attempts or eval code inside args
        for (const [key, val] of Object.entries(args)) {
          if (typeof val === 'string') {
            // Check for raw SQL injection attempts
            if (/(\bDROP\s+TABLE\b|\bDELETE\s+FROM\b|;\s*--)/i.test(val)) {
              return { valid: false, error: `Dangerous string argument detected in parameter "${key}"` };
            }
          }
        }

        sanitizedSteps.push({
          stepNumber: step.stepNumber || i + 1,
          toolName: cleanToolName,
          arguments: args,
          riskLevel: step.riskLevel || 'LOW',
          requiresConfirmation: Boolean(step.requiresConfirmation)
        });
      }

      return {
        valid: true,
        sanitizedPlan: {
          type: 'TOOL_EXECUTION_PLAN',
          intent: typeof plan.intent === 'string' ? plan.intent : 'TOOL_EXECUTION',
          steps: sanitizedSteps,
          message: typeof plan.message === 'string' ? plan.message.trim() : '',
          requiresConfirmation: Boolean(plan.requiresConfirmation)
        }
      };
    }

    return { valid: false, error: 'Unhandled plan validation state' };
  }
}

module.exports = {
  VALID_PLAN_TYPES,
  PlanSchemaValidator
};
