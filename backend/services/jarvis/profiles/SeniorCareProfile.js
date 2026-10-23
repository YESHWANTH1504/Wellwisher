const pool = require('../../../config/db');

class SeniorCareProfile {
  /**
   * Retrieve senior care summary: active medications, vitals, hydration, and emergency contacts
   */
  static async getSummary(userId) {
    if (!userId) throw new Error('userId is required');

    const [meds] = await pool.query(
      'SELECT id, name, dosage, schedule_time, taken FROM medications WHERE user_id = ? AND deleted_at IS NULL ORDER BY schedule_time ASC',
      [userId]
    );

    const [vitals] = await pool.query(
      'SELECT systolic, diastolic, pulse, recorded_at FROM vitals WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1',
      [userId]
    );

    const today = new Date().toISOString().split('T')[0];
    const [hydration] = await pool.query(
      'SELECT SUM(amount_ml) as total_ml FROM hydration_logs WHERE user_id = ? AND DATE(logged_at) = ?',
      [userId, today]
    );

    const [family] = await pool.query(
      'SELECT id, name, relationship, phone_number, is_emergency_contact FROM family_members WHERE user_id = ?',
      [userId]
    );

    return {
      medications: meds || [],
      latestVitals: vitals?.[0] || null,
      todayHydrationMl: hydration?.[0]?.total_ml || 0,
      emergencyContacts: (family || []).filter(f => f.is_emergency_contact)
    };
  }

  /**
   * Log an emergency / SOS event
   */
  static async triggerSos(userId, reason = 'Voice SOS triggered') {
    const summary = await this.getSummary(userId);
    return {
      status: 'EMERGENCY_TRIGGERED',
      userId,
      reason,
      notifiedContacts: summary.emergencyContacts,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SeniorCareProfile;
