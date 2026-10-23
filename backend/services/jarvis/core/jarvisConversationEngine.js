/**
 * JarvisConversationEngine 4.0
 * Unified multi-turn conversational state, context resolution, and follow-up management.
 */
class JarvisConversationEngine {
  constructor() {
    this.conversations = new Map();
  }

  getConversation(convId) {
    if (!this.conversations.has(convId)) {
      this.conversations.set(convId, {
        convId,
        turns: [],
        activeEntityId: null,
        activeEntityType: null,
        lastSpokenMessage: null,
        pendingClarification: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    return this.conversations.get(convId);
  }

  addTurn(convId, role, content, metadata = {}) {
    const conv = this.getConversation(convId);
    const turn = {
      turnId: `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      metadata,
      timestamp: new Date().toISOString()
    };
    conv.turns.push(turn);
    if (role === 'assistant') {
      conv.lastSpokenMessage = content;
    }
    if (metadata.activeEntityId) {
      conv.activeEntityId = metadata.activeEntityId;
      conv.activeEntityType = metadata.activeEntityType || 'EVENT';
    }
    conv.updatedAt = new Date().toISOString();
    return turn;
  }

  getActiveEntity(convId) {
    const conv = this.getConversation(convId);
    return {
      entityId: conv.activeEntityId,
      entityType: conv.activeEntityType
    };
  }

  clearConversation(convId) {
    this.conversations.delete(convId);
  }
}

module.exports = new JarvisConversationEngine();
