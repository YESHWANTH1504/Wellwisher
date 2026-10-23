const OpenAIProvider = require('./OpenAIProvider');
const GeminiProvider = require('./GeminiProvider');
const ElevenLabsProvider = require('./ElevenLabsProvider');
const LiveKitProvider = require('./LiveKitProvider');
const { PROVIDER_STATUS } = require('./AIProvider');

class AIProviderRegistry {
  constructor() {
    this._providers = new Map();
    this._initDefaultProviders();
  }

  _initDefaultProviders() {
    this.register('gemini', new GeminiProvider());
    this.register('openai', new OpenAIProvider());
    this.register('elevenlabs', new ElevenLabsProvider());
    this.register('livekit', new LiveKitProvider());
  }

  /**
   * Register a provider instance by name
   * @param {string} name
   * @param {AIProvider} providerInstance
   */
  register(name, providerInstance) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (!providerInstance) {
      throw new Error(`Provider instance for "${name}" cannot be null`);
    }
    this._providers.set(name.toLowerCase(), providerInstance);
  }

  /**
   * Unregister a provider
   */
  unregister(name) {
    return this._providers.delete(name.toLowerCase());
  }

  /**
   * Get provider by name
   */
  get(name) {
    if (!name || typeof name !== 'string') return null;
    return this._providers.get(name.toLowerCase()) || null;
  }

  /**
   * Check if provider exists
   */
  has(name) {
    if (!name || typeof name !== 'string') return false;
    return this._providers.has(name.toLowerCase());
  }

  /**
   * Get all registered provider instances
   */
  getAll() {
    return Array.from(this._providers.values());
  }

  /**
   * Get all registered provider names
   */
  getProviderNames() {
    return Array.from(this._providers.keys());
  }

  /**
   * Get all providers supporting a given capability
   * @param {string} capability
   * @returns {Array<AIProvider>}
   */
  getProvidersWithCapability(capability) {
    const matching = [];
    for (const provider of this._providers.values()) {
      if (typeof provider.hasCapability === 'function' && provider.hasCapability(capability)) {
        matching.push(provider);
      }
    }
    return matching;
  }

  /**
   * Check whether a specific provider is currently healthy and available
   */
  async isProviderAvailable(name) {
    const provider = this.get(name);
    if (!provider) return false;
    if (provider.status === PROVIDER_STATUS.DISABLED) return false;
    return provider.healthCheck();
  }

  /**
   * Manually override or update a provider's status
   */
  setProviderStatus(name, status) {
    const provider = this.get(name);
    if (provider) {
      provider.status = status;
    }
  }

  /**
   * Get health status map across all registered providers
   */
  async getHealthStatus(forceRefresh = false) {
    const status = {};
    for (const [name, provider] of this._providers.entries()) {
      try {
        const isHealthy = await provider.healthCheck(forceRefresh);
        status[name] = {
          healthy: isHealthy,
          status: provider.status,
          capabilities: Array.from(provider.getCapabilities ? provider.getCapabilities() : [])
        };
      } catch (err) {
        status[name] = {
          healthy: false,
          status: PROVIDER_STATUS.TEMPORARILY_FAILED,
          error: err.message
        };
      }
    }
    return status;
  }
}

const aiProviderRegistry = new AIProviderRegistry();

module.exports = {
  AIProviderRegistry,
  aiProviderRegistry
};
