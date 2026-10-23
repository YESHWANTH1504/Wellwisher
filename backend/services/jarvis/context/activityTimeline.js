/**
 * ActivityTimeline
 * Tracks user-visible assistant operations, plans, automated executions, and verifications.
 */
class ActivityTimeline {
  constructor() {
    this.events = [];
  }

  logEvent(userId, event) {
    const entry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      ...event,
      timestamp: new Date().toISOString()
    };
    this.events.unshift(entry);
    if (this.events.length > 500) {
      this.events.pop();
    }
    return entry;
  }

  getTimeline(userId, limit = 50) {
    return this.events.filter(e => e.userId === userId).slice(0, limit);
  }

  clearTimeline(userId) {
    this.events = this.events.filter(e => e.userId !== userId);
  }

  getTodaySummary(userId) {
    const today = new Date().toISOString().split('T')[0];
    const todays = this.events.filter(e => e.userId === userId && e.timestamp.startsWith(today));
    return {
      totalActions: todays.length,
      successful: todays.filter(e => e.success !== false).length,
      failed: todays.filter(e => e.success === false).length,
      recent: todays.slice(0, 5)
    };
  }
}

module.exports = new ActivityTimeline();
