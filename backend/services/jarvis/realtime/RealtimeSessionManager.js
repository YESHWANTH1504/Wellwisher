const RealtimeSession = require('./RealtimeSession');
const { REALTIME_SESSION_STATES } = require('./RealtimeSessionStates');
const defaultRealtimeEventBus = require('./RealtimeEventBus');
const { REALTIME_EVENTS } = require('./RealtimeEventBus');
const { defaultSupervisorAgent } = require('../agent/JarvisSupervisorAgent');
const { activeTaskManager } = require('../tasks/ActiveTaskManager');

class RealtimeSessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.supervisor = options.supervisor || defaultSupervisorAgent;
    this.eventBus = options.eventBus || defaultRealtimeEventBus;
    this.sessionTimeoutMs = options.sessionTimeoutMs || 5 * 60 * 1000; // 5 min idle cleanup
    this._startCleanupTimer();
  }

  /**
   * Create a new authenticated realtime session
   * @param {Object} options - { userId, deviceId, sessionId, transport, initialContext }
   */
  createSession(options = {}) {
    const { userId, deviceId, sessionId, transport, initialContext } = options;
    if (userId === undefined || userId === null || typeof userId !== 'number' || isNaN(userId)) {
      throw new Error('RealtimeSessionManager: Valid authenticated numeric userId is required.');
    }

    const session = new RealtimeSession({
      userId,
      deviceId,
      sessionId,
      transport,
      initialContext,
      eventBus: this.eventBus
    });

    this.sessions.set(session.sessionId, session);

    // Bind speech completion to supervisor orchestration
    session.on('speech_end', async (evt) => {
      await this._handleSpeechTurn(session, evt);
    });

    session.on('barge_in', (evt) => {
      if (this.supervisor && typeof this.supervisor.handleInterruption === 'function') {
        this.supervisor.handleInterruption(session.sessionId);
      }
    });

    session.connect();
    return session;
  }

  /**
   * Get an existing session verifying user authorization
   */
  getSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (userId !== undefined && userId !== null && session.userId !== userId) {
      // Cross-user IDOR access attempt blocked
      return null;
    }
    return session;
  }

  /**
   * Handle user speech turn through authoritative supervisor intelligence
   */
  async _handleSpeechTurn(session, evt) {
    if (!session || session.state === REALTIME_SESSION_STATES.DISCONNECTED) return;

    const startTime = Date.now();

    try {
      // Load any active task into context
      const activeTask = activeTaskManager.getActiveTask(session.sessionId, session.userId);

      // Invoke supervisor intelligence pipeline
      const transcriptText = evt.transcriptText || (evt.capturedAudio ? 'Voice utterance received' : '');
      if (!transcriptText) {
        session.transitionTo(REALTIME_SESSION_STATES.LISTENING);
        return;
      }

      const result = await this.supervisor.processRequest(
        session.userId,
        transcriptText,
        {
          sessionId: session.sessionId,
          activeTask
        }
      );

      // Check if session was interrupted while processing
      if (session.state === REALTIME_SESSION_STATES.INTERRUPTED) {
        return;
      }

      if (result && result.speech) {
        session.setAssistantSpeaking();
        this.eventBus.publish(REALTIME_EVENTS.ASSISTANT_SPEECH_STARTED, {
          sessionId: session.sessionId,
          userId: session.userId,
          textLength: result.speech.length,
          latencyMs: Date.now() - startTime
        });
      } else {
        session.transitionTo(REALTIME_SESSION_STATES.LISTENING);
      }
    } catch (err) {
      this.eventBus.publish(REALTIME_EVENTS.REALTIME_ERROR, {
        sessionId: session.sessionId,
        userId: session.userId,
        error: err.message
      });
      session.transitionTo(REALTIME_SESSION_STATES.ERROR);
    }
  }

  /**
   * Explicit client or voice interruption
   */
  interruptSession(sessionId, userId, reason = 'User barge-in') {
    const session = this.getSession(sessionId, userId);
    if (!session) return false;

    session.handleBargeIn(reason);
    if (this.supervisor && typeof this.supervisor.handleInterruption === 'function') {
      this.supervisor.handleInterruption(sessionId);
    }
    return true;
  }

  /**
   * Terminate and clean up session
   */
  closeSession(sessionId, userId) {
    const session = this.getSession(sessionId, userId);
    if (!session) return false;

    session.disconnect();
    this.sessions.delete(sessionId);
    return true;
  }

  _startCleanupTimer() {
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions.entries()) {
        if (now - session.lastActivityAt > this.sessionTimeoutMs) {
          session.disconnect();
          this.sessions.delete(id);
        }
      }
    }, 60000);
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    for (const session of this.sessions.values()) {
      session.disconnect();
    }
    this.sessions.clear();
  }
}

const defaultRealtimeSessionManager = new RealtimeSessionManager();

module.exports = defaultRealtimeSessionManager;
module.exports.RealtimeSessionManager = RealtimeSessionManager;
module.exports.defaultRealtimeSessionManager = defaultRealtimeSessionManager;
