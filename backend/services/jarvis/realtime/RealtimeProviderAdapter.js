const defaultRealtimeSessionManager = require('./RealtimeSessionManager');
const { aiModelRouter } = require('../providers/AIModelRouter');
const { aiProviderRegistry } = require('../providers/AIProviderRegistry');
const { PROVIDER_CAPABILITIES, PROVIDER_STATUS } = require('../providers/AIProvider');

/**
 * RealtimeProviderAdapter
 * Standardized bridge connecting AIModelRouter and providers to real bidirectional realtime sessions.
 */
class RealtimeProviderAdapter {
  constructor(options = {}) {
    this.providerName = (options.providerName || 'livekit').toLowerCase();
    this.sessionManager = options.sessionManager || defaultRealtimeSessionManager;
    this.modelRouter = options.modelRouter || aiModelRouter;
    this.providerRegistry = options.providerRegistry || aiProviderRegistry;
  }

  /**
   * Truthfully check readiness of the target provider
   */
  async checkReadiness() {
    const provider = this.providerRegistry.get(this.providerName);
    if (!provider) {
      return {
        ready: false,
        status: 'NOT_CONFIGURED',
        providerName: this.providerName
      };
    }

    if (this.providerName === 'livekit') {
      const url = process.env.LIVEKIT_URL || '';
      const key = process.env.LIVEKIT_API_KEY || '';
      if (!url || !key || url.includes('your_livekit_url')) {
        return {
          ready: false,
          status: 'NOT_CONFIGURED',
          providerName: 'livekit'
        };
      }
    }

    try {
      const isHealthy = await provider.healthCheck();
      return {
        ready: Boolean(isHealthy),
        status: provider.status,
        providerName: this.providerName
      };
    } catch (err) {
      return {
        ready: false,
        status: 'FAILED',
        error: err.message,
        providerName: this.providerName
      };
    }
  }

  /**
   * Check if any realtime transport provider is available and healthy
   */
  async getRealtimeProviderStatus() {
    const realtimeProviders = this.providerRegistry.getProvidersWithCapability(PROVIDER_CAPABILITIES.REALTIME_TRANSPORT);
    const statuses = {};

    for (const provider of realtimeProviders) {
      try {
        const isHealthy = await provider.healthCheck();
        statuses[provider.name] = {
          available: isHealthy,
          status: provider.status,
          capabilities: Array.from(provider.getCapabilities())
        };
      } catch (err) {
        statuses[provider.name] = {
          available: false,
          status: PROVIDER_STATUS.TEMPORARILY_FAILED,
          error: err.message
        };
      }
    }

    return statuses;
  }

  /**
   * Start an authenticated realtime session
   */
  createSession({ userId, deviceId, sessionId, transport, initialContext }) {
    return this.sessionManager.createSession({ userId, deviceId, sessionId, transport, initialContext });
  }

  /**
   * Process streaming audio chunk from microphone
   */
  pushAudioChunk(sessionId, userId, pcmFrame) {
    const session = this.sessionManager.getSession(sessionId, userId);
    if (!session) return false;
    session.pushAudioChunk(pcmFrame);
    return true;
  }

  /**
   * Trigger immediate speech interruption / barge-in
   */
  interrupt(sessionId, userId, reason) {
    return this.sessionManager.interruptSession(sessionId, userId, reason);
  }

  /**
   * Disconnect session
   */
  disconnectSession(sessionId, userId) {
    return this.sessionManager.closeSession(sessionId, userId);
  }

  /**
   * Get current state of realtime session
   */
  getSessionState(sessionId, userId) {
    const session = this.sessionManager.getSession(sessionId, userId);
    return session ? session.state : null;
  }
}

const defaultRealtimeProviderAdapter = new RealtimeProviderAdapter();

module.exports = RealtimeProviderAdapter;
module.exports.RealtimeProviderAdapter = RealtimeProviderAdapter;
module.exports.defaultRealtimeProviderAdapter = defaultRealtimeProviderAdapter;
