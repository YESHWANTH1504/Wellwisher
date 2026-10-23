/**
 * JarvisOfflineIntentResolver
 * Deterministic offline intent classification and execution planning.
 * Operates without external LLM access to fulfill core device and personal OS commands.
 */

const { defaultConversationState } = require('./JarvisConversationState');
const JarvisReferenceResolver = require('./JarvisReferenceResolver');
const { defaultWorldModel } = require('./JarvisWorldModel');
const ApplicationResolver = require('../platform/ApplicationResolver');

class JarvisOfflineIntentResolver {
  constructor(options = {}) {
    this.conversationState = options.conversationState || defaultConversationState;
    this.worldModel = options.worldModel || defaultWorldModel;
  }

  /**
   * Resolve user query offline into a deterministic execution plan
   * @param {number|string} userId
   * @param {string} rawRequest
   * @param {Object} options
   */
  async resolve(userId, rawRequest, options = {}) {
    const raw = (rawRequest || '').trim();
    const clean = raw.replace(/[?!.]/g, '').trim();
    const lower = clean.toLowerCase();
    const sessionId = options.sessionId || `session_${userId}_default`;

    // 1. Greetings
    if (lower === 'hello' || lower === 'hi' || lower === 'hey jarvis' || lower === 'hello jarvis') {
      return {
        handled: true,
        intent: 'GREETING',
        executionMode: 'LOCAL',
        speech: 'Hello. I am operating on-device and ready to assist you.',
        plan: {
          type: 'FINAL_RESPONSE',
          message: 'Hello. I am operating on-device and ready to assist you.'
        }
      };
    }

    // 2. Current Time & Date
    if (
      lower === 'what time is it' ||
      lower === "what's the time" ||
      lower === 'time' ||
      lower.includes('current time')
    ) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return {
        handled: true,
        intent: 'DEVICE_TIME',
        executionMode: 'LOCAL',
        speech: `It is currently ${timeStr}.`,
        plan: {
          type: 'FINAL_RESPONSE',
          message: `It is currently ${timeStr}.`
        }
      };
    }

    if (lower === "what's the date" || lower === 'what is today date' || lower === 'what is the date') {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      return {
        handled: true,
        intent: 'DEVICE_DATE',
        executionMode: 'LOCAL',
        speech: `Today is ${dateStr}.`,
        plan: {
          type: 'FINAL_RESPONSE',
          message: `Today is ${dateStr}.`
        }
      };
    }

    // 3. Conversational Stop / Halt
    if (lower === 'stop' || lower === 'cancel' || lower === 'not now') {
      return {
        handled: true,
        intent: 'SYSTEM_STOP',
        executionMode: 'LOCAL',
        speech: 'Stopped.',
        plan: {
          type: 'FINAL_RESPONSE',
          message: 'Stopped.'
        }
      };
    }

    // 4. Device Battery Query
    if (lower.includes('battery') || lower.includes("what's my battery")) {
      const batteryLevel = options.batteryLevel || 100;
      return {
        handled: true,
        intent: 'DEVICE_BATTERY',
        executionMode: 'LOCAL',
        speech: `Your device battery is at ${batteryLevel}%.`,
        plan: {
          type: 'FINAL_RESPONSE',
          message: `Your device battery is at ${batteryLevel}%.`
        }
      };
    }

    // 5. Application Launch ("Open WhatsApp", "Launch Settings")
    if (lower.startsWith('open ') || lower.startsWith('launch ')) {
      const appName = lower.replace(/^(open|launch)\s+/i, '').trim();
      const resolved = ApplicationResolver.resolve(raw);
      const pkg = resolved?.packageName || (appName === 'whatsapp' ? 'com.whatsapp' : (appName === 'settings' ? 'com.android.settings' : ''));

      return {
        handled: true,
        intent: 'OPEN_APPLICATION',
        executionMode: 'LOCAL',
        speech: `Opening ${appName}.`,
        plan: {
          type: 'TOOL_EXECUTION_PLAN',
          steps: [
            {
              stepNumber: 1,
              toolName: 'open_application',
              arguments: { appName, packageName: pkg }
            }
          ]
        }
      };
    }

