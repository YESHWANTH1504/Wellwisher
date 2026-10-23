/**
 * JarvisHybridIntelligenceFabric
 * Evolved Model Fabric integrating local on-device capabilities, cloud foundation models,
 * network intelligence, privacy routing, and graceful degraded modes.
 *
 * Extends JarvisModelFabric to satisfy Phase 12 Hybrid Architecture.
 */

const { JarvisModelFabric, MODEL_CLASSES } = require('./JarvisModelFabric');
const { defaultNetworkState, NETWORK_STATES } = require('./JarvisNetworkState');
const { defaultLocalModelRegistry, LOCAL_CAPABILITY_TYPES } = require('./JarvisLocalModelRegistry');
const { defaultHybridRoutingPolicy, EXECUTION_MODES } = require('./JarvisHybridRoutingPolicy');
const { defaultResourcePolicy } = require('./JarvisResourcePolicy');
const { JarvisPrivacyRouter, PRIVACY_LEVELS } = require('./JarvisPrivacyRouter');

class JarvisHybridIntelligenceFabric extends JarvisModelFabric {
  constructor(options = {}) {
    super(options);
    this.networkState = options.networkState || defaultNetworkState;
    this.localRegistry = options.localRegistry || defaultLocalModelRegistry;
    this.routingPolicy = options.routingPolicy || defaultHybridRoutingPolicy;
    this.resourcePolicy = options.resourcePolicy || defaultResourcePolicy;
    this._eventListeners = new Set();
  }

  /**
   * Resolve universal model selection for reasoning or conversation
   */
  resolveModel(taskType = 'FAST', context = {}, options = {}) {
    const route = this.routingPolicy.evaluateRoute({
      taskType,
      contextPackage: context,
      text: options.requestText || options.text || '',
      options
    });

    const resolution = {
      provider: route.provider,
      executionMode: route.executionMode,
      capability: route.capability,
      model: route.modelName,
      available: route.available,
      confidence: route.confidence,
      reason: route.reason,
      fallbackChain: route.fallbackChain,
      privacyClass: route.privacyClass,
      estimatedLatency: route.estimatedLatency
    };

    this._emitObservabilityEvent('AI_ROUTE_SELECTED', resolution);
    return resolution;
  }

  /**
   * Resolve speech-to-text (STT) transcription provider
   */
  resolveTranscription(options = {}) {
    const network = this.networkState.getNetworkState();
    const localStt = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_STT);

    // 1. If local STT is available and verified on device
    if (localStt && localStt.available) {
      this._emitObservabilityEvent('LOCAL_STT_USED', { provider: localStt.provider });
      return {
        provider: localStt.provider,
        executionMode: EXECUTION_MODES.LOCAL,
        capability: 'LOCAL_STT',
        model: localStt.modelName,
        available: true,
        confidence: 0.90,
        reason: 'Using verified on-device Android SpeechRecognizer.',
        fallbackChain: [localStt.provider, 'CLOUD_STT'],
        privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
        estimatedLatency: localStt.estimatedLatencyMs || 250
      };
    }

    // 2. If online and cloud STT reachable
    if (network === NETWORK_STATES.ONLINE || network === NETWORK_STATES.HYBRID) {
      return {
        provider: 'cloud_speech_to_text',
        executionMode: EXECUTION_MODES.CLOUD,
        capability: 'TRANSCRIPTION',
        model: 'gemini-whisper-stt',
        available: true,
        confidence: 0.95,
        reason: 'Using high-accuracy cloud transcription service.',
        fallbackChain: ['cloud_speech_to_text', 'DEGRADED_TEXT_ONLY'],
        privacyClass: PRIVACY_LEVELS.CLOUD_ALLOWED,
        estimatedLatency: 180
      };
    }

