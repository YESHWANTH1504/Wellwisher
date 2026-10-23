/**
 * ProactiveAgent
 * Surfaces timely, helpful, non-spammy proactive briefings and reminders when authorized.
 */
class ProactiveAgent {
  constructor(options = {}) {
    this.toolExecutor = options.toolExecutor || null;
  }

  /**
   * Evaluate if any proactive context should be surfaced to user
   */
  async evaluateProactiveContext(userId, currentHour = new Date().getHours()) {
    const proactiveItems = [];

    // Morning Briefing Check (6 AM - 10 AM)
    if (currentHour >= 6 && currentHour <= 10) {
      proactiveItems.push({
        type: 'DAILY_BRIEFING',
        priority: 'NORMAL',
        message: 'Good morning. Your schedule is ready whenever you want your morning briefing.'
      });
    }

    // Afternoon Hydration Check (1 PM - 4 PM)
    if (currentHour >= 13 && currentHour <= 16) {
      proactiveItems.push({
        type: 'HYDRATION_CHECK',
        priority: 'LOW',
        message: "Afternoon check-in: Remember to keep a glass of water nearby."
      });
    }

    return proactiveItems;
  }
}

module.exports = ProactiveAgent;
