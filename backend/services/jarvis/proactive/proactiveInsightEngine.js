class ProactiveInsightEngine {
  /**
   * Generate actionable non-medical insights from user context
   */
  static generateInsights(context) {
    const insights = [];
    const { routines, hydration } = context;

    // 1. High Schedule Density Insight
    if (routines.length >= 5) {
      insights.push({
        eventType: 'WELLNESS_INSIGHT',
        priority: 'MEDIUM',
        title: 'Busy Day Ahead',
        message: `You have ${routines.length} routines scheduled today. Remember to take short breaks to keep your focus sharp.`,
        actionPayload: { action: 'VIEW_SCHEDULE' }
      });
    }

    // 2. Hydration Pace Insight
    if (hydration.totalMl < 1000 && routines.length > 0) {
      insights.push({
        eventType: 'HYDRATION_NUDGE',
        priority: 'LOW',
        title: 'Hydration Check-in',
        message: `You have logged ${hydration.totalMl} ml of water today. Staying hydrated supports sustained energy.`,
        actionPayload: { action: 'LOG_HYDRATION', amountMl: 250 }
      });
    }

    return insights;
  }
}

module.exports = ProactiveInsightEngine;
