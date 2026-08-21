class DailyBriefingEngine {
  /**
   * Generate factual morning briefing from real context
   */
  static generateBriefing(context) {
    const { temporal, routines, stats, hydration, preferences } = context;
    const assistantName = preferences.assistantName || 'JARVIS';
    const dayName = temporal.dayOfWeek;
    const dateStr = temporal.currentDate;

    if (routines.length === 0) {
      return {
        eventType: 'DAILY_BRIEFING',
        priority: 'MEDIUM',
        title: `Morning Briefing — ${dayName}`,
        message: `Good morning! You have an open calendar with no scheduled routines for today (${dateStr}). It's a great time to plan your day or set some wellness goals.`,
        data: {
          totalTasks: 0,
          firstTask: null,
          hydrationGoalMl: hydration.goalMl,
          completionRate: 0
        },
        actionPayload: {
          action: 'PLAN_DAY',
          prompt: 'Plan my day'
        }
      };
    }

    const firstTask = routines[0];
    const upcomingTasks = routines.filter(r => r.status !== 'completed');

    let summary = `Good morning. You have ${routines.length} scheduled task${routines.length > 1 ? 's' : ''} for today.`;
    if (firstTask) {
      summary += ` Your first activity is "${firstTask.title}" at ${firstTask.time}.`;
    }

    if (upcomingTasks.length > 0 && firstTask && upcomingTasks[0].title !== firstTask.title) {
      summary += ` Upcoming next: "${upcomingTasks[0].title}".`;
    } else if (upcomingTasks.length > 1) {
      summary += ` Upcoming next: "${upcomingTasks[1].title}".`;
    }

    if (stats.completedCount > 0) {
      summary += ` You have already completed ${stats.completedCount} task${stats.completedCount > 1 ? 's' : ''}.`;
    }

    if (hydration.totalMl < 500) {
      summary += ` Remember to stay hydrated as you begin your morning.`;
    }

    return {
      eventType: 'DAILY_BRIEFING',
      priority: 'MEDIUM',
      title: `Morning Briefing — ${dayName}`,
      message: summary,
      data: {
        totalTasks: routines.length,
        upcomingCount: upcomingTasks.length,
        completedCount: stats.completedCount,
        firstTask: firstTask ? { title: firstTask.title, time: firstTask.time } : null,
        hydration: hydration
      },
      actionPayload: {
        action: 'OPEN_SCHEDULE',
        date: dateStr
      }
    };
  }
}

module.exports = DailyBriefingEngine;
