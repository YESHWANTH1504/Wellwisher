const ProactiveEngine = require('../proactiveEngine');

class ReminderEvaluationJob {
  static async evaluate(userId) {
    return await ProactiveEngine.evaluateUser(userId);
  }
}

class DailyBriefingJob {
  static async execute(userId) {
    return await ProactiveEngine.getDailyBriefing(userId);
  }
}

class EveningSummaryJob {
  static async execute(userId) {
    return await ProactiveEngine.getEveningSummary(userId);
  }
}

class CleanupProactiveEventsJob {
  static async cleanupExpiredEvents() {
    // In production, marks events past expires_at as EXPIRED
    return { cleanedCount: 0 };
  }
}

module.exports = {
  ReminderEvaluationJob,
  DailyBriefingJob,
  EveningSummaryJob,
  CleanupProactiveEventsJob
};
