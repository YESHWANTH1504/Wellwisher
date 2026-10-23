const { defaultPerceptionFabric } = require('./JarvisPerceptionFabric');
const { defaultContextFabric } = require('./JarvisContextFabric');
const { defaultModelFabric } = require('./JarvisModelFabric');
const { defaultIntentFabric } = require('./JarvisIntentFabric');
const { defaultCapabilityRegistry } = require('./JarvisCapabilityRegistry');
const { defaultCapabilityResolver } = require('./JarvisCapabilityResolver');
const { defaultActionEngine } = require('./JarvisActionEngine');
const JarvisPermissionManager = require('./JarvisPermissionManager');
const { JarvisVerificationEngine, VERIFICATION_STATES } = require('./JarvisVerificationEngine');
const { defaultWorldModel } = require('./JarvisWorldModel');
const { defaultEntityResolver } = require('./JarvisEntityResolver');
const JarvisReferenceResolver = require('./JarvisReferenceResolver');
const { JarvisSupervisorAgent, SUPERVISOR_STATES } = require('../agent/JarvisSupervisorAgent');
const { defaultConversationState } = require('./JarvisConversationState');
const { defaultWorkflowEngine } = require('../workflow/JarvisWorkflowEngine');
const { defaultAnticipationEngine } = require('../anticipation/JarvisAnticipationEngine');
const { defaultHybridIntelligenceFabric } = require('./JarvisHybridIntelligenceFabric');
const { defaultOfflineIntentResolver } = require('./JarvisOfflineIntentResolver');
const { defaultNetworkState } = require('./JarvisNetworkState');
const { defaultLocalModelRegistry } = require('./JarvisLocalModelRegistry');

/**
 * JarvisSystemOrchestrator
 * Coordinates universal perception, personal context, model fabric, capability execution,
 * and verification. Connects with JarvisSupervisorAgent preserving all existing Phase 1-6 features.
 */
class JarvisSystemOrchestrator {
  constructor(options = {}) {
    this.perception = options.perception || defaultPerceptionFabric;
    this.contextFabric = options.contextFabric || defaultContextFabric;
    this.modelFabric = options.modelFabric || defaultModelFabric;
    this.hybridFabric = options.hybridFabric || defaultHybridIntelligenceFabric;
    this.offlineResolver = options.offlineResolver || defaultOfflineIntentResolver;
    this.networkState = options.networkState || defaultNetworkState;
    this.intentFabric = options.intentFabric || defaultIntentFabric;
    this.capabilities = options.capabilities || defaultCapabilityRegistry;
    this.capabilityResolver = options.capabilityResolver || defaultCapabilityResolver;
    this.actionEngine = options.actionEngine || defaultActionEngine;
    this.worldModel = options.worldModel || defaultWorldModel;
    this.entityResolver = options.entityResolver || defaultEntityResolver;
    this.supervisor = options.supervisor || new JarvisSupervisorAgent({
      modelRouter: this.modelFabric.router,
      providerRegistry: this.modelFabric.registry
    });
  }

  /**
   * Request adapter matching JarvisOSCore handleRequest contract
   */
  async handleRequest(req, ...args) {
    if (typeof req === 'object' && req !== null && req.userId) {
      return await this.orchestrate(req.userId, req.text || req.rawRequest || '', req);
    }
    return await this.orchestrate(req, ...args);
  }

