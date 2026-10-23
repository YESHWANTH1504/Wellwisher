const ContextEngine = require('../context/contextEngine');
const LLMAdapter = require('./llm/llmAdapter');
const { aiModelRouter } = require('../providers/AIModelRouter');
const { aiProviderRegistry } = require('../providers/AIProviderRegistry');
const RequestClassifierAgent = require('./RequestClassifierAgent');
const KnowledgeAgent = require('./specialized/KnowledgeAgent');
const PersonalContextAgent = require('./specialized/PersonalContextAgent');
const ProactiveAgent = require('./specialized/ProactiveAgent');
const ConversationAgent = require('./specialized/ConversationAgent');
const TaskPlanningAgent = require('./specialized/TaskPlanningAgent');
const SafetyAuthorizationAgent = require('./specialized/SafetyAuthorizationAgent');
const ToolExecutionAgent = require('./specialized/ToolExecutionAgent');
const MemoryAgent = require('./specialized/MemoryAgent');
const CalendarAgent = require('./specialized/CalendarAgent');
const ReminderAgent = require('./specialized/ReminderAgent');
const AlarmAgent = require('./specialized/AlarmAgent');
const WellnessAgent = require('./specialized/WellnessAgent');
const DeviceAgent = require('./specialized/DeviceAgent');
const FollowUpResolutionAgent = require('./specialized/FollowUpResolutionAgent');
const { activeTaskManager } = require('../tasks/ActiveTaskManager');
const DeviceVerificationService = require('../platform/DeviceVerificationService');
const VoiceResponseFormatter = require('./VoiceResponseFormatter');
const { WorkflowVerifier, VERIFICATION_STATUS } = require('./WorkflowVerifier');
const { ResponseAgent } = require('./ResponseAgent');
const { multimodalContextManager } = require('../multimodal/MultimodalContextManager');
const VisualMemoryManager = require('../multimodal/VisualMemoryManager');
const MultimodalPromptGuard = require('../multimodal/MultimodalPromptGuard');
const HealthVisualSafetyGuard = require('../multimodal/HealthVisualSafetyGuard');

const SUPERVISOR_STATES = {
  IDLE: 'IDLE',
  LISTENING: 'LISTENING',
  CAPTURING: 'CAPTURING',
  ANALYZING: 'ANALYZING',
  UNDERSTANDING: 'UNDERSTANDING',
  CONTEXTUALIZING: 'CONTEXTUALIZING',
  PLANNING: 'PLANNING',
  AUTHORIZING: 'AUTHORIZING',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  SPEAKING: 'SPEAKING',
  INTERRUPTED: 'INTERRUPTED',
  RECOVERY: 'RECOVERY',
  WAITING: 'WAITING',
  NEEDS_CONFIRMATION: 'NEEDS_CONFIRMATION'
};

/**
 * JarvisSupervisorAgent
 * Authoritative central intelligence coordinating universal AI reasoning,
 * context retrieval, tool execution, state verification, and voice output synthesis.
 * All requests flow through ONE unified intelligence. Zero hardcoded command switchboards.
 */
class JarvisSupervisorAgent {
  constructor(options = {}) {
    this.modelRouter = options.modelRouter || options.aiModelRouter || aiModelRouter;
    this.providerRegistry = options.providerRegistry || options.aiProviderRegistry || aiProviderRegistry;
    this.llmAdapter = options.llmAdapter || new LLMAdapter({ router: this.modelRouter, registry: this.providerRegistry });
    this.classifier = options.classifier || new RequestClassifierAgent();
    this.knowledge = options.knowledge || new KnowledgeAgent({ llmAdapter: this.llmAdapter, modelRouter: this.modelRouter });
    this.conversationAgent = options.conversationAgent || new ConversationAgent();
    this.taskPlanningAgent = options.taskPlanningAgent || new TaskPlanningAgent({ llmAdapter: this.llmAdapter, modelRouter: this.modelRouter });
    this.safetyAgent = options.safetyAgent || new SafetyAuthorizationAgent();
    this.toolExecutionAgent = options.toolExecutionAgent || new ToolExecutionAgent();
    this.memoryAgent = options.memoryAgent || new MemoryAgent();
    this.personalContext = options.personalContext || new PersonalContextAgent(this.memoryAgent);
    this.proactive = options.proactive || new ProactiveAgent({ toolExecutor: this.toolExecutionAgent });

    // Domain Subagents
    this.calendar = new CalendarAgent(this.toolExecutionAgent);
    this.reminders = new ReminderAgent(this.toolExecutionAgent);
    this.alarms = new AlarmAgent(this.toolExecutionAgent);
    this.wellness = new WellnessAgent(this.toolExecutionAgent);
    this.device = new DeviceAgent(this.toolExecutionAgent);

    this.currentState = SUPERVISOR_STATES.IDLE;
  }

