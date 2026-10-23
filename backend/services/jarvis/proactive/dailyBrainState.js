const CalendarService = require('../integrations/calendarService');
const { AiHealthIntelligenceRepository } = require('../../../repositories/ai/aiHealthIntelligenceRepository');
const { AiDocumentRepository } = require('../../../repositories/ai/aiDocumentRepository');
const MemoryRetriever = require('../context/retrievers/memoryRetriever');

/**
 * JARVIS Daily Brain State Matrix
 * Synthesizes a unified daily context snapshot with 5-tier attention scoring:
 * URGENT, IMPORTANT, RELEVANT, OPTIONAL, IGNORE
 */
class DailyBrainState {
  /**
   * Synthesizes the current daily state for a user
   */
  static async getDailyState(userId, timezone = 'UTC') {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Calendar & Schedule
    let events = [];
    try {
      events = await CalendarService.getEvents(userId, todayStr);
    } catch (_) {}

    // 2. Pending & Overdue items
    const nowMinutes = CalendarService.parseTimeToMinutes(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone })
    );

    const pendingTasks = [];
    const overdueTasks = [];
    const upcomingEvents = [];

    for (const ev of events) {
      const evMinutes = CalendarService.parseTimeToMinutes(ev.time);
      if (ev.status === 'completed') continue;

      if (evMinutes < nowMinutes - 30) {
        overdueTasks.push(ev);
      } else if (evMinutes >= nowMinutes && evMinutes <= nowMinutes + 90) {
        upcomingEvents.push(ev);
      } else {
        pendingTasks.push(ev);
      }
    }

    // 3. Health Trends & Alerts
    let healthAlerts = [];
    try {
      const trends = await AiHealthIntelligenceRepository.getMetricHistory(userId, 'HEART_RATE', 7);
      if (trends && trends.length > 0) {
        const anomalies = trends.filter(t => t.anomaly_detected || t.status === 'ALERT');
        healthAlerts = anomalies.map(a => ({
          metric: a.metric_type || 'Vitals',
          value: a.metric_value,
          message: a.summary || 'Elevated reading detected'
        }));
      }
    } catch (_) {}

    // 4. Documents Requiring Attention
    let unreadDocs = [];
    try {
      const docs = await AiDocumentRepository.listDocuments(userId, { limit: 5 });
      if (docs) {
        unreadDocs = docs.filter(d => d.status === 'PROCESSED');
      }
    } catch (_) {}

    // 5. Semantic Memory Highlights
    let memories = [];
    try {
      const memRes = await MemoryRetriever.retrieve(userId, 'daily habits preferences goals', { limit: 5 });
      memories = memRes.memories || [];
    } catch (_) {}

    // 6. Attention Prioritization Engine (URGENT / IMPORTANT / RELEVANT / OPTIONAL / IGNORE)
    const prioritizedAttention = [];

    // Overdue tasks -> URGENT / IMPORTANT
    for (const ot of overdueTasks) {
      prioritizedAttention.push({
        tier: ot.category === 'medication' ? 'URGENT' : 'IMPORTANT',
        title: `Overdue: ${ot.title}`,
        time: ot.time,
        source: 'TASK'
      });
    }

    // Imminent events (in next 90 min) -> URGENT / IMPORTANT
    for (const ue of upcomingEvents) {
      prioritizedAttention.push({
        tier: 'URGENT',
        title: `Upcoming: ${ue.title}`,
        time: ue.time,
        source: 'CALENDAR'
      });
    }

    // Health alerts -> IMPORTANT
    for (const ha of healthAlerts) {
      prioritizedAttention.push({
        tier: 'IMPORTANT',
        title: `Health Notice: ${ha.metric}`,
        message: ha.message,
        source: 'HEALTH'
      });
    }

    // Unread documents -> RELEVANT
    for (const ud of unreadDocs) {
      prioritizedAttention.push({
        tier: 'RELEVANT',
        title: `Document: ${ud.title || 'New medical report'}`,
        source: 'DOCUMENT'
      });
    }

    // Standard pending -> OPTIONAL
    for (const pt of pendingTasks) {
      prioritizedAttention.push({
        tier: 'OPTIONAL',
        title: pt.title,
        time: pt.time,
        source: 'TASK'
      });
    }

    return {
      date: todayStr,
      timezone,
      summary: {
        totalEvents: events.length,
        pendingCount: pendingTasks.length,
        overdueCount: overdueTasks.length,
        imminentCount: upcomingEvents.length,
        healthAlertCount: healthAlerts.length
      },
      attentionFeed: prioritizedAttention,
      events,
      upcomingEvents,
      overdueTasks,
      healthAlerts,
      unreadDocs,
      memories
    };
  }

  /**
   * Generates a conversational daily focus summary
   */
  static async getDailyFocusSummary(userId, timezone = 'UTC') {
    const state = await this.getDailyState(userId, timezone);
    const urgent = state.attentionFeed.filter(a => a.tier === 'URGENT');
    const important = state.attentionFeed.filter(a => a.tier === 'IMPORTANT');

    const totalKeyItems = urgent.length + important.length;
    let focusSpeech = '';

    if (totalKeyItems === 0) {
      focusSpeech = `You have a clear schedule today with no urgent tasks or health alerts. Everything is running smoothly.`;
    } else {
      const topItems = [...urgent, ...important].slice(0, 3).map(i => i.title).join(', ');
      focusSpeech = `You have ${totalKeyItems} important ${totalKeyItems === 1 ? 'item' : 'items'} requiring your attention today: ${topItems}.`;
    }

    return {
      state,
      focusSpeech,
      urgentCount: urgent.length,
      importantCount: important.length
    };
  }
}

module.exports = DailyBrainState;
