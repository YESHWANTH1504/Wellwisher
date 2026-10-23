const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const { aiProviderRegistry } = require('./AIProviderRegistry');
const { PROVIDER_CAPABILITIES, PROVIDER_STATUS } = require('./AIProvider');

/**
 * Logical Model Roles
 * Decouples system intelligence needs from concrete vendor models.
 */
const MODEL_ROLES = Object.freeze({
  FAST_MODEL: 'FAST_MODEL',
  STRONG_REASONING_MODEL: 'STRONG_REASONING_MODEL',
  REALTIME_MODEL: 'REALTIME_MODEL',
  VISION_MODEL: 'VISION_MODEL',
  TTS_MODEL: 'TTS_MODEL',
  TRANSCRIPTION_MODEL: 'TRANSCRIPTION_MODEL',
  OCR_MODEL: 'OCR_MODEL',
  DOCUMENT_MODEL: 'DOCUMENT_MODEL',
  SCREEN_MODEL: 'SCREEN_MODEL',
  MULTIMODAL_REASONING_MODEL: 'MULTIMODAL_REASONING_MODEL',
  REALTIME_MULTIMODAL_MODEL: 'REALTIME_MULTIMODAL_MODEL'
});

// Legacy aliases for backward compatibility
const TASK_CAPABILITIES = {
  ...MODEL_ROLES,
  REASONING: MODEL_ROLES.STRONG_REASONING_MODEL,
  CONVERSATION: MODEL_ROLES.FAST_MODEL,
  FAST_INTENT: MODEL_ROLES.FAST_MODEL,
  VISION: MODEL_ROLES.VISION_MODEL,
  TTS: MODEL_ROLES.TTS_MODEL,
  REALTIME_VOICE: MODEL_ROLES.REALTIME_MODEL,
  OCR: MODEL_ROLES.OCR_MODEL,
  DOCUMENT: MODEL_ROLES.DOCUMENT_MODEL,
  SCREEN: MODEL_ROLES.SCREEN_MODEL,
  MULTIMODAL: MODEL_ROLES.MULTIMODAL_REASONING_MODEL,
  DETERMINISTIC: 'DETERMINISTIC'
};

class AIModelRouter {
  constructor(registry = aiProviderRegistry) {
    this.registry = registry;
    this._initRoleConfiguration();
    this.telemetryHistory = [];
    this.maxTelemetryEntries = 50;
  }

