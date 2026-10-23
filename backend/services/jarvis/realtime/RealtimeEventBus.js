const EventEmitter = require('node:events');

const REALTIME_EVENTS = Object.freeze({
  SESSION_CREATED: 'REALTIME_SESSION_CREATED',
  CONNECTING: 'REALTIME_CONNECTING',
  CONNECTED: 'REALTIME_CONNECTED',
  DISCONNECTED: 'REALTIME_DISCONNECTED',
  RECONNECTING: 'REALTIME_RECONNECTING',
  AUDIO_CAPTURE_STARTED: 'AUDIO_CAPTURE_STARTED',
  AUDIO_CAPTURE_STOPPED: 'AUDIO_CAPTURE_STOPPED',
  USER_SPEECH_STARTED: 'USER_SPEECH_STARTED',
  USER_SPEECH_ENDED: 'USER_SPEECH_ENDED',
  ASSISTANT_SPEECH_STARTED: 'ASSISTANT_SPEECH_STARTED',
  ASSISTANT_SPEECH_STOPPED: 'ASSISTANT_SPEECH_STOPPED',
  BARGE_IN_DETECTED: 'BARGE_IN_DETECTED',
  PROVIDER_FAILURE: 'PROVIDER_FAILURE',
  PROVIDER_SWITCH: 'PROVIDER_SWITCH',
  TOOL_CALL_STARTED: 'TOOL_CALL_STARTED',
  TOOL_CALL_COMPLETED: 'TOOL_CALL_COMPLETED',
  REALTIME_ERROR: 'REALTIME_ERROR'
});

class RealtimeEventBus extends EventEmitter {
  constructor() {
    super();
    this.eventHistory = [];
    this.maxHistory = 100;
  }

  /**
   * Emit event with structured payload and record telemetry
   * Strictly avoids logging raw audio buffers or credentials.
   */
  publish(eventType, payload = {}) {
    const timestamp = Date.now();
    const event = {
      type: eventType,
      timestamp,
      sessionId: payload.sessionId || null,
      userId: payload.userId || null,
      metadata: { ...payload }
    };

    // Sanitize any audio buffer or secret keys
    delete event.metadata.audioChunk;
    delete event.metadata.pcmBuffer;
    delete event.metadata.token;
    delete event.metadata.apiKey;

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    this.emit(eventType, payload);
    this.emit('*', event);
    return event;
  }

  getRecentEvents(limit = 20) {
    return this.eventHistory.slice(0, limit);
  }
}

const defaultRealtimeEventBus = new RealtimeEventBus();

module.exports = defaultRealtimeEventBus;
module.exports.RealtimeEventBus = RealtimeEventBus;
module.exports.defaultRealtimeEventBus = defaultRealtimeEventBus;
module.exports.REALTIME_EVENTS = REALTIME_EVENTS;
