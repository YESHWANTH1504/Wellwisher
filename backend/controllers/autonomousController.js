const VoiceGateway = require('../services/jarvis/autonomous/voiceGateway');
const TaskScheduler = require('../services/jarvis/autonomous/taskScheduler');
const ProactiveNotifier = require('../services/jarvis/autonomous/proactiveNotifier');
const AiAutonomousRepository = require('../repositories/ai/aiAutonomousRepository');

class AutonomousController {
  /**
   * POST /api/autonomous/voice-command
   * Headless background voice command execution
   */
  static async handleVoiceCommand(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized user context required' });
      }

      const { transcript, deviceId, conversationId, timezone } = req.body;
      const result = await VoiceGateway.processVoiceCommand({
        userId,
        transcript,
        deviceId,
        conversationId,
        timezone
      });

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/autonomous/tasks
   * Create an autonomous reminder or scheduled command
   */
  static async createTask(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized user context required' });
      }

      const { title, scheduleTime, cronExpression, commandText, taskType } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: 'Task title is required' });
      }

      const task = await TaskScheduler.scheduleOneTimeTask({
        userId,
        title,
        scheduleTime: scheduleTime || new Date().toISOString(),
        commandText,
        payload: { taskType }
      });

      return res.status(201).json({ success: true, task });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/autonomous/tasks
   * List autonomous tasks for user
   */
  static async listTasks(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const tasks = await AiAutonomousRepository.listTasks(userId, req.query.status || null);
      return res.status(200).json({ success: true, tasks });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/autonomous/device/register
   * Register or update device background session
   */
  static async registerDevice(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { deviceId, deviceName, platform, wakeWordEnabled, backgroundActive, pushToken } = req.body;
      const device = await AiAutonomousRepository.registerDevice({
        userId,
        deviceId: deviceId || 'device_default',
        deviceName,
        platform,
        wakeWordEnabled,
        backgroundActive,
        pushToken
      });

      return res.status(200).json({ success: true, device });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/autonomous/status
   * Live companion status
   */
  static async getStatus(req, res) {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const devices = await AiAutonomousRepository.listUserDevices(userId);
      const recentRuns = await AiAutonomousRepository.listRecentRuns(userId, 5);
      const notifications = await AiAutonomousRepository.listNotifications(userId, 5);

      return res.status(200).json({
        success: true,
        companionActive: true,
        wakeWordEnabled: devices.length > 0 ? Boolean(devices[0].wake_word_enabled) : true,
        backgroundServiceActive: devices.length > 0 ? Boolean(devices[0].background_active) : true,
        recentRuns,
        notifications
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AutonomousController;
