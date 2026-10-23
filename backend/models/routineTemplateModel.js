const pool = require('../config/db');

// Default routines per Phase 3 specifications
const DEFAULT_ROUTINE_DEFS = [
  // Monday-Friday (Working Day) weekday_mask = '1,2,3,4,5'
  { key: 'wk_0700_wakeup', title: 'Wake Up', weekdayMask: '1,2,3,4,5', startTime: '07:00', endTime: '07:30', category: 'sleep', eventType: 'sleep' },
  { key: 'wk_0900_breakfast', title: 'Breakfast', weekdayMask: '1,2,3,4,5', startTime: '09:00', endTime: '09:30', category: 'meal', eventType: 'meal' },
  { key: 'wk_1000_commute', title: 'Login / Commute to Office', weekdayMask: '1,2,3,4,5', startTime: '10:00', endTime: '10:30', category: 'work', eventType: 'commute' },
  { key: 'wk_1200_tea', title: 'Hydration / Tea Break', weekdayMask: '1,2,3,4,5', startTime: '12:00', endTime: '12:15', category: 'break', eventType: 'break' },
  { key: 'wk_1300_lunch', title: 'Lunch Break', weekdayMask: '1,2,3,4,5', startTime: '13:00', endTime: '14:00', category: 'meal', eventType: 'meal' },
  { key: 'wk_1600_snacks', title: 'Evening Snacks', weekdayMask: '1,2,3,4,5', startTime: '16:00', endTime: '16:20', category: 'meal', eventType: 'meal' },
  { key: 'wk_1800_logout', title: 'Logout', weekdayMask: '1,2,3,4,5', startTime: '18:00', endTime: '18:30', category: 'work', eventType: 'work' },
  { key: 'wk_1900_exercise', title: 'Exercise', weekdayMask: '1,2,3,4,5', startTime: '19:00', endTime: '20:00', category: 'exercise', eventType: 'exercise' },
  { key: 'wk_2100_dinner', title: 'Dinner', weekdayMask: '1,2,3,4,5', startTime: '21:00', endTime: '21:45', category: 'meal', eventType: 'meal' },
  { key: 'wk_2200_sleep', title: 'Sleep', weekdayMask: '1,2,3,4,5', startTime: '22:00', endTime: '06:00', category: 'sleep', eventType: 'sleep' },

  // Saturday weekday_mask = '6'
  { key: 'sat_0800_wakeup', title: 'Wake Up', weekdayMask: '6', startTime: '08:00', endTime: '08:30', category: 'sleep', eventType: 'sleep' },
  { key: 'sat_0900_breakfast', title: 'Breakfast', weekdayMask: '6', startTime: '09:00', endTime: '09:30', category: 'meal', eventType: 'meal' },
  { key: 'sat_1000_household', title: 'Personal / Household Tasks', weekdayMask: '6', startTime: '10:00', endTime: '12:00', category: 'personal', eventType: 'task' },
  { key: 'sat_1230_hydration', title: 'Hydration Break', weekdayMask: '6', startTime: '12:30', endTime: '12:45', category: 'break', eventType: 'break' },
  { key: 'sat_1300_lunch', title: 'Lunch', weekdayMask: '6', startTime: '13:00', endTime: '14:00', category: 'meal', eventType: 'meal' },
  { key: 'sat_1600_freetime', title: 'Free Time', weekdayMask: '6', startTime: '16:00', endTime: '17:30', category: 'personal', eventType: 'personal' },
  { key: 'sat_1800_outdoor', title: 'Outdoor Activity / Exercise', weekdayMask: '6', startTime: '18:00', endTime: '19:30', category: 'exercise', eventType: 'exercise' },
  { key: 'sat_2030_dinner', title: 'Dinner', weekdayMask: '6', startTime: '20:30', endTime: '21:30', category: 'meal', eventType: 'meal' },
  { key: 'sat_2230_relax', title: 'Relax', weekdayMask: '6', startTime: '22:30', endTime: '23:00', category: 'personal', eventType: 'personal' },
  { key: 'sat_2300_sleep', title: 'Sleep', weekdayMask: '6', startTime: '23:00', endTime: '07:30', category: 'sleep', eventType: 'sleep' },

  // Sunday weekday_mask = '0'
  { key: 'sun_0800_wakeup', title: 'Wake Up', weekdayMask: '0', startTime: '08:00', endTime: '08:30', category: 'sleep', eventType: 'sleep' },
  { key: 'sun_0900_breakfast', title: 'Breakfast', weekdayMask: '0', startTime: '09:00', endTime: '09:30', category: 'meal', eventType: 'meal' },
  { key: 'sun_1000_family', title: 'Personal / Family Time', weekdayMask: '0', startTime: '10:00', endTime: '12:00', category: 'personal', eventType: 'personal' },
  { key: 'sun_1230_hydration', title: 'Hydration Break', weekdayMask: '0', startTime: '12:30', endTime: '12:45', category: 'break', eventType: 'break' },
  { key: 'sun_1300_lunch', title: 'Lunch', weekdayMask: '0', startTime: '13:00', endTime: '14:00', category: 'meal', eventType: 'meal' },
  { key: 'sun_1600_planning', title: 'Planning / Preparation', weekdayMask: '0', startTime: '16:00', endTime: '17:30', category: 'personal', eventType: 'task' },
  { key: 'sun_1800_exercise', title: 'Exercise / Walk', weekdayMask: '0', startTime: '18:00', endTime: '19:15', category: 'exercise', eventType: 'exercise' },
  { key: 'sun_2000_dinner', title: 'Dinner', weekdayMask: '0', startTime: '20:00', endTime: '21:00', category: 'meal', eventType: 'meal' },
  { key: 'sun_2100_prep', title: 'Prepare for Monday', weekdayMask: '0', startTime: '21:00', endTime: '21:45', category: 'personal', eventType: 'task' },
  { key: 'sun_2200_sleep', title: 'Sleep', weekdayMask: '0', startTime: '22:00', endTime: '06:30', category: 'sleep', eventType: 'sleep' }
];

