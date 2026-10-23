const crypto = require('node:crypto');
const { aiModelRouter } = require('../providers/AIModelRouter');
const { JarvisSupervisorAgent, SUPERVISOR_STATES } = require('../agent/JarvisSupervisorAgent');
const SeniorCareProfile = require('../profiles/SeniorCareProfile');
const ProfessionalProfile = require('../profiles/ProfessionalProfile');
const { registry } = require('../tools');
const { CanonicalRequest, ACTIVATION_SOURCES, INPUT_TYPES } = require('../core/canonicalRequest');
const AiConversationRepository = require('../../../repositories/ai/aiConversationRepository');
const { activeTaskManager } = require('../tasks/ActiveTaskManager');

class JarvisMasterOrchestrator {
  constructor(options = {}) {
    this.router = options.router || aiModelRouter;
    this.supervisor = options.supervisor || new JarvisSupervisorAgent({ modelRouter: this.router });
    this.sessions = new Map();
    this.commandHistory = []; // In-memory cache + persistent event telemetry
  }

  /**
   * Create or resume a personal AI session
   */
  createSession(userId, metadata = {}) {
    const sessionId = `session_${userId}_${crypto.randomBytes(6).toString('hex')}`;
    const session = {
      sessionId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
      activeTurn: 0,
      conversationSummary: ''
    };
    this.sessions.set(sessionId, session);
    console.log(`[JARVIS] SESSION_CREATED sessionId=${sessionId} userId=${userId}`);
    return session;
  }

  /**
   * Get active session or create a default stable one
   */
  getSession(userId, sessionId) {
    const sid = sessionId || `session_${userId}_default`;
    if (!this.sessions.has(sid)) {
      this.sessions.set(sid, {
        sessionId: sid,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {},
        activeTurn: 0
      });
    }
    return this.sessions.get(sid);
  }

