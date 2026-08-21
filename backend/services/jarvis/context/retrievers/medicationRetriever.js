const pool = require('../../../../config/db');

class MedicationRetriever {
  /**
   * Retrieve user prescribed medications and daily schedule
   */
  static async retrieve(userId) {
    const [rows] = await pool.query(
      'SELECT id, name, dosage, schedule_time, remaining_pills FROM medications WHERE user_id = ? ORDER BY schedule_time ASC',
      [userId]
    );

    return {
      count: rows.length,
      medications: rows
    };
  }
}

module.exports = MedicationRetriever;
