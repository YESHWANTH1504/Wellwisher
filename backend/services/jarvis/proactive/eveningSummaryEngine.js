class EveningSummaryEngine {
  /**
   * Generate factual evening summary from real context
   */
  static generateSummary(context) {
    const { temporal, routines, stats, hydration } = context;
    const dateStr = temporal.currentDate;

    if (routines.length === 0) {
      return {
        eventType: 'EVENING_SUMMARY',
        priority: 'LOW',
        title: `Evening Summary — ${temporal.dayOfWeek}`,
        message: `Here's your day wrap-up. You had no scheduled routines for today. Rest well tonight!`,
        data: {
          totalTasks: 0,
          completedCount: 0,
          completionRate: 100,
          hydrationTotalMl: hydration.totalMl
        }
      };
    }

    const { total, completedCount, missedCount, completionRate } = stats;
    const unfinished = routines.filter(r => r.status !== 'completed');

    let summary = `Here is your day summary. You completed ${completedCount} of ${total} scheduled tasks (${completionRate}% completion).`;

    if (missedCount > 0) {
      summary += ` You had ${missedCount} missed task${missedCount > 1 ? 's' : ''}.`;
    }

    if (unfinished.length > 0) {
      const topUnfinished = unfinished.slice(0, 2).map(r => `"${r.title}"`).join(', ');
      summary += ` Unfinished activities include ${topUnfinished}. Would you like me to move them to tomorrow?`;
    } else {
      summary += ` Fantastic work completing all your scheduled routines!`;
    }

    return {
      eventType: 'EVENING_SUMMARY',
      priority: 'LOW',
      title: `Evening Summary — ${temporal.dayOfWeek}`,
      message: summary,
      data: {
        totalTasks: total,
        completedCount,
        missedCount,
        unfinishedCount: unfinished.length,
        completionRate,
        hydrationTotalMl: hydration.totalMl
      },
      actionPayload: {
        action: unfinished.length > 0 ? 'PROMPT_MOVE_TO_TOMORROW' : 'OPEN_STATS',
        unfinishedIds: unfinished.map(r => r.id)
      }
    };
  }
}

module.exports = EveningSummaryEngine;