  /**
   * Execute an end-to-end multi-agent orchestration lifecycle
   * Supports both canonical request object and positional parameters.
   */
  async process(arg1, arg2, arg3 = {}) {
    const startTime = Date.now();

    // 1. Canonical request normalization
    let userId, rawUtterance, options, source, requestId, sessionId;
    if (typeof arg1 === 'object' && arg1 !== null && (arg1.transcript !== undefined || arg1.userId !== undefined)) {
      userId = arg1.userId;
      rawUtterance = arg1.transcript || arg1.normalizedTranscript || '';
      options = arg1.context || {};
      source = arg1.source || arg1.activationSource || 'TEXT';
      requestId = arg1.requestId || `req_${crypto.randomBytes(6).toString('hex')}`;
      sessionId = arg1.sessionId || `session_${userId}_default`;
    } else {
      userId = arg1;
      rawUtterance = arg2 || '';
      options = arg3 || {};
      source = options.source || options.activationSource || 'TEXT';
      requestId = options.requestId || `req_${crypto.randomBytes(6).toString('hex')}`;
      sessionId = options.sessionId || `session_${userId}_default`;
    }

    // Map source to authoritative CanonicalRequest ACTIVATION_SOURCES
    let activationSource = ACTIVATION_SOURCES.TEXT_INPUT;
    const upperSource = (source || '').toUpperCase();
    if (upperSource === 'WAKE_WORD' || upperSource === 'WAKE') {
      activationSource = ACTIVATION_SOURCES.WAKE_WORD;
    } else if (upperSource === 'MIC_BUTTON' || upperSource === 'MIC') {
      activationSource = ACTIVATION_SOURCES.MIC_BUTTON;
    } else if (upperSource === 'VOICE' || upperSource === 'VOICE_INTERACTION' || upperSource === 'FOREGROUND_VOICE') {
      activationSource = ACTIVATION_SOURCES.VOICE_INTERACTION;
    } else if (upperSource === 'CAMERA' || upperSource === 'VISION' || upperSource === 'LOOK') {
      activationSource = ACTIVATION_SOURCES.CAMERA;
    } else if (upperSource === 'SCREEN' || upperSource === 'SCREENSHOT') {
      activationSource = ACTIVATION_SOURCES.SCREEN;
    } else if (upperSource === 'MULTIMODAL' || upperSource === 'DOCUMENT' || upperSource === 'PDF') {
      activationSource = ACTIVATION_SOURCES.MULTIMODAL;
    } else if (upperSource === 'TEXT' || upperSource === 'TEXT_INPUT' || upperSource === 'MANUAL') {
      activationSource = ACTIVATION_SOURCES.TEXT_INPUT;
    } else if (Object.values(ACTIVATION_SOURCES).includes(source)) {
      activationSource = source;
    } else {
      console.warn(`[JARVIS] Rejected unverified activation source: "${source}"`);
      return {
        success: false,
        errorCode: 'UNAUTHORIZED_ACTIVATION_SOURCE',
        speech: '',
        message: `Invalid activation source: ${source}. Internal/unsolicited events cannot initiate AI requests.`
      };
    }

    const canonicalReq = new CanonicalRequest({
      requestId,
      sessionId,
      userId,
      activationSource,
      userInitiated: true,
      rawTranscript: rawUtterance,
      context: options
    });

    const validation = CanonicalRequest.validate(canonicalReq);
    if (!validation.valid) {
      console.warn(`[JARVIS] CanonicalRequest validation failed: ${validation.error}`);
      return {
        success: false,
        errorCode: 'INVALID_CANONICAL_REQUEST',
        speech: 'I did not catch that. How can I help you?',
        message: validation.error
      };
    }

    const session = this.getSession(userId, sessionId);
    session.activeTurn = (session.activeTurn || 0) + 1;
    session.updatedAt = new Date().toISOString();

    console.log(`[JARVIS] REQUEST_RECEIVED requestId=${requestId} source=${activationSource} raw="${rawUtterance}"`);
    console.log(`[JARVIS] SESSION_LOADED sessionId=${sessionId}`);

    // Persist incoming user turn to conversation history
    try {
      const existingConv = await AiConversationRepository.getConversationById(sessionId, userId);
      if (!existingConv) {
        await AiConversationRepository.createConversation(userId, {
          id: sessionId,
          title: (rawUtterance || '').substring(0, 40) || 'JARVIS Session'
        });
      }
      if (rawUtterance) {
        await AiConversationRepository.addMessage(userId, {
          conversationId: sessionId,
          role: 'user',
          content: rawUtterance
        });
      }
    } catch (_) {}

    // 2. Hydrate active task state from durable storage if missing from RAM (e.g. server restart)
    try {
      await activeTaskManager.loadActiveTask(sessionId, userId);
    } catch (_) {}

    // 3. Multi-Agent Supervisor Request Processing
    const result = await this.supervisor.processRequest(userId, canonicalReq.cleanedCommand || rawUtterance, {
      ...options,
      sessionId,
      requestId,
      source: activationSource,
      canonicalRequest: canonicalReq
    });

    // Persist assistant response turn to conversation history
    try {
      const assistantText = result.speech || result.message || '';
      if (assistantText) {
        await AiConversationRepository.addMessage(userId, {
          conversationId: sessionId,
          role: 'assistant',
          content: assistantText
        });
      }
    } catch (_) {}

    const duration = Date.now() - startTime;
    const provider = result.provider || 'gemini';
    const model = result.model || 'gemini-3.5-flash-lite';
    const intent = result.intent || 'UNKNOWN';

    console.log(`[JARVIS] PROVIDER=${provider}`);
    console.log(`[JARVIS] MODEL=${model}`);
    console.log(`[JARVIS] INTENT=${intent}`);
    if (result.steps && result.steps.length > 0) {
      console.log(`[JARVIS] TOOL=${result.steps[0].toolName}`);
      console.log(`[JARVIS] ACTION=${result.action || result.steps[0].toolName}`);
    }
    console.log(`[JARVIS] EXECUTION_RESULT status=${result.executionStatus || 'SUCCESS'}`);
    console.log(`[JARVIS] RESPONSE_GENERATED text="${(result.speech || result.message || '').substring(0, 60)}"`);
    console.log(`[JARVIS] REQUEST_COMPLETED duration=${duration}ms`);

    // 3. Command History Durable Recording
    const commandRecord = {
      commandId: `cmd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      requestId,
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      source,
      rawTranscript: rawUtterance,
      normalizedTranscript: (rawUtterance || '').trim().toLowerCase(),
      intent,
      entities: result.entities || {},
      provider,
      model,
      plannedActions: result.steps || [],
      toolCalls: result.steps?.map(s => ({ tool: s.toolName, args: s.arguments })) || [],
      toolResults: result.steps?.map(s => s.result) || [],
      executionStatus: result.executionStatus || (result.success ? 'COMPLETED' : 'FAILED'),
      verificationStatus: result.verified ? 'VERIFIED' : (result.verificationUnavailable ? 'VERIFICATION_UNAVAILABLE' : 'UNVERIFIED'),
      responseText: result.speech || result.message || '',
      responseTimestamp: new Date().toISOString(),
      error: result.error || null,
      duration
    };

    this.commandHistory.unshift(commandRecord);
    if (this.commandHistory.length > 1000) {
      this.commandHistory.pop();
    }

    return {
      ...result,
      requestId,
      sessionId,
      latencyMs: duration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Alias for process()
   */
  async processRequest(arg1, arg2, arg3 = {}) {
    return this.process(arg1, arg2, arg3);
  }

  /**
   * Verify native Android action execution reported from client
   */
  async verifyNativeAction(userId, sessionId, payload = {}) {
    console.log(`[JARVIS] VERIFICATION_RESULT action=${payload.action} pkg=${payload.packageName} verified=${payload.nativeResult?.verified}`);
    return await this.supervisor.verifyNativeAction(userId, sessionId, payload);
  }

  /**
   * Handle barge-in / speech stop
   */
  interrupt(sessionId) {
    console.log(`[JARVIS] INTERRUPT_REQUESTED sessionId=${sessionId}`);
    return this.supervisor.handleInterruption(sessionId);
  }

  /**
   * Retrieve persistent command and activity history
   */
  getCommandHistory(userId, options = {}) {
    const limit = parseInt(options.limit, 10) || 50;
    return this.commandHistory
      .filter(cmd => cmd.userId === userId)
      .slice(0, limit);
  }

  /**
   * Retrieve working session memory
   */
  getSessionMemory(userId, sessionId) {
    const session = this.sessions.get(sessionId) || null;
    const workingMemory = this.supervisor.memoryAgent?.getWorkingMemory(sessionId) || {};
    return {
      session,
      workingMemory
    };
  }

  /**
   * Retrieve registered system tools and capabilities
   */
  getCapabilities() {
    return registry.listAvailableTools();
  }

  /**
   * Confirm pending action
   */
  async confirmAction(userId, confirmationId, options = {}) {
    return await this.supervisor.confirmAction(userId, confirmationId, options);
  }

  /**
   * Cancel pending or active action
   */
  cancelAction(userId, sessionId) {
    return this.supervisor.cancelAction(userId, sessionId);
  }

  /**
   * Get senior care domain summary
   */
  async getSeniorSummary(userId) {
    return await SeniorCareProfile.getSummary(userId);
  }

  async getWorkdayBriefing(userId) {
    return await ProfessionalProfile.getWorkdayBriefing(userId);
  }

  /**
   * Record lightweight context event into working session memory without duplicating calendar database
   */
  recordContextEvent(userId, sessionId, eventData = {}) {
    const session = this.getSession(userId, sessionId);
    if (!session.contextEvents) {
      session.contextEvents = [];
    }
    session.contextEvents.unshift(eventData);
    if (session.contextEvents.length > 50) {
      session.contextEvents.pop();
    }
    session.updatedAt = new Date().toISOString();
    return true;
  }
}

const masterOrchestrator = new JarvisMasterOrchestrator();

module.exports = {
  JarvisMasterOrchestrator,
  masterOrchestrator,
  SUPERVISOR_STATES
};
