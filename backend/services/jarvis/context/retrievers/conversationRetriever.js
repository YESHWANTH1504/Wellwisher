const AiConversationRepository = require('../../../../repositories/ai/aiConversationRepository');

class ConversationRetriever {
  /**
   * Retrieve bounded recent conversation history for active session
   */
  static async retrieve(userId, conversationId, { limit = 10 } = {}) {
    if (!conversationId) {
      // Find latest conversation session
      const userConvs = await AiConversationRepository.getConversationsByUser(userId, { limit: 1 });
      if (userConvs.length === 0) {
        return { conversationId: null, count: 0, messages: [] };
      }
      conversationId = userConvs[0].id;
    }

    const messages = await AiConversationRepository.getMessagesByConversation(conversationId, userId);
    const bounded = messages.slice(-Math.min(20, Math.max(1, limit)));

    return {
      conversationId,
      totalHistoryCount: messages.length,
      retrievedCount: bounded.length,
      messages: bounded
    };
  }
}

module.exports = ConversationRetriever;