  _initRoleConfiguration() {
    this.roleConfig = {
      [MODEL_ROLES.FAST_MODEL]: {
        primaryProvider: (process.env.FAST_MODEL_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.FAST_MODEL_NAME || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.TEXT_GENERATION
      },
      [MODEL_ROLES.STRONG_REASONING_MODEL]: {
        primaryProvider: (process.env.STRONG_REASONING_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.STRONG_REASONING_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.TOOL_PLANNING
      },
      [MODEL_ROLES.REALTIME_MODEL]: {
        primaryProvider: (process.env.REALTIME_PROVIDER || 'livekit').toLowerCase(),
        primaryModel: process.env.REALTIME_MODEL || 'livekit_room',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.REALTIME_TRANSPORT
      },
      [MODEL_ROLES.VISION_MODEL]: {
        primaryProvider: (process.env.VISION_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.VISION_MODEL || 'gemini-flash-latest',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.VISION
      },
      [MODEL_ROLES.TTS_MODEL]: {
        primaryProvider: (process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase(),
        primaryModel: process.env.TTS_MODEL || 'eleven_turbo_v2',
        secondaryProvider: 'gemini',
        requiredCapability: PROVIDER_CAPABILITIES.TTS
      },
      [MODEL_ROLES.TRANSCRIPTION_MODEL]: {
        primaryProvider: (process.env.TRANSCRIPTION_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.TRANSCRIPTION_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.TRANSCRIPTION
      },
      [MODEL_ROLES.OCR_MODEL]: {
        primaryProvider: (process.env.OCR_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.OCR_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.OCR
      },
      [MODEL_ROLES.DOCUMENT_MODEL]: {
        primaryProvider: (process.env.DOCUMENT_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.DOCUMENT_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.DOCUMENT
      },
      [MODEL_ROLES.SCREEN_MODEL]: {
        primaryProvider: (process.env.SCREEN_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.SCREEN_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.SCREEN_ANALYSIS
      },
      [MODEL_ROLES.MULTIMODAL_REASONING_MODEL]: {
        primaryProvider: (process.env.MULTIMODAL_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.MULTIMODAL_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'openai',
        requiredCapability: PROVIDER_CAPABILITIES.VISION
      },
      [MODEL_ROLES.REALTIME_MULTIMODAL_MODEL]: {
        primaryProvider: (process.env.REALTIME_MULTIMODAL_PROVIDER || 'gemini').toLowerCase(),
        primaryModel: process.env.REALTIME_MULTIMODAL_MODEL || 'gemini-3.5-flash-lite',
        secondaryProvider: 'livekit',
        requiredCapability: PROVIDER_CAPABILITIES.MULTIMODAL_STREAMING
      }
    };
  }

  /**
   * Determine candidate providers for a given role in prioritized fallback order
   * @param {string} role - One of MODEL_ROLES
   * @returns {Array<AIProvider>}
   */
  getCandidateProviders(role) {
    const config = this.roleConfig[role];
    if (!config) {
      // Default to general text generation providers
      const gemini = this.registry.get('gemini');
      const openai = this.registry.get('openai');
      return [gemini, openai].filter(Boolean);
    }

    const candidates = [];
    const primary = this.registry.get(config.primaryProvider);
    if (primary) candidates.push(primary);

    if (config.secondaryProvider && config.secondaryProvider !== config.primaryProvider) {
      const secondary = this.registry.get(config.secondaryProvider);
      if (secondary) candidates.push(secondary);
    }

    // Add any other registered provider with the required capability
    if (config.requiredCapability) {
      const others = this.registry.getProvidersWithCapability(config.requiredCapability);
      for (const p of others) {
        if (!candidates.includes(p)) {
          candidates.push(p);
        }
      }
    }

    return candidates.filter(Boolean);
  }

  /**
   * Route and execute an action across candidate providers with structured fallback
   */
  async routeAndExecute(role, actionFn, fallbackFn = null) {
    const startTime = Date.now();
    const candidates = this.getCandidateProviders(role);
    let attemptsCount = 0;
    let lastError = null;

    for (const provider of candidates) {
      attemptsCount++;
      try {
        const isHealthy = await provider.healthCheck();
        if (!isHealthy) {
          continue;
        }

        const result = await actionFn(provider);
        if (result !== null && result !== undefined) {
          const durationMs = Date.now() - startTime;
          const telemetry = {
            role,
            provider: provider.name,
            model: provider.modelName || provider.name,
            durationMs,
            success: true,
            fallbackUsed: attemptsCount > 1,
            attempts: attemptsCount,
            timestamp: Date.now()
          };
          this._recordTelemetry(telemetry);

          return {
            success: true,
            provider: provider.name,
            model: provider.modelName || provider.name,
            diagnostics: telemetry,
            data: result
          };
        }
      } catch (err) {
        lastError = err.message;
        console.warn(`[AI_MODEL_ROUTER] Provider ${provider.name} failed for ${role}:`, err.message);
        continue;
      }
    }

    // All primary and secondary providers failed or unavailable
    if (fallbackFn) {
      try {
        const fallbackResult = await fallbackFn();
        const durationMs = Date.now() - startTime;
        const telemetry = {
          role,
          provider: 'deterministic_fallback',
          model: 'local_engine',
          durationMs,
          success: true,
          fallbackUsed: true,
          attempts: attemptsCount,
          timestamp: Date.now()
        };
        this._recordTelemetry(telemetry);

        return {
          success: true,
          provider: 'deterministic_fallback',
          model: 'local_engine',
          diagnostics: telemetry,
          data: fallbackResult
        };
      } catch (fbErr) {
        lastError = fbErr.message;
      }
    }

    // Honest failure return: never invent AI responses
    const durationMs = Date.now() - startTime;
    const failureTelemetry = {
      role,
      provider: 'none',
      model: 'none',
      durationMs,
      success: false,
      error: lastError || 'ALL_PROVIDERS_UNAVAILABLE',
      attempts: attemptsCount,
      timestamp: Date.now()
    };
    this._recordTelemetry(failureTelemetry);

    return {
      success: false,
      provider: 'none',
      model: 'none',
      diagnostics: failureTelemetry,
      error: 'AI_SERVICES_UNAVAILABLE',
      data: null
    };
  }

  /**
   * Plan a task: Selects STRONG_REASONING_MODEL, executes plan across providers with fallback
   */
  async plan(contextPackage, requestText, availableTools = [], fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.STRONG_REASONING_MODEL,
      async (provider) => {
        if (typeof provider.plan === 'function') {
          return provider.plan(contextPackage, requestText, availableTools);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Generate conversational response: Uses FAST_MODEL for natural dialog
   */
  async respond(prompt, context = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.FAST_MODEL,
      async (provider) => {
        if (typeof provider.respond === 'function') {
          return provider.respond(prompt, context);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Generate raw text for general inquiries
   */
  async generateText(prompt, systemInstruction = '', options = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.FAST_MODEL,
      async (provider) => {
        if (typeof provider.generateText === 'function') {
          return provider.generateText(prompt, systemInstruction, options);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Understand command: FAST_MODEL intent and entity classification
   */
  async understand(text, context = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.FAST_MODEL,
      async (provider) => {
        if (typeof provider.understand === 'function') {
          return provider.understand(text, context);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Synthesize audio: TTS_MODEL
   */
  async synthesize(text, voiceOptions = {}) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.TTS_MODEL,
      async (provider) => {
        if (typeof provider.synthesize === 'function') {
          return provider.synthesize(text, voiceOptions);
        }
        return null;
      }
    );

    return res.data;
  }

  /**
   * Transcribe speech audio buffer: TRANSCRIPTION_MODEL
   */
  async transcribe(audioBuffer, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.TRANSCRIPTION_MODEL,
      async (provider) => {
        if (typeof provider.transcribe === 'function') {
          return provider.transcribe(audioBuffer);
        }
        return null;
      },
      fallbackFn
    );
    return res.data;
  }

  /**
   * Realtime streaming text generation: FAST_MODEL
   */
  async generateTextStream(prompt, systemInstruction = '', options = {}, onChunk = null, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.FAST_MODEL,
      async (provider) => {
        if (typeof provider.generateTextStream === 'function') {
          return provider.generateTextStream(prompt, systemInstruction, options, onChunk);
        } else if (typeof provider.generateText === 'function') {
          const text = await provider.generateText(prompt, systemInstruction, options);
          if (text && onChunk) onChunk(text);
          return text;
        }
        return null;
      },
      fallbackFn
    );
    return res.data;
  }

  /**
   * Streaming audio synthesis: TTS_MODEL
   */
  async synthesizeStream(text, voiceOptions = {}, onChunk = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.TTS_MODEL,
      async (provider) => {
        if (typeof provider.synthesizeStream === 'function') {
          return provider.synthesizeStream(text, voiceOptions, onChunk);
        } else if (typeof provider.synthesize === 'function') {
          const buf = await provider.synthesize(text, voiceOptions);
          if (buf && onChunk) onChunk(buf);
          return buf;
        }
        return null;
      }
    );
    return res.data;
  }

  /**
   * Visual analysis: VISION_MODEL
   */
  async analyzeImage(imageData, prompt, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.VISION_MODEL,
      async (provider) => {
        if (typeof provider.analyzeImage === 'function') {
          return provider.analyzeImage(imageData, prompt);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Deep image understanding: VISION_MODEL / MULTIMODAL_REASONING_MODEL
   */
  async understandImage(imageData, prompt, options = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.VISION_MODEL,
      async (provider) => {
        if (typeof provider.understandImage === 'function') {
          return provider.understandImage(imageData, prompt, options);
        } else if (typeof provider.analyzeImage === 'function') {
          return provider.analyzeImage(imageData, prompt, options);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Screen analysis: SCREEN_MODEL
   */
  async analyzeScreen(screenData, prompt, options = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.SCREEN_MODEL,
      async (provider) => {
        if (typeof provider.analyzeScreen === 'function') {
          return provider.analyzeScreen(screenData, prompt, options);
        } else if (typeof provider.analyzeImage === 'function') {
          return provider.analyzeImage(screenData, prompt, options);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * OCR / Text extraction: OCR_MODEL
   */
  async extractText(imageData, options = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.OCR_MODEL,
      async (provider) => {
        if (typeof provider.extractTextFromImage === 'function') {
          return provider.extractTextFromImage(imageData, options);
        } else if (typeof provider.extractText === 'function') {
          return provider.extractText(imageData, options.mimeType || 'image/jpeg', options);
        } else if (typeof provider.analyzeImage === 'function') {
          return provider.analyzeImage(imageData, 'Extract all text from this image.', options);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * Document understanding: DOCUMENT_MODEL
   */
  async analyzeDocument(docData, mimeType = 'application/pdf', prompt = '', options = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.DOCUMENT_MODEL,
      async (provider) => {
        if (typeof provider.analyzeDocument === 'function') {
          return provider.analyzeDocument(docData, mimeType, prompt, options);
        } else if (typeof provider.analyzePdf === 'function' && mimeType === 'application/pdf') {
          return provider.analyzePdf(docData, prompt, options);
        } else if (typeof provider.analyzeImage === 'function') {
          return provider.analyzeImage(docData, prompt, { ...options, mimeType });
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  /**
   * PDF document analysis: DOCUMENT_MODEL
   */
  async analyzePdf(pdfData, prompt = '', options = {}, fallbackFn = null) {
    return this.analyzeDocument(pdfData, 'application/pdf', prompt, options, fallbackFn);
  }

  /**
   * Unified multimodal response: MULTIMODAL_REASONING_MODEL
   */
  async multimodalResponse(multimodalInput, prompt = '', options = {}, fallbackFn = null) {
    const res = await this.routeAndExecute(
      MODEL_ROLES.MULTIMODAL_REASONING_MODEL,
      async (provider) => {
        if (typeof provider.multimodalResponse === 'function') {
          return provider.multimodalResponse(multimodalInput, prompt, options);
        } else if (typeof provider.analyzeImage === 'function') {
          const data = multimodalInput.data || multimodalInput.bytes || multimodalInput.base64;
          return provider.analyzeImage(data, prompt, options);
        }
        return null;
      },
      fallbackFn
    );

    return res.data;
  }

  _recordTelemetry(telemetry) {
    this.telemetryHistory.unshift(telemetry);
    if (this.telemetryHistory.length > this.maxTelemetryEntries) {
      this.telemetryHistory.pop();
    }
  }

  getTelemetry() {
    return [...this.telemetryHistory];
  }
}

const aiModelRouter = new AIModelRouter();

module.exports = {
  MODEL_ROLES,
  TASK_CAPABILITIES,
  AIModelRouter,
  aiModelRouter
};
