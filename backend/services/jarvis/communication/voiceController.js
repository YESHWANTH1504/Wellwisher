const { defaultVoiceRouter } = require('./voiceCommandRouter');
const { defaultVoiceSessionManager } = require('./voiceSessionManager');
const { defaultVoiceTelemetry } = require('../telemetry/voiceTelemetryService');

/**
 * Controller for JARVIS Voice Assistant Endpoints (Phase 51).
 */
class VoiceController {
    /**
     * POST /api/jarvis/voice/command
     */
    static async handleVoiceCommand(req, res) {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    errorCode: 'UNAUTHORIZED',
                    message: 'Authentication token required.'
                });
            }

            const payload = req.body || {};
            const result = await defaultVoiceRouter.routeVoiceCommand(userId, payload, {
                timezone: req.headers['x-timezone'] || payload.timezone || 'UTC',
                langCode: req.headers['x-lang-code'] || payload.langCode || 'en-US',
                isGenuinePhysicalSample: req.headers['x-genuine-hardware'] === 'true'
            });

            const statusCode = result.success ? 200 : (result.errorCode === 'UNAUTHORIZED' ? 401 : 400);
            return res.status(statusCode).json(result);
        } catch (err) {
            console.error('VoiceController handleVoiceCommand error:', err.message);
            return res.status(500).json({
                success: false,
                errorCode: 'INTERNAL_VOICE_ERROR',
                speech: 'An internal voice processing error occurred.',
                message: 'Internal server error'
            });
        }
    }

    /**
     * POST /api/jarvis/voice/cancel
     */
    static async cancelVoiceSession(req, res) {
        try {
            const userId = req.userId;
            const { sessionId } = req.body || {};

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const cancelled = defaultVoiceSessionManager.cancelSession(sessionId, userId);
            return res.json({
                success: true,
                cancelled,
                message: 'Voice session cancelled'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * GET /api/jarvis/voice/telemetry
     */
    static async getVoiceTelemetry(req, res) {
        try {
            const onlyGenuine = req.query.physicalOnly === 'true';
            const report = defaultVoiceTelemetry.getMetricsReport(onlyGenuine);
            return res.json({
                success: true,
                data: report
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = VoiceController;
