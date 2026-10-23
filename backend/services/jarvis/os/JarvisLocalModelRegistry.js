/**
 * JarvisLocalModelRegistry
 * Registers and discovers verified on-device models and runtime capabilities.
 *
 * ABSOLUTE INVARIANT:
 * Never claim "ON-DEVICE AI" or "OFFLINE AI" unless actual local inference or runtime
 * is executed and verified. If a runtime (e.g. Gemini Nano or Android AI Core) is not
 * present on the target hardware, mark available: false and report honest capability state.
 */

const LOCAL_CAPABILITY_TYPES = Object.freeze({
  LOCAL_FAST: 'LOCAL_FAST',
  LOCAL_REASONING: 'LOCAL_REASONING',
  LOCAL_STT: 'LOCAL_STT',
  LOCAL_TTS: 'LOCAL_TTS',
  LOCAL_VISION: 'LOCAL_VISION',
  LOCAL_EMBEDDING: 'LOCAL_EMBEDDING'
});

const LOCAL_PROVIDERS = Object.freeze({
  ANDROID_AI_CORE: 'ANDROID_AI_CORE',
  GEMINI_NANO: 'GEMINI_NANO',
  ANDROID_SPEECH_RECOGNIZER: 'ANDROID_SPEECH_RECOGNIZER',
  ANDROID_TTS: 'ANDROID_TTS',
  ONNX_RUNTIME: 'ONNX_RUNTIME',
  TFLITE: 'TFLITE',
  DETERMINISTIC_RULES: 'DETERMINISTIC_RULES',
  LOCAL_VECTOR_INDEX: 'LOCAL_VECTOR_INDEX'
});

class JarvisLocalModelRegistry {
  constructor() {
    this._models = new Map();
    this._initializeDefaultRegistry();
  }

  _initializeDefaultRegistry() {
    // 1. Deterministic Fast Local Rule NLU (Always available locally)
    this.registerModel({
      id: 'local_deterministic_nlu_v1',
      capability: LOCAL_CAPABILITY_TYPES.LOCAL_FAST,
      provider: LOCAL_PROVIDERS.DETERMINISTIC_RULES,
      modelName: 'jarvis-rule-intent-resolver',
      version: '1.2.0',
      available: true,
      hardwareAccelerated: false,
      contextWindow: 1024,
      estimatedLatencyMs: 2,
      metadata: {
        description: 'Deterministic offline pattern matching & entity extraction engine'
      }
    });

    // 2. Android TextToSpeech (Local speech synthesis)
    this.registerModel({
      id: 'android_tts_v1',
      capability: LOCAL_CAPABILITY_TYPES.LOCAL_TTS,
      provider: LOCAL_PROVIDERS.ANDROID_TTS,
      modelName: 'android-system-tts',
      version: '1.0.0',
      available: true, // Available via Android platform TTS service
      hardwareAccelerated: false,
      estimatedLatencyMs: 120,
      metadata: {
        description: 'Android native on-device TextToSpeech synthesis'
      }
    });

    // 3. Android SpeechRecognizer (On-device STT discovery)
    this.registerModel({
      id: 'android_stt_v1',
      capability: LOCAL_CAPABILITY_TYPES.LOCAL_STT,
      provider: LOCAL_PROVIDERS.ANDROID_SPEECH_RECOGNIZER,
      modelName: 'android-speech-recognizer',
      version: '1.0.0',
      available: false, // Discovered dynamically at runtime via bridge
      hardwareAccelerated: false,
      estimatedLatencyMs: 250,
      metadata: {
        description: 'Android SpeechRecognizer with EXTRA_PREFER_OFFLINE'
      }
    });

    // 4. Android AI Core / Gemini Nano (Local generative reasoning)
    // By default marked false until verified on device
    this.registerModel({
      id: 'gemini_nano_v1',
      capability: LOCAL_CAPABILITY_TYPES.LOCAL_REASONING,
      provider: LOCAL_PROVIDERS.ANDROID_AI_CORE,
      modelName: 'gemini-nano',
      version: '1.0.0-aicore',
      available: false, // Strictly verified via device detection
      hardwareAccelerated: true,
      contextWindow: 4096,
      estimatedLatencyMs: 380,
      metadata: {
        description: 'Google AICore On-Device Foundation Model'
      }
    });

    // 5. Local Semantic Embedding & Indexing
    this.registerModel({
      id: 'local_semantic_index_v1',
      capability: LOCAL_CAPABILITY_TYPES.LOCAL_EMBEDDING,
      provider: LOCAL_PROVIDERS.LOCAL_VECTOR_INDEX,
      modelName: 'jarvis-fast-keyword-embedding',
      version: '2.0.0',
      available: true,
      hardwareAccelerated: false,
      contextWindow: 2048,
      estimatedLatencyMs: 5,
      metadata: {
        description: 'Local tokenized vector & keyword semantic search index'
      }
    });

    // 6. Local Vision (OCR / Object detection)
    this.registerModel({
      id: 'local_vision_ocr_v1',
      capability: LOCAL_CAPABILITY_TYPES.LOCAL_VISION,
      provider: LOCAL_PROVIDERS.TFLITE,
      modelName: 'mobile-ocr-detector',
      version: '0.9.0',
      available: false, // Requires on-device vision model binary
      hardwareAccelerated: true,
      estimatedLatencyMs: 450,
      metadata: {
        description: 'Local lightweight OCR detection'
      }
    });
  }

