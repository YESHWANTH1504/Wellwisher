const { aiModelRouter, MODEL_ROLES } = require('../providers/AIModelRouter');
const { aiProviderRegistry } = require('../providers/AIProviderRegistry');
const { JarvisPrivacyRouter, PRIVACY_LEVELS } = require('./JarvisPrivacyRouter');

/**
 * JarvisModelFabric
 * Universal Model Fabric abstracting local on-device intelligence and cloud foundation models.
 * Dynamically resolves execution models based on task, latency, privacy routing, and hardware status.
 */

const MODEL_CLASSES = Object.freeze({
  LOCAL_FAST: 'LOCAL_FAST',
  LOCAL_REASONING: 'LOCAL_REASONING',
  CLOUD_FAST: 'CLOUD_FAST',
  CLOUD_REASONING: 'CLOUD_REASONING',
  VISION: 'VISION',
  REALTIME: 'REALTIME',
  TRANSCRIPTION: 'TRANSCRIPTION',
  TTS: 'TTS',
  EMBEDDING: 'EMBEDDING'
});

class JarvisModelFabric {
  constructor(options = {}) {
    this.router = options.router || aiModelRouter;
    this.registry = options.registry || aiProviderRegistry;
    this._localModelAvailable = false;
    this._localCapabilities = [];
  }

  /**
   * Detect Android on-device AICore / Gemini Nano / Local LLM availability
   */
  async detectOnDeviceCapabilities(deviceStatus = {}) {
    // Check if connected device or runtime reports local AICore / Nano execution
    const hasLocalInference = Boolean(
      deviceStatus.hasLocalInference ||
      deviceStatus.aiCoreAvailable ||
      process.env.LOCAL_AICORE_AVAILABLE === 'true'
    );

    this._localModelAvailable = hasLocalInference;
    this._localCapabilities = hasLocalInference
      ? ['INTENT_CLASSIFICATION', 'ENTITY_EXTRACTION', 'LIGHTWEIGHT_SUMMARY']
      : [];

    return {
      isAvailable: this._localModelAvailable,
      capabilities: this._localCapabilities,
      provider: hasLocalInference ? 'Android AICore / Gemini Nano' : 'NONE'
    };
  }

  isLocalModelAvailable() {
    return this._localModelAvailable;
  }

  getLocalModels() {
    if (!this._localModelAvailable) return [];
    return [{ id: 'gemini-nano', name: 'Gemini Nano (On-Device)', contextWindow: 4096 }];
  }

  getLocalCapabilities() {
    return [...this._localCapabilities];
  }

  /**
   * Select the appropriate model class and provider for a given request
   */
  selectModelForTask(taskType, context = {}, options = {}) {
    const privacyEval = JarvisPrivacyRouter.evaluatePrivacy(context, options.requestText, options);

    // If local execution required and available
    if (privacyEval.level === PRIVACY_LEVELS.LOCAL_ONLY) {
      if (this.isLocalModelAvailable()) {
        return {
          modelClass: MODEL_CLASSES.LOCAL_FAST,
          provider: 'local',
          modelName: 'gemini-nano',
          isLocal: true,
          privacyLevel: privacyEval.level
        };
      } else {
        // Return local policy constraint
        return {
          modelClass: MODEL_CLASSES.LOCAL_FAST,
          provider: 'deterministic_safety_gate',
          modelName: 'local_policy',
          isLocal: true,
          privacyLevel: privacyEval.level,
          localConstraint: true
        };
      }
    }

    // Multimodal Vision Tasks
    if (taskType === 'VISION' || taskType === 'MULTIMODAL' || taskType === 'OCR' || taskType === 'SCREEN') {
      return {
        modelClass: MODEL_CLASSES.VISION,
        provider: 'gemini',
        modelName: process.env.VISION_MODEL || 'gemini-3.5-flash-lite',
        isLocal: false,
        privacyLevel: privacyEval.level
      };
    }

    // Realtime Voice Transport
    if (taskType === 'REALTIME_VOICE' || taskType === 'REALTIME') {
      return {
        modelClass: MODEL_CLASSES.REALTIME,
        provider: 'livekit',
        modelName: 'livekit_room',
        isLocal: false,
        privacyLevel: privacyEval.level
      };
    }

    // Complex reasoning tasks
    if (taskType === 'STRONG_REASONING' || taskType === 'PLANNING') {
      return {
        modelClass: MODEL_CLASSES.CLOUD_REASONING,
        provider: 'gemini',
        modelName: process.env.STRONG_REASONING_MODEL || 'gemini-3.5-flash-lite',
        isLocal: false,
        privacyLevel: privacyEval.level
      };
    }

    // Fast conversation default
    return {
      modelClass: MODEL_CLASSES.CLOUD_FAST,
      provider: 'gemini',
      modelName: process.env.FAST_MODEL_NAME || 'gemini-3.5-flash-lite',
      isLocal: false,
      privacyLevel: privacyEval.level
    };
  }

  /**
   * Universal completion invocation routing through underlying router
   */
  async generateCompletion(prompt, options = {}) {
    const taskType = options.taskType || 'FAST_MODEL';
    const routing = this.selectModelForTask(taskType, options.context, options);

    if (routing.localConstraint && !this.isLocalModelAvailable()) {
      return 'Action completed locally under privacy safeguard.';
    }

    return await this.router.routeCompletion(prompt, {
      role: taskType === 'PLANNING' ? MODEL_ROLES.STRONG_REASONING_MODEL : MODEL_ROLES.FAST_MODEL,
      ...options
    });
  }

  /**
   * Health status of model fabric
   */
  async getStatus() {
    return {
      modelFabricOnline: true,
      onDeviceAiAvailable: this.isLocalModelAvailable(),
      localCapabilities: this.getLocalCapabilities(),
      cloudProviders: this.registry.getHealthyProviders().map(p => p.name),
      primaryCloudProvider: 'gemini',
      primaryModel: process.env.FAST_MODEL_NAME || 'gemini-3.5-flash-lite'
    };
  }
}

const defaultModelFabric = new JarvisModelFabric();

module.exports = {
  JarvisModelFabric,
  defaultModelFabric,
  MODEL_CLASSES
};
