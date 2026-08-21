const ScreenCareModel = require('../models/screenCareModel');

class ScreenCareController {
  static async getSettings(req, res) {
    try {
      const settings = await ScreenCareModel.getSettings(req.userId);
      return res.json({
        success: true,
        data: {
          breakIntervalMinutes: settings.break_interval_minutes,
          breakDurationSeconds: settings.break_duration_seconds,
          eyeCareEnabled: Boolean(settings.eye_care_enabled),
          dailyScreenLimitMinutes: settings.daily_screen_limit_minutes
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch screen care settings',
        error: err.message
      });
    }
  }

  static async updateSettings(req, res) {
    try {
      const { breakIntervalMinutes, breakDurationSeconds, eyeCareEnabled, dailyScreenLimitMinutes } = req.body;
      await ScreenCareModel.updateSettings(req.userId, {
        breakIntervalMinutes,
        breakDurationSeconds,
        eyeCareEnabled,
        dailyScreenLimitMinutes
      });

      return res.json({
        success: true,
        message: 'Screen care settings updated successfully'
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update screen care settings',
        error: err.message
      });
    }
  }
}

module.exports = ScreenCareController;
