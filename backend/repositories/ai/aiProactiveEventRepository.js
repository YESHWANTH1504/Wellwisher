const pool = require('../../config/db');
const crypto = require('node:crypto');

class AiProactiveEventRepository {
  /**
   * Create a new proactive event
   */
  static async createEvent(userId, eventData = {}) {
    if (!userId) {
      throw new Error('userId is required to create a proactive event.');
    }

    const id = eventData.id || `pro_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const eventType = eventData.eventType || 'UPCOMING_TASK';
    const priority = eventData.priority || 'MEDIUM';
    const title = eventData.title || 'Notification';
    const message = eventData.message || '';
    const source = eventData.source || 'PROACTIVE_ENGINE';
    const relatedEntityType = eventData.relatedEntityType || null;
    const relatedEntityId = eventData.relatedEntityId ? String(eventData.relatedEntityId) : null;
    const scheduledFor = eventData.scheduledFor ? new Date(eventData.scheduledFor) : new Date();
    const status = eventData.status || 'PENDING';
    const actionPayload = eventData.actionPayload ? JSON.stringify(eventData.actionPayload) : null;
    const metadata = eventData.metadata ? JSON.stringify(eventData.metadata) : null;
    const expiresAt = eventData.expiresAt ? new Date(eventData.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO ai_proactive_events 
       (id, user_id, event_type, priority, title, message, source, related_entity_type, related_entity_id, scheduled_for, status, action_payload, metadata, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        eventType,
        priority,
        title,
        message,
        source,
        relatedEntityType,
        relatedEntityId,
        scheduledFor,
        status,
        actionPayload,
        metadata,
        expiresAt
      ]
    );

    return this.getEventById(id, userId);
  }

  /**
   * Get proactive event by ID (user-scoped)
   */
  static async getEventById(eventId, userId) {
    const [rows] = await pool.query(
      'SELECT * FROM ai_proactive_events WHERE id = ? AND user_id = ?',
      [eventId, userId]
    );
    if (!rows || rows.length === 0) return null;
    return this._formatRow(rows[0]);
  }

  /**
   * Get active proactive feed for user
   */
  static async getActiveFeed(userId, { limit = 20, statuses = ['PENDING', 'DELIVERED'] } = {}) {
    const [rows] = await pool.query(
      `SELECT * FROM ai_proactive_events 
       WHERE user_id = ? AND status IN (${statuses.map(() => '?').join(',')})
       ORDER BY FIELD(priority, 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'), created_at DESC 
       LIMIT ?`,
      [userId, ...statuses, limit]
    );
    return (rows || []).map(r => this._formatRow(r));
  }

  /**
   * Update event status (DISMISSED, ACTED, DELIVERED, etc.)
   */
  static async updateStatus(eventId, userId, status, extra = {}) {
    const validStatuses = ['PENDING', 'DELIVERED', 'DISMISSED', 'ACTED', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid proactive event status: "${status}".`);
    }

    const deliveredAt = status === 'DELIVERED' ? new Date() : (extra.deliveredAt || null);

    await pool.query(
      `UPDATE ai_proactive_events 
       SET status = ?, delivered_at = COALESCE(?, delivered_at), updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [status, deliveredAt, eventId, userId]
    );

    return this.getEventById(eventId, userId);
  }

  /**
   * Count proactive events delivered to user in the last N minutes
   */
  static async getRecentEventCount(userId, minutes = 60) {
    const sinceTime = new Date(Date.now() - minutes * 60 * 1000);
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM ai_proactive_events 
       WHERE user_id = ? AND status != 'CANCELLED' AND created_at >= ?`,
      [userId, sinceTime]
    );
    return rows && rows[0] ? Number(rows[0].count) : 0;
  }

  /**
   * Find existing pending event for same entity to avoid duplicate spamming
   */
  static async findPendingForEntity(userId, eventType, relatedEntityType, relatedEntityId) {
    const [rows] = await pool.query(
      `SELECT * FROM ai_proactive_events 
       WHERE user_id = ? AND event_type = ? AND related_entity_type = ? AND related_entity_id = ? AND status IN ('PENDING', 'DELIVERED')
       ORDER BY created_at DESC LIMIT 1`,
      [userId, eventType, relatedEntityType, String(relatedEntityId)]
    );
    if (!rows || rows.length === 0) return null;
    return this._formatRow(rows[0]);
  }

  static _formatRow(row) {
    if (!row) return null;
    return {
      ...row,
      action_payload: typeof row.action_payload === 'string' ? JSON.parse(row.action_payload) : row.action_payload,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
    };
  }
}

module.exports = {
  AiProactiveEventRepository
};