    // 3. Offline without local STT
    this._emitObservabilityEvent('DEGRADED_CAPABILITY', { capability: 'TRANSCRIPTION' });
    return {
      provider: 'NONE',
      executionMode: EXECUTION_MODES.DEGRADED,
      capability: 'TRANSCRIPTION',
      model: 'none',
      available: false,
      confidence: 0.0,
      reason: 'On-device STT is unavailable and network is offline. Voice input unavailable.',
      fallbackChain: ['DEGRADED_TEXT_INPUT_REQUIRED'],
      privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
      estimatedLatency: 0
    };
  }

  /**
   * Resolve Text-to-Speech (TTS) synthesis provider
   */
  resolveTTS(options = {}) {
    const network = this.networkState.getNetworkState();
    const localTts = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_TTS);

    // Prefer local Android TTS when offline or low-latency required
    if (network === NETWORK_STATES.OFFLINE || options.preferLocal || (localTts && localTts.available)) {
      if (localTts && localTts.available) {
        this._emitObservabilityEvent('LOCAL_TTS_USED', { provider: localTts.provider });
        return {
          provider: localTts.provider,
          executionMode: EXECUTION_MODES.LOCAL,
          capability: 'LOCAL_TTS',
          model: localTts.modelName,
          available: true,
          confidence: 0.92,
          reason: 'Using native Android TextToSpeech engine on device.',
          fallbackChain: [localTts.provider, 'CLOUD_TTS'],
          privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
          estimatedLatency: localTts.estimatedLatencyMs || 100
        };
      }
    }

    // Cloud TTS if online and reachable
    if (this.networkState.isProviderReachable('tts_cloud')) {
      return {
        provider: 'elevenlabs',
        executionMode: EXECUTION_MODES.CLOUD,
        capability: 'TTS',
        model: 'eleven_multilingual_v2',
        available: true,
        confidence: 0.96,
        reason: 'Using natural cloud neural voice synthesis.',
        fallbackChain: ['elevenlabs', localTts?.provider || 'UI_TEXT_FALLBACK'],
        privacyClass: PRIVACY_LEVELS.CLOUD_ALLOWED,
        estimatedLatency: 280
      };
    }

    // Fallback to local TTS or UI text
    if (localTts && localTts.available) {
      return {
        provider: localTts.provider,
        executionMode: EXECUTION_MODES.LOCAL,
        capability: 'LOCAL_TTS',
        model: localTts.modelName,
        available: true,
        confidence: 0.90,
        reason: 'Cloud TTS unreachable. Automatically failed over to Android native TTS.',
        fallbackChain: [localTts.provider],
        privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
        estimatedLatency: 120
      };
    }

    return {
      provider: 'NONE',
      executionMode: EXECUTION_MODES.DEGRADED,
      capability: 'TTS',
      model: 'ui-only',
      available: false,
      confidence: 0.0,
      reason: 'No speech synthesizer available. Emitting UI text only.',
      fallbackChain: ['UI_TEXT_ONLY'],
      privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
      estimatedLatency: 0
    };
  }

  /**
   * Resolve Multimodal Vision provider
   */
  resolveVision(options = {}) {
    const network = this.networkState.getNetworkState();
    const localVision = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_VISION);
    const resourceEval = this.resourcePolicy.evaluateResourceConstraints('VISION', options);

    if (network === NETWORK_STATES.OFFLINE) {
      if (localVision && localVision.available && resourceEval.permitted) {
        return {
          provider: localVision.provider,
          executionMode: EXECUTION_MODES.LOCAL,
          capability: 'LOCAL_VISION',
          model: localVision.modelName,
          available: true,
          confidence: 0.80,
          reason: 'Using lightweight on-device vision model while offline.',
          fallbackChain: [localVision.provider],
          privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
          estimatedLatency: localVision.estimatedLatencyMs || 450
        };
      }
      return {
        provider: 'NONE',
        executionMode: EXECUTION_MODES.DEGRADED,
        capability: 'VISION',
        model: 'none',
        available: false,
        confidence: 0.0,
        reason: 'Vision understanding requires cloud or local vision models which are unavailable.',
        fallbackChain: ['DEGRADED_VISION_UNAVAILABLE'],
        privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
        estimatedLatency: 0
      };
    }

    return {
      provider: 'gemini',
      executionMode: EXECUTION_MODES.CLOUD,
      capability: 'VISION',
      model: process.env.VISION_MODEL || 'gemini-3.5-flash-lite',
      available: true,
      confidence: 0.95,
      reason: 'Using multimodal cloud vision model.',
      fallbackChain: ['gemini', 'DEGRADED_VISION'],
      privacyClass: PRIVACY_LEVELS.CLOUD_ALLOWED,
      estimatedLatency: 350
    };
  }

  /**
   * Resolve Semantic Embedding provider
   */
  resolveEmbedding(options = {}) {
    const localEmb = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_EMBEDDING);
    return {
      provider: localEmb.provider,
      executionMode: EXECUTION_MODES.LOCAL,
      capability: 'LOCAL_EMBEDDING',
      model: localEmb.modelName,
      available: true,
      confidence: 0.95,
      reason: 'Using local tokenized vector embedding index.',
      fallbackChain: [localEmb.provider],
      privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
      estimatedLatency: localEmb.estimatedLatencyMs || 5
    };
  }

  /**
   * Resolve Strong Reasoning provider
   */
  resolveReasoning(options = {}) {
    return this.resolveModel('STRONG_REASONING', options.context, options);
  }

  /**
   * Resolve Realtime Voice provider
   */
  resolveRealtime(options = {}) {
    const network = this.networkState.getNetworkState();
    if (network === NETWORK_STATES.OFFLINE || !this.networkState.isProviderReachable('realtime')) {
      return {
        provider: 'NONE',
        executionMode: EXECUTION_MODES.DEGRADED,
        capability: 'REALTIME',
        model: 'none',
        available: false,
        confidence: 0.0,
        reason: 'Realtime WebSocket audio transport requires internet connection.',
        fallbackChain: ['LOCAL_TTS_FALLBACK'],
        privacyClass: PRIVACY_LEVELS.LOCAL_ONLY,
        estimatedLatency: 0
      };
    }

    return {
      provider: 'livekit',
      executionMode: EXECUTION_MODES.CLOUD,
      capability: 'REALTIME',
      model: 'livekit_webrtc_room',
      available: true,
      confidence: 0.95,
      reason: 'Connected to LiveKit cloud realtime media server.',
      fallbackChain: ['livekit', 'DEGRADED_HALF_DUPLEX'],
      privacyClass: PRIVACY_LEVELS.CLOUD_ALLOWED,
      estimatedLatency: 80
    };
  }

  addObservabilityListener(listener) {
    if (typeof listener === 'function') {
      this._eventListeners.add(listener);
    }
  }

  removeObservabilityListener(listener) {
    this._eventListeners.delete(listener);
  }

  _emitObservabilityEvent(eventName, payload = {}) {
    const event = {
      event: eventName,
      timestamp: Date.now(),
      payload
    };
    for (const listener of this._eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[JarvisHybridIntelligenceFabric] Listener error:', err.message);
      }
    }
  }
}

const defaultHybridIntelligenceFabric = new JarvisHybridIntelligenceFabric();

module.exports = {
  JarvisHybridIntelligenceFabric,
  defaultHybridIntelligenceFabric,
  EXECUTION_MODES
};
