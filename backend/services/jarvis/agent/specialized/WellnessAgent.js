/**
 * WellnessAgent
 * Domain agent for hydration, health, and wellness logs. Delegates to authoritative ToolRegistry.
 */
class WellnessAgent {
  constructor(toolExecutionAgent) {
    this.executor = toolExecutionAgent;
  }

  async logWater(userId, amountMl) {
    return await this.executor.executeToolStep(userId, 'log_hydration', {
      amountMl: amountMl || 250
    });
  }

  async getHydrationSummary(userId) {
    return await this.executor.executeToolStep(userId, 'get_hydration', {});
  }
}

module.exports = WellnessAgent;
