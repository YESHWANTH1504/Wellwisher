const { AIProvider, PROVIDER_CAPABILITIES, PROVIDER_STATUS } = require('./AIProvider');
const { defaultLiveKitTokenService } = require('../../../livekit/LiveKitTokenService');

class LiveKitProvider extends AIProvider {
  constructor(config = {}) {
    super('livekit', config);
    this.tokenService = config.tokenService || defaultLiveKitTokenService;
    this.wsUrl = config.wsUrl || process.env.LIVEKIT_URL || '';
  }

  getCapabilities() {
    return new Set([
      PROVIDER_CAPABILITIES.REALTIME_TRANSPORT
    ]);
  }

  async _performHealthCheck() {
    if (!this.tokenService || typeof this.tokenService.isConfigured !== 'function') {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return false;
    }
    const configured = Boolean(this.tokenService.isConfigured());
    this.status = configured ? PROVIDER_STATUS.AVAILABLE : PROVIDER_STATUS.MISCONFIGURED;
    return configured;
  }

  /**
   * Create an authentication token for a realtime voice room
   */
  createToken(roomName, participantIdentity, metadata = {}) {
    if (!this.tokenService || !this.tokenService.isConfigured()) {
      throw new Error('LiveKitProvider is not configured with valid server credentials.');
    }
    return this.tokenService.generateToken({
      userId: participantIdentity,
      roomName: roomName || 'jarvis_realtime',
      metadata
    });
  }

  /**
   * Realtime Provider Contract implementation for LiveKit
   */
  async createRealtimeSession(options = {}) {
    if (!this.tokenService || !this.tokenService.isConfigured()) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      throw new Error('LiveKitProvider is not configured with valid server credentials.');
    }
    const roomName = options.roomName || `jarvis_rt_${options.userId}_${Date.now()}`;
    const tokenData = this.tokenService.generateToken({
      userId: options.userId,
      roomName,
      metadata: options.metadata || {}
    });
    return {
      provider: 'livekit',
      sessionId: options.sessionId || roomName,
      roomName,
      wsUrl: this.wsUrl,
      token: tokenData.token,
      ttlSeconds: tokenData.ttlSeconds,
      createdAt: Date.now()
    };
  }

  async connectRealtimeSession(sessionId) {
    if (!this.tokenService || !this.tokenService.isConfigured()) {
      throw new Error('LiveKitProvider is not configured with valid server credentials.');
    }
    return true;
  }

  async disconnectRealtimeSession(sessionId) {
    return true;
  }

  async sendAudioChunk(sessionId, audioChunk) {
    return true;
  }

  async sendText(sessionId, text) {
    return true;
  }

  async interruptResponse(sessionId) {
    return true;
  }

  getRealtimeSessionState(sessionId) {
    return this.status;
  }
}

module.exports = LiveKitProvider;
