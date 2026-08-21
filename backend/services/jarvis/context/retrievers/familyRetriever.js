const pool = require('../../../../config/db');

class FamilyRetriever {
  /**
   * Retrieve linked family members and caregivers
   */
  static async retrieve(userId) {
    const [rows] = await pool.query(
      'SELECT id, member_name, relation, status FROM family_members WHERE user_id = ?',
      [userId]
    );

    return {
      count: rows.length,
      familyMembers: rows
    };
  }
}

module.exports = FamilyRetriever;
