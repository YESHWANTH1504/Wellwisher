const pool = require('../../config/db');
const crypto = require('node:crypto');

class AiPersonalProfileRepository {
  /**
   * Save or update synthesized personal profile
   */
  static async saveProfile(userId, profileData = {}) {
    if (!userId) throw new Error('userId is required');

    const id = `prof_${userId}`;
    const dataJson = JSON.stringify(profileData);

    await pool.query(
      `INSERT INTO ai_personal_profiles (id, user_id, profile_data, version)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE profile_data = VALUES(profile_data), version = version + 1, updated_at = NOW()`,
      [id, userId, dataJson]
    );

    return this.getProfile(userId);
  }

  /**
   * Get user personal profile
   */
  static async getProfile(userId) {
    if (!userId) throw new Error('userId is required');

    const [rows] = await pool.query(
      'SELECT * FROM ai_personal_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      profileData: typeof r.profile_data === 'string' ? JSON.parse(r.profile_data) : r.profile_data,
      version: r.version,
      updatedAt: r.updated_at
    };
  }

  /**
   * Reset profile
   */
  static async resetProfile(userId) {
    if (!userId) throw new Error('userId is required');
    await pool.query('DELETE FROM ai_personal_profiles WHERE user_id = ?', [userId]);
    return true;
  }
}

module.exports = {
  AiPersonalProfileRepository
};
