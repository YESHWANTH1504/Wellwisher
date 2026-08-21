const pool = require('../../../../config/db');
const ProactiveEngine = require('../proactiveEngine');

class ProactiveSchedulerJob {
  /**
   * Run recurring evaluation across active users
   */
  static async runJob() {
    try {
      const [users] = await pool.query(
        'SELECT id FROM users WHERE is_active = 1 LIMIT 50'
      );

      const results = [];
      for (const u of (users || [])) {
        try {
          const res = await ProactiveEngine.evaluateUser(u.id);
          results.push({ userId: u.id, status: 'SUCCESS', count: res.deliveredEvents.length });
        } catch (err) {
          results.push({ userId: u.id, status: 'FAILED', error: err.message });
        }
      }

      return { success: true, processedUsers: results.length, details: results };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = ProactiveSchedulerJob;
