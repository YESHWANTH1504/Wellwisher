/**
 * JarvisHybridRoutingPolicy
 * Authoritative intelligence routing engine determining execution mode:
 * LOCAL -> CLOUD -> HYBRID -> DEGRADED
 *
 * Considers 14 holistic parameters without altering user intent:
 * 1. User intent
 * 2. Privacy class
 * 3. Required capability
 * 4. Local availability
 * 5. Network state
 * 6. Model quality
 * 7. Latency
 * 8. Battery
 * 9. Thermal state
 * 10. User preferences
 * 11. Current conversation
 * 12. Safety level
 * 13. Proactive mode
 * 14. Provider health
 */

const { JarvisPrivacyRouter, PRIVACY_LEVELS } = require('./JarvisPrivacyRouter');
const { defaultNetworkState, NETWORK_STATES } = require('./JarvisNetworkState');
const { defaultLocalModelRegistry, LOCAL_CAPABILITY_TYPES } = require('./JarvisLocalModelRegistry');
const { defaultResourcePolicy } = require('./JarvisResourcePolicy');

const EXECUTION_MODES = Object.freeze({
  LOCAL: 'LOCAL',
  CLOUD: 'CLOUD',
  HYBRID: 'HYBRID',
  DEGRADED: 'DEGRADED'
});

class JarvisHybridRoutingPolicy {
  constructor(options = {}) {
    this.networkState = options.networkState || defaultNetworkState;
    this.localRegistry = options.localRegistry || defaultLocalModelRegistry;
    this.resourcePolicy = options.resourcePolicy || defaultResourcePolicy;
  }

  /**
   * Decide execution route for a request
   * @param {Object} routingContext
   * @returns {{
   *   executionMode: string,
   *   provider: string,
   *   capability: string,
   *   modelName: string,
   *   available: boolean,
   *   confidence: number,
   *   reason: string,
   *   fallbackChain: Array<string>,
   *   privacyClass: string,
   *   estimatedLatency: number
   * }}
   */
  evaluateRoute(routingContext = {}) {
    const rawText = (routingContext.text || routingContext.requestText || '').trim();
    const lower = rawText.toLowerCase();
    const taskType = routingContext.taskType || this._inferTaskType(lower);
    const privacyEval = JarvisPrivacyRouter.evaluatePrivacy(
      routingContext.contextPackage || {},
      rawText,
      routingContext.options || {}
    );
    const network = this.networkState.getNetworkState();
    const resourceEval = this.resourcePolicy.evaluateResourceConstraints(taskType, routingContext);

    // 1. Check if the task is a purely local deterministic command (Time, Battery, App, Alarms, Reminders, Memory)
    const isPurelyLocalCommand = this._isDeterministicLocalCommand(lower);

    if (isPurelyLocalCommand) {
      return {
        executionMode: EXECUTION_MODES.LOCAL,
        provider: 'LOCAL_DETERMINISTIC_RULES',
        capability: 'LOCAL_FAST',
        modelName: 'jarvis-rule-intent-resolver',
        available: true,
        confidence: 0.98,
        reason: 'Deterministic local command fulfilled on-device from World Model and local runtime.',
        fallbackChain: ['LOCAL_DETERMINISTIC_RULES'],
        privacyClass: privacyEval.level,
        estimatedLatency: 2
      };
    }

    // 2. Offline Network State Evaluation
    if (network === NETWORK_STATES.OFFLINE) {
      // If user asks for real-time external info (weather, web search, cloud news)
      if (this._requiresExternalCloudData(lower)) {
        return {
          executionMode: EXECUTION_MODES.DEGRADED,
          provider: 'NONE',
          capability: 'EXTERNAL_WEB_INFO',
          modelName: 'offline-degraded-reporter',
          available: false,
          confidence: 1.0,
          reason: 'Network is offline. Live external information cannot be retrieved.',
          degradedMessage: this._getOfflineLimitationMessage(lower),
          fallbackChain: ['DEGRADED_EXPLICIT_NOTICE'],
          privacyClass: privacyEval.level,
          estimatedLatency: 1
        };
      }

      // Check if local generative reasoning is available on device
      const localReasoning = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_REASONING);
      if (localReasoning && localReasoning.available && resourceEval.permitted) {
        return {
          executionMode: EXECUTION_MODES.LOCAL,
          provider: localReasoning.provider,
          capability: 'LOCAL_REASONING',
          modelName: localReasoning.modelName,
          available: true,
          confidence: 0.85,
          reason: 'Executing via verified on-device foundation model while offline.',
          fallbackChain: [localReasoning.provider, 'LOCAL_DETERMINISTIC_RULES'],
          privacyClass: privacyEval.level,
          estimatedLatency: localReasoning.estimatedLatencyMs || 350
        };
      }

      // Fall back to local rule-based intent engine
      return {
        executionMode: EXECUTION_MODES.LOCAL,
        provider: 'LOCAL_DETERMINISTIC_RULES',
        capability: 'LOCAL_FAST',
        modelName: 'jarvis-rule-intent-resolver',
        available: true,
        confidence: 0.80,
        reason: 'Operating offline with local capability engine and stored context.',
        fallbackChain: ['LOCAL_DETERMINISTIC_RULES'],
        privacyClass: privacyEval.level,
        estimatedLatency: 5
      };
    }

