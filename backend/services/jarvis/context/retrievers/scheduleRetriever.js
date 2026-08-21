const RoutineModel = require('../../../../models/routineModel');

class ScheduleRetriever {
  /**
   * Retrieve today's and upcoming schedules within a bounded time window
   */
  static async retrieve(userId, temporal, { includeUpcoming = true, upcomingDays = 2 } = {}) {
    const today = temporal.currentDate;

    // 1. Fetch Today's routines
    const todayRoutines = await RoutineModel.getByDate(userId, today);

    // 2. Fetch upcoming routines
    const upcomingRoutines = [];
    if (includeUpcoming) {
      for (let i = 1; i <= upcomingDays; i++) {
        const targetDate = new Date(new Date(`${today}T12:00:00Z`).getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        const nextDayRoutines = await RoutineModel.getByDate(userId, targetDate);
        if (nextDayRoutines.length > 0) {
          upcomingRoutines.push(...nextDayRoutines);
        }
      }
    }

    return {
      todayDate: today,
      todayCount: todayRoutines.length,
      todayRoutines,
      upcomingCount: upcomingRoutines.length,
      upcomingRoutines
    };
  }
}

module.exports = ScheduleRetriever;
