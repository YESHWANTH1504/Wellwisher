const EventEmitter = require('node:events');
const { REALTIME_SESSION_STATES, canTransition } = require('./RealtimeSessionStates');
const RealtimeAudioProtocol = require('./RealtimeAudioProtocol');
const defaultRealtimeEventBus = require('./RealtimeEventBus');
const { REALTIME_EVENTS } = require('./RealtimeEventBus');

class RealtimeSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessionId = options.sessionId || `rt_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.userId = options.userId;
    if (this.userId === undefined || this.userId === null || typeof this.userId !== 'number' || isNaN(this.userId)) {
      throw new Error('RealtimeSession requires an authenticated numeric userId.');
    }
    this.deviceId = options.deviceId || 'android_client';
    this.transport = options.transport || 'audio_stream';
    this.state = REALTIME_SESSION_STATES.IDLE;
    this.eventBus = options.eventBus || defaultRealtimeEventBus;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();

    // Context continuity
    this.context = { ...(options.initialContext || {}) };

    // Audio & VAD configuration
    this.sampleRate = options.sampleRate || RealtimeAudioProtocol.SAMPLE_RATE;
    this.vadThreshold = options.vadThreshold || RealtimeAudioProtocol.CONFIG.DEFAULT_VAD_THRESHOLD;
    this.silenceTimeoutMs = options.silenceTimeoutMs || RealtimeAudioProtocol.CONFIG.DEFAULT_SILENCE_TIMEOUT_MS;

    // Turn tracking
    this.turnIndex = 0;
    this.silenceTimer = null;
    this.speechStartTime = 0;
    this.audioBuffer = [];
    this.currentAssistantAudioStream = null;
    this.interrupted = false;

    this.eventBus.publish(REALTIME_EVENTS.SESSION_CREATED, {
      sessionId: this.sessionId,
      userId: this.userId,
      deviceId: this.deviceId
    });
  }

  getState() {
    return this.state;
  }

  updateContext(newContext = {}) {
    this.context = {
      ...this.context,
      ...newContext
    };
    return this.context;
  }

  /**
   * Transition session state with strict state machine validation
   */
  transitionTo(newState) {
    if (this.state === newState) return this.state;

    if (!canTransition(this.state, newState)) {
      console.warn(`[REALTIME_SESSION] Invalid transition requested: ${this.state} -> ${newState} for session ${this.sessionId}`);
      return this.state;
    }

    const oldState = this.state;
    this.state = newState;
    this.lastActivityAt = Date.now();

    this.emit('state_change', { oldState, newState, sessionId: this.sessionId });
    return this.state;
  }

  /**
   * Connect session
   */
  connect() {
    this.transitionTo(REALTIME_SESSION_STATES.CONNECTING);
    this.eventBus.publish(REALTIME_EVENTS.CONNECTING, { sessionId: this.sessionId, userId: this.userId });
    this.transitionTo(REALTIME_SESSION_STATES.CONNECTED);
    this.transitionTo(REALTIME_SESSION_STATES.LISTENING);
    this.eventBus.publish(REALTIME_EVENTS.CONNECTED, { sessionId: this.sessionId, userId: this.userId });
    return true;
  }

  /**
   * Feed an incoming PCM audio frame from the microphone into the session
   * @param {Buffer} pcmFrame - 16kHz 16-bit Mono PCM chunk
   * @returns {Object} { interrupted: boolean, state: string }
   */
  pushAudioChunk(pcmFrame) {
    this.lastActivityAt = Date.now();

    if (!RealtimeAudioProtocol.isValidPcmFrame(pcmFrame)) {
      return { interrupted: false, state: this.state };
    }

    const isSpeech = RealtimeAudioProtocol.isSpeech(pcmFrame, this.vadThreshold);
    const now = Date.now();

    if (isSpeech) {
      // 1. BARGE-IN: If assistant is speaking or processing, immediately interrupt!
      if (this.state === REALTIME_SESSION_STATES.ASSISTANT_SPEAKING || this.state === REALTIME_SESSION_STATES.PROCESSING) {
        this.interrupted = true;
        this.transitionTo(REALTIME_SESSION_STATES.INTERRUPTED);

        if (this.currentAssistantAudioStream) {
          this.currentAssistantAudioStream = null;
        }

        this.eventBus.publish('barge_in', {
          sessionId: this.sessionId,
          userId: this.userId,
          reason: 'user_acoustic_barge_in'
        });
        this.eventBus.publish(REALTIME_EVENTS.BARGE_IN_DETECTED, {
          sessionId: this.sessionId,
          userId: this.userId,
          reason: 'user_acoustic_barge_in'
        });

        this.emit('barge_in', { timestamp: now, reason: 'user_acoustic_barge_in' });

        this.transitionTo(REALTIME_SESSION_STATES.USER_SPEAKING);
        this.speechStartTime = now;
        this.audioBuffer = [pcmFrame];
        this.emit('speech_start', { timestamp: now, energy: RealtimeAudioProtocol.calculateRmsEnergy(pcmFrame) });

        return { interrupted: true, state: this.state };
      }

      if (this.state === REALTIME_SESSION_STATES.LISTENING || this.state === REALTIME_SESSION_STATES.INTERRUPTED) {
        this.speechStartTime = now;
        this.audioBuffer = [pcmFrame];
        this.transitionTo(REALTIME_SESSION_STATES.USER_SPEAKING);
        this.eventBus.publish(REALTIME_EVENTS.USER_SPEECH_STARTED, {
          sessionId: this.sessionId,
          userId: this.userId,
          energy: RealtimeAudioProtocol.calculateRmsEnergy(pcmFrame)
        });
        this.emit('speech_start', { timestamp: now, energy: RealtimeAudioProtocol.calculateRmsEnergy(pcmFrame) });
      } else if (this.state === REALTIME_SESSION_STATES.USER_SPEAKING) {
        this.audioBuffer.push(pcmFrame);
      }

      // Reset silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.state === REALTIME_SESSION_STATES.USER_SPEAKING) {
      // Below threshold during user speech -> start silence timer
      this.audioBuffer.push(pcmFrame);
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this._finalizeUserSpeechTurn();
        }, this.silenceTimeoutMs);
      }
    }

    return { interrupted: false, state: this.state };
  }

  /**
   * Handle immediate barge-in interruption
   */
  interrupt(reason = 'User interruption') {
    this.interrupted = true;
    this.transitionTo(REALTIME_SESSION_STATES.INTERRUPTED);

    // Stop and discard pending assistant audio
    if (this.currentAssistantAudioStream) {
      this.currentAssistantAudioStream = null;
    }

    this.eventBus.publish('barge_in', {
      sessionId: this.sessionId,
      userId: this.userId,
      reason
    });

    this.eventBus.publish(REALTIME_EVENTS.BARGE_IN_DETECTED, {
      sessionId: this.sessionId,
      userId: this.userId,
      reason
    });

    this.emit('barge_in', { timestamp: Date.now(), reason });

    // Transition back to LISTENING to capture user follow-up
    this.transitionTo(REALTIME_SESSION_STATES.LISTENING);
    return true;
  }

  handleBargeIn(reason = 'User interruption') {
    return this.interrupt(reason);
  }

  /**
   * Complete user speech turn and trigger transcript/intelligence processing
   */
  _finalizeUserSpeechTurn() {
    if (this.state !== REALTIME_SESSION_STATES.USER_SPEAKING) return;

    this.silenceTimer = null;
    const durationMs = Date.now() - this.speechStartTime;
    const capturedAudio = Buffer.concat(this.audioBuffer);
    this.audioBuffer = [];

    this.transitionTo(REALTIME_SESSION_STATES.PROCESSING);
    this.eventBus.publish(REALTIME_EVENTS.USER_SPEECH_ENDED, {
      sessionId: this.sessionId,
      userId: this.userId,
      durationMs,
      audioBytes: capturedAudio.length
    });

    this.emit('speech_end', {
      timestamp: Date.now(),
      durationMs,
      capturedAudio
    });
  }

  /**
   * Mark that assistant has started speaking response
   */
  setAssistantSpeaking(streamHandle = null) {
    this.interrupted = false;
    this.currentAssistantAudioStream = streamHandle;
    this.transitionTo(REALTIME_SESSION_STATES.ASSISTANT_SPEAKING);
    this.eventBus.publish(REALTIME_EVENTS.ASSISTANT_SPEECH_STARTED, {
      sessionId: this.sessionId,
      userId: this.userId
    });
  }

  /**
   * Mark that assistant has finished speaking response
   */
  setAssistantSpeechCompleted() {
    this.currentAssistantAudioStream = null;
    if (this.state === REALTIME_SESSION_STATES.ASSISTANT_SPEAKING) {
      this.eventBus.publish(REALTIME_EVENTS.ASSISTANT_SPEECH_STOPPED, {
        sessionId: this.sessionId,
        userId: this.userId
      });
      this.transitionTo(REALTIME_SESSION_STATES.LISTENING);
    }
  }

  /**
   * Disconnect and release all resources
   */
  disconnect() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.audioBuffer = [];
    this.currentAssistantAudioStream = null;
    if (this.state !== REALTIME_SESSION_STATES.DISCONNECTED) {
      if (this.state !== REALTIME_SESSION_STATES.DISCONNECTING) {
        this.transitionTo(REALTIME_SESSION_STATES.DISCONNECTING);
      }
      this.transitionTo(REALTIME_SESSION_STATES.DISCONNECTED);
    }
    this.eventBus.publish(REALTIME_EVENTS.DISCONNECTED, {
      sessionId: this.sessionId,
      userId: this.userId
    });
    this.emit('disconnected', { sessionId: this.sessionId });
  }

  close() {
    this.disconnect();
  }
}

module.exports = RealtimeSession;