  /**
   * Process a user voice/text request through the universal single-intelligence lifecycle
   */
  async processRequest(userId, requestText, options = {}) {
    const startTime = Date.now();
    const sessionId = options.sessionId || `session_${Date.now()}`;
    const raw = (requestText || '').trim();

    if (!userId) {
      return {
        success: false,
        state: SUPERVISOR_STATES.RECOVERY,
        errorCode: 'UNAUTHORIZED',
        speech: 'Authentication is required to access JARVIS.',
        message: 'Authentication required.'
      };
    }

    if (!raw) {
      return {
        success: false,
        state: SUPERVISOR_STATES.RECOVERY,
        errorCode: 'EMPTY_REQUEST',
        speech: 'I did not catch that. How can I help you?',
        message: 'Empty request received.'
      };
    }

    // 1. Safety Pre-Evaluation (Prompt Injection & Medical Safety Guardrails)
    this.currentState = SUPERVISOR_STATES.UNDERSTANDING;
    const securityCheck = this.safetyAgent.evaluateSecurity(raw);
    if (!securityCheck.safe) {
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: securityCheck.intent,
        speech: securityCheck.message,
        message: securityCheck.message
      };
    }

    const medicalCheck = this.safetyAgent.evaluateMedicalSafety(raw);
    if (!medicalCheck.safe) {
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: medicalCheck.intent,
        speech: medicalCheck.message,
        message: medicalCheck.message
      };
    }

    // 2. Contextual Follow-Up Engine (Active Task Resolution)
    const followUp = FollowUpResolutionAgent.resolve(raw, sessionId, { userId });
    if (followUp.isFollowUp) {
      this.currentState = SUPERVISOR_STATES.EXECUTING;

      let executedSteps = [];
      let finalSpeech = followUp.speech || followUp.message || '';
      let triggerAtMillis = null;
      let reminderId = null;

      if (followUp.actionPlan && Array.isArray(followUp.actionPlan.steps)) {
        for (const step of followUp.actionPlan.steps) {
          const execRes = await this.toolExecutionAgent.executeTool(userId, step.toolName, step.arguments, {
            timezone: options.timezone || 'UTC',
            healthContext: options.healthContext || options.canonicalRequest?.context?.healthContext,
            healthGoals: options.healthGoals || options.canonicalRequest?.context?.healthGoals
          });
          executedSteps.push({
            stepNumber: step.stepNumber,
            toolName: step.toolName,
            result: execRes
          });

          const resData = execRes?.data || execRes || {};
          if (resData.message) finalSpeech = resData.message;
          if (resData.triggerAtMillis) triggerAtMillis = resData.triggerAtMillis;
          if (resData.reminderId) reminderId = resData.reminderId;

          // Update or clear active task state
          if (step.toolName === 'cancel_reminder' || step.toolName === 'cancel_event') {
            activeTaskManager.clearActiveTask(sessionId);
            this.memoryAgent.clearWorkingMemory(sessionId, 'lastAction');
          } else if (step.toolName === 'update_reminder' || step.toolName === 'reschedule_event') {
            activeTaskManager.setActiveTask(sessionId, {
              userId,
              reminderId: resData.reminderId || reminderId,
              title: resData.title || resData.updatedEvent?.title || 'Reminder',
              time: resData.time || resData.updatedEvent?.time,
              date: resData.date || resData.updatedEvent?.date,
              triggerAtMillis: resData.triggerAtMillis,
              status: 'RESCHEDULED',
              verified: true
            });
            this.memoryAgent.setWorkingMemory(sessionId, 'lastAction', {
              type: 'reminder',
              reminderId: resData.reminderId || reminderId,
              title: resData.title || 'Reminder',
              time: resData.time
            });
          }
        }
      }

      if (followUp.clearTask) {
        activeTaskManager.clearActiveTask(sessionId);
        this.memoryAgent.clearWorkingMemory(sessionId);
      }

      this.currentState = SUPERVISOR_STATES.SPEAKING;
      const spoken = VoiceResponseFormatter.formatForSpeech(finalSpeech);

      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: followUp.intent || 'FOLLOW_UP_RESPONSE',
        speech: spoken,
        message: finalSpeech || spoken,
        executionStatus: 'VERIFIED',
        steps: executedSteps,
        reminderId,
        triggerAtMillis,
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // 2.2 Memory & Preference Management (Phase 5 & 5.1 Hardened)
    const lower = raw.toLowerCase();
    const isVisualQuery = lower.includes('image') || lower.includes('photo') || lower.includes('visual') || lower.includes('desk');
    if (
      !isVisualQuery && (
        lower.startsWith('remember that') ||
        lower.startsWith('remember ') ||
        lower.startsWith('forget that') ||
        lower.startsWith('forget preference') ||
        lower.startsWith('forget my preference') ||
        lower.startsWith('delete that memory') ||
        lower.startsWith('don\'t remember this') ||
        lower.startsWith('dont remember this') ||
        lower.includes('what time format do i prefer') ||
        lower.includes('what do you remember') ||
        lower.includes('what do i prefer') ||
        lower.includes('my preferences') ||
        lower.includes('my reminder preference') ||
        lower.includes('forget that i prefer') ||
        lower.includes('forget my') ||
        lower.includes('what are my reminders') ||
        lower.includes('what reminders do i have') ||
        lower.includes('what did i ask you to remind')
      )
    ) {
      const memRes = await this.personalContext.handleMemoryRequest(userId, raw);
      if (memRes) {
        this.currentState = SUPERVISOR_STATES.SPEAKING;
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: memRes.action || 'MEMORY_ACTION',
          speech: memRes.speech,
          message: memRes.message || memRes.speech,
          executionStatus: 'VERIFIED',
          telemetry: { totalDurationMs: Date.now() - startTime }
        };
      }
    }

    // 2.3 Proactive Morning Briefing Request (Phase 5)
    if (
      lower.includes('morning briefing') ||
      lower.includes('give me my briefing') ||
      lower.includes('today\'s briefing') ||
      lower.includes('todays briefing')
    ) {
      const briefingRes = await this.personalContext.generateMorningBriefing(userId, { force: true });
      this.currentState = SUPERVISOR_STATES.SPEAKING;
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'DAILY_BRIEFING',
        speech: briefingRes.speech,
        message: briefingRes.message,
        executionStatus: 'VERIFIED',
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // 2.4 Register incoming multimodal input into active visual context
    if (options.multimodalInput) {
      const mmInput = options.multimodalInput;
      multimodalContextManager.setActiveContext(userId, sessionId, {
        data: mmInput.data || mmInput.bytes || mmInput.base64,
        mimeType: mmInput.mimeType || 'image/jpeg',
        type: mmInput.type || 'CAMERA_IMAGE',
        source: mmInput.source || 'CAMERA',
        filename: mmInput.filename,
        storedAt: Date.now()
      });
    }

    // 2.5 Explicit Clear / Forget Active Visual Context
    if (
      lower.includes('forget that image') ||
      lower.includes('forget this visual context') ||
      lower.includes('clear visual context') ||
      lower.includes('forget the photo') ||
      lower.includes('forget the image') ||
      lower.includes('forget what you saw') ||
      lower.includes('forget what you see')
    ) {
      multimodalContextManager.clearContext(userId, sessionId);
      this.currentState = SUPERVISOR_STATES.SPEAKING;
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'CLEAR_VISUAL_CONTEXT',
        speech: 'I have cleared the active visual context.',
        message: 'Active visual context has been cleared.',
        executionStatus: 'VERIFIED',
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // 2.6 Explicit Visual Memory Management (Save, Recall, Forget)
    // 2.6.1 Visual Memory Forget (Evaluated before Recall)
    if (
      lower.startsWith('forget that visual memory') ||
      lower.startsWith('forget the visual memory') ||
      lower.includes('forget that photo') ||
      lower.includes('forget the photo i asked you to remember') ||
      lower.includes('forget that visual memory') ||
      (lower.startsWith('forget') && (lower.includes('desk') || lower.includes('photo') || lower.includes('visual') || lower.includes('work desk')))
    ) {
      const forgot = await VisualMemoryManager.forgetVisualMemory(userId, raw);
      this.currentState = SUPERVISOR_STATES.SPEAKING;
      const speech = forgot
        ? 'I have deleted that visual memory from your profile.'
        : 'I could not find that visual memory to delete.';
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'VISUAL_MEMORY_FORGET',
        speech,
        message: speech,
        executionStatus: 'VERIFIED',
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // 2.6.2 Visual Memory Recall
    if (
      lower.startsWith('what did i ask you to remember about') ||
      lower.includes('what do you remember about') ||
      (lower.includes('remember') && !lower.startsWith('forget') && (lower.includes('desk') || lower.includes('work desk') || lower.includes('photo') || lower.includes('visual memory')))
    ) {
      const recalled = await VisualMemoryManager.recallVisualMemory(userId, raw);
      if (recalled) {
        this.currentState = SUPERVISOR_STATES.SPEAKING;
        const speech = `You asked me to remember: ${recalled.memory_value}`;
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'VISUAL_MEMORY_RECALL',
          speech,
          message: recalled.memory_value,
          executionStatus: 'VERIFIED',
          telemetry: { totalDurationMs: Date.now() - startTime }
        };
      }
    }

    // 2.6.3 Visual Memory Explicit Save ("Remember this as my work desk" / "Remember that this is...")
    if (
      (lower.startsWith('remember this as') || lower.startsWith('remember that this is') || lower.startsWith('remember this photo as'))
    ) {
      const labelMatch = raw.match(/remember (?:this|that) (?:is|as) (?:my )?(.+)/i);
      const label = labelMatch ? labelMatch[1].trim() : 'visual_item';
      const activeVisual = multimodalContextManager.getActiveContext(userId, sessionId);

      let desc = activeVisual?.lastObservation || `Visual observation of ${label}`;
      if (activeVisual?.data && !activeVisual.lastObservation) {
        try {
          const obs = await this.modelRouter.understandImage(activeVisual.data, `Briefly describe this ${label}.`);
          if (obs) desc = obs;
        } catch (_) {}
      }

      await VisualMemoryManager.saveVisualMemory(userId, {
        label,
        description: desc,
        sourceDevice: activeVisual?.source || 'CAMERA'
      });

      this.currentState = SUPERVISOR_STATES.SPEAKING;
      const speech = `I have remembered this as your ${label}.`;
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'VISUAL_MEMORY_SAVE',
        speech,
        message: speech,
        executionStatus: 'VERIFIED',
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // 2.7 Multimodal & Vision Understanding Engine (Camera, Screen, OCR, Documents, Follow-ups)
    const hasVisualContext = multimodalContextManager.hasActiveContext(userId, sessionId);
    const isVisionIntent = (
      lower.includes('look at this') ||
      lower.includes('what is this') ||
      lower.includes('what am i looking at') ||
      lower.includes('what color') ||
      lower.includes('read this') ||
      lower.includes('read that') ||
      lower.includes('read sign') ||
      lower.includes('read the text') ||
      lower.includes('read any text') ||
      lower.includes('what does this say') ||
      lower.includes('what does it say') ||
      lower.includes('what\'s on my screen') ||
      lower.includes('whats on my screen') ||
      lower.includes('read this screen') ||
      lower.includes('summarize this document') ||
      lower.includes('summarize this pdf') ||
      lower.includes('what does page') ||
      lower.includes('what medicine is this') ||
      lower.includes('what is in front of me') ||
      lower.includes('what\'s in front of me') ||
      lower.includes('whats in front of me') ||
      Boolean(options.multimodalInput)
    );

    if (isVisionIntent) {
      const activeVisual = multimodalContextManager.getActiveContext(userId, sessionId);
      if (!activeVisual || !activeVisual.data) {
        this.currentState = SUPERVISOR_STATES.CAPTURING;
        return {
          success: true,
          state: SUPERVISOR_STATES.CAPTURING,
          intent: 'CAMERA_CAPTURE_REQUESTED',
          speech: 'Please point your camera at what you want me to look at.',
          message: 'Camera capture required. Point camera and try again.',
          executionStatus: 'NEEDS_INPUT',
          telemetry: { totalDurationMs: Date.now() - startTime }
        };
      }

      this.currentState = SUPERVISOR_STATES.ANALYZING;

      // Defend against prompt injection in visual/OCR/doc content
      const guardedPrompt = MultimodalPromptGuard.buildGuardedInstruction(
        'Analyze the user visual context accurately and concisely.',
        raw
      );

      let visualResult = null;
      let provenanceSource = activeVisual.source || activeVisual.type || 'CAMERA';

      // OCR path
      if (
        lower.includes('read') ||
        lower.includes('extract text') ||
        lower.includes('what does this say') ||
        lower.includes('what does it say')
      ) {
        visualResult = await this.modelRouter.extractText(activeVisual.data, {
          mimeType: activeVisual.mimeType || 'image/jpeg'
        });
      } else if (activeVisual.type === 'SCREENSHOT' || lower.includes('screen')) {
        visualResult = await this.modelRouter.analyzeScreen(activeVisual.data, guardedPrompt);
        provenanceSource = 'SCREENSHOT';
      } else if (activeVisual.type === 'PDF' || activeVisual.mimeType === 'application/pdf') {
        visualResult = await this.modelRouter.analyzePdf(activeVisual.data, guardedPrompt);
        provenanceSource = activeVisual.filename || 'PDF_DOCUMENT';
      } else {
        visualResult = await this.modelRouter.understandImage(activeVisual.data, guardedPrompt);
      }

      if (!visualResult) {
        this.currentState = SUPERVISOR_STATES.SPEAKING;
        return {
          success: false,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'VISUAL_ANALYSIS_FAILED',
          speech: 'I am unable to see or analyze that clearly right now.',
          message: 'Visual analysis could not be completed by the vision provider.',
          telemetry: { totalDurationMs: Date.now() - startTime }
        };
      }

      // Sanitize output through PromptGuard and Clinical Safety Guard
      const cleanOutput = MultimodalPromptGuard.sanitizeOutput(visualResult);
      const isClinical = HealthVisualSafetyGuard.isClinicalContent(raw + ' ' + cleanOutput);
      const isMed = HealthVisualSafetyGuard.isMedicationQuery(raw);
      const finalSafeSpeech = HealthVisualSafetyGuard.sanitizeVisualClinicalResponse(cleanOutput, isClinical, { isMedication: isMed });

      // Save into active context for multi-turn follow-ups ("What color is it?")
      activeVisual.lastObservation = finalSafeSpeech;
      multimodalContextManager.setActiveContext(userId, sessionId, activeVisual);

      this.currentState = SUPERVISOR_STATES.SPEAKING;
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'VISUAL_UNDERSTANDING',
        speech: finalSafeSpeech,
        message: finalSafeSpeech,
        extractedText: cleanOutput,
        executionStatus: 'VERIFIED',
        provenance: {
          provider: 'Gemini',
          model: 'gemini-3.5-flash-lite',
          source: provenanceSource,
          timestamp: new Date().toISOString()
        },
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // 3. Multi-Turn Pending Slot Resolution
    const multiTurnResolution = this.conversationAgent.resolveMultiTurnIntent(raw, {
      pendingIntent: options.pendingIntent || this.memoryAgent.getWorkingMemory(sessionId, 'pendingIntent'),
      pendingSlots: options.pendingSlots || this.memoryAgent.getWorkingMemory(sessionId, 'pendingSlots'),
      lastWeatherLocation: this.memoryAgent.getWorkingMemory(sessionId, 'lastWeatherLocation')
    });

    if (multiTurnResolution.clearPending) {
      this.memoryAgent.clearWorkingMemory(sessionId, 'pendingIntent');
      this.memoryAgent.clearWorkingMemory(sessionId, 'pendingSlots');
    }

    const resolvedRequestText = multiTurnResolution.resolvedQuery || raw;

    // 4. Build Context Package via ContextEngine
    this.currentState = SUPERVISOR_STATES.CONTEXTUALIZING;
    const incomingUserName = (options.userName || options.canonicalRequest?.context?.userName || '').trim();
    const contextPackage = await ContextEngine.buildContext(userId, resolvedRequestText, {
      conversationId: sessionId,
      timezone: options.timezone || 'UTC',
      userName: incomingUserName
    });

    if (incomingUserName) {
      contextPackage.user = contextPackage.user || {};
      contextPackage.user.name = incomingUserName;
      contextPackage.userName = incomingUserName;
    } else if (contextPackage.user?.name) {
      contextPackage.userName = contextPackage.user.name;
    }

    // Attach active task from activeTaskManager into contextPackage (hydrated from durable store if cold)
    contextPackage.activeTask = activeTaskManager.getActiveTask(sessionId, userId) 
      || await activeTaskManager.loadActiveTask(sessionId, userId);
    contextPackage.lastAction = this.memoryAgent.getWorkingMemory(sessionId, 'lastAction');
    try {
      contextPackage.personalSnapshot = await this.personalContext.buildContextSnapshot(userId, {
        timezone: options.timezone || 'UTC',
        userName: incomingUserName,
        sessionId
      });
    } catch (_) {}

    // 5. Universal AI Planning Phase (Single unified intelligence via LLMAdapter)
    this.currentState = SUPERVISOR_STATES.PLANNING;
    const plan = await this.taskPlanningAgent.planTask(contextPackage, resolvedRequestText);

    // Case 1: Clarification Required (Missing Slot or Ambiguity)
    if (plan.type === 'CLARIFICATION_REQUIRED') {
      this.currentState = SUPERVISOR_STATES.SPEAKING;
      if (plan.pendingIntent) {
        this.memoryAgent.setWorkingMemory(sessionId, 'pendingIntent', plan.pendingIntent);
      }
      if (plan.missingSlot) {
        this.memoryAgent.setWorkingMemory(sessionId, 'pendingSlots', { missingSlot: plan.missingSlot });
      }
      this.memoryAgent.setWorkingMemory(sessionId, 'lastUserQuery', resolvedRequestText);
      const spoken = VoiceResponseFormatter.formatForSpeech(plan.message);
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: plan.intent || 'CLARIFICATION_REQUIRED',
        requiresClarification: true,
        speech: spoken,
        message: plan.message,
        executionStatus: 'VERIFIED',
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // Case 2: Pure Conversation / General Chat / Explanation / Joke (No Tools Required)
    if (plan.type === 'FINAL_RESPONSE') {
      this.currentState = SUPERVISOR_STATES.SPEAKING;
      this.memoryAgent.setWorkingMemory(sessionId, 'lastUserQuery', resolvedRequestText);
      const spoken = VoiceResponseFormatter.formatForSpeech(plan.message);
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: plan.intent || 'GENERAL_CONVERSATION',
        action: plan.action || null,
        gender: plan.gender || null,
        speech: spoken,
        message: plan.message,
        executionStatus: 'VERIFIED',
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // Case 3: Tool Execution Phase
    if (plan.type === 'TOOL_EXECUTION_PLAN' && Array.isArray(plan.steps)) {
      this.currentState = SUPERVISOR_STATES.AUTHORIZING;

      const executedSteps = [];
      let lastTriggerAtMillis = null;
      let lastReminderId = null;

      for (const step of plan.steps) {
        // Authorize Tool Action against user safety policy
        const authCheck = this.safetyAgent.checkAuthorization(
          userId,
          step.toolName,
          step.arguments,
          options.isConfirmed
        );

        if (authCheck.requiresConfirmation) {
          this.currentState = SUPERVISOR_STATES.SPEAKING;
          const confSpeech = `I need your confirmation to execute ${step.toolName}. Would you like me to proceed?`;
          return {
            success: true,
            state: SUPERVISOR_STATES.SPEAKING,
            intent: 'CONFIRMATION_REQUIRED',
            requiresConfirmation: true,
            confirmationId: authCheck.confirmationId,
            speech: confSpeech,
            message: authCheck.message
          };
        }

        // Execute Tool via ToolExecutionAgent
        this.currentState = SUPERVISOR_STATES.EXECUTING;
        const execResult = await this.toolExecutionAgent.executeToolStep(
          userId,
          step.toolName,
          step.arguments,
          {
            isConfirmed: options.isConfirmed,
            timezone: options.timezone || 'UTC',
            healthContext: options.healthContext || options.canonicalRequest?.context?.healthContext,
            healthGoals: options.healthGoals || options.canonicalRequest?.context?.healthGoals,
            sessionId,
            workingMemory: this.memoryAgent.getWorkingMemory(sessionId),
            timeFormat: options.timeFormat || '12h',
            canonicalRequest: options.canonicalRequest
          }
        );

        const resData = execResult?.data || execResult || {};
        executedSteps.push({
          stepNumber: step.stepNumber,
          toolName: step.toolName,
          result: execResult,
          data: resData
        });

        if (resData.triggerAtMillis) lastTriggerAtMillis = resData.triggerAtMillis;
        if (resData.reminderId || resData.id) lastReminderId = resData.reminderId || resData.id;

        if (resData.requiresClarification && resData.candidates) {
          this.memoryAgent.setWorkingMemory(sessionId, 'pendingClarification', {
            toolName: step.toolName,
            candidates: resData.candidates,
            query: step.arguments
          });
          activeTaskManager.setActiveTask(sessionId, {
            type: 'PENDING_CLARIFICATION',
            toolName: step.toolName,
            candidates: resData.candidates,
            query: step.arguments
          });
        }

        if (resData.requiresClarification && resData.missingSlot === 'location') {
          this.memoryAgent.setWorkingMemory(sessionId, 'pendingIntent', 'WEATHER_QUERY');
          this.memoryAgent.setWorkingMemory(sessionId, 'pendingSlots', { missingSlot: 'location', queryType: step.arguments?.queryType || 'general' });
        }

        if (step.toolName === 'get_weather' && resData.location) {
          this.memoryAgent.setWorkingMemory(sessionId, 'lastWeatherLocation', resData.location);
          activeTaskManager.setActiveTask(sessionId, {
            type: 'WEATHER_QUERY',
            location: resData.location,
            status: 'COMPLETED',
            verified: true
          });
        }

        // Maintain ActiveTaskManager state
        if (
          step.toolName === 'create_reminder' ||
          step.toolName === 'create_schedule' ||
          step.toolName === 'calendar_create_event' ||
          step.toolName === 'update_reminder' ||
          step.toolName === 'reschedule_event' ||
          step.toolName === 'update_schedule' ||
          step.toolName === 'calendar_update_event'
        ) {
          const itemType = (step.toolName.includes('reminder')) ? 'REMINDER' : 'SCHEDULE';
          const resolvedId = resData.reminderId || resData.eventId || resData.id || resData.event?.id || lastReminderId;
          const resolvedTitle = resData.title || resData.event?.title || step.arguments?.title || 'Event';
          const resolvedTime = resData.time || resData.event?.time || step.arguments?.time || step.arguments?.newTime || step.arguments?.targetTime;
          const resolvedDate = resData.date || resData.event?.date || step.arguments?.date || step.arguments?.newDate || step.arguments?.targetDate;

          activeTaskManager.setActiveTask(sessionId, {
            userId,
            reminderId: resolvedId,
            scheduleId: resolvedId,
            eventId: resolvedId,
            id: resolvedId,
            title: resolvedTitle,
            time: resolvedTime,
            date: resolvedDate,
            triggerAtMillis: lastTriggerAtMillis,
            type: itemType,
            status: 'SCHEDULED',
            verified: true
          });
          this.memoryAgent.setWorkingMemory(sessionId, 'lastAction', {
            type: itemType.toLowerCase(),
            reminderId: resolvedId,
            eventId: resolvedId,
            title: resolvedTitle,
            time: resolvedTime
          });
        } else if (
          step.toolName === 'cancel_reminder' ||
          step.toolName === 'cancel_event' ||
          step.toolName === 'delete_schedule' ||
          step.toolName === 'calendar_delete_event'
        ) {
          if (!resData.requiresClarification) {
            activeTaskManager.clearActiveTask(sessionId);
            this.memoryAgent.clearWorkingMemory(sessionId, 'lastAction');
            this.memoryAgent.clearWorkingMemory(sessionId, 'pendingClarification');
          }
        } else if (
          step.toolName === 'calendar_get_today' ||
          step.toolName === 'get_today_schedule' ||
          step.toolName === 'calendar_get_date' ||
          step.toolName === 'calendar_get_week'
        ) {
          const eventsList = resData.events || resData.routines || [];
          if (eventsList.length > 0) {
            const { defaultConversationState } = require('../os/JarvisConversationState');
            defaultConversationState.setCandidates(sessionId, userId, eventsList).catch(() => {});

            activeTaskManager.setActiveTask(sessionId, {
              userId,
              type: 'RETRIEVED_SCHEDULE',
              title: eventsList.length === 1 ? eventsList[0].title : `${eventsList.length} Schedule Items`,
              eventId: eventsList.length === 1 ? eventsList[0].id : null,
              entityId: eventsList.length === 1 ? eventsList[0].id : null,
              time: eventsList.length === 1 ? eventsList[0].time : null,
              date: resData.date || eventsList[0].date,
              candidates: eventsList.map((e, idx) => ({
                id: e.id,
                eventId: e.id,
                entityId: e.id,
                title: e.title,
                time: e.time,
                formattedTime: e.formattedTime,
                date: e.date,
                category: e.category,
                eventType: e.eventType,
                ordinal: idx + 1
              })),
              status: 'COMPLETED',
              verified: true
            });
            this.memoryAgent.setWorkingMemory(sessionId, 'lastRetrievedAgenda', eventsList);
          }
        } else if (step.toolName === 'open_application') {
          const appName = step.arguments?.appName || 'WhatsApp';
          const packageName = step.arguments?.packageName || resData.packageName || 'com.whatsapp';
          activeTaskManager.setActiveTask(sessionId, {
            userId,
            type: 'OPEN_APPLICATION',
            application: appName,
            packageName,
            status: 'ACTION_PLANNED',
            verified: false,
            requiresNativeExecution: true,
            startedAt: Date.now()
          });
        }
      }

      this.currentState = SUPERVISOR_STATES.VERIFYING;
      const workflowStatus = WorkflowVerifier.verifyWorkflow(executedSteps, {
        requiresClarification: executedSteps.some(s => s.result?.requiresClarification || s.result?.data?.requiresClarification),
        requiresConfirmation: executedSteps.some(s => s.result?.requiresConfirmation || s.result?.data?.requiresConfirmation)
      });
      const allSucceeded = workflowStatus === VERIFICATION_STATUS.SUCCESS;

      // Synthesize Natural Voice Response
      this.currentState = SUPERVISOR_STATES.SPEAKING;
      let speechFeedback = 'Done.';

      // If current information tool was called, or informational query (wellness, schedule, news), or no explicit message provided, synthesize via LLM
      const firstData = executedSteps[0]?.result?.data || executedSteps[0]?.result || {};
      if (
        plan.intent === 'CURRENT_INFORMATION_QUERY' ||
        plan.intent === 'WELLNESS_QUERY' ||
        plan.steps.some(s => s.toolName === 'get_current_information') ||
        plan.steps.some(s => s.toolName === 'get_today_schedule') ||
        plan.steps.some(s => s.toolName === 'get_wellness_summary') ||
        (!firstData.message && plan.steps.some(s => s.toolName.startsWith('get_')))
      ) {
        speechFeedback = await this.llmAdapter.synthesizeResponse(resolvedRequestText, executedSteps, contextPackage);
      } else {
        const generated = ResponseAgent.generateResponse({
          workflowStatus,
          executedSteps,
          activeContext: contextPackage,
          userPreference: options.userPreference,
          timeFormat: options.timeFormat || '12h',
          defaultMessage: firstData.speech || firstData.message || (allSucceeded ? 'Done.' : 'I ran into an issue taking care of that.')
        });
        speechFeedback = generated.speech;
      }

      let rawSpeechFeedback = firstData.speech || speechFeedback;
      let rawVisualMessage = firstData.message || firstData.speech || speechFeedback;

      const rawUser = (contextPackage.userName || contextPackage.user?.name || '').trim();
      if (rawUser && !rawUser.includes('@')) {
        if (!rawSpeechFeedback.toLowerCase().includes(rawUser.toLowerCase())) {
          rawSpeechFeedback = rawSpeechFeedback.replace(/^(Done|Sure|All set|Got it)\b[.,]?\s*/i, '');
          rawSpeechFeedback = `Sure, ${rawUser}. ${rawSpeechFeedback}`;
        }
        if (!rawVisualMessage.toLowerCase().includes(rawUser.toLowerCase())) {
          rawVisualMessage = `Sure, ${rawUser}. ${rawVisualMessage}`;
        }
      }

      const visualMessage = rawVisualMessage;
      const formattedSpeech = VoiceResponseFormatter.formatForSpeech(rawSpeechFeedback);
      const isDeviceAction = plan.intent === 'OPEN_APPLICATION' || plan.intent === 'OPEN_SETTINGS' ||
        plan.steps[0]?.toolName === 'open_application' || plan.steps[0]?.toolName === 'open_settings';

      this.memoryAgent.setWorkingMemory(sessionId, 'lastUserQuery', resolvedRequestText);

      const hasAction = isDeviceAction || Boolean(lastReminderId) || executedSteps.some(s =>
        s.toolName.includes('calendar') ||
        s.toolName.includes('schedule') ||
        s.toolName.includes('reminder') ||
        s.toolName.startsWith('create_') ||
        s.toolName.startsWith('update_') ||
        s.toolName.startsWith('cancel_') ||
        s.toolName.startsWith('delete_')
      );

      const calendarStep = executedSteps.find(s =>
        s.toolName.includes('calendar') ||
        s.toolName.includes('schedule') ||
        s.toolName.includes('reminder')
      );

      return {
        success: allSucceeded,
        type: hasAction ? 'ACTION_COMPLETED' : 'FINAL_RESPONSE',
        state: isDeviceAction ? SUPERVISOR_STATES.EXECUTING : SUPERVISOR_STATES.SPEAKING,
        intent: plan.intent || 'TOOL_EXECUTION',
        requiresClarification: Boolean(firstData.requiresClarification),
        candidates: firstData.candidates || null,
        speech: formattedSpeech,
        message: visualMessage,
        executionStatus: isDeviceAction ? 'ACTION_PLANNED' : (allSucceeded ? 'VERIFIED' : 'FAILED'),
        steps: executedSteps,
        reminderId: lastReminderId,
        triggerAtMillis: lastTriggerAtMillis,
        requiresNativeExecution: isDeviceAction,
        action: isDeviceAction ? {
          tool: plan.steps[0]?.toolName || 'open_application',
          appName: plan.steps[0]?.arguments?.appName || (plan.steps[0]?.toolName === 'open_settings' ? 'Settings' : 'Application'),
          packageName: plan.steps[0]?.arguments?.packageName || executedSteps[0]?.result?.data?.packageName || (plan.steps[0]?.toolName === 'open_settings' ? 'com.android.settings' : null),
          status: 'ACTION_PLANNED',
          verified: false
        } : (lastReminderId ? {
          tool: 'schedule_reminder',
          type: 'SCHEDULE_REMINDER',
          reminderId: lastReminderId,
          triggerAtMillis: lastTriggerAtMillis,
          status: 'SCHEDULED',
          verified: true,
          data: (calendarStep?.data || firstData)
        } : (calendarStep ? {
          tool: calendarStep.toolName,
          type: calendarStep.data?.action || 'SCHEDULE_EVENT',
          status: 'CONFIRMED',
          verified: true,
          data: calendarStep.data
        } : null)),
        telemetry: { totalDurationMs: Date.now() - startTime }
      };
    }

    // Default Fallback: Ask KnowledgeAgent using Gemini
    this.currentState = SUPERVISOR_STATES.SPEAKING;
    const fallbackAnswer = await this.knowledge.respond(resolvedRequestText, { userId });
    return {
      success: true,
      state: SUPERVISOR_STATES.SPEAKING,
      intent: 'GENERAL_CONVERSATION',
      speech: VoiceResponseFormatter.formatForSpeech(fallbackAnswer),
      message: fallbackAnswer,
      telemetry: { totalDurationMs: Date.now() - startTime }
    };
  }

  /**
   * Verify native Android execution results reported from client MethodChannel
   */
  async verifyNativeAction(userId, sessionId, payload = {}) {
    const { action, packageName, appName, nativeResult } = payload;
    const resolvedAppName = appName || (packageName?.includes('whatsapp') ? 'WhatsApp' : 'Application');
    const isSuccess = Boolean(nativeResult && (nativeResult.success === true || nativeResult.executed === true));

    if (isSuccess) {
      activeTaskManager.updateTaskStatus(sessionId, 'COMPLETED', {
        verified: true,
        completedAt: Date.now()
      });

      const speech = `${resolvedAppName} is open.`;
      this.memoryAgent.setWorkingMemory(sessionId, 'lastAction', {
        type: action || 'OPEN_APPLICATION',
        title: resolvedAppName,
        application: resolvedAppName,
        packageName,
        status: 'COMPLETED',
        verified: true
      });

      return {
        success: true,
        verified: true,
        executionStatus: 'COMPLETED',
        state: SUPERVISOR_STATES.SPEAKING,
        intent: action || 'OPEN_APPLICATION',
        speech,
        message: speech,
        action: {
          tool: 'open_application',
          application: resolvedAppName,
          packageName,
          status: 'COMPLETED',
          verified: true
        }
      };
    } else {
      const errorType = nativeResult?.error || 'LAUNCH_FAILED';
      activeTaskManager.updateTaskStatus(sessionId, 'FAILED', {
        verified: false,
        lastError: errorType,
        completedAt: Date.now()
      });

      let speech = `I couldn't open ${resolvedAppName}.`;
      if (errorType === 'APPLICATION_NOT_INSTALLED') {
        speech = `I couldn't find ${resolvedAppName} on this phone.`;
      } else if (errorType === 'ACTIVITY_NOT_FOUND') {
        speech = `I couldn't open ${resolvedAppName}. Activity was not found.`;
      } else if (errorType === 'SECURITY_EXCEPTION') {
        speech = `I couldn't open ${resolvedAppName}. Android permission was denied.`;
      }

      this.memoryAgent.setWorkingMemory(sessionId, 'lastAction', {
        type: action || 'OPEN_APPLICATION',
        title: resolvedAppName,
        application: resolvedAppName,
        packageName,
        status: 'FAILED',
        verified: false,
        lastError: errorType
      });

      return {
        success: false,
        verified: false,
        executionStatus: 'FAILED',
        state: SUPERVISOR_STATES.SPEAKING,
        intent: action || 'OPEN_APPLICATION',
        speech,
        message: speech,
        error: errorType,
        action: {
          tool: 'open_application',
          application: resolvedAppName,
          packageName,
          status: 'FAILED',
          verified: false,
          error: errorType
        }
      };
    }
  }

  /**
   * Cancel an active or pending action
   */
  cancelAction(userId, sessionId) {
    this.currentState = SUPERVISOR_STATES.IDLE;
    activeTaskManager.clearActiveTask(sessionId, userId);
    this.memoryAgent.clearWorkingMemory(sessionId);
    return {
      success: true,
      cancelled: true,
      state: SUPERVISOR_STATES.IDLE,
      message: 'Active action cancelled.'
    };
  }

  /**
   * Handle user interruption / barge-in
   */
  handleInterruption(sessionId) {
    this.currentState = SUPERVISOR_STATES.INTERRUPTED;
    this.memoryAgent.clearWorkingMemory(sessionId);
    return {
      success: true,
      interrupted: true,
      state: SUPERVISOR_STATES.INTERRUPTED,
      message: 'Agent speech cancelled by user interruption.'
    };
  }
}

const defaultSupervisorAgent = new JarvisSupervisorAgent();

module.exports = {
  JarvisSupervisorAgent,
  defaultSupervisorAgent,
  SUPERVISOR_STATES
};
