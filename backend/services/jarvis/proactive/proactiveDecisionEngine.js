const { AiProactiveEventRepository } = require('../../../repositories/ai/aiProactiveEventRepository');

const FREQUENCY_LIMITS = {
  LOW: { maxPerHour: 2, maxPerDay: 6, minCooldownMins: 10 },
  BALANCED: { maxPerHour: 4, maxPerDay: 12, minCooldownMins: 5 },
  HIGH: { maxPerHour: 8, maxPerDay: 20, minCooldownMins: 2 }
};

class ProactiveDecisionEngine {
  /**
   * Evaluate whether a candidate proactive event should be delivered to the user
   */
  static async evaluateEventDelivery(userId, candidateEvent, userPreferences = {}, temporal = {}) {
    const proactiveEnabled = userPreferences.proactiveAssistanceEnabled !== false;
    if (!proactiveEnabled) {
      return { shouldDeliver: false, reason: 'PROACTIVE_ASSISTANCE_DISABLED' };
    }

    // 1. Check Quiet Hours
    if (userPreferences.quietHoursEnabled) {
      const inQuietHours = this.isWithinQuietHours(
        temporal.currentTime || '12:00',
        userPreferences.quietHoursStart || '22:00',
        userPreferences.quietHoursEnd || '07:00'
      );

      if (inQuietHours && candidateEvent.priority !== 'CRITICAL') {
        return { shouldDeliver: false, reason: 'QUIET_HOURS_ACTIVE' };
      }
    }

    // 2. Check Specific Feature Toggles (default to true if not explicitly false)
    const dailyEnabled = userPreferences.dailyBriefingEnabled !== false;
    const eveningEnabled = userPreferences.eveningSummaryEnabled !== false;
    const remindersEnabled = userPreferences.proactiveRemindersEnabled !== false;

    if (candidateEvent.eventType === 'DAILY_BRIEFING' && !dailyEnabled) {
      return { shouldDeliver: false, reason: 'DAILY_BRIEFING_DISABLED' };
    }
    if (candidateEvent.eventType === 'EVENING_SUMMARY' && !eveningEnabled) {
      return { shouldDeliver: false, reason: 'EVENING_SUMMARY_DISABLED' };
    }
    if (['UPCOMING_TASK', 'TASK_DUE', 'OVERDUE_TASK', 'MISSED_TASK'].includes(candidateEvent.eventType) && !remindersEnabled) {
      return { shouldDeliver: false, reason: 'PROACTIVE_REMINDERS_DISABLED' };
    }

    // 3. Duplicate Suppression (check if an active pending event already exists for this entity)
    if (candidateEvent.relatedEntityId) {
      const existing = await AiProactiveEventRepository.findPendingForEntity(
        userId,
        candidateEvent.eventType,
        candidateEvent.relatedEntityType,
        candidateEvent.relatedEntityId
      );
      if (existing) {
        return { shouldDeliver: false, reason: 'DUPLICATE_EVENT_PENDING', existingId: existing.id };
      }
    }

    // 4. Rate Limiting & Notification Fatigue
    const freq = (userPreferences.notificationFrequency || 'BALANCED').toUpperCase();
    const limits = FREQUENCY_LIMITS[freq] || FREQUENCY_LIMITS.BALANCED;

    const recentHourCount = await AiProactiveEventRepository.getRecentEventCount(userId, 60);
    if (recentHourCount >= limits.maxPerHour && candidateEvent.priority !== 'CRITICAL') {
      return { shouldDeliver: false, reason: 'HOURLY_RATE_LIMIT_EXCEEDED' };
    }

    const recentDayCount = await AiProactiveEventRepository.getRecentEventCount(userId, 24 * 60);
    if (recentDayCount >= limits.maxPerDay && candidateEvent.priority !== 'CRITICAL') {
      return { shouldDeliver: false, reason: 'DAILY_RATE_LIMIT_EXCEEDED' };
    }

    return { shouldDeliver: true };
  }

  /**
   * Check if given time falls in quiet hours window (e.g. 22:00 to 07:00)
   */
  static isWithinQuietHours(currentTimeStr, quietStartStr, quietEndStr) {
    const parseMins = (str) => {
      if (!str) return 0;
      if (str.includes(':')) {
        const parts = str.split(':');
        let h = parseInt(parts[0], 10);
        let m = parseInt(parts[1], 10);
        if (str.toLowerCase().includes('pm') && h < 12) h += 12;
        if (str.toLowerCase().includes('am') && h === 12) h = 0;
        return h * 60 + m;
      }
      return 0;
    };

    const currentMins = parseMins(currentTimeStr);
    const startMins = parseMins(quietStartStr);
    const endMins = parseMins(quietEndStr);

    if (startMins > endMins) {
      // Crosses midnight, e.g. 22:00 (1320) to 07:00 (420)
      return currentMins >= startMins || currentMins < endMins;
    } else {
      return currentMins >= startMins && currentMins < endMins;
    }
  }
}

module.exports = ProactiveDecisionEngine;
