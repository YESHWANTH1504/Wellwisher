const pool = require('../config/db');

class ScreenCareModel {
  static async getSettings(userId) {
    if (!userId) return {
      break_interval_minutes: 30,
      break_duration_seconds: 20,
      eye_care_enabled: 1,
      daily_screen_limit_minutes: 480
    };

    const [rows] = await pool.query(
      'SELECT * FROM screen_care_settings WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows[0] || {
      break_interval_minutes: 30,
      break_duration_seconds: 20,
      eye_care_enabled: 1,
      daily_screen_limit_minutes: 480
    };
  }

  static async updateSettings(userId, settings) {
    if (!userId) throw new Error('Cannot update settings without authenticated userId');
    const { breakIntervalMinutes, breakDurationSeconds, eyeCareEnabled, dailyScreenLimitMinutes } = settings;
    await pool.query(
      `INSERT INTO screen_care_settings 
       (user_id, break_interval_minutes, break_duration_seconds, eye_care_enabled, daily_screen_limit_minutes) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         break_interval_minutes = VALUES(break_interval_minutes),
         break_duration_seconds = VALUES(break_duration_seconds),
         eye_care_enabled = VALUES(eye_care_enabled),
         daily_screen_limit_minutes = VALUES(daily_screen_limit_minutes)`,
      [userId, breakIntervalMinutes || 30, breakDurationSeconds || 20, eyeCareEnabled ? 1 : 0, dailyScreenLimitMinutes || 480]
    );
  }
}

module.exports = ScreenCareModel;
