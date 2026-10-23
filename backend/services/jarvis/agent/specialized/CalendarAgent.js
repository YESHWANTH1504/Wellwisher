/**
 * CalendarAgent
 * Domain agent for calendar events and schedules. Delegates to authoritative ToolRegistry.
 */
class CalendarAgent {
  constructor(toolExecutionAgent) {
    this.executor = toolExecutionAgent;
  }

  async getTodayEvents(userId) {
    return await this.executor.executeToolStep(userId, 'get_today_schedule', {});
  }

  async scheduleEvent(userId, title, time, date) {
    return await this.executor.executeToolStep(userId, 'create_schedule', {
      title: title || 'Meeting',
      time: time || '10:00 AM',
      date: date || new Date().toISOString().split('T')[0],
      category: 'general'
    });
  }
}

module.exports = CalendarAgent;
