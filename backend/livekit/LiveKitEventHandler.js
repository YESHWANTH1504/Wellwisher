const EventEmitter = require('node:events');

/**
 * LiveKitEventHandler
 * Processes LiveKit Webhook events and connection status transitions.
 */
class LiveKitEventHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.roomManager = options.roomManager || null;
  }

  /**
   * Process incoming LiveKit Webhook payload
   */
  handleWebhookEvent(eventPayload = {}) {
    const { event, room, participant, track } = eventPayload;

    if (!event) {
      return { success: false, error: 'Missing event field in webhook payload' };
    }

    const timestamp = Date.now();

    switch (event) {
      case 'participant_joined':
        this.emit('participant_joined', {
          roomName: room?.name,
          participantId: participant?.identity,
          metadata: participant?.metadata,
          timestamp
        });
        break;

      case 'participant_left':
        this.emit('participant_left', {
          roomName: room?.name,
          participantId: participant?.identity,
          timestamp
        });
        break;

      case 'track_published':
        this.emit('track_published', {
          roomName: room?.name,
          participantId: participant?.identity,
          trackKind: track?.type || 'audio',
          trackSid: track?.sid,
          timestamp
        });
        break;

      case 'room_finished':
        this.emit('room_finished', {
          roomName: room?.name,
          timestamp
        });
        break;

      default:
        this.emit('unhandled_event', { event, timestamp });
        break;
    }

    return { success: true, event, processedAt: timestamp };
  }
}

const defaultLiveKitEventHandler = new LiveKitEventHandler();

module.exports = {
  LiveKitEventHandler,
  defaultLiveKitEventHandler
};
