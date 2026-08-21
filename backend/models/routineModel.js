const pool = require('../config/db');

class RoutineModel {
  static async getByDate(userId, dateStr) {
    if (!userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM routines 
       WHERE user_id = ? 
         AND date = ? 
         AND deleted_at IS NULL 
       ORDER BY STR_TO_DATE(time, '%h:%i %p') ASC`,
      [userId, dateStr]
    );
    return rows;
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
    const { id, userId, title, description, time, category, status, date, reminderEnabled } = itemData;
    if (!userId) throw new Error('Cannot create routine without authenticated userId');
    await pool.query(
      `INSERT INTO routines 
       (id, user_id, title, description, time, category, status, date, reminder_enabled) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, title, description || '', time, category || 'other', status || 'upcoming', date, reminderEnabled ? 1 : 0]
    );
    return id;
  }

  static async update(id, userId, itemData) {
    if (!userId) throw new Error('Cannot update routine without authenticated userId');
    const { title, description, time, category, status, date, reminderEnabled } = itemData;
    const [result] = await pool.query(
      `UPDATE routines 
       SET title = ?, description = ?, time = ?, category = ?, status = ?, date = ?, reminder_enabled = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [title, description, time, category, status, date, reminderEnabled ? 1 : 0, id, userId]
    );
    return result.affectedRows > 0;
  }

  static async softDelete(id, userId) {
    if (!userId) throw new Error('Cannot delete routine without authenticated userId');
    const [result] = await pool.query(
      `UPDATE routines SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = RoutineModel;
