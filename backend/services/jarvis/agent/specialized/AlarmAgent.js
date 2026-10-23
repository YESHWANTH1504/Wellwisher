/**
 * AlarmAgent
 * Domain agent for alarms and exact timing. Delegates to authoritative ToolRegistry.
 */
class AlarmAgent {
  constructor(toolExecutionAgent) {
    this.executor = toolExecutionAgent;
  }

  async setAlarm(userId, time) {
    return await this.executor.executeToolStep(userId, 'create_schedule', {
      title: 'Alarm',
      time: time || '07:00 AM',
      date: new Date().toISOString().split('T')[0],
      category: 'general'
    });
  }
}

module.exports = AlarmAgent;
