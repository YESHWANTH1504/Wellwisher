const pool = require('../../config/db');

class AiConversationRepository {
  /**
   * Create a new conversation session
   */
  static async createConversation(userId, { id, title, metadata } = {}) {
    if (!userId) throw new Error('userId is required to create a conversation');
    const conversationId = id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const conversationTitle = (title || 'New Conversation').trim();
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await pool.query(
      `INSERT INTO ai_conversations (id, user_id, title, metadata)
       VALUES (?, ?, ?, ?)`,
      [conversationId, userId, conversationTitle, metadataJson]
    );

    return {
      id: conversationId,
      userId,
      title: conversationTitle,
      metadata: metadata || null,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get all active conversations for a user
   */
  static async getConversationsByUser(userId, { limit = 20 } = {}) {
    if (!userId) throw new Error('userId is required');
    const [rows] = await pool.query(
      `SELECT * FROM ai_conversations 
       WHERE user_id = ? AND deleted_at IS NULL 
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, parseInt(limit, 10) || 20]
    );
    return rows;
  }

  /**
   * Get single conversation by ID with user ownership check
   */
  static async getConversationById(id, userId) {
    if (!id || !userId) throw new Error('id and userId are required');
    const [rows] = await pool.query(
      `SELECT * FROM ai_conversations 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, userId]
    );
    return rows[0] || null;
  }

  /**
   * Update conversation title
   */
  static async updateTitle(id, userId, title) {
    if (!id || !userId) throw new Error('id and userId are required');
    const [result] = await pool.query(
      `UPDATE ai_conversations SET title = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [(title || 'Untitled Conversation').trim(), id, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Soft delete conversation
   */
  static async softDeleteConversation(id, userId) {
    if (!id || !userId) throw new Error('id and userId are required');
    const [result] = await pool.query(
      `UPDATE ai_conversations SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Add message to conversation
   */
  static async addMessage(userId, { id, conversationId, role, content, toolCalls, metadata } = {}) {
    if (!userId || !conversationId) throw new Error('userId and conversationId are required');
    
    // Verify conversation ownership first
    const conv = await this.getConversationById(conversationId, userId);
    if (!conv) throw new Error('Conversation not found or not owned by user');

    const validRoles = ['user', 'assistant', 'system', 'tool'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid message role: ${role}. Supported roles: ${validRoles.join(', ')}`);
    }

    const messageId = id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const toolCallsJson = toolCalls ? JSON.stringify(toolCalls) : null;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    await pool.query(
      `INSERT INTO ai_conversation_messages (id, conversation_id, user_id, role, content, tool_calls, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [messageId, conversationId, userId, role, content || '', toolCallsJson, metadataJson]
    );

    // Update conversation timestamp
    await pool.query(
      `UPDATE ai_conversations SET updated_at = NOW() WHERE id = ?`,
      [conversationId]
    );

    return {
      id: messageId,
      conversationId,
      userId,
      role,
      content,
      toolCalls: toolCalls || null,
      metadata: metadata || null,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get all messages for a conversation (chronological)
   */
  static async getMessagesByConversation(conversationId, userId) {
    if (!conversationId || !userId) throw new Error('conversationId and userId are required');
    
    // Verify ownership
    const conv = await this.getConversationById(conversationId, userId);
    if (!conv) return [];

    const [rows] = await pool.query(
      `SELECT * FROM ai_conversation_messages 
       WHERE conversation_id = ? AND user_id = ? 
       ORDER BY created_at ASC`,
      [conversationId, userId]
    );
    return rows;
  }
}

module.exports = AiConversationRepository;