    // 6. Memory Operations ("Remember that my favorite color is blue", "What did I ask you to remember?")
    if (lower.startsWith('remember that') || lower.startsWith('remember ')) {
      const memoryContent = raw.replace(/^remember (that )?/i, '').trim();
      return {
        handled: true,
        intent: 'SAVE_MEMORY',
        executionMode: 'LOCAL',
        speech: `I will remember that: ${memoryContent}.`,
        plan: {
          type: 'TOOL_EXECUTION_PLAN',
          steps: [
            {
              stepNumber: 1,
              toolName: 'save_memory',
              arguments: { memory: memoryContent }
            }
          ]
        }
      };
    }

    if (
      lower.includes('what do you remember') ||
      lower.includes('what did i ask you to remember') ||
      lower.includes('my favorite color')
    ) {
      return {
        handled: true,
        intent: 'RECALL_MEMORY',
        executionMode: 'LOCAL',
        speech: 'Checking your stored local memories.',
        plan: {
          type: 'TOOL_EXECUTION_PLAN',
          steps: [
            {
              stepNumber: 1,
              toolName: 'recall_memory',
              arguments: { query: raw }
            }
          ]
        }
      };
    }

    // 7. Pronoun / Reference Resolution ("Move it to 4 PM", "Cancel that reminder")
    let resolvedRef = null;
    try {
      resolvedRef = JarvisReferenceResolver.resolve(raw, sessionId, {
        userId,
        timezone: options.timezone
      });
    } catch (_) {}

    if (resolvedRef && resolvedRef.isReference) {
      return {
        handled: true,
        intent: resolvedRef.intent || 'REFERENCE_MUTATION',
        executionMode: 'LOCAL',
        speech: resolvedRef.speech || 'Updating record locally.',
        plan: resolvedRef.actionPlan ? {
          type: 'TOOL_EXECUTION_PLAN',
          steps: resolvedRef.actionPlan.steps
        } : {
          type: 'FINAL_RESPONSE',
          message: resolvedRef.speech || 'Updated locally.'
        }
      };
    }

    // 8. Schedule / Next Meeting Query ("What is my next meeting?", "Show my schedule")
    if (lower.includes('next meeting') || lower.includes('my schedule') || lower.includes("what's on my schedule")) {
      return {
        handled: true,
        intent: 'GET_SCHEDULE',
        executionMode: 'LOCAL',
        speech: 'Retrieving your schedule from local calendar.',
        plan: {
          type: 'TOOL_EXECUTION_PLAN',
          steps: [
            {
              stepNumber: 1,
              toolName: 'get_calendar_events',
              arguments: { date: 'today' }
            }
          ]
        }
      };
    }

    // 9. Reminder Creation ("Set a reminder for 6 PM to drink water" or "Set a reminder to drink water at 6 PM")
    if (lower.startsWith('set a reminder') || lower.startsWith('remind me')) {
      return {
        handled: true,
        intent: 'CREATE_REMINDER',
        executionMode: 'LOCAL',
        speech: 'Setting reminder locally.',
        plan: {
          type: 'TOOL_EXECUTION_PLAN',
          steps: [
            {
              stepNumber: 1,
              toolName: 'create_reminder',
              arguments: { query: raw, date: 'today' }
            }
          ]
        }
      };
    }

    // 10. External Cloud Queries (Weather, live web)
    if (lower.includes('weather') || lower.includes('temperature') || lower.includes('forecast')) {
      return {
        handled: true,
        intent: 'WEATHER_OFFLINE_DEGRADED',
        executionMode: 'DEGRADED',
        speech: 'I need an internet connection to check current weather. Local features remain available.',
        plan: {
          type: 'FINAL_RESPONSE',
          message: 'I need an internet connection to check current weather. Local features remain available.'
        }
      };
    }

    // Default: Not deterministically recognized offline
    return {
      handled: false,
      intent: 'UNKNOWN_OFFLINE',
      executionMode: 'DEGRADED',
      speech: 'I cannot process this complex request while offline without internet connection.',
      plan: {
        type: 'FINAL_RESPONSE',
        message: 'I cannot process this complex request while offline without internet connection.'
      }
    };
  }
}

const defaultOfflineIntentResolver = new JarvisOfflineIntentResolver();

module.exports = {
  JarvisOfflineIntentResolver,
  defaultOfflineIntentResolver
};
