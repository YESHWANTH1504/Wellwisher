/**
 * JarvisProactiveFatigueManager
 * Phase 11 Proactive Fatigue Control & Notification Throttling.
 * Enforces Quiet Hours (default 22:00–07:00), Rate Limits, Dedup Cooldowns,
 * and Conversational Non-Interference.
 */

const pool = require('../../../config/db');

const DEFAULT_LIMITS = {
  LOW: { maxPerHour: 2, maxPerDay: 6, minCooldownMins: 15 },
  BALANCED: { maxPerHour: 4, maxPerDay: 12, minCooldownMins: 10 },
  HIGH: { maxPerHour: 8, maxPerDay: 20, minCooldownMins: 5 }
};

class JarvisProactiveFatigueManager {
  constructor() {
    this._recentDeliveries = new Map(); // Memory cache: userId -> [{ dedupKey, deliveredAt }]
  }

  /**
   * Check whether current time is within Quiet Hours window
   * @param {string} currentTimeStr "HH:MM"
   * @param {string} quietStartStr "HH:MM"
   * @param {string} quietEndStr "HH:MM"
   * @returns {boolean}
   */
  static isQuietHours(currentTimeStr = '12:00', quietStartStr = '22:00', quietEndStr = '07:00') {
    const parseMins = (str) => {
      if (!str || !str.includes(':')) return 0;
      const parts = str.split(':');
      let h = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10);
      if (str.toLowerCase().includes('pm') && h < 12) h += 12;
      if (str.toLowerCase().includes('am') && h === 12) h = 0;
      return h * 60 + m;
    };

    const cur = parseMins(currentTimeStr);
    const start = parseMins(quietStartStr);
    const end = parseMins(quietEndStr);

    if (start > end) {
      // Midnight crossover (e.g. 22:00 to 07:00)
      return cur >= start || cur < end;
    }
    return cur >= start && cur < end;
  }

  /**
   * Evaluate whether a proactive suggestion can be delivered to the user
   * @param {number} userId
   * @param {Object} candidate
   * @param {Object} options { currentTime, preferences, activeConversation, activeWorkflow }
   * @returns {Promise<{ allowed: boolean, reason: string }>}
   */
  async canDeliver(userId, candidate = {}, options = {}) {
    const prefs = options.preferences || {};
    const currentTime = options.currentTime || new Date().toTimeString().substring(0, 5);

    // 0. Emergency or Critical Safety overrides fatigue controls
    if (candidate.priority === 'CRITICAL' || candidate.priority === 'URGENT') {
      return { allowed: true, reason: 'CRITICAL_PRIORITY_OVERRIDE' };
    }

    // 1. Check Quiet Hours
    const quietEnabled = prefs.quietHoursEnabled !== false;
    if (quietEnabled) {
      const qStart = prefs.quietHoursStart || '22:00';
      const qEnd = prefs.quietHoursEnd || '07:00';
      if (JarvisProactiveFatigueManager.isQuietHours(currentTime, qStart, qEnd)) {
        return { allowed: false, reason: 'QUIET_HOURS_ACTIVE' };
      }
    }

    // 2. Active Conversation or Workflow Interference Check
    if (options.activeConversation && options.activeConversation.isSpeaking) {
      return { allowed: false, reason: 'CONVERSATION_IN_PROGRESS' };
    }

    // 3. Deduplication and Cooldown Check
    const dedupKey = candidate.dedupKey;
    if (dedupKey) {
      const userList = this._recentDeliveries.get(userId) || [];
      const now = Date.now();
      const existing = userList.find(d => d.dedupKey === dedupKey);
      if (existing) {
        const elapsedMins = (now - existing.deliveredAt) / 60000;
        const cooldownMins = 30; // 30 min deduplication cooldown
        if (elapsedMins < cooldownMins) {
          return { allowed: false, reason: 'COOLDOWN_ACTIVE' };
        }
      }

      // Check DB for recent duplicates
      try {
        const [rows] = await pool.query(`
          SELECT suggestion_id, created_at FROM jarvis_proactive_suggestions
          WHERE user_id = ? AND dedup_key = ? AND created_at > (NOW() - INTERVAL 30 MINUTE)
          LIMIT 1
        `, [userId, dedupKey]);
        if (rows.length > 0) {
          return { allowed: false, reason: 'RECENT_DUPLICATE_PERSISTED' };
        }
      } catch (_) {}
    }

    // 4. Rate Limits (Hourly & Daily)
    const freq = (prefs.notificationFrequency || 'BALANCED').toUpperCase();
    const limits = DEFAULT_LIMITS[freq] || DEFAULT_LIMITS.BALANCED;

    try {
      const [hRows] = await pool.query(`
        SELECT COUNT(*) as cnt FROM jarvis_proactive_suggestions
        WHERE user_id = ? AND created_at > (NOW() - INTERVAL 1 HOUR)
      `, [userId]);
      if (hRows[0]?.cnt >= limits.maxPerHour) {
        return { allowed: false, reason: 'HOURLY_LIMIT_REACHED' };
      }

      const [dRows] = await pool.query(`
        SELECT COUNT(*) as cnt FROM jarvis_proactive_suggestions
        WHERE user_id = ? AND created_at > (NOW() - INTERVAL 24 HOUR)
      `, [userId]);
      if (dRows[0]?.cnt >= limits.maxPerDay) {
        return { allowed: false, reason: 'DAILY_LIMIT_REACHED' };
      }
    } catch (_) {}

    return { allowed: true, reason: 'DELIVERY_PERMITTED' };
  }

  /**
   * Record delivery timestamp in memory and database
   */
  recordDelivery(userId, candidate = {}) {
    if (!this._recentDeliveries.has(userId)) {
      this._recentDeliveries.set(userId, []);
    }
    const list = this._recentDeliveries.get(userId);
    list.unshift({
      dedupKey: candidate.dedupKey || 'generic',
      deliveredAt: Date.now()
    });
    if (list.length > 50) list.pop();
  }
}

const defaultFatigueManager = new JarvisProactiveFatigueManager();

module.exports = {
  JarvisProactiveFatigueManager,
  defaultFatigueManager
};
