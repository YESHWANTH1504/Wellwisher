/**
 * AIProvider
 * Base abstract interface and capability contract for all AI model providers
 * (Gemini, OpenAI, ElevenLabs, LiveKit, etc.)
 */

const PROVIDER_CAPABILITIES = Object.freeze({
  TEXT_GENERATION: 'TEXT_GENERATION',
  STRUCTURED_OUTPUT: 'STRUCTURED_OUTPUT',
  TOOL_PLANNING: 'TOOL_PLANNING',
  VISION: 'VISION',
  TTS: 'TTS',
  TRANSCRIPTION: 'TRANSCRIPTION',
  REALTIME_TRANSPORT: 'REALTIME_TRANSPORT',
  OCR: 'OCR',
  DOCUMENT: 'DOCUMENT',
  SCREEN_ANALYSIS: 'SCREEN_ANALYSIS',
  MULTIMODAL_STREAMING: 'MULTIMODAL_STREAMING'
});

const PROVIDER_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  MISCONFIGURED: 'MISCONFIGURED',
  RATE_LIMITED: 'RATE_LIMITED',
  TEMPORARILY_FAILED: 'TEMPORARILY_FAILED',
  DISABLED: 'DISABLED'
});

const PROVIDER_ERRORS = Object.freeze({
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  CONTENT_FILTERED: 'CONTENT_FILTERED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  NOT_CONFIGURED: 'NOT_CONFIGURED'
});

class AIProvider {
  /**
   * @param {string} name - Identifier for provider (e.g. 'gemini', 'openai')
   * @param {Object} config - Provider configuration parameters
   */
  constructor(name, config = {}) {
    if (new.target === AIProvider) {
      throw new TypeError("Cannot instantiate abstract class AIProvider directly.");
    }
    this.name = name.toLowerCase();
    this.config = config;
    this.status = PROVIDER_STATUS.AVAILABLE;
    this.lastHealthCheckTime = 0;
    this.cachedHealthResult = null;
    this.healthCacheTtlMs = config.healthCacheTtlMs || 30000; // 30s cache
    this.lastDiagnostics = null;
  }

  /**
   * Safe serialization: omit API keys, credentials, and SDK client handles
   */
  toJSON() {
    const copy = { ...this };
    delete copy.apiKey;
    delete copy.client;
    delete copy.aiClient;
    delete copy.tokenService;
    if (copy.config) {
      const sanitizedConfig = { ...copy.config };
      delete sanitizedConfig.apiKey;
      delete sanitizedConfig.token;
      delete sanitizedConfig.secret;
      copy.config = sanitizedConfig;
    }
    return copy;
  }

  /**
   * Return set of supported capabilities for this provider instance
   * Subclasses MUST override and return their real capabilities.
   * @returns {Set<string>}
   */
  getCapabilities() {
    return new Set();
  }

  /**
   * Check if this provider supports a specific capability
   * @param {string} capability
   * @returns {boolean}
   */
  hasCapability(capability) {
    return this.getCapabilities().has(capability);
  }

  /**
   * Check provider health status. Uses caching to prevent hammering APIs on every request.
   * @param {boolean} forceRefresh - If true, bypasses the cache
   * @returns {Promise<boolean>}
   */
  async healthCheck(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cachedHealthResult !== null && (now - this.lastHealthCheckTime) < this.healthCacheTtlMs) {
      return this.cachedHealthResult;
    }

