const EventEmitter = require('node:events');
const { JarvisLiveKitSession, LIVEKIT_SESSION_STATES } = require('./JarvisLiveKitSession');
const { defaultSupervisorAgent } = require('../services/jarvis/agent/JarvisSupervisorAgent');
const { defaultLiveKitTokenService } = require('./LiveKitTokenService');
const { defaultLiveKitRoomManager } = require('./LiveKitRoomManager');
const { defaultVoiceTelemetry } = require('../services/jarvis/telemetry/voiceTelemetryService');

/**
 * JarvisLiveKitAgent
 * Realtime Voice Agent runtime over LiveKit WebRTC transport.
 * Receives audio streams, manages VAD turn-taking, executes supervisor intelligence,
 * synthesizes streaming voice responses, and handles immediate barge-in.
 */
class JarvisLiveKitAgent extends EventEmitter {
  constructor(options = {}) {
    super();
    this.supervisor = options.supervisor || defaultSupervisorAgent;
    this.tokenService = options.tokenService || defaultLiveKitTokenService;
    this.roomManager = options.roomManager || defaultLiveKitRoomManager;
    this.telemetry = options.telemetry || defaultVoiceTelemetry;
    this.activeSessions = new Map();
  }

  /**
   * Start a new realtime LiveKit agent session for an authenticated user
   */
  startSession({ userId, deviceId, roomName, metadata = {} }) {
    if (!userId) {
      throw new Error('JarvisLiveKitAgent: userId is required to start a LiveKit session.');
    }

    const room = roomName || `jarvis_room_${userId}_${deviceId || 'dev'}`;
    const session = new JarvisLiveKitSession({
      userId,
      deviceId,
      roomName: room
    });

    this.activeSessions.set(session.sessionId, session);
    this.roomManager.getOrCreateRoom(room, { metadata });
    this.roomManager.addParticipant(room, `user_${userId}`, metadata);

    session.transitionTo(LIVEKIT_SESSION_STATES.CONNECTED);

    // Setup Session Event Handlers
    session.on('speech_end', async (evt) => {
      this.emit('user_speech_complete', { sessionId: session.sessionId, durationMs: evt.durationMs });
    });

    session.on('barge_in', (evt) => {
      this.supervisor.handleInterruption(session.sessionId);
      session.setSpeakingState(false);
      this.emit('barge_in_handled', { sessionId: session.sessionId, timestamp: evt.timestamp });
    });

    return session;
  }

  /**
   * Process a speech transcript from LiveKit participant and generate spoken response
   */
  async handleSpeechTranscript(sessionId, transcriptText, options = {}) {
    const session = this.activeSessions.get(sessionId);
    const startTime = Date.now();

    if (!session) {
      return {
        success: false,
        errorCode: 'SESSION_NOT_FOUND',
        speech: 'Voice session expired. Please say Hey Jarvis again.'
      };
    }

    session.transitionTo(LIVEKIT_SESSION_STATES.PROCESSING);

    // Run Supervisor Intelligence
    const agentResult = await this.supervisor.processRequest(
      session.userId,
      transcriptText,
      {
        sessionId: session.sessionId,
        timezone: options.timezone || 'UTC',
        isConfirmed: Boolean(options.isConfirmed)
      }
    );

    const totalDuration = Date.now() - startTime;

    // Record Sanitized Telemetry
    this.telemetry.recordSample({
      isGenuinePhysicalSample: options.isGenuinePhysicalSample || false,
      sttLatencyMs: options.sttLatencyMs || 250,
      geminiLatencyMs: totalDuration,
      totalResponseLatencyMs: totalDuration + (options.sttLatencyMs || 250)
    });

    session.setSpeakingState(true);
    session.transitionTo(LIVEKIT_SESSION_STATES.SPEAKING);

    return {
      success: agentResult.success !== false,
      sessionId: session.sessionId,
      speech: agentResult.speech,
      intent: agentResult.intent,
      executionStatus: agentResult.executionStatus || 'VERIFIED',
      telemetry: {
        totalDurationMs: totalDuration
      }
    };
  }

  /**
   * Close a LiveKit voice session
   */
  stopSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.disconnect();
    this.activeSessions.delete(sessionId);
    this.roomManager.removeParticipant(session.roomName, `user_${session.userId}`);
    return true;
  }

  /**
   * Get active session by ID
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }
}

const defaultLiveKitAgent = new JarvisLiveKitAgent();

module.exports = {
  JarvisLiveKitAgent,
  defaultLiveKitAgent
};
