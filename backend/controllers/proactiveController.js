const ProactiveEngine = require('../services/jarvis/proactive/proactiveEngine');
const { AiProactiveEventRepository } = require('../repositories/ai/aiProactiveEventRepository');
const { AiPreferenceRepository } = require('../repositories/ai/aiPreferenceRepository');

class ProactiveController {
  /**
   * GET /api/ai/proactive/feed
   */
  static async getFeed(req, res) {
    try {
      const userId = req.userId;
      const feed = await AiProactiveEventRepository.getActiveFeed(userId, { limit: 20 });
      return res.status(200).json({
        success: true,
        count: feed.length,
        data: feed
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve proactive feed.' });
    }
  }

  /**
   * GET /api/ai/briefing/today
   */
  static async getDailyBriefing(req, res) {
    try {
      const userId = req.userId;
      const briefing = await ProactiveEngine.getDailyBriefing(userId);
      return res.status(200).json({
        success: true,
        data: briefing
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to generate daily briefing.' });
    }
  }

  /**
   * GET /api/ai/summary/today
   */
  static async getEveningSummary(req, res) {
    try {
      const userId = req.userId;
      const summary = await ProactiveEngine.getEveningSummary(userId);
      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to generate evening summary.' });
    }
  }

  /**
   * POST /api/ai/proactive/:id/dismiss
   */
  static async dismissEvent(req, res) {
    try {
      const userId = req.userId;
      const eventId = req.params.id;
      const updated = await AiProactiveEventRepository.updateStatus(eventId, userId, 'DISMISSED');
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to dismiss event.' });
    }
  }

  /**
   * POST /api/ai/proactive/:id/act
   */
  static async actOnEvent(req, res) {
    try {
      const userId = req.userId;
      const eventId = req.params.id;
      const updated = await AiProactiveEventRepository.updateStatus(eventId, userId, 'ACTED');
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Event not found.' });
      }
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to record action on event.' });
    }
  }

  /**
   * POST /api/ai/proactive/evaluate
   */
  static async evaluate(req, res) {
    try {
      const userId = req.userId;
      const result = await ProactiveEngine.evaluateUser(userId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to evaluate proactive events.' });
    }
  }

  /**
   * GET /api/ai/preferences
   */
  static async getPreferences(req, res) {
    try {
      const userId = req.userId;
      const prefs = await AiPreferenceRepository.getPreferences(userId);
      return res.status(200).json({ success: true, data: prefs });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve AI preferences.' });
    }
  }

  /**
   * PUT /api/ai/preferences
   */
  static async updatePreferences(req, res) {
    try {
      const userId = req.userId;
      const updated = await AiPreferenceRepository.updatePreferences(userId, req.body || {});
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update AI preferences.' });
    }
  }
}

module.exports = ProactiveController;