class RoutineTemplateModel {
  static async getByUser(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM routine_templates 
       WHERE user_id = ? AND deleted_at IS NULL 
       ORDER BY start_time ASC`,
      [userId]
    );
    return rows;
  }

  static async getActiveByUser(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM routine_templates 
       WHERE user_id = ? AND enabled = 1 AND deleted_at IS NULL 
       ORDER BY start_time ASC`,
      [userId]
    );
    return rows;
  }

  static async getById(id, userId) {
    if (!userId) return null;
    const [rows] = await pool.query(
      `SELECT * FROM routine_templates 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, userId]
    );
    return rows[0] || null;
  }

  static async getByWeekday(userId, weekdayNumber) {
    if (!userId) return [];
    const templates = await this.getActiveByUser(userId);
    const dayStr = String(weekdayNumber);
    return templates.filter(t => {
      const masks = t.weekday_mask.split(',').map(s => s.trim());
      return masks.includes(dayStr);
    });
  }

  static async create(itemData) {
    const { id, userId, title, weekdayMask, startTime, endTime, category, eventType, enabled, reminderEnabled, reminderOffset, recurrenceRule, timezone } = itemData;
    if (!userId) throw new Error('Cannot create routine template without authenticated userId');
    const templateId = id || `tmpl_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    await pool.query(
      `INSERT INTO routine_templates 
       (id, user_id, title, weekday_mask, start_time, end_time, category, event_type, enabled, reminder_enabled, reminder_offset, recurrence_rule, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        templateId,
        userId,
        title,
        weekdayMask || '1,2,3,4,5',
        startTime,
        endTime || null,
        category || 'routine',
        eventType || 'routine',
        enabled !== undefined ? (enabled ? 1 : 0) : 1,
        reminderEnabled !== undefined ? (reminderEnabled ? 1 : 0) : 1,
        reminderOffset || 0,
        recurrenceRule || 'WEEKLY',
        timezone || 'UTC'
      ]
    );
    return this.getById(templateId, userId);
  }

  static async update(id, userId, updateData) {
    if (!userId) throw new Error('Cannot update routine template without authenticated userId');
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const title = updateData.title !== undefined ? updateData.title : existing.title;
    const weekdayMask = updateData.weekdayMask !== undefined ? updateData.weekdayMask : existing.weekday_mask;
    const startTime = updateData.startTime !== undefined ? updateData.startTime : existing.start_time;
    const endTime = updateData.endTime !== undefined ? updateData.endTime : existing.end_time;
    const category = updateData.category !== undefined ? updateData.category : existing.category;
    const eventType = updateData.eventType !== undefined ? updateData.eventType : existing.event_type;
    const enabled = updateData.enabled !== undefined ? (updateData.enabled ? 1 : 0) : existing.enabled;
    const reminderEnabled = updateData.reminderEnabled !== undefined ? (updateData.reminderEnabled ? 1 : 0) : existing.reminder_enabled;
    const reminderOffset = updateData.reminderOffset !== undefined ? updateData.reminderOffset : existing.reminder_offset;
    const recurrenceRule = updateData.recurrenceRule !== undefined ? updateData.recurrenceRule : existing.recurrence_rule;
    const timezone = updateData.timezone !== undefined ? updateData.timezone : existing.timezone;

    await pool.query(
      `UPDATE routine_templates 
       SET title = ?, weekday_mask = ?, start_time = ?, end_time = ?, category = ?, event_type = ?, enabled = ?, reminder_enabled = ?, reminder_offset = ?, recurrence_rule = ?, timezone = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [title, weekdayMask, startTime, endTime, category, eventType, enabled, reminderEnabled, reminderOffset, recurrenceRule, timezone, id, userId]
    );
    return this.getById(id, userId);
  }

  static async softDelete(id, userId) {
    if (!userId) throw new Error('Cannot delete routine template without authenticated userId');
    const [result] = await pool.query(
      `UPDATE routine_templates SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Idempotent initialization of default routines.
   * Running 1 time or 10,000 times produces exactly the same set of templates.
   * Deterministic ID: tmpl_${userId}_${def.key}
   */
  static async initializeDefaultRoutines(userId, timezone = 'UTC') {
    if (!userId) return [];
    
    // Check existing templates for this user
    const existing = await this.getByUser(userId);
    const existingIds = new Set(existing.map(t => t.id));

    const created = [];
    for (const def of DEFAULT_ROUTINE_DEFS) {
      const templateId = `tmpl_${userId}_${def.key}`;
      if (!existingIds.has(templateId)) {
        await pool.query(
          `INSERT IGNORE INTO routine_templates 
           (id, user_id, title, weekday_mask, start_time, end_time, category, event_type, enabled, reminder_enabled, reminder_offset, recurrence_rule, timezone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 'WEEKLY', ?)`,
          [
            templateId,
            userId,
            def.title,
            def.weekdayMask,
            def.startTime,
            def.endTime,
            def.category,
            def.eventType,
            timezone
          ]
        );
      }
    }

    return await this.getByUser(userId);
  }
}

module.exports = RoutineTemplateModel;
