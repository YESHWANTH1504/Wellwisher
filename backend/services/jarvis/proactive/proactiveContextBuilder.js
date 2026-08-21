const TemporalContext = require('../context/temporalContext');
const RoutineModel = require('../../../models/routineModel');
const { AiPreferenceRepository } = require('../../../repositories/ai/aiPreferenceRepository');
const { AiMemoryRepository } = require('../../../repositories/ai/aiMemoryRepository');
const pool = require('../../../config/db');

class ProactiveContextBuilder {
  /**
   * Build complete proactive evaluation context for user
   */
  static async buildContext(userId, { baseDate = new Date() } = {}) {
    if (!userId) throw new Error('userId is required');

    // 1. Fetch user AI preferences
    const preferences = await AiPreferenceRepository.getPreferences(userId);
    const timezone = preferences.languagePreference || 'UTC'; // Or user configured timezone

    // 2. Resolve temporal context
    const temporal = TemporalContext.resolve(timezone, baseDate);
    const today = temporal.currentDate;

    // 3. Fetch today's routines
    const routines = await RoutineModel.getByDate(userId, today);

    // 4. Calculate schedule breakdown
    const completed = routines.filter(r => r.status === 'completed');
    const upcoming = routines.filter(r => r.status === 'upcoming' || r.status === 'snoozed');
    const missed = routines.filter(r => r.status === 'missed');

    // Parse routine times into relative minutes from current time
    const parsedRoutines = routines.map(r => {
      const diffMinutes = this._calculateTimeDiffMinutes(r.time, temporal.currentTime);
      return {
        ...r,
        diffMinutes,
        isOverdue: diffMinutes < -15 && r.status !== 'completed',
        isUpcomingSoon: diffMinutes >= 0 && diffMinutes <= 35 && r.status !== 'completed',
        isDueNow: Math.abs(diffMinutes) <= 10 && r.status !== 'completed'
      };
    });

    // 5. Fetch recent memories
    const memories = await AiMemoryRepository.getMemoriesByUser(userId, { limit: 15 });

    // 6. Fetch hydration summary
    let hydration = { totalMl: 0, goalMl: 2500 };
    try {
      const [hydRows] = await pool.query(
        'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
        [userId, today]
      );
      hydration.totalMl = Number(hydRows[0]?.total_ml || 0);
    } catch (_) {}

    return {
      userId,
      temporal,
      preferences,
      routines: parsedRoutines,
      completedRoutines: completed,
      upcomingRoutines: upcoming,
      missedRoutines: missed,
      memories,
      hydration,
      stats: {
        total: routines.length,
        completedCount: completed.length,
        upcomingCount: upcoming.length,
        missedCount: missed.length,
        completionRate: routines.length > 0 ? Math.round((completed.length / routines.length) * 100) : 0
      }
    };
  }

  static _calculateTimeDiffMinutes(routineTimeStr, currentTimeStr) {
    try {
      const parseTime = (str) => {
        const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const isPm = match[3].toUpperCase() === 'PM';
        if (isPm && h < 12) h += 12;
        if (!isPm && h === 12) h = 0;
        return h * 60 + m;
      };

      const rMins = parseTime(routineTimeStr);
      const cMins = parseTime(currentTimeStr);
      return rMins - cMins;
    } catch {
      return 999;
    }
  }
}

module.exports = ProactiveContextBuilder;
