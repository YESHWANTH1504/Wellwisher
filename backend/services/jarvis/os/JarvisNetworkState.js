/**
 * JarvisNetworkState
 * Monitors and tracks network connectivity, provider reachability,
 * and failover latency across local and cloud endpoints.
 *
 * States:
 * - ONLINE: Full internet and cloud provider reachability
 * - HYBRID: Local reachable, cloud partially degraded or high latency
 * - OFFLINE: No internet connectivity or physical airplane mode
 * - DEGRADED: Specific cloud providers failing, fallback active
 * - UNKNOWN: Initial state before reachability check
 */

const NETWORK_STATES = Object.freeze({
  ONLINE: 'ONLINE',
  HYBRID: 'HYBRID',
  OFFLINE: 'OFFLINE',
  DEGRADED: 'DEGRADED',
  UNKNOWN: 'UNKNOWN'
});

const REACHABILITY_TARGETS = Object.freeze({
  INTERNET: 'internet',
  BACKEND: 'backend',
  GEMINI: 'gemini',
  OPENAI: 'openai',
  REALTIME: 'realtime',
  TTS_CLOUD: 'tts_cloud'
});

class JarvisNetworkState {
  constructor(options = {}) {
    this._state = options.initialState || NETWORK_STATES.ONLINE;
    this._forcedOffline = Boolean(options.forcedOffline);
    this._lastCheck = Date.now();
    this._reachability = {
      internet: true,
      backend: true,
      gemini: true,
      openai: true,
      realtime: true,
      tts_cloud: true
    };
    this._providerLatencies = {
      gemini: 150,
      openai: 220,
      backend: 10
    };
    this._failedProviders = new Set();
    this._listeners = new Set();
  }

  getNetworkState() {
    if (this._forcedOffline) return NETWORK_STATES.OFFLINE;
    return this._state;
  }

  isOnline() {
    return this.getNetworkState() === NETWORK_STATES.ONLINE || this.getNetworkState() === NETWORK_STATES.HYBRID;
  }

  isOffline() {
    return this.getNetworkState() === NETWORK_STATES.OFFLINE;
  }

  isDegraded() {
    return this.getNetworkState() === NETWORK_STATES.DEGRADED;
  }

  setForcedOffline(forced) {
    const prev = this.getNetworkState();
    this._forcedOffline = Boolean(forced);
    if (this._forcedOffline) {
      this._state = NETWORK_STATES.OFFLINE;
      this._reachability.internet = false;
      this._reachability.gemini = false;
      this._reachability.openai = false;
      this._reachability.realtime = false;
      this._reachability.tts_cloud = false;
    } else {
      this._evaluateCompositeState();
    }
    this._notifyStateChange(prev, this.getNetworkState());
  }

  setProviderFailure(providerName, isFailed = true) {
    const key = providerName.toLowerCase();
    const prev = this.getNetworkState();
    if (isFailed) {
      this._failedProviders.add(key);
      if (this._reachability[key] !== undefined) {
        this._reachability[key] = false;
      }
    } else {
      this._failedProviders.delete(key);
      if (this._reachability[key] !== undefined) {
        this._reachability[key] = true;
      }
    }
    this._evaluateCompositeState();
    this._notifyStateChange(prev, this.getNetworkState());
  }

  isProviderReachable(providerName) {
    if (this._forcedOffline) return false;
    const key = providerName.toLowerCase();
    if (this._failedProviders.has(key)) return false;
    return this._reachability[key] !== false;
  }

  setProviderLatency(providerName, latencyMs) {
    const key = providerName.toLowerCase();
    this._providerLatencies[key] = latencyMs;
    // If latency is excessive (>3000ms), mark as degraded
    if (latencyMs > 3000) {
      this.setProviderFailure(key, true);
    }
  }

  getProviderLatency(providerName) {
    return this._providerLatencies[providerName.toLowerCase()] || 0;
  }

  getReachability() {
    if (this._forcedOffline) {
      return {
        internet: false,
        backend: true,
        gemini: false,
        openai: false,
        realtime: false,
        tts_cloud: false
      };
    }
    return { ...this._reachability };
  }

  /**
   * Evaluate overall composite state based on connectivity & provider health
   */
  _evaluateCompositeState() {
    if (this._forcedOffline || !this._reachability.internet) {
      this._state = NETWORK_STATES.OFFLINE;
      return;
    }

    const failedCount = this._failedProviders.size;
    if (failedCount === 0) {
      this._state = NETWORK_STATES.ONLINE;
    } else if (this._failedProviders.has('gemini') && this._failedProviders.has('openai')) {
      // All primary cloud AI models are down
      this._state = NETWORK_STATES.DEGRADED;
    } else {
      this._state = NETWORK_STATES.HYBRID;
    }
  }

  addListener(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
    }
  }

  removeListener(listener) {
    this._listeners.delete(listener);
  }

  _notifyStateChange(oldState, newState) {
    if (oldState === newState) return;
    for (const listener of this._listeners) {
      try {
        listener({ oldState, newState, reachability: this.getReachability() });
      } catch (err) {
        console.error('[JarvisNetworkState] Listener error:', err.message);
      }
    }
  }

  reset() {
    this._forcedOffline = false;
    this._state = NETWORK_STATES.ONLINE;
    this._failedProviders.clear();
    this._reachability = {
      internet: true,
      backend: true,
      gemini: true,
      openai: true,
      realtime: true,
      tts_cloud: true
    };
    this._providerLatencies = { gemini: 150, openai: 220, backend: 10 };
  }
}

const defaultNetworkState = new JarvisNetworkState();

module.exports = {
  JarvisNetworkState,
  defaultNetworkState,
  NETWORK_STATES,
  REACHABILITY_TARGETS
};
