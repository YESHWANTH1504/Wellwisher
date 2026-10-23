const EventEmitter = require('node:events');
const { LiveKitAudioSession } = require('./LiveKitAudioSession');

const LIVEKIT_SESSION_STATES = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  SPEAKING: 'SPEAKING',
  INTERRUPTED: 'INTERRUPTED',
  RECONNECTING: 'RECONNECTING',
  FAILED: 'FAILED'
};

/**
 * JarvisLiveKitSession
 * Represents an active LiveKit WebRTC realtime voice session between client and JARVIS agent.
 */
class JarvisLiveKitSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessionId = options.sessionId || `lk_sess_${Date.now()}`;
    this.userId = options.userId || null;
    this.deviceId = options.deviceId || 'android_device';
    this.roomName = options.roomName || `room_${this.userId}`;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();
    this.state = LIVEKIT_SESSION_STATES.DISCONNECTED;

    this.audioSession = new LiveKitAudioSession({
      sessionId: this.sessionId,
      userId: this.userId
    });

    this._setupAudioListeners();
  }

  _setupAudioListeners() {
    this.audioSession.on('speech_start', (evt) => {
      if (this.state === LIVEKIT_SESSION_STATES.SPEAKING) {
        this.transitionTo(LIVEKIT_SESSION_STATES.INTERRUPTED);
        this.emit('barge_in', evt);
      } else {
        this.transitionTo(LIVEKIT_SESSION_STATES.LISTENING);
        this.emit('speech_start', evt);
      }
    });

    this.audioSession.on('speech_end', (evt) => {
      this.transitionTo(LIVEKIT_SESSION_STATES.PROCESSING);
      this.emit('speech_end', evt);
    });

    this.audioSession.on('barge_in', (evt) => {
      this.transitionTo(LIVEKIT_SESSION_STATES.INTERRUPTED);
      this.emit('barge_in', evt);
    });
  }

  /**
   * Safe state transition
   */
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastActivityAt = Date.now();
    this.emit('state_change', { oldState, newState, sessionId: this.sessionId });
    return this.state;
  }

  /**
   * Feed raw PCM audio frames into the session
   */
  pushAudioChunk(pcmChunk) {
    this.lastActivityAt = Date.now();
    this.audioSession.processAudioFrame(pcmChunk);
  }

  /**
   * Notify session that the agent has started speaking (for barge-in tracking)
   */
  setSpeakingState(isSpeaking) {
    this.audioSession.setAgentSpeaking(isSpeaking);
    if (isSpeaking) {
      this.transitionTo(LIVEKIT_SESSION_STATES.SPEAKING);
    } else if (this.state === LIVEKIT_SESSION_STATES.SPEAKING) {
      this.transitionTo(LIVEKIT_SESSION_STATES.CONNECTED);
    }
  }

  /**
   * Disconnect and clean up session
   */
  disconnect() {
    this.audioSession.reset();
    this.transitionTo(LIVEKIT_SESSION_STATES.DISCONNECTED);
    this.emit('disconnected', { sessionId: this.sessionId });
  }
}

module.exports = {
  JarvisLiveKitSession,
  LIVEKIT_SESSION_STATES
};
