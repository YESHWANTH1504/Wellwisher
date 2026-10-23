/**
 * DeviceAgent
 * Domain agent for device-level actions and preferences. Delegates to authoritative ToolRegistry.
 */
class DeviceAgent {
  constructor(toolExecutionAgent) {
    this.executor = toolExecutionAgent;
  }

  async getDevicePreferences(userId) {
    return await this.executor.executeToolStep(userId, 'get_preferences', {});
  }
}

module.exports = DeviceAgent;
