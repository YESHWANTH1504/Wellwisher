const pool = require('../../../../config/db');

class WellnessRetriever {
  /**
   * Retrieve bounded health & wellness metrics (hydration, vitals, sleep)
   */
  static async retrieve(userId, currentDate) {
    const today = currentDate || new Date().toISOString().split('T')[0];

    // 1. Hydration
    const [hydRows] = await pool.query(
      'SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration_logs WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    // 2. Latest Vitals
    const [vitRows] = await pool.query(
      'SELECT systolic, diastolic, heart_rate, spo2, blood_glucose, weight_kg, created_at FROM vitals_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    // 3. Sleep & Mood
    const [sleepRows] = await pool.query(
      'SELECT sleep_hours, bedtime, wake_time, mood_rating, date FROM sleep_mood_logs WHERE user_id = ? AND date = ? LIMIT 1',
      [userId, today]
    );

    return {
      date: today,
      hydration: {
        totalMl: Number(hydRows[0]?.total_ml || 0),
        goalMl: 2500
      },
      latestVitals: vitRows[0] || null,
      sleepMood: sleepRows[0] || null
    };
  }
}

module.exports = WellnessRetriever;
