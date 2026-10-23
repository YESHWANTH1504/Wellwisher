const crypto = require('node:crypto');
const { defaultSystemOrchestrator } = require('./JarvisSystemOrchestrator');
const { CanonicalRequest, ACTIVATION_SOURCES, INPUT_TYPES } = require('../core/canonicalRequest');
const VoiceResponseFormatter = require('../agent/VoiceResponseFormatter');

/**
 * JarvisRequest
 * Typed request payload presented to JARVIS OS Core.
 */
class JarvisRequest {
  constructor({
    requestId,
    userId,
    sessionId,
    text = '',
    modality = 'VOICE',
    source = 'VOICE_INTERACTION',
    screenContext = null,
    multimodalInput = null,
    healthSnapshot = null,
    deviceStatus = null,
    isConfirmed = false,
    confirmationId = null,
    timezone = 'UTC',
    userName = 'User',
    timestamp = Date.now()
  } = {}) {
    this.requestId = requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.userId = userId;
    this.sessionId = sessionId || `session_${userId}_default`;
    this.text = (text || '').trim();
    this.modality = modality;
    this.source = source;
    this.screenContext = screenContext;
    this.multimodalInput = multimodalInput;
    this.healthSnapshot = healthSnapshot;
    this.deviceStatus = deviceStatus;
    this.isConfirmed = Boolean(isConfirmed);
    this.confirmationId = confirmationId;
    this.timezone = timezone;
    this.userName = userName;
    this.timestamp = timestamp;
  }
}

/**
 * JarvisExecutionResult
 * Authoritative typed execution result returned by JARVIS OS Core.
 */
class JarvisExecutionResult {
  constructor({
    success = true,
    requestId,
    sessionId,
    intent,
    state = 'SPEAKING',
    speech = '',
    message = '',
    executionStatus = 'VERIFIED',
    steps = [],
    action = null,
    requiresConfirmation = false,
    confirmationId = null,
    requiresNativeExecution = false,
    error = null,
    telemetry = {}
  } = {}) {
    this.success = success;
    this.requestId = requestId;
    this.sessionId = sessionId;
    this.intent = intent;
    this.state = state;
    this.speech = speech;
    this.message = message;
    this.executionStatus = executionStatus;
    this.steps = steps;
    this.action = action;
    this.requiresConfirmation = requiresConfirmation;
    this.confirmationId = confirmationId;
    this.requiresNativeExecution = requiresNativeExecution;
    this.error = error;
    this.telemetry = telemetry;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * JarvisOSCore
 * Authoritative operating system layer for WellWisher / JARVIS.
 * Transforms JARVIS from a standalone assistant application into a coherent
 * Android AI Operating System Layer.
 */
class JarvisOSCore {
  constructor(options = {}) {
    this.orchestrator = options.orchestrator || defaultSystemOrchestrator;
  }

  /**
   * Process a typed JarvisRequest through the complete 18-step OS lifecycle:
   * 1. Receive request
   * 2. Identify modality
   * 3. Gather context
   * 4. Resolve entities/references
   * 5. Classify intent
   * 6. Determine capabilities
   * 7. Select model if required
   * 8. Generate structured plan
   * 9. Validate plan
   * 10. Apply safety policy
   * 11. Ask confirmation if required
   * 12. Execute trusted capabilities
   * 13. Observe result
   * 14. Verify result
   * 15. Persist relevant state
   * 16. Update active task
   * 17. Generate natural response
   * 18. Speak/display response
   *
   * @param {JarvisRequest|Object} request
   * @returns {Promise<JarvisExecutionResult>}
   */
  async execute(request) {
    const startTime = Date.now();
    const req = request instanceof JarvisRequest ? request : new JarvisRequest(request);

    if (!req.userId) {
      return new JarvisExecutionResult({
        success: false,
        requestId: req.requestId,
        sessionId: req.sessionId,
        state: 'RECOVERY',
        error: 'UNAUTHORIZED',
        speech: 'Authentication is required to invoke JARVIS OS.',
        message: 'Authentication required.'
      });
    }

    if (!req.text && !req.confirmationId && !req.multimodalInput) {
      return new JarvisExecutionResult({
        success: false,
        requestId: req.requestId,
        sessionId: req.sessionId,
        state: 'RECOVERY',
        error: 'EMPTY_REQUEST',
        speech: 'I did not catch that. How can I help you?',
        message: 'Empty request received.'
      });
    }

    console.log(`[JARVIS_OS] REQUEST_RECEIVED id=${req.requestId} user=${req.userId} modality=${req.modality} text="${req.text}"`);

    // Delegate through system orchestrator
    const res = await this.orchestrator.orchestrate(req.userId, req.text, {
      requestId: req.requestId,
      sessionId: req.sessionId,
      source: req.source,
      modality: req.modality,
      screenContext: req.screenContext,
      multimodalInput: req.multimodalInput,
      healthSnapshot: req.healthSnapshot,
      deviceStatus: req.deviceStatus,
      isConfirmed: req.isConfirmed,
      confirmationId: req.confirmationId,
      timezone: req.timezone,
      userName: req.userName
    });

    const executionDuration = Date.now() - startTime;
    console.log(`[JARVIS_OS] EXECUTION_COMPLETED id=${req.requestId} status=${res.executionStatus || 'VERIFIED'} duration=${executionDuration}ms`);

    return new JarvisExecutionResult({
      success: res.success !== false,
      requestId: req.requestId,
      sessionId: req.sessionId,
      intent: res.intent || 'GENERAL',
      state: res.state || 'SPEAKING',
      speech: res.speech || VoiceResponseFormatter.formatForSpeech(res.message || 'Done.'),
      message: res.message || res.speech || 'Done.',
      executionStatus: res.executionStatus || 'VERIFIED',
      steps: res.steps || [],
      action: res.action || null,
      requiresConfirmation: res.requiresConfirmation || false,
      confirmationId: res.confirmationId || null,
      requiresNativeExecution: res.requiresNativeExecution || false,
      error: res.error || null,
      telemetry: {
        ...(res.telemetry || {}),
        osDurationMs: executionDuration,
        correlationId: req.requestId
      }
    });
  }

  /**
   * Diagnostic System Probe
   */
  async probe(userId, options = {}) {
    return await this.orchestrator.getSystemStatus(userId, options);
  }
}

const defaultOSCore = new JarvisOSCore();

module.exports = {
  JarvisOSCore,
  JarvisRequest,
  JarvisExecutionResult,
  defaultOSCore
};
