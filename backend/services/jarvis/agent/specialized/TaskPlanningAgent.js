const { aiModelRouter } = require('../../providers/AIModelRouter');
const LLMAdapter = require('../llm/llmAdapter');
const ApplicationResolver = require('../../platform/ApplicationResolver');

/**
 * TaskPlanningAgent
 * Coordinates planning of user requests into executable tool steps using AIModelRouter.
 * Eliminates hardcoded intent keywords and canned entities.
 */
class TaskPlanningAgent {
  constructor(options = {}) {
    this.modelRouter = options.modelRouter || options.aiModelRouter || aiModelRouter;
    this.llmAdapter = options.llmAdapter || new LLMAdapter({ router: this.modelRouter });
  }

  /**
   * Plan a task based on context, request, and available tools
   */
  async planTask(contextPackage, userRequest, availableTools = []) {
    const raw = (userRequest || '').trim();

    // 1. Check if modelRouter has an explicit plan override
    if (this.modelRouter && typeof this.modelRouter.plan === 'function' && this.modelRouter.plan !== Object.getPrototypeOf(this.modelRouter).plan) {
      try {
        const customPlan = await this.modelRouter.plan(contextPackage, raw, availableTools);
        if (customPlan) return customPlan;
      } catch (err) {
        console.warn('TaskPlanningAgent: modelRouter plan error:', err.message);
      }
    }

    // 2. Delegate to the authoritative AI reasoning planner
    if (this.llmAdapter && typeof this.llmAdapter.plan === 'function') {
      try {
        const plan = await this.llmAdapter.plan(contextPackage, raw, availableTools);
        if (plan) {
          // If the plan is an OPEN_APPLICATION action, enhance with ApplicationResolver if appName known
          if (plan.steps && plan.steps.length > 0 && plan.steps[0].toolName === 'open_application') {
            const step = plan.steps[0];
            const appName = step.arguments?.appName || raw.replace(/^(open|launch)\s+/i, '').trim();
            const resolved = ApplicationResolver.resolve(raw);
            if (resolved && resolved.isAppRequest) {
              step.arguments = {
                appName: resolved.appName || appName,
                packageName: resolved.packageName
              };
            }
          }
          return plan;
        }
      } catch (err) {
        console.warn('TaskPlanningAgent: AI planner error:', err.message);
      }
    }

    // 3. Fallback to deterministic offline intent resolver if available
    try {
      const { defaultOfflineIntentResolver } = require('../../os/JarvisOfflineIntentResolver');
      const offlineRes = await defaultOfflineIntentResolver.resolve(contextPackage?.user?.id || 1, raw, {
        sessionId: contextPackage?.conversationId
      });
      if (offlineRes && offlineRes.handled && offlineRes.plan) {
        return offlineRes.plan;
      }
    } catch (_) {}

    // 4. Default fallback
    return {
      type: 'FINAL_RESPONSE',
      intent: 'GENERAL_CONVERSATION',
      message: 'I am here to assist you.',
      requiresConfirmation: false
    };
  }
}

module.exports = TaskPlanningAgent;
