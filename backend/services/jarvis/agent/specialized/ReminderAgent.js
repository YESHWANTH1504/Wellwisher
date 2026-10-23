/**
 * ReminderAgent
 * Domain agent for reminders and tasks. Delegates to authoritative ToolRegistry.
 */
class ReminderAgent {
  constructor(toolExecutionAgent) {
    this.executor = toolExecutionAgent;
  }

  async createReminder(userId, title, time, date) {
    return await this.executor.executeToolStep(userId, 'create_schedule', {
      title: title || 'Reminder',
      time: time || '06:00 PM',
      date: date || new Date().toISOString().split('T')[0],
      category: 'general'
    });
  }

  async cancelReminder(userId, routineId) {
    return await this.executor.executeToolStep(userId, 'delete_schedule', {
      routineId
    });
  }
}

module.exports = ReminderAgent;
