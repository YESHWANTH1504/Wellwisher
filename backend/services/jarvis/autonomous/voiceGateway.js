const { defaultAgent } = require('../agent/jarvisAgent');
const AiAutonomousRepository = require('../../../repositories/ai/aiAutonomousRepository');

class VoiceGateway {
  /**
   * Process background / headless voice invocation (e.g. triggered by "Hey JARVIS")
   */
  static async processVoiceCommand({
    userId,
    transcript,
    deviceId = 'device_headless_bg',
    conversationId = null,
    timezone = 'UTC'
  }) {
    const startTime = Date.now();
    const cleanTranscript = (transcript || '').trim();

    if (!cleanTranscript) {
      return {
        success: false,
        intent: 'EMPTY_INPUT',
        spokenResponse: 'I did not catch that. How can I help you?',
        executionSteps: [],
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 1. Process via JarvisAgent
      const response = await defaultAgent.processRequest(userId, cleanTranscript, {
        conversationId,
        timezone,
        source: 'WAKE_WORD_VOICE'
      });

      const durationMs = Date.now() - startTime;
      const executionSteps = response.steps || response.executionSteps || [];

      // 2. Record autonomous execution run telemetry
      await AiAutonomousRepository.recordExecutionRun({
        userId,
        triggerSource: 'WAKE_WORD_VOICE',
        inputText: cleanTranscript,
        intent: response.intent || 'GENERAL_CONVERSATION',
        status: response.success ? 'SUCCESS' : 'FAILED',
        executionSteps,
        responseText: response.message,
        durationMs
      });

      return {
        success: response.success,
        intent: response.intent,
        spokenResponse: response.message,
        executionSteps,
        confirmation: response.confirmation || null,
        requiresConfirmation: response.requiresConfirmation || false,
        conversationId: response.conversationId || conversationId,
        timestamp: response.timestamp || new Date().toISOString()
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await AiAutonomousRepository.recordExecutionRun({
        userId,
        triggerSource: 'WAKE_WORD_VOICE',
        inputText: cleanTranscript,
        intent: 'ERROR',
        status: 'FAILED',
        executionSteps: [],
        responseText: `Error: ${err.message}`,
        durationMs
      });

      return {
        success: false,
        intent: 'ERROR',
        spokenResponse: 'I encountered an error executing that request. Please try again in a moment.',
        executionSteps: [],
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = VoiceGateway;
