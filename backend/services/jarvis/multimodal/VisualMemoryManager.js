/**
 * VisualMemoryManager
 * Manages explicit visual memories in MySQL ai_memories table.
 * Adheres to Section 19 & 20:
 * - Never saves raw personal images by default.
 * - Stores structured descriptions, semantic tags, and provenance references.
 * - Strictly requires explicit user intent ("Remember that this is my office desk").
 * - Supports save, recall, and targeted deletion ("Forget that visual memory").
 */

const { AiMemoryRepository: aiMemoryRepository } = require('../../../repositories/ai/aiMemoryRepository');

class VisualMemoryManager {
  /**
   * Save an explicit visual memory
   */
  static async saveVisualMemory(userId, params = {}) {
    if (!userId) throw new Error('userId is required to save visual memory.');
    const label = params.label || params.target || 'visual_object';
    const cleanKey = `visual_${label.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
    const description = params.description || `Visual observation of ${label}`;

    const memoryRecord = await aiMemoryRepository.createMemory(userId, {
      memoryKey: cleanKey,
      memoryValue: description,
      memoryType: 'VISUAL_MEMORY',
      source: 'USER_EXPLICIT',
      confidenceScore: params.confidence || 0.95,
      metadata: {
        label,
        storedAt: new Date().toISOString(),
        sourceDevice: params.sourceDevice || 'CAMERA',
        features: params.features || []
      }
    });

    return {
      success: true,
      key: cleanKey,
      label,
      memoryId: memoryRecord?.id,
      description
    };
  }

  /**
   * Recall visual memory by topic / label
   */
  static async recallVisualMemory(userId, query = '') {
    if (!userId) return null;
    const memories = await aiMemoryRepository.getMemoriesByUser(userId, {
      memoryType: 'VISUAL_MEMORY',
      limit: 20
    });

    if (!memories || memories.length === 0) return null;

    if (!query) return memories[0];

    const lowerQuery = query.toLowerCase().trim();
    const cleanTarget = lowerQuery
      .replace(/^(what did i ask you to remember about|what do you remember about|what is|tell me about|remember|recall)\s+/i, '')
      .replace(/[?.!]/g, '')
      .trim();

    const keywords = cleanTarget
      .split(/\s+/)
      .filter(w => w.length > 2 && !['that', 'this', 'photo', 'image', 'picture', 'visual', 'memory', 'what', 'you', 'about'].includes(w));

    const match = memories.find(m => {
      const cleanKey = (m.memory_key || '').toLowerCase();
      const cleanVal = (m.memory_value || '').toLowerCase();
      const metaStr = m.metadata ? JSON.stringify(m.metadata).toLowerCase() : '';

      if (cleanTarget && (cleanKey.includes(cleanTarget) || cleanVal.includes(cleanTarget) || metaStr.includes(cleanTarget))) {
        return true;
      }

      if (keywords.length > 0 && keywords.some(kw => cleanKey.includes(kw) || cleanVal.includes(kw) || metaStr.includes(kw))) {
        return true;
      }

      return false;
    });

    return match || memories[0];
  }

  /**
   * Delete / forget visual memory
   */
  static async forgetVisualMemory(userId, target = '') {
    if (!userId) return false;
    const memories = await aiMemoryRepository.getMemoriesByUser(userId, {
      memoryType: 'VISUAL_MEMORY',
      limit: 20
    });

    if (!memories || memories.length === 0) return false;

    let targetMemory = null;
    if (target) {
      const lower = target.toLowerCase().trim();
      const cleanTarget = lower
        .replace(/^(forget|delete|remove|clear|erase|what you remember about|that)\s+/i, '')
        .replace(/[?.!]/g, '')
        .trim();

      const keywords = cleanTarget
        .split(/\s+/)
        .filter(w => w.length > 2 && !['that', 'this', 'photo', 'image', 'picture', 'visual', 'memory', 'what', 'you', 'about'].includes(w));

      targetMemory = memories.find(m => {
        const cleanKey = (m.memory_key || '').toLowerCase();
        const cleanVal = (m.memory_value || '').toLowerCase();
        const metaStr = m.metadata ? JSON.stringify(m.metadata).toLowerCase() : '';

        if (cleanTarget && (cleanKey.includes(cleanTarget) || cleanVal.includes(cleanTarget) || metaStr.includes(cleanTarget))) {
          return true;
        }

        if (keywords.length > 0 && keywords.some(kw => cleanKey.includes(kw) || cleanVal.includes(kw) || metaStr.includes(kw))) {
          return true;
        }

        return false;
      });
    }

    if (!targetMemory) {
      targetMemory = memories[0];
    }

    if (targetMemory) {
      await aiMemoryRepository.deleteMemory(targetMemory.id, userId);
      return true;
    }

    return false;
  }
}

module.exports = VisualMemoryManager;
