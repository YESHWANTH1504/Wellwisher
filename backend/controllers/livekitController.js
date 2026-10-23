const { defaultLiveKitTokenService } = require('../livekit/LiveKitTokenService');
const { defaultLiveKitAgent } = require('../livekit/JarvisLiveKitAgent');
const { defaultLiveKitEventHandler } = require('../livekit/LiveKitEventHandler');

class LiveKitController {
  /**
   * POST /api/livekit/token
   * Issue short-lived, user-bound LiveKit access token
   */
  static async getToken(req, res) {
    try {
      const userId = req.user?.id;
      const { deviceId, roomName, ttlSeconds, nonce, metadata } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Authenticated user session required.'
        });
      }

      const tokenData = defaultLiveKitTokenService.generateToken({
        userId,
        deviceId: deviceId || 'android_app',
        roomName,
        ttlSeconds: ttlSeconds ? parseInt(ttlSeconds, 10) : undefined,
        nonce,
        metadata
      });

      return res.status(200).json({
        success: true,
        data: tokenData
      });
    } catch (err) {
      const statusCode = err.message.includes('Replay') ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        errorCode: 'TOKEN_GENERATION_FAILED',
        message: err.message
      });
    }
  }

  /**
   * POST /api/livekit/session/start
   * Start a realtime voice agent session
   */
  static async startSession(req, res) {
    try {
      const userId = req.user?.id;
      const { deviceId, roomName, metadata } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Authenticated user session required.'
        });
      }

      const session = defaultLiveKitAgent.startSession({
        userId,
        deviceId,
        roomName,
        metadata
      });

      return res.status(200).json({
        success: true,
        data: {
          sessionId: session.sessionId,
          roomName: session.roomName,
          state: session.state,
          createdAt: session.createdAt
        }
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        errorCode: 'SESSION_START_FAILED',
        message: err.message
      });
    }
  }

  /**
   * POST /api/livekit/session/stop
   * Stop an active realtime voice agent session
   */
  static async stopSession(req, res) {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          errorCode: 'MISSING_SESSION_ID',
          message: 'sessionId is required.'
        });
      }

      const stopped = defaultLiveKitAgent.stopSession(sessionId);
      return res.status(200).json({
        success: true,
        stopped
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        errorCode: 'SESSION_STOP_FAILED',
        message: err.message
      });
    }
  }

  /**
   * POST /api/livekit/webhook
   * Handle incoming LiveKit server webhooks
   */
  static async handleWebhook(req, res) {
    try {
      const eventResult = defaultLiveKitEventHandler.handleWebhookEvent(req.body);
      return res.status(200).json(eventResult);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  /**
   * GET /api/livekit/diagnostics
   * Check LiveKit backend connectivity and configuration
   */
  static async getDiagnostics(req, res) {
    const isConfigured = defaultLiveKitTokenService.isConfigured();
    return res.status(200).json({
      status: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      liveKitUrl: process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880',
      activeRooms: defaultLiveKitAgent.roomManager.rooms.size,
      activeSessions: defaultLiveKitAgent.activeSessions.size,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = LiveKitController;
