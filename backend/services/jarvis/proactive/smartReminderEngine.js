const ProactiveScorer = require('./proactiveScorer');

class SmartReminderEngine {
  /**
   * Evaluate schedule context and generate intelligent reminder candidates
   */
  static evaluateReminders(context, recentCount = 0) {
    const candidates = [];
    const { routines } = context;

    for (const routine of routines) {
      if (routine.status === 'completed') continue;

      const diff = routine.diffMinutes;

      // 1. Due Right Now (-5 to +5 mins)
      if (diff >= -5 && diff <= 5) {
        const scoreObj = ProactiveScorer.scoreUpcomingRoutine(routine, recentCount);
        candidates.push({
          eventType: 'TASK_DUE',
          priority: scoreObj.priority,
          title: `Starting Now: ${routine.title}`,
          message: `"${routine.title}" is scheduled for ${routine.time}. Ready to begin?`,
          relatedEntityType: 'routine',
          relatedEntityId: routine.id,
          actionPayload: {
            action: 'VIEW_ROUTINE',
            routineId: routine.id,
            time: routine.time
          },
          metadata: { score: scoreObj.score, diffMinutes: diff }
        });
        continue;
      }

      // 2. Upcoming Soon (15 to 30 mins window)
      if (diff > 5 && diff <= 30) {
        const scoreObj = ProactiveScorer.scoreUpcomingRoutine(routine, recentCount);
        candidates.push({
          eventType: 'UPCOMING_TASK',
          priority: scoreObj.priority,
          title: `Upcoming: ${routine.title}`,
          message: `"${routine.title}" starts in ${diff} minutes (at ${routine.time}).`,
          relatedEntityType: 'routine',
          relatedEntityId: routine.id,
          actionPayload: {
            action: 'VIEW_ROUTINE',
            routineId: routine.id,
            time: routine.time
          },
          metadata: { score: scoreObj.score, diffMinutes: diff }
        });
        continue;
      }

      // 3. Overdue (Past by 15+ mins without completion)
      if (diff < -15 && diff >= -180 && routine.status !== 'missed') {
        const scoreObj = ProactiveScorer.scoreOverdueRoutine(routine, recentCount);
        candidates.push({
          eventType: 'OVERDUE_TASK',
          priority: scoreObj.priority,
          title: `Pending: ${routine.title}`,
          message: `You haven't marked "${routine.title}" as completed yet. Would you like to complete or reschedule it?`,
          relatedEntityType: 'routine',
          relatedEntityId: routine.id,
          actionPayload: {
            action: 'PROMPT_RESCHEDULE_OR_COMPLETE',
            routineId: routine.id,
            title: routine.title
          },
          metadata: { score: scoreObj.score, diffMinutes: diff }
        });
      }
    }

    return candidates;
  }
}

module.exports = SmartReminderEngine;