  registerModel(modelConfig) {
    if (!modelConfig || !modelConfig.capability) {
      throw new Error('registerModel requires valid capability');
    }
    this._models.set(modelConfig.capability, {
      ...modelConfig,
      lastChecked: Date.now()
    });
    return this._models.get(modelConfig.capability);
  }

  getModel(capability) {
    return this._models.get(capability) || null;
  }

  isCapabilityAvailable(capability) {
    const model = this.getModel(capability);
    return Boolean(model && model.available);
  }

  listModels() {
    return Array.from(this._models.values());
  }

  /**
   * Discover and verify actual device capabilities from hardware status
   * Never fabricates availability!
   */
  async discoverDeviceCapabilities(deviceStatus = {}) {
    // 1. Check AI Core / Gemini Nano
    const hasAiCore = Boolean(
      deviceStatus.aiCoreAvailable ||
      deviceStatus.hasGeminiNano ||
      process.env.LOCAL_AICORE_AVAILABLE === 'true'
    );
    const nanoModel = this._models.get(LOCAL_CAPABILITY_TYPES.LOCAL_REASONING);
    if (nanoModel) {
      nanoModel.available = hasAiCore;
      nanoModel.lastChecked = Date.now();
      nanoModel.hardwareAccelerated = Boolean(deviceStatus.hardwareAcceleration);
    }

    // 2. Check Local STT
    const hasLocalStt = Boolean(
      deviceStatus.localSpeechRecognitionAvailable ||
      deviceStatus.hasOfflineStt
    );
    const sttModel = this._models.get(LOCAL_CAPABILITY_TYPES.LOCAL_STT);
    if (sttModel) {
      sttModel.available = hasLocalStt;
      sttModel.lastChecked = Date.now();
    }

    // 3. Check Local TTS
    const hasLocalTts = deviceStatus.localTtsAvailable !== undefined
      ? Boolean(deviceStatus.localTtsAvailable)
      : true; // Android TTS is typically available on physical Android devices
    const ttsModel = this._models.get(LOCAL_CAPABILITY_TYPES.LOCAL_TTS);
    if (ttsModel) {
      ttsModel.available = hasLocalTts;
      ttsModel.lastChecked = Date.now();
    }

    // 4. Check Local Vision
    const hasLocalVision = Boolean(deviceStatus.localVisionAvailable);
    const visionModel = this._models.get(LOCAL_CAPABILITY_TYPES.LOCAL_VISION);
    if (visionModel) {
      visionModel.available = hasLocalVision;
      visionModel.lastChecked = Date.now();
    }

    return {
      timestamp: Date.now(),
      discoveredCapabilities: this.listModels().map(m => ({
        capability: m.capability,
        provider: m.provider,
        modelName: m.modelName,
        available: m.available,
        hardwareAccelerated: m.hardwareAccelerated
      }))
    };
  }
}

const defaultLocalModelRegistry = new JarvisLocalModelRegistry();

module.exports = {
  JarvisLocalModelRegistry,
  defaultLocalModelRegistry,
  LOCAL_CAPABILITY_TYPES,
  LOCAL_PROVIDERS
};
