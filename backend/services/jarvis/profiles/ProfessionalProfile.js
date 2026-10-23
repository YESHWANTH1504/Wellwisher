const pool = require('../../../config/db');
const RoutineModel = require('../../../models/routineModel');

class ProfessionalProfile {
  /**
   * Retrieve working professional briefing: calendar meetings, scheduled work slots, and focus time
   */
  static async getWorkdayBriefing(userId, targetDate = null) {
    if (!userId) throw new Error('userId is required');
    const today = targetDate || new Date().toISOString().split('T')[0];

    const routines = await RoutineModel.getByDate(userId, today);
    const meetings = routines.filter(r => {
      const t = (r.title || '').toLowerCase();
      const c = (r.category || '').toLowerCase();
      return t.includes('meet') || t.includes('sync') || t.includes('call') || c.includes('work') || c.includes('office');
    });

    const focusSlots = routines.filter(r => {
      const t = (r.title || '').toLowerCase();
      return t.includes('focus') || t.includes('deep work') || t.includes('code') || t.includes('review');
    });

    return {
      date: today,
      totalScheduleItems: routines.length,
      meetings,
      focusSlots,
      allRoutines: routines
    };
  }

  /**
   * Plan a quick focus block
   */
  static async planFocusBlock(userId, { title = 'Deep Focus Session', time = '02:00 PM', durationMinutes = 60 } = {}) {
    const today = new Date().toISOString().split('T')[0];
    return await RoutineModel.create({
      userId,
      title,
      time,
      date: today,
      category: 'work',
      description: `Focus duration: ${durationMinutes} minutes`
    });
  }
}

module.exports = ProfessionalProfile;
