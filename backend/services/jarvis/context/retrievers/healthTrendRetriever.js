const { AiHealthIntelligenceRepository } = require('../../../../repositories/ai/aiHealthIntelligenceRepository');
const HealthTrendEngine = require('../../health/healthTrendEngine');
const { CONTEXT_SOURCE_LIMITS } = require('../contextSources');

class HealthTrendRetriever {
  /**
   * Retrieve bounded health trend and alert context
   */
  static async retrieve(userId, options = {}) {
    if (!userId) return null;

    try {
      const maxTrends = CONTEXT_SOURCE_LIMITS.MAX_HEALTH_TRENDS || 5;
      const maxAlerts = CONTEXT_SOURCE_LIMITS.MAX_HEALTH_ALERTS || 5;

      let trends = await AiHealthIntelligenceRepository.getTrends(userId);
      if (trends.length === 0) {
        trends = await HealthTrendEngine.computeUserTrends(userId);
      }

      const activeAlerts = await AiHealthIntelligenceRepository.getActiveAlerts(userId);

      const boundedTrends = trends
        .filter(t => t.trendDirection !== 'INSUFFICIENT_DATA')
        .slice(0, maxTrends)
        .map(t => ({
          metric: t.metricName,
          previous: t.previousValue,
          latest: t.latestValue,
          unit: t.unit,
          change: t.changeValue,
          direction: t.trendDirection
        }));

      const boundedAlerts = activeAlerts.slice(0, maxAlerts).map(a => ({
        type: a.alertType,
        metric: a.metric,
        severity: a.severity,
        message: a.message
      }));

      return {
        hasHealthTrends: boundedTrends.length > 0 || boundedAlerts.length > 0,
        trends: boundedTrends,
        alerts: boundedAlerts,
        totalTrendsCount: trends.length,
        totalAlertsCount: activeAlerts.length
      };
    } catch (err) {
      console.warn('HealthTrendRetriever warning:', err.message);
      return { hasHealthTrends: false, trends: [], alerts: [], error: err.message };
    }
  }
}

module.exports = HealthTrendRetriever;
