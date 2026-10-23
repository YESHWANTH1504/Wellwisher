const pool = require('../config/db');

class RoutineModel {
  static async getByDate(userId, dateStr) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM routines 
       WHERE user_id = ? 
         AND date = ? 
         AND deleted_at IS NULL 
       ORDER BY time ASC`,
      [userId, dateStr]
    );
    return rows;
  }

  static async getByDateRange(userId, startDateStr, endDateStr) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM routines 
       WHERE user_id = ? 
         AND date >= ? 
         AND date <= ? 
         AND deleted_at IS NULL 
       ORDER BY date ASC, time ASC`,
      [userId, startDateStr, endDateStr]
    );
    return rows;
  }

  static async getAll(userId) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM routines 
       WHERE user_id = ? 
         AND deleted_at IS NULL 
       ORDER BY date ASC, time ASC`,
      [userId]
    );
    return rows;
  }

  static async delete(id, userId) {
    return await this.softDelete(id, userId);
  }

  static async getByTemplateAndDate(userId, templateId, dateStr) {
    if (!userId || !templateId) return null;
    const [rows] = await pool.query(
      `SELECT * FROM routines 
       WHERE user_id = ? 
         AND template_id = ? 
         AND date = ? 
         AND deleted_at IS NULL LIMIT 1`,
      [userId, templateId, dateStr]
    );
    return rows[0] || null;
  }

  static async getById(id, userId) {
    if (!userId) return null;
    const [rows] = await pool.query(
      `SELECT * FROM routines 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, userId]
    );
    return rows[0] || null;
  }

  static async create(itemData) {
    const {
      id,
      userId,
      title,
      description,
      time,
      endTime,
      category,
      eventType,
      status,
      date,
      timezone,
      isAllDay,
      recurrenceGroupId,
      templateId,
      source,
      reminderEnabled,
      reminderMinutesBefore,
      priority
    } = itemData;

    if (!userId) throw new Error('Cannot create routine without authenticated userId');
    const routineId = id || (`rot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    
    await pool.query(
      `INSERT INTO routines 
       (id, user_id, title, description, time, end_time, category, event_type, status, date, timezone, is_all_day, recurrence_group_id, template_id, source, reminder_enabled, reminder_minutes_before, priority) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineId,
        userId,
        title,
        description || '',
        time,
        endTime || null,
        category || 'routine',
        eventType || 'routine',
        status || 'scheduled',
        date,
        timezone || 'UTC',
        isAllDay ? 1 : 0,
        recurrenceGroupId || null,
        templateId || null,
        source || 'manual',
        reminderEnabled !== undefined ? (reminderEnabled ? 1 : 0) : 1,
        reminderMinutesBefore || 0,
        priority || 'normal'
      ]
    );
    return this.getById(routineId, userId);
  }

  static async update(id, userId, itemData) {
    if (!userId) throw new Error('Cannot update routine without authenticated userId');
    const existing = await this.getById(id, userId);
    if (!existing) return null;

    const title = itemData.title !== undefined ? itemData.title : existing.title;
    const description = itemData.description !== undefined ? itemData.description : (existing.description || '');
    const time = itemData.time !== undefined ? itemData.time : existing.time;
    const endTime = itemData.endTime !== undefined ? itemData.endTime : existing.end_time;
    const category = itemData.category !== undefined ? itemData.category : (existing.category || 'routine');
    const eventType = itemData.eventType !== undefined ? itemData.eventType : (existing.event_type || 'routine');
    const status = itemData.status !== undefined ? itemData.status : (existing.status || 'scheduled');
    const date = itemData.date !== undefined ? itemData.date : existing.date;
    const timezone = itemData.timezone !== undefined ? itemData.timezone : (existing.timezone || 'UTC');
    const isAllDay = itemData.isAllDay !== undefined ? (itemData.isAllDay ? 1 : 0) : existing.is_all_day;
    const reminderEnabled = itemData.reminderEnabled !== undefined ? (itemData.reminderEnabled ? 1 : 0) : existing.reminder_enabled;
    const reminderMinutesBefore = itemData.reminderMinutesBefore !== undefined ? itemData.reminderMinutesBefore : existing.reminder_minutes_before;
    const priority = itemData.priority !== undefined ? itemData.priority : existing.priority;
    const completedAt = itemData.completedAt !== undefined ? itemData.completedAt : existing.completed_at;

    await pool.query(
      `UPDATE routines 
       SET title = ?, description = ?, time = ?, end_time = ?, category = ?, event_type = ?, status = ?, date = ?, timezone = ?, is_all_day = ?, reminder_enabled = ?, reminder_minutes_before = ?, priority = ?, completed_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [
        title, description, time, endTime, category, eventType, status, date, timezone, isAllDay,
        reminderEnabled, reminderMinutesBefore, priority, completedAt, id, userId
      ]
    );
    return this.getById(id, userId);
  }

  static async setStatus(id, userId, status, completedAt = null) {
    if (!userId) throw new Error('Cannot update status without authenticated userId');
    await pool.query(
      `UPDATE routines SET status = ?, completed_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [status, completedAt, id, userId]
    );
    return this.getById(id, userId);
  }

  static async softDelete(id, userId) {
    if (!userId) throw new Error('Cannot delete routine without authenticated userId');
    const [result] = await pool.query(
      `UPDATE routines SET deleted_at = NOW(), status = 'cancelled' WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = RoutineModel;
