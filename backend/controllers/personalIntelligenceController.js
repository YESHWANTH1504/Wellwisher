const PersonalIntelligenceEngine = require('../services/jarvis/intelligence/personalIntelligenceEngine');
const WeeklyIntelligenceEngine = require('../services/jarvis/intelligence/weeklyIntelligenceEngine');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const { AiPersonalProfileRepository } = require('../repositories/ai/aiPersonalProfileRepository');
const { AiPreferenceRepository } = require('../repositories/ai/aiPreferenceRepository');

class PersonalIntelligenceController {
  /**
   * GET /api/ai/profile
   */
  static async getProfile(req, res) {
    try {
      const userId = req.userId;
      const profile = await PersonalIntelligenceEngine.buildProfile(userId);
      return res.status(200).json({ success: true, data: profile });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve personal profile.' });
    }
  }

  /**
   * GET /api/ai/memories
   */
  static async getMemories(req, res) {
    try {
      const userId = req.userId;
      const { type, source, limit } = req.query;
      const memories = await AiMemoryRepository.getMemoriesByUser(userId, {
        memoryType: type,
        source,
        limit: limit ? parseInt(limit, 10) : 50
      });
      return res.status(200).json({ success: true, count: memories.length, data: memories });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve memories.' });
    }
  }

  /**
   * PUT /api/ai/memories/:id
   */
  static async updateMemory(req, res) {
    try {
      const userId = req.userId;
      const memoryId = parseInt(req.params.id, 10);
      const { memoryValue, importance, confidenceScore } = req.body;

      const updated = await AiMemoryRepository.updateMemory(memoryId, userId, {
        memoryValue,
        importance,
        confidenceScore
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Memory not found or unauthorized.' });
      }

      // Invalidate profile cache
      await PersonalIntelligenceEngine.buildProfile(userId, { forceRefresh: true });

      const memory = await AiMemoryRepository.getMemoryById(memoryId, userId);
      return res.status(200).json({ success: true, data: memory });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update memory.' });
    }
  }

  /**
   * DELETE /api/ai/memories/:id
   */
  static async deleteMemory(req, res) {
    try {
      const userId = req.userId;
      const memoryId = parseInt(req.params.id, 10);
      const deleted = await AiMemoryRepository.deleteMemory(memoryId, userId);

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Memory not found or unauthorized.' });
      }

      // Invalidate profile cache
      await PersonalIntelligenceEngine.buildProfile(userId, { forceRefresh: true });

      return res.status(200).json({ success: true, message: 'Memory deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete memory.' });
    }
  }

  /**
   * POST /api/ai/memories/clear
   */
  static async clearMemories(req, res) {
    try {
      const userId = req.userId;
      const { inferredOnly } = req.body || {};
      const count = await AiMemoryRepository.clearMemories(userId, { inferredOnly: Boolean(inferredOnly) });

      // Invalidate profile cache
      await PersonalIntelligenceEngine.buildProfile(userId, { forceRefresh: true });

      return res.status(200).json({ success: true, clearedCount: count });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to clear memories.' });
    }
  }

  /**
   * GET /api/ai/weekly-summary
   */
  static async getWeeklySummary(req, res) {
    try {
      const userId = req.userId;
      const summary = await WeeklyIntelligenceEngine.generateWeeklySummary(userId);
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to generate weekly summary.' });
    }
  }

  /**
   * POST /api/ai/personalization/reset
   */
  static async resetPersonalization(req, res) {
    try {
      const userId = req.userId;
      await AiPersonalProfileRepository.resetProfile(userId);
      await AiPreferenceRepository.updatePreferences(userId, {
        assistantName: 'JARVIS',
        preferredResponseStyle: 'CONCISE',
        proactiveAssistanceEnabled: true
      });
      return res.status(200).json({ success: true, message: 'Personalization reset to factory defaults.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to reset personalization.' });
    }
  }
}

module.exports = PersonalIntelligenceController;