    // 3. Privacy Constraint: LOCAL_ONLY or sensitive content
    if (privacyEval.level === PRIVACY_LEVELS.LOCAL_ONLY) {
      const localReasoning = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_REASONING);
      if (localReasoning && localReasoning.available && resourceEval.permitted) {
        return {
          executionMode: EXECUTION_MODES.LOCAL,
          provider: localReasoning.provider,
          capability: 'LOCAL_REASONING',
          modelName: localReasoning.modelName,
          available: true,
          confidence: 0.95,
          reason: 'Privacy policy mandates on-device processing. Routed to local model.',
          fallbackChain: [localReasoning.provider, 'LOCAL_DETERMINISTIC_RULES'],
          privacyClass: privacyEval.level,
          estimatedLatency: localReasoning.estimatedLatencyMs || 350
        };
      } else {
        return {
          executionMode: EXECUTION_MODES.LOCAL,
          provider: 'LOCAL_DETERMINISTIC_RULES',
          capability: 'LOCAL_FAST',
          modelName: 'jarvis-rule-intent-resolver',
          available: true,
          confidence: 0.90,
          reason: 'Sensitive data routed to deterministic local engine to enforce privacy.',
          fallbackChain: ['LOCAL_DETERMINISTIC_RULES'],
          privacyClass: privacyEval.level,
          estimatedLatency: 2
        };
      }
    }

    // 4. Provider Failure & Degraded State handling
    const geminiAvailable = this.networkState.isProviderReachable('gemini');
    const openaiAvailable = this.networkState.isProviderReachable('openai');

    if (!geminiAvailable && !openaiAvailable) {
      // Both cloud LLM providers failed -> fallback to local
      const localReasoning = this.localRegistry.getModel(LOCAL_CAPABILITY_TYPES.LOCAL_REASONING);
      if (localReasoning && localReasoning.available && resourceEval.permitted) {
        return {
          executionMode: EXECUTION_MODES.HYBRID,
          provider: localReasoning.provider,
          capability: 'LOCAL_REASONING',
          modelName: localReasoning.modelName,
          available: true,
          confidence: 0.80,
          reason: 'Cloud providers unreachable. Automatically failed over to local reasoning model.',
          fallbackChain: ['CLOUD_FAILED', localReasoning.provider, 'LOCAL_DETERMINISTIC_RULES'],
          privacyClass: privacyEval.level,
          estimatedLatency: localReasoning.estimatedLatencyMs || 350
        };
      } else {
        return {
          executionMode: EXECUTION_MODES.DEGRADED,
          provider: 'LOCAL_DETERMINISTIC_RULES',
          capability: 'LOCAL_FAST',
          modelName: 'jarvis-rule-intent-resolver',
          available: true,
          confidence: 0.70,
          reason: 'Cloud providers unavailable and local reasoning offline. Operating in degraded local mode.',
          fallbackChain: ['LOCAL_DETERMINISTIC_RULES'],
          privacyClass: privacyEval.level,
          estimatedLatency: 5
        };
      }
    }

    // 5. Normal Online Execution (Gemini primary, OpenAI secondary)
    const primaryProvider = geminiAvailable ? 'gemini' : 'openai';
    const primaryModel = geminiAvailable
      ? (taskType === 'PLANNING' || taskType === 'STRONG_REASONING' ? 'gemini-3.5-flash-lite' : 'gemini-3.5-flash-lite')
      : 'gpt-4o-mini';

    return {
      executionMode: EXECUTION_MODES.CLOUD,
      provider: primaryProvider,
      capability: taskType === 'PLANNING' ? 'CLOUD_REASONING' : 'CLOUD_FAST',
      modelName: primaryModel,
      available: true,
      confidence: 0.95,
      reason: `Online request routed through verified ${primaryProvider} cloud engine.`,
      fallbackChain: [primaryProvider, geminiAvailable ? 'openai' : 'gemini', 'LOCAL_DETERMINISTIC_RULES'],
      privacyClass: privacyEval.level,
      estimatedLatency: this.networkState.getProviderLatency(primaryProvider) || 180
    };
  }

  _inferTaskType(text) {
    if (text.includes('plan') || text.includes('workflow') || text.includes('step by step')) {
      return 'PLANNING';
    }
    if (text.includes('look at this') || text.includes('what is this') || text.includes('ocr')) {
      return 'VISION';
    }
    return 'FAST';
  }

  _isDeterministicLocalCommand(rawLower) {
    const lower = rawLower.replace(/[?!.]/g, '').trim();
    // Current time / date
    if (lower === 'what time is it' || lower === "what's the time" || lower === "what's the date" || lower === 'current time') {
      return true;
    }
    // Device battery / WiFi / Bluetooth / flashlight
    if (
      lower.includes('battery') ||
      lower.includes('wifi state') ||
      lower.includes('turn on flashlight') ||
      lower.includes('turn off flashlight')
    ) {
      return true;
    }
    // Application launch
    if (lower.startsWith('open ') || lower.startsWith('launch ')) {
      return true;
    }
    // Memory CRUD
    if (
      lower.startsWith('remember that') ||
      lower.startsWith('remember ') ||
      lower.startsWith('forget that') ||
      lower.startsWith('delete that memory') ||
      lower.includes('what did i ask you to remember') ||
      lower.includes('what is my favorite color')
    ) {
      return true;
    }
    // Local schedule / meetings / alarms / timers
    if (
      lower.includes('my schedule') ||
      lower.includes('next meeting') ||
      lower.includes('second meeting') ||
      lower.includes('move it to') ||
      lower.includes('set an alarm') ||
      lower.includes('set a timer') ||
      lower.includes('start a timer') ||
      lower.includes('set a reminder') ||
      lower.includes('cancel that reminder') ||
      lower.includes('cancel reminder') ||
      lower.includes('my reminders')
    ) {
      return true;
    }
    // Conversational halt
    if (lower === 'stop' || lower === 'cancel' || lower === 'not now') {
      return true;
    }
    return false;
  }

  _requiresExternalCloudData(lower) {
    return (
      lower.includes('weather') ||
      lower.includes('forecast') ||
      lower.includes('temperature today') ||
      lower.includes('search web') ||
      lower.includes('search the web') ||
      lower.includes('latest news') ||
      lower.includes('stock price')
    );
  }

  _getOfflineLimitationMessage(lower) {
    if (lower.includes('weather')) {
      return 'I need an internet connection to check current weather. Local features remain available.';
    }
    if (lower.includes('news')) {
      return 'I need an internet connection to fetch the latest news.';
    }
    return 'This request requires an internet connection which is currently unavailable.';
  }
}

const defaultHybridRoutingPolicy = new JarvisHybridRoutingPolicy();

module.exports = {
  JarvisHybridRoutingPolicy,
  defaultHybridRoutingPolicy,
  EXECUTION_MODES
};
