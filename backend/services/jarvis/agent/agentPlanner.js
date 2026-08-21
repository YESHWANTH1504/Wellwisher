const { registry } = require('../tools');

const MAX_AGENT_STEPS = 8;

class AgentPlanner {
  /**
   * Validate and construct a bounded execution plan from LLM reasoning output
   */
  static createPlan(llmPlan = {}) {
    if (!llmPlan || typeof llmPlan !== 'object') {
      return {
        type: 'FINAL_RESPONSE',
        intent: 'UNKNOWN_REQUEST',
        steps: [],
        message: 'Unable to formulate an agent execution plan.'
      };
    }

    if (llmPlan.type === 'FINAL_RESPONSE' || !Array.isArray(llmPlan.toolCalls) || llmPlan.toolCalls.length === 0) {
      return {
        type: 'FINAL_RESPONSE',
        intent: llmPlan.intent || 'GENERAL_CONVERSATION',
        steps: [],
        message: llmPlan.message || 'Processing complete.'
      };
    }

    // Validate Tool Calls against Tool Registry
    const validatedSteps = [];

    for (let i = 0; i < llmPlan.toolCalls.length; i++) {
      if (validatedSteps.length >= MAX_AGENT_STEPS) {
        break; // Strictly enforce max step budget
      }

      const call = llmPlan.toolCalls[i];
      const toolName = (call.tool || call.name || '').trim();

      if (!registry.has(toolName)) {
        return {
          type: 'ERROR',
          errorCode: 'UNKNOWN_TOOL',
          message: `Agent planned an unregistered tool: "${toolName}". Execution halted for safety.`,
          steps: []
        };
      }

      validatedSteps.push({
        stepNumber: validatedSteps.length + 1,
        toolName,
        arguments: call.arguments || {}
      });
    }

    return {
      type: 'TOOL_EXECUTION_PLAN',
      intent: llmPlan.intent || 'ACTION_PLAN',
      steps: validatedSteps
    };
  }
}

module.exports = {
  AgentPlanner,
  MAX_AGENT_STEPS
};