    try {
      const isHealthy = await this._performHealthCheck();
      this.cachedHealthResult = isHealthy;
      this.status = isHealthy ? PROVIDER_STATUS.AVAILABLE : PROVIDER_STATUS.UNAVAILABLE;
      this.lastHealthCheckTime = now;
      return isHealthy;
    } catch (err) {
      this.cachedHealthResult = false;
      this.status = PROVIDER_STATUS.TEMPORARILY_FAILED;
      this.lastHealthCheckTime = now;
      return false;
    }
  }

  /**
   * Protected method for provider-specific health checking
   * @returns {Promise<boolean>}
   */
  async _performHealthCheck() {
    return true;
  }

  /**
   * Generate conversational or explanatory response text
   * @param {string} prompt - User request
   * @param {Object} context - Memory and dialog history
   * @returns {Promise<string|null>}
   */
  async respond(prompt, context = {}) {
    throw new Error(`respond() not implemented in provider "${this.name}"`);
  }

  /**
   * Generate general text with system instructions and prompt
   * @param {string} prompt
   * @param {string} systemInstruction
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  async generateText(prompt, systemInstruction = '', options = {}) {
    return this.respond(prompt, { systemInstruction, ...options });
  }

  /**
   * Understand natural language utterance, extract structured intent and entities
   * @param {string} text - User prompt
   * @param {Object} context - Conversation and temporal context
   * @returns {Promise<Object|null>}
   */
  async understand(text, context = {}) {
    throw new Error(`understand() not implemented in provider "${this.name}"`);
  }

  /**
   * Plan request: Produces structured intent, direct response, or planned tool calls
   * @param {Object} contextPackage
   * @param {string} requestText
   * @param {Array<Object>} availableTools
   * @returns {Promise<Object|null>}
   */
  async plan(contextPackage = {}, requestText = '', availableTools = []) {
    throw new Error(`plan() not implemented in provider "${this.name}"`);
  }

  /**
   * Synthesize text to spoken audio buffer
   * @param {string} text
   * @param {Object} voiceOptions
   * @returns {Promise<Buffer|null>}
   */
  async synthesize(text, voiceOptions = {}) {
    throw new Error(`synthesize() not implemented in provider "${this.name}"`);
  }

  /**
   * Transcribe audio buffer to text
   * @param {Buffer} audioBuffer
   * @returns {Promise<string|null>}
   */
  async transcribe(audioBuffer) {
    throw new Error(`transcribe() not implemented in provider "${this.name}"`);
  }

  /**
   * Analyze image or camera frame
   * @param {Buffer|string} imageData - Base64 or image buffer
   * @param {string} prompt - Question about the image
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  async analyzeImage(imageData, prompt, options = {}) {
    throw new Error(`analyzeImage() not implemented in provider "${this.name}"`);
  }

  /**
   * High-level image understanding with structured observations
   */
  async understandImage(imageData, prompt, options = {}) {
    return this.analyzeImage(imageData, prompt, options);
  }

  /**
   * Analyze screen context or screenshot
   */
  async analyzeScreen(screenData, prompt, options = {}) {
    return this.analyzeImage(screenData, prompt || 'Analyze this screen capture.', options);
  }

  /**
   * Extract text / OCR from image or document
   */
  async extractTextFromImage(imageData, options = {}) {
    return this.analyzeImage(imageData, 'Extract all visible text from this image accurately.', options);
  }

  /**
   * Multi-page document or PDF analysis
   */
  async analyzeDocument(docData, mimeType = 'application/pdf', prompt = '', options = {}) {
    throw new Error(`analyzeDocument() not implemented in provider "${this.name}"`);
  }

  /**
   * Direct PDF analysis
   */
  async analyzePdf(pdfData, prompt = '', options = {}) {
    return this.analyzeDocument(pdfData, 'application/pdf', prompt, options);
  }

  /**
   * Video frame understanding
   */
  async understandVideoFrame(frameData, prompt = '', options = {}) {
    return this.analyzeImage(frameData, prompt || 'Describe what is happening in this frame.', options);
  }

  /**
   * Unified multimodal response combining text + image + document
   */
  async multimodalResponse(multimodalInput, prompt = '', options = {}) {
    throw new Error(`multimodalResponse() not implemented in provider "${this.name}"`);
  }

  /**
   * Stream multimodal response
   */
  async streamMultimodalResponse(multimodalInput, prompt, onChunk, options = {}) {
    throw new Error(`streamMultimodalResponse() not implemented in provider "${this.name}"`);
  }

  // ==========================================================
  // REALTIME PROVIDER CONTRACT (Phase 3)
  // Real bidirectional streaming voice and transport abstraction
  // ==========================================================

  /**
   * Create a new realtime session
   * @param {Object} options
   */
  async createRealtimeSession(options = {}) {
    throw new Error(`createRealtimeSession() not implemented in provider "${this.name}"`);
  }

  /**
   * Connect an established realtime session
   * @param {string} sessionId
   */
  async connectRealtimeSession(sessionId) {
    throw new Error(`connectRealtimeSession() not implemented in provider "${this.name}"`);
  }

  /**
   * Disconnect and release realtime session resources
   * @param {string} sessionId
   */
  async disconnectRealtimeSession(sessionId) {
    throw new Error(`disconnectRealtimeSession() not implemented in provider "${this.name}"`);
  }

  /**
   * Push an incremental audio chunk (e.g. 16kHz PCM frame) to realtime transport
   * @param {string} sessionId
   * @param {Buffer} audioChunk
   */
  async sendAudioChunk(sessionId, audioChunk) {
    throw new Error(`sendAudioChunk() not implemented in provider "${this.name}"`);
  }

  /**
   * Send text to the realtime session
   * @param {string} sessionId
   * @param {string} text
   */
  async sendText(sessionId, text) {
    throw new Error(`sendText() not implemented in provider "${this.name}"`);
  }

  /**
   * Trigger immediate speech interruption / barge-in
   * @param {string} sessionId
   */
  async interruptResponse(sessionId) {
    throw new Error(`interruptResponse() not implemented in provider "${this.name}"`);
  }

  /**
   * Update conversational context or memory for session
   * @param {string} sessionId
   * @param {Object} context
   */
  async updateSessionContext(sessionId, context) {
    throw new Error(`updateSessionContext() not implemented in provider "${this.name}"`);
  }

  /**
   * Deliver tool execution result to the realtime session
   * @param {string} sessionId
   * @param {Object} toolResult
   */
  async sendToolResult(sessionId, toolResult) {
    throw new Error(`sendToolResult() not implemented in provider "${this.name}"`);
  }

  /**
   * Get current state of realtime session
   * @param {string} sessionId
   * @returns {string|null}
   */
  getRealtimeSessionState(sessionId) {
    return null;
  }
}

module.exports = {
  AIProvider,
  PROVIDER_CAPABILITIES,
  PROVIDER_STATUS,
  PROVIDER_ERRORS
};
