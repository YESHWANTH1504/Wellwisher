const HealthTrendEngine = require('./healthTrendEngine');
const { AiHealthIntelligenceRepository } = require('../../../repositories/ai/aiHealthIntelligenceRepository');
const { AiProactiveEventRepository } = require('../../../repositories/ai/aiProactiveEventRepository');
const ProactiveDecisionEngine = require('../proactive/proactiveDecisionEngine');
const ProactiveScorer = require('../proactive/proactiveScorer');

class HealthTrendAlertEngine {
  /**
   * Evaluate health trends and generate proactive alerts
   */
  static async evaluateHealthAlerts(userId, userPreferences = {}, temporal = {}) {
    if (!userId) throw new Error('userId is required to evaluate health alerts.');

    // 1. Recompute or fetch latest trends
    const trends = await HealthTrendEngine.computeUserTrends(userId);
    const generatedAlerts = [];

    for (const trend of trends) {
      if (trend.trendDirection === 'INSUFFICIENT_DATA' || !trend.history || trend.history.length === 0) {
        continue;
      }

      const history = trend.history;
      const latestObs = history[history.length - 1];
      const prevObs = history.length >= 2 ? history[history.length - 2] : null;

      // A. Check for 3-Point Persistent Out-of-Range Flags
      const outOfRangeCount = history.filter(o => ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'ABNORMAL'].includes((o.flag || '').toUpperCase())).length;

      if (history.length >= 3 && outOfRangeCount >= 3) {
        const alert = {
          alertType: 'PERSISTENT_OUT_OF_RANGE',
          metric: trend.metricName,
          severity: 'HIGH',
          message: `Your ${trend.metricName} reading has been outside the reference range across ${history.length} consecutive records (latest: ${trend.latestValue} ${trend.unit}). Consider discussing this persistent trend with your doctor.`,
          evidence: history.map(h => ({ date: h.date, value: h.value, flag: h.flag, unit: h.unit })),
          sourceDocumentIds: trend.sourceDocumentIds,
          doctorQuestions: [
            `My ${trend.metricName} has remained outside the printed reference range over my last ${history.length} reports. Is further evaluation or lifestyle adjustment recommended?`
          ]
        };

        const saved = await AiHealthIntelligenceRepository.createAlert(userId, alert);
        generatedAlerts.push(saved);
        await this.dispatchProactiveHealthEvent(userId, alert, userPreferences, temporal);
        continue;
      }

      // B. Check for Repeated Out-of-Range (2 consecutive out of range)
      if (history.length >= 2 && prevObs && ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'ABNORMAL'].includes((latestObs.flag || '').toUpperCase()) && ['HIGH', 'LOW', 'CRITICAL_HIGH', 'CRITICAL_LOW', 'ABNORMAL'].includes((prevObs.flag || '').toUpperCase())) {
        const alert = {
          alertType: 'REPEATED_OUT_OF_RANGE',
          metric: trend.metricName,
          severity: 'MEDIUM',
          message: `Your ${trend.metricName} was flagged outside its reference range on two recent reports (${prevObs.value} -> ${latestObs.value} ${trend.unit}). You may want to review this pattern during your next consultation.`,
          evidence: [
            { date: prevObs.date, value: prevObs.value, flag: prevObs.flag },
            { date: latestObs.date, value: latestObs.value, flag: latestObs.flag }
          ],
          sourceDocumentIds: trend.sourceDocumentIds,
          doctorQuestions: [
            `My ${trend.metricName} was outside the reference range on my last two visits (${prevObs.value} and ${latestObs.value} ${trend.unit}). What does this pattern indicate for my care?`
          ]
        };

        const saved = await AiHealthIntelligenceRepository.createAlert(userId, alert);
        generatedAlerts.push(saved);
        await this.dispatchProactiveHealthEvent(userId, alert, userPreferences, temporal);
        continue;
      }

      // C. Check for Significant Drift (e.g. Percentage shift >= 20% on lipid/glucose/renal)
      if (trend.changePercent !== null && Math.abs(trend.changePercent) >= 20.0 && trend.observationsCount >= 2) {
        const directionWord = trend.changePercent > 0 ? 'increased' : 'decreased';
        const alert = {
          alertType: 'HEALTH_TREND_ALERT',
          metric: trend.metricName,
          severity: 'MEDIUM',
          message: `Your ${trend.metricName} has ${directionWord} by ${Math.abs(trend.changePercent)}% between reports (${trend.previousValue} to ${trend.latestValue} ${trend.unit}).`,
          evidence: [
            { previous: trend.previousValue, date: trend.previousDate },
            { latest: trend.latestValue, date: trend.latestDate, change: trend.changeValue }
          ],
          sourceDocumentIds: trend.sourceDocumentIds,
          doctorQuestions: [
            `My ${trend.metricName} changed by ${trend.changePercent}% from ${trend.previousValue} to ${trend.latestValue} ${trend.unit}. Does this change require any follow-up?`
          ]
        };

        const saved = await AiHealthIntelligenceRepository.createAlert(userId, alert);
        generatedAlerts.push(saved);
        await this.dispatchProactiveHealthEvent(userId, alert, userPreferences, temporal);
      }
    }

    return generatedAlerts;
  }

  /**
   * Dispatch alert into Proactive Event Engine with quiet hours, duplicate suppression, and fatigue protection
   */
  static async dispatchProactiveHealthEvent(userId, alert, userPreferences, temporal) {
    const candidateEvent = {
      eventType: 'HEALTH_TREND_ALERT',
      priority: alert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      title: `Health Trend: ${alert.metric}`,
      message: alert.message,
      relatedEntityType: 'HEALTH_ALERT',
      relatedEntityId: `${alert.alertType}_${alert.metric}`,
      actionType: 'NAVIGATE',
      actionPayload: { route: '/jarvis/health' }
    };

    const decision = await ProactiveDecisionEngine.evaluateEventDelivery(
      userId,
      candidateEvent,
      userPreferences,
      temporal
    );

    if (decision.shouldDeliver) {
      const score = ProactiveScorer.calculateScore({
        timeUrgency: alert.severity === 'HIGH' ? 30 : 15,
        importance: alert.severity === 'HIGH' ? 30 : 20,
        relevance: 20,
        behaviorSignal: 10,
        notificationFatigue: decision.fatiguePenalty || 0
      });

      await AiProactiveEventRepository.createEvent(userId, {
        eventType: 'HEALTH_TREND_ALERT',
        priorityScore: score.score,
        priority: score.priority,
        title: candidateEvent.title,
        message: candidateEvent.message,
        actionType: candidateEvent.actionType,
        actionPayload: candidateEvent.actionPayload,
        relatedEntityType: candidateEvent.relatedEntityType,
        relatedEntityId: candidateEvent.relatedEntityId,
        metadata: { metric: alert.metric, alertType: alert.alertType, questions: alert.doctorQuestions },
        status: 'PENDING'
      });
    }
  }

  static async evaluateHealthTrendAlerts(userId, userPreferences, temporal) {
    return this.evaluateHealthAlerts(userId, userPreferences, temporal);
  }
}

module.exports = HealthTrendAlertEngine;
