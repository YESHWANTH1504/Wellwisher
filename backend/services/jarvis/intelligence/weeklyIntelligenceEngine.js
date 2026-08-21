const pool = require('../../../config/db');

class WeeklyIntelligenceEngine {
  /**
   * Generate 7-day personal productivity and wellness summary
   */
  static async generateWeeklySummary(userId) {
    if (!userId) throw new Error('userId is required');

    // 1. Fetch routines over the last 7 days
    const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [routines] = await pool.query(
      'SELECT * FROM routines WHERE user_id = ? AND date >= ?',
      [userId, sinceDate]
    );

    const total = routines ? routines.length : 0;
    const completed = (routines || []).filter(r => r.status === 'completed').length;
    const missed = (routines || []).filter(r => r.status === 'missed').length;
    const snoozed = (routines || []).filter(r => r.status === 'snoozed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    // 2. Fetch hydration consistency over last 7 days
    let avgHydrationMl = 0;
    try {
      const [hydRows] = await pool.query(
        'SELECT COALESCE(AVG(daily_total), 0) AS avg_ml FROM (SELECT SUM(amount_ml) AS daily_total FROM hydration_logs WHERE user_id = ? AND date >= ? GROUP BY date) as daily_hyd',
        [userId, sinceDate]
      );
      avgHydrationMl = Math.round(Number(hydRows[0]?.avg_ml || 0));
    } catch (_) {}

    // 3. Formulate summary recommendations
    const insights = [];
    if (completionRate >= 80) {
      insights.push('Outstanding routine consistency! You maintained over 80% task completion this week.');
    } else if (completionRate < 50 && total > 0) {
      insights.push('Consider spacing your tasks across broader free-time windows to reduce schedule overload.');
    }

    if (avgHydrationMl >= 2000) {
      insights.push(`Great hydration habit with an average of ${avgHydrationMl} ml logged per day.`);
    }

    return {
      userId,
      period: 'LAST_7_DAYS',
      stats: {
        totalRoutines: total,
        completedRoutines: completed,
        missedRoutines: missed,
        postponedRoutines: snoozed,
        completionRatePercentage: completionRate,
        averageDailyHydrationMl: avgHydrationMl
      },
      insights,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = WeeklyIntelligenceEngine;