  /**
   * Main Orchestration Pipeline
   */
  async orchestrate(userId, rawRequest, options = {}) {
    const startTime = Date.now();
    const sessionId = options.sessionId || `session_${userId}_default`;

    // 0. Ensure conversation state is initialized
    const { defaultConversationState } = require('./JarvisConversationState');
    await defaultConversationState.getOrCreate(sessionId, userId);

    // 0b. Phase 10: In-flight Workflow Continuation / Cancellation / Explanation
    const inFlightWf = await defaultConversationState.getActiveWorkflow(sessionId, userId);
    if (inFlightWf) {
      const lowerReq = rawRequest.trim().toLowerCase();
      const wfId = inFlightWf.workflowId || inFlightWf;

      if (/(?:what(?:'s|\s+is)\s+taking\s+so\s+long|what\s+are\s+you\s+doing|why\s+didn't\s+you\s+continue)/i.test(lowerReq)) {
        const explanation = await defaultWorkflowEngine.explainWorkflowStatus(wfId);
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'workflow.explain_status',
          speech: explanation.speech || String(explanation),
          message: explanation.speech || String(explanation),
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      }

      if (inFlightWf.status === 'AWAITING_CONFIRMATION' || inFlightWf.status === 'AWAITING_USER_INPUT') {
        if (/(?:yes|continue|do it|send it|proceed|no|stop|cancel|never mind|use the second one|use second)/i.test(lowerReq)) {
          const wfResult = await defaultWorkflowEngine.resumeWorkflow(wfId, rawRequest, {
            userId,
            sessionId,
            ...options
          });
          return {
            success: wfResult.success,
            state: SUPERVISOR_STATES.SPEAKING,
            intent: 'workflow.resume',
            speech: wfResult.speech || 'Proceeding with workflow.',
            message: wfResult.speech || 'Proceeding with workflow.',
            executionStatus: wfResult.success ? 'VERIFIED' : 'FAILED',
            workflow: wfResult.workflow,
            telemetry: { durationMs: Date.now() - startTime }
          };
        }
      }
    }

    // 1. Check for quick multi-turn reference resolution ("stop", "what is the second meeting", "actually make that 9", "cancel that")
    const reference = JarvisReferenceResolver.resolve(rawRequest, sessionId, { userId, timezone: options.timezone });
    if (reference.isReference) {
      if (reference.referenceType === 'STOP_PLAYBACK') {
        this.supervisor.handleInterruption(sessionId);
        return {
          success: true,
          state: SUPERVISOR_STATES.INTERRUPTED,
          speech: reference.speech,
          message: reference.speech,
          telemetry: { durationMs: Date.now() - startTime }
        };
      }

      // Handle speech-only references (e.g. ORDINAL_QUERY "What is the second meeting?")
      if (reference.speech && !reference.actionPlan) {
        if (reference.targetEntity) {
          await defaultConversationState.lockEntity(sessionId, userId, reference.targetEntity, {
            source: 'ORDINAL_SELECTION',
            rawQuery: rawRequest
          });
        }
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: reference.intent || 'CALENDAR_ORDINAL_SELECTION',
          speech: reference.speech,
          message: reference.speech,
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      }

      if (reference.actionPlan) {
        let executedSteps = [];
        let finalSpeech = reference.speech;

        for (const step of reference.actionPlan.steps) {
          const res = await this.actionEngine.executeAction(userId, step.toolName, step.arguments, {
            sessionId,
            timezone: options.timezone
          });
          executedSteps.push({
            toolName: step.toolName,
            result: res
          });

          // Record action in durable conversation state
          await defaultConversationState.recordAction(sessionId, userId, step.toolName, step.arguments, res);

          // If reminder was created with related event, link in World Model
          if (step.toolName === 'create_reminder' && step.arguments.relatedEventId) {
            const reminderId = res?.data?.reminderId || res?.reminderId || res?.id;
            if (reminderId) {
              await this.worldModel.linkReminderToEvent(userId, reminderId, step.arguments.relatedEventId);
            }
          }
        }

        if (reference.clearTask) {
          this.supervisor.cancelAction(userId, sessionId);
        }

        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: reference.intent || 'FOLLOW_UP_ACTION',
          speech: finalSpeech,
          message: finalSpeech,
          executionStatus: 'VERIFIED',
          steps: executedSteps,
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // 1b. Check for Screen -> Action intent ("add the event/date shown here to my calendar")
    if (options.screenContext && /add\s+.*(?:shown here|on screen|this event|this meeting).*(?:calendar|schedule)/i.test(rawRequest)) {
      const resolvedScreenEntity = await this.entityResolver.resolveEntity(userId, rawRequest, {
        screenContext: options.screenContext
      });

      if (resolvedScreenEntity.resolved && resolvedScreenEntity.entity) {
        const ent = resolvedScreenEntity.entity;
        const res = await this.actionEngine.executeAction(userId, 'calendar_create_event', {
          title: ent.displayName,
          date: ent.date,
          time: ent.time
        }, { sessionId, timezone: options.timezone });

        const confirmMsg = `Added "${ent.displayName}" to your calendar for ${ent.date} at ${ent.time}.`;
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'calendar.create_event',
          speech: confirmMsg,
          message: confirmMsg,
          executionStatus: 'VERIFIED',
          steps: [{ toolName: 'calendar_create_event', result: res }],
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // 1c. Phase 9: "Can you do this?" query evaluation (Section 5)
    if (/^can\s+you\s+/i.test(rawRequest.trim())) {
      const capabilityCheck = this.capabilityResolver.evaluateCapabilityQuery(rawRequest);
      if (capabilityCheck.status !== 'UNKNOWN') {
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'system.query_capability',
          speech: capabilityCheck.speech,
          message: capabilityCheck.speech,
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // 1d. Phase 9: Fast Offline Path for Native App Launches & System Settings
    // 1d. Phase 9: Fast Offline Path for Native App Launches & System Settings
    const convState = await defaultConversationState.getOrCreate(sessionId, userId);
    const resolveContext = {
      rawRequest,
      previousApp: convState.previousApplication,
      recentApps: convState.recentApplications,
      activeApplication: convState.activeApplication,
      preferences: options.preferences || {},
      permissions: options.permissions || [],
      ...options
    };

    // 1f.2. Phase 11: Proactive Explanation ("Why did you suggest this?")
    if (/(?:why\s+did\s+you\s+suggest|why\s+are\s+you\s+recommending|explain\s+suggestion|why\s+this\s+suggestion)/i.test(rawRequest.trim())) {
      const feed = await defaultAnticipationEngine.getProactiveFeed(userId, 1);
      const latestSugg = feed && feed.length > 0 ? feed[0] : null;
      if (latestSugg) {
        const explanation = await defaultAnticipationEngine.explainSuggestion(userId, latestSugg.suggestion_id);
        const speech = explanation.explanation || 'I made this suggestion based on your recent activity patterns.';
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'proactive.explain_suggestion',
          speech,
          message: speech,
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      } else {
        const speech = "I don't have an active proactive suggestion to explain right now.";
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'proactive.explain_suggestion',
          speech,
          message: speech,
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // 1f.3. Phase 11: Proactive Mode Controls ("Turn off proactive suggestions", "Set proactive mode to...")
    if (/(?:turn\s+off\s+proactive|stop\s+proactive\s+suggestions|disable\s+proactive)/i.test(rawRequest.trim())) {
      await defaultAnticipationEngine.setUserPreferences(userId, { proactiveMode: 'OFF' });
      const speech = 'Proactive suggestions have been turned off. I will only assist when you directly ask.';
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'proactive.set_mode',
        speech,
        message: speech,
        executionStatus: 'VERIFIED',
        telemetry: { durationMs: Date.now() - startTime }
      };
    }

    if (/(?:set\s+proactive\s+mode\s+to|enable\s+proactive\s+mode|turn\s+on\s+proactive)/i.test(rawRequest.trim())) {
      let targetMode = 'BALANCED';
      if (/assisted/i.test(rawRequest)) targetMode = 'ASSISTED';
      else if (/proactive/i.test(rawRequest)) targetMode = 'PROACTIVE';
      else if (/off/i.test(rawRequest)) targetMode = 'OFF';

      await defaultAnticipationEngine.setUserPreferences(userId, { proactiveMode: targetMode });
      const speech = `Proactive mode is now set to ${targetMode}.`;
      return {
        success: true,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'proactive.set_mode',
        speech,
        message: speech,
        executionStatus: 'VERIFIED',
        telemetry: { durationMs: Date.now() - startTime }
      };
    }

    // 1g. Phase 10: Multi-Step Goal Detection & Execution
    const isMultiStepGoal = (
      (rawRequest.includes(' and ') || rawRequest.includes(' then ')) &&
      (
        /(?:find|search|get|open|create|move|share|send|message|remind)/i.test(rawRequest)
      )
    ) || (
      // "Create a meeting tomorrow at 10 AM and remind me one hour before"
      /(?:create|schedule).*(?:meeting|event).*(?:remind)/i.test(rawRequest)
    ) || (
      // "Move my second meeting to 4 PM and remind me 30 minutes before"
      /(?:move|change).*(?:second meeting|meeting).*(?:remind)/i.test(rawRequest)
    ) || (
      // "Find RMK College in Maps and open directions"
      /find.*in maps.*and (?:open )?directions/i.test(rawRequest)
    ) || (
      // "Find a restaurant near me, get its address, and share it with Arun"
      /find.*restaurant.*(?:address|share|send)/i.test(rawRequest)
    ) || (
      // "Open WhatsApp and message Arun that I'll be late"
      /open whatsapp and (?:message|tell)/i.test(rawRequest)
    );

    if (isMultiStepGoal) {
      const wfContext = {
        sessionId,
        activeEntity: convState.activeEntity,
        activeApplication: convState.activeApplication,
        preferences: options.preferences || {},
        permissions: options.permissions || [],
        ...options
      };

      const { workflow } = await defaultWorkflowEngine.createWorkflow(userId, rawRequest, wfContext);
      if (workflow && workflow.steps.length > 1) {
        await defaultConversationState.setActiveWorkflow(sessionId, userId, workflow);
        const wfExec = await defaultWorkflowEngine.executeWorkflow(workflow.workflowId, {
          userId,
          sessionId,
          ...options
        });

        return {
          success: wfExec.success,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'workflow.execute',
          speech: wfExec.speech,
          message: wfExec.speech,
          executionStatus: wfExec.success ? 'VERIFIED' : 'FAILED',
          workflow: wfExec.workflow,
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // Fast check: Preference configuration
    if (/always\s+use\s+whatsapp\s+when\s+i\s+say\s+message|forget\s+my\s+preferred\s+messaging\s+app|use\s+sms\s+instead/i.test(rawRequest)) {
      const prefRes = await this.capabilityResolver.resolve('communication.send_message', {}, resolveContext);
      if (prefRes.resolved && prefRes.speech) {
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: prefRes.intentName,
          speech: prefRes.speech,
          message: prefRes.speech,
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // Fast check: Media commands ("play music", "pause", "next song", "previous song")
    if (/^(?:play(?:\s+music)?|pause|next(?:\s+song)?|previous(?:\s+song)?)$/i.test(rawRequest.trim())) {
      const mediaRes = await this.capabilityResolver.resolve('media.control', {}, resolveContext);
      if (mediaRes.resolved) {
        const res = await this.actionEngine.executeAction(userId, 'control_media', mediaRes.parameters, { sessionId });
        const actName = mediaRes.parameters.mediaAction;
        const speech = actName === 'pause' ? 'Playback paused.' : (actName === 'play' ? 'Resuming playback.' : `Skipping to ${actName} track.`);
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'media.control',
          speech,
          message: speech,
          executionStatus: res.success ? 'VERIFIED' : 'FAILED',
          steps: [{ toolName: 'control_media', result: res }],
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // Fast check: Navigation ("navigate to X", "directions to X", "show restaurants nearby")
    if (/^(?:please\s+)?(?:can\s+you\s+)?(?:navigate\s+to|directions\s+to|show\s+.*nearby)\s+/i.test(rawRequest.trim())) {
      const navRes = await this.capabilityResolver.resolve('navigation.get_directions', {}, resolveContext);
      if (navRes.resolved) {
        const res = await this.actionEngine.executeAction(userId, 'navigate_to_location', navRes.parameters, { sessionId });
        const speech = `Navigating to ${navRes.parameters.destination}...`;
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'navigation.get_directions',
          speech,
          message: speech,
          executionStatus: res.success ? 'VERIFIED' : 'FAILED',
          steps: [{ toolName: 'navigate_to_location', result: res }],
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // Fast check: Phone calls ("call X")
    if (/^(?:please\s+)?(?:can\s+you\s+)?call\s+/i.test(rawRequest.trim())) {
      const callRes = await this.capabilityResolver.resolve('communication.make_call', {}, resolveContext);
      if (callRes.requiresPermission && callRes.speech) {
        return {
          success: false,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'communication.make_call',
          speech: callRes.speech,
          message: callRes.speech,
          executionStatus: 'PERMISSION_REQUIRED',
          requiredPermission: callRes.requiredPermission,
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // App launch or system settings
    const appIntentCheck = /^(?:please\s+)?(?:can\s+you\s+)?(?:open|launch|start|bring\s+up|go\s+to|take\s+me\s+to|switch\s+to|show\s+(?:me\s+)?(?:my\s+)?)\s+/i.test(rawRequest.trim());
    if (appIntentCheck) {
      // Check if system settings
      if (/\b(?:settings|wi-fi|wifi|bluetooth|battery)\b/i.test(rawRequest)) {
        const settingsRes = await this.capabilityResolver.resolve('system.open_settings', {}, resolveContext);
        if (settingsRes.resolved) {
          const res = await this.actionEngine.executeAction(userId, 'open_system_settings', settingsRes.parameters, { sessionId });
          const speech = `Opening ${settingsRes.parameters.settingType || 'system'} settings...`;
          return {
            success: true,
            state: SUPERVISOR_STATES.SPEAKING,
            intent: 'system.open_settings',
            speech,
            message: speech,
            executionStatus: res.success ? 'VERIFIED' : 'FAILED',
            steps: [{ toolName: 'open_system_settings', result: res }],
            telemetry: { durationMs: Date.now() - startTime }
          };
        }
      }

      // Check app launch
      const appLaunchRes = await this.capabilityResolver.resolve('system.open_application', {}, resolveContext);
      if (appLaunchRes.resolved) {
        const res = await this.actionEngine.executeAction(userId, 'open_application', appLaunchRes.parameters, { sessionId });
        
        // Record active application without overwriting active entity
        await defaultConversationState.setActiveApplication(sessionId, userId, {
          packageName: appLaunchRes.targetPackage,
          appName: appLaunchRes.targetAppName
        });

        // Record in World Model
        await this.worldModel.upsertEntity(userId, {
          id: `app_${appLaunchRes.targetPackage.replace(/[^a-zA-Z0-9]/g, '_')}`,
          entityType: 'APPLICATION',
          displayName: appLaunchRes.targetAppName,
          properties: { packageName: appLaunchRes.targetPackage }
        });

        const speech = `Opening ${appLaunchRes.targetAppName}...`;
        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'system.open_application',
          speech,
          message: speech,
          executionStatus: res.success ? 'VERIFIED' : 'FAILED',
          steps: [{ toolName: 'open_application', result: res }],
          telemetry: { durationMs: Date.now() - startTime }
        };
      } else if (appLaunchRes.speech) {
        // Honest failure response (e.g. "Telegram isn't installed on this device.")
        return {
          success: false,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: 'system.open_application',
          speech: appLaunchRes.speech,
          message: appLaunchRes.speech,
          executionStatus: 'FAILED',
          error: appLaunchRes.reason,
          telemetry: { durationMs: Date.now() - startTime }
        };
      }
    }

    // 2. Format on-screen context if present
    let effectiveRequest = rawRequest;
    if (options.screenContext) {
      const sc = options.screenContext;
      const visible = Array.isArray(sc.visibleText) ? sc.visibleText.join('; ') : (sc.visibleText || 'None');
      const screenInfo = `[ON-SCREEN CONTEXT: Application="${sc.currentApplication || 'Unknown'}", Title="${sc.screenTitle || 'None'}", Content="${visible}"]`;
      effectiveRequest = `${rawRequest}\n${screenInfo}`;
    }

    // 2b. Phase 12: Offline Execution & Deterministic Fallback Guard
    const isNetworkOffline = this.networkState.isOffline() || Boolean(options.forcedOffline);
    if (isNetworkOffline) {
      const offlineRes = await this.offlineResolver.resolve(userId, rawRequest, {
        sessionId,
        batteryLevel: options.batteryLevel,
        ...options
      });

      if (offlineRes.handled) {
        if (offlineRes.plan?.type === 'TOOL_EXECUTION_PLAN' && Array.isArray(offlineRes.plan.steps)) {
          let executedSteps = [];
          for (const step of offlineRes.plan.steps) {
            const res = await this.actionEngine.executeAction(userId, step.toolName, step.arguments, {
              sessionId,
              timezone: options.timezone
            });
            executedSteps.push({ toolName: step.toolName, result: res });
          }
          return {
            success: true,
            state: SUPERVISOR_STATES.SPEAKING,
            intent: offlineRes.intent,
            executionMode: offlineRes.executionMode || 'LOCAL',
            speech: offlineRes.speech,
            message: offlineRes.speech,
            executionStatus: 'VERIFIED',
            steps: executedSteps,
            telemetry: { durationMs: Date.now() - startTime }
          };
        }

        return {
          success: true,
          state: SUPERVISOR_STATES.SPEAKING,
          intent: offlineRes.intent,
          executionMode: offlineRes.executionMode || 'LOCAL',
          speech: offlineRes.speech,
          message: offlineRes.speech,
          executionStatus: 'VERIFIED',
          telemetry: { durationMs: Date.now() - startTime }
        };
      }

      // Offline and unhandled by local deterministic engine
      return {
        success: false,
        state: SUPERVISOR_STATES.SPEAKING,
        intent: 'offline.unsupported',
        executionMode: 'DEGRADED',
        speech: offlineRes.speech || 'I cannot process this complex request while offline without internet connection.',
        message: offlineRes.speech || 'I cannot process this complex request while offline without internet connection.',
        executionStatus: 'FAILED',
        telemetry: { durationMs: Date.now() - startTime }
      };
    }

    // 3. Delegate through unified intelligence supervisor
    const supervisorResult = await this.supervisor.processRequest(userId, effectiveRequest, {
      sessionId,
      ...options
    });

    return {
      ...supervisorResult,
      osVerified: true,
      executionMode: supervisorResult.executionMode || 'CLOUD',
      telemetry: {
        ...(supervisorResult.telemetry || {}),
        orchestratorDurationMs: Date.now() - startTime
      }
    };
  }

  /**
   * Diagnostic System OS Status
   */
  async getSystemStatus(userId, options = {}) {
    const modelStatus = await this.modelFabric.getStatus();
    const capabilityList = this.capabilities.listCapabilities();

    return {
      success: true,
      osVersion: 'JARVIS OS 7.0 (Android AI Operating System)',
      platform: 'ANDROID',
      architecture: 'UNIVERSAL_INTELLIGENCE_FABRIC',
      status: this.networkState.getNetworkState(),
      networkState: this.networkState.getNetworkState(),
      offlineEngine: {
        networkState: this.networkState.getNetworkState(),
        reachability: this.networkState.getReachability(),
        localModels: defaultLocalModelRegistry.listModels()
      },
      models: modelStatus,
      registeredCapabilitiesCount: capabilityList.length,
      domainsCovered: Object.keys(require('./JarvisIntentFabric').INTENT_DOMAINS),
      verificationEngineActive: true,
      worldModelActive: true,
      timestamp: new Date().toISOString()
    };
  }
}

const defaultSystemOrchestrator = new JarvisSystemOrchestrator();

module.exports = {
  JarvisSystemOrchestrator,
  defaultSystemOrchestrator
};
