const ProactiveContextBuilder = require('./proactiveContextBuilder');
const SmartReminderEngine = require('./smartReminderEngine');
const DailyBriefingEngine = require('./dailyBriefingEngine');
const EveningSummaryEngine = require('./eveningSummaryEngine');
const ProactiveInsightEngine = require('./proactiveInsightEngine');
const ProactiveDecisionEngine = require('./proactiveDecisionEngine');
const BehaviorPatternEngine = require('./behaviorPatternEngine');
const { AiProactiveEventRepository } = require('../../../repositories/ai/aiProactiveEventRepository');
const notificationService = require('./notificationService');

class ProactiveEngine {
  /**
   * Evaluate and generate active proactive events for a user
   */
  static async evaluateUser(userId, { baseDate = new Date() } = {}) {
    if (!userId) throw new Error('userId is required');

    // 1. Build rich context
    const context = await ProactiveContextBuilder.buildContext(userId, { baseDate });
    const { preferences, temporal, routines } = context;

    // 2. Safe behavioral habit learning
    await BehaviorPatternEngine.analyzeAndRecordPatterns(userId, routines);

    // 3. Gather candidate proactive items
    const recentCount = await AiProactiveEventRepository.getRecentEventCount(userId, 60);
    const candidates = [];

    // Reminders
    const reminders = SmartReminderEngine.evaluateReminders(context, recentCount);
    candidates.push(...reminders);

    // Insights
    const insights = ProactiveInsightEngine.generateInsights(context);
    candidates.push(...insights);

    // 4. Process and filter candidates through Decision Engine
    const approvedEvents = [];

    for (const candidate of candidates) {
      const decision = await ProactiveDecisionEngine.evaluateEventDelivery(
        userId,
        candidate,
        preferences,
        temporal
      );

      if (decision.shouldDeliver) {
        // Persist event in database
        const savedEvent = await AiProactiveEventRepository.createEvent(userId, {
          eventType: candidate.eventType,
          priority: candidate.priority,
          title: candidate.title,
          message: candidate.message,
          relatedEntityType: candidate.relatedEntityType,
          relatedEntityId: candidate.relatedEntityId,
          actionPayload: candidate.actionPayload,
          metadata: candidate.metadata,
          status: 'PENDING'
        });

        // Send push notification if configured
        await notificationService.sendNotification(userId, savedEvent);

        approvedEvents.push(savedEvent);
      }
    }

    return {
      userId,
      evaluatedCount: candidates.length,
      deliveredEvents: approvedEvents,
      activeFeed: await AiProactiveEventRepository.getActiveFeed(userId, { limit: 10 })
    };
  }

  /**
   * Get morning daily briefing
   */
  static async getDailyBriefing(userId, { baseDate = new Date() } = {}) {
    const context = await ProactiveContextBuilder.buildContext(userId, { baseDate });
    return DailyBriefingEngine.generateBriefing(context);
  }

  /**
   * Get evening summary
   */
  static async getEveningSummary(userId, { baseDate = new Date() } = {}) {
    const context = await ProactiveContextBuilder.buildContext(userId, { baseDate });
    return EveningSummaryEngine.generateSummary(context);
  }
}

module.exports = ProactiveEngine;
