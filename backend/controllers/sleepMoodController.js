const pool = require('../config/db');

class SleepMoodController {
  static async getLog(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const dateStr = (req.query.date || '').trim() || new Date().toISOString().split('T')[0];
      const [rows] = await pool.query(
        'SELECT * FROM sleep_mood_logs WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
        [req.userId, dateStr]
      );
      return res.json({
        success: true,
        data: rows[0] || {
          sleep_hours: 7.5,
          bedtime: '11:00 PM',
          wake_time: '06:30 AM',
          mood_rating: 'Energetic'
        }
      });
    } catch (err) {
      console.error('Get sleep/mood error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sleep & mood log'
      });
    }
  }

  static async logSleepMood(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { sleepHours, bedtime, wakeTime, moodRating } = req.body || {};
      const dateStr = (req.body.date || '').trim() || new Date().toISOString().split('T')[0];
      const hours = parseFloat(sleepHours) || 8.0;

      if (hours < 0 || hours > 24) {
        return res.status(400).json({
          success: false,
          message: 'Sleep hours must be between 0 and 24'
        });
      }

      await pool.query(
        'INSERT INTO sleep_mood_logs (user_id, sleep_hours, bedtime, wake_time, mood_rating, date) VALUES (?, ?, ?, ?, ?, ?)',
        [req.userId, hours, (bedtime || '11:00 PM').trim(), (wakeTime || '07:00 AM').trim(), (moodRating || 'Happy').trim(), dateStr]
      );

      return res.status(201).json({
        success: true,
        message: 'Sleep & mood log saved successfully'
      });
    } catch (err) {
      console.error('Log sleep/mood error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to log sleep & mood'
      });
    }
  }
}

module.exports = SleepMoodController;
