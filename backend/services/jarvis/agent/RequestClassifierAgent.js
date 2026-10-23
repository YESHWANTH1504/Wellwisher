const ApplicationResolver = require('../platform/ApplicationResolver');

/**
 * RequestClassifierAgent
 * Deterministically and semantically classifies incoming user utterances into typed request categories.
 */
class RequestClassifierAgent {
  static CATEGORIES = {
    CONVERSATION: 'CONVERSATION',
    QUESTION: 'QUESTION',
    PERSONAL_TASK: 'PERSONAL_TASK',
    CALENDAR: 'CALENDAR',
    REMINDER: 'REMINDER',
    ALARM: 'ALARM',
    WELLNESS: 'WELLNESS',
    DEVICE_ACTION: 'DEVICE_ACTION',
    MULTI_STEP_TASK: 'MULTI_STEP_TASK',
    MEMORY: 'MEMORY',
    CLARIFICATION: 'CLARIFICATION',
    UNSUPPORTED: 'UNSUPPORTED'
  };

  /**
   * Classify user request text into high-level agent category
   */
  classify(userRequest = '') {
    const raw = (userRequest || '').trim();
    const lower = raw.toLowerCase();

    if (!lower) {
      return { category: RequestClassifierAgent.CATEGORIES.CLARIFICATION, confidence: 1.0, intent: 'EMPTY_INPUT' };
    }

    // 0.5 Medical Safety Guardrails (Dosage alterations, prescriptions)
    if (
      ((lower.includes('increase') || lower.includes('decrease') || lower.includes('change') || lower.includes('adjust') || lower.includes('stop') || lower.includes('start') || lower.includes('double') || lower.includes('halve')) && (lower.includes('medication') || lower.includes('dosage') || lower.includes('dose') || lower.includes('medicine') || lower.includes('pill'))) ||
      lower.includes('what medication should i take')
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.QUESTION,
        confidence: 1.0,
        intent: 'MEDICAL_SAFETY_ALERT'
      };
    }

    // 1. Multi-Step Tasks (Contains multiple conjunctions or distinct goals)
    if (
      (lower.includes('and remind me') && (lower.includes('meeting') || lower.includes('schedule') || lower.includes('at '))) ||
      (lower.includes('plan my day') || lower.includes('plan my evening') || lower.includes('organize my day')) ||
      (lower.includes('remind me to leave') && lower.includes('remind me to carry'))
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.MULTI_STEP_TASK,
        confidence: 0.95,
        intent: 'MULTI_STEP_PLAN'
      };
    }

    // 2. Conversational Memory Storage & Retrieval
    if (
      lower.startsWith('remember that') ||
      lower.startsWith('remember ') ||
      lower.includes('do you remember') ||
      lower.includes('what did i tell you') ||
      lower.includes('what did i ask') ||
      lower.includes('what are my reminders') ||
      lower.includes('what coffee do i like') ||
      lower.includes('what do i prefer') ||
      lower.includes('my preference')
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.MEMORY,
        confidence: 0.98,
        intent: lower.startsWith('remember') ? 'STORE_MEMORY' : 'RETRIEVE_MEMORY'
      };
    }

    // 3. Alarms
    if (
      lower.startsWith('wake me up') ||
      lower.startsWith('set an alarm') ||
      lower.startsWith('cancel the alarm') ||
      lower.includes('alarm for')
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.ALARM,
        confidence: 0.98,
        intent: lower.includes('cancel') ? 'CANCEL_ALARM' : 'SET_ALARM'
      };
    }

    // 4. Reminders
    if (
      lower.startsWith('remind me') ||
      lower.startsWith('set a reminder') ||
      lower.startsWith('cancel that reminder') ||
      lower.startsWith('cancel my reminder') ||
      (lower.includes('reminder') && !lower.includes('what is a'))
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.REMINDER,
        confidence: 0.95,
        intent: lower.includes('cancel') ? 'CANCEL_REMINDER' : 'CREATE_REMINDER'
      };
    }

    // 4.5 Contextual Follow-Ups
    if (
      lower.includes('taking so long') ||
      lower.includes('what is taking') ||
      lower.includes("what's taking") ||
      lower.includes('are you still') ||
      lower.includes('what did you just do') ||
      lower.includes('did it open') ||
      lower.includes('is it open') ||
      lower.includes('is it done') ||
      lower.includes('what happened') ||
      lower.startsWith('actually make that ') ||
      lower.startsWith('actually make it ') ||
      lower === 'cancel that' ||
      lower === 'cancel it'
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.CLARIFICATION,
        confidence: 0.98,
        intent: 'FOLLOW_UP'
      };
    }

    // 5. Calendar & Scheduling (Creation, Modification, Deletion, Query)
    const isScheduleQuery = (
      lower === 'schedule' ||
      lower === 'my schedule' ||
      lower === 'current schedule' ||
      lower === "today's schedule" ||
      lower === "what's scheduled" ||
      lower === 'what is scheduled' ||
      lower === "what's scheduled today" ||
      lower === 'schedule for today' ||
      lower === 'schedule today' ||
      lower === "show me today's schedule" ||
      lower === 'show my schedule' ||
      lower === 'show schedule' ||
      lower === 'check schedule' ||
      lower === 'view schedule' ||
      lower === 'what do i have today' ||
      lower === 'what am i doing today' ||
      lower === 'what is planned for today' ||
      lower === 'do i have anything scheduled today' ||
      lower === 'do i have anything scheduled' ||
      lower === 'what do i have tomorrow' ||
      lower === 'what about tomorrow' ||
      lower === 'schedule for tomorrow' ||
      lower === 'schedule tomorrow' ||
      lower.startsWith('schedule for ') ||
      lower.includes('my current schedule') ||
      lower.includes("what's on my schedule") ||
      lower.includes('what is on my schedule') ||
      lower.includes('what is on schedule') ||
      lower.includes("what's on schedule") ||
      lower.includes("what's scheduled") ||
      lower.includes('what is scheduled') ||
      lower.includes('on my schedule') ||
      lower.includes('on my calendar') ||
      lower.includes('what do i have today') ||
      lower.includes('what do i have tomorrow') ||
      lower.includes('what do i have planned') ||
      lower.includes('what is planned') ||
      lower.includes('what am i doing today') ||
      lower.includes('do i have anything scheduled') ||
      lower.includes('show my schedule') ||
      lower.includes('show schedule') ||
      lower.includes('check schedule') ||
      lower.includes('view schedule') ||
      lower.includes('today schedule') ||
      lower.includes('my day') ||
      lower.includes('agenda') ||
      (lower.includes('calendar') && !lower.includes('what is a calendar'))
    );

    if (
      isScheduleQuery ||
      lower.startsWith('add ') ||
      lower.startsWith('put ') ||
      lower.startsWith('create routine') ||
      lower.startsWith('move ') ||
      lower.startsWith('reschedule ') ||
      lower.includes('schedule a meeting') ||
      lower.includes('schedule team') ||
      lower.includes('schedule a ') ||
      lower.includes('schedule my usual workout') ||
      lower.includes('cancel the meeting') ||
      lower.includes('cancel my meeting') ||
      lower.includes('cancel meeting') ||
      lower.includes('cancel appointment') ||
      lower.includes('cancel the appointment') ||
      lower.includes('cancel doctor') ||
      (lower.includes('cancel') && (lower.includes('schedule') || lower.includes('calendar') || lower.includes('event') || lower.includes('meeting') || lower.includes('appointment'))) ||
      lower.includes('tea break')
    ) {
      let intent = 'QUERY_SCHEDULE';
      if (isScheduleQuery) {
        intent = 'QUERY_SCHEDULE';
      } else if (lower.startsWith('move') || lower.startsWith('reschedule')) {
        intent = 'RESCHEDULE_SCHEDULE';
      } else if (lower.includes('cancel') || lower.includes('delete')) {
        intent = 'CANCEL_SCHEDULE';
      } else if (
        lower.startsWith('add ') ||
        lower.startsWith('put ') ||
        lower.startsWith('create routine') ||
        lower.includes('schedule a meeting') ||
        lower.includes('schedule team') ||
        lower.includes('schedule a ') ||
        lower.includes('schedule my usual workout') ||
        lower.includes('tea break')
      ) {
        intent = 'CREATE_SCHEDULE';
      }
      return {
        category: RequestClassifierAgent.CATEGORIES.CALENDAR,
        confidence: 0.98,
        intent
      };
    }

    // 6. Wellness & Health
    if (
      lower.includes('water') ||
      lower.includes('hydration') ||
      lower.includes('drink') ||
      lower.includes('vitals') ||
      lower.includes('blood pressure') ||
      lower.includes('wellness summary') ||
      lower.includes('health summary') ||
      lower.includes('medication') ||
      lower.includes('pills')
    ) {
      let intent = 'WELLNESS_QUERY';
      if (lower.includes('summary')) intent = 'WELLNESS_SUMMARY';
      else if (lower.includes('log') || lower.includes('drank') || lower.includes('add water') || lower.includes('300ml') || lower.includes('250ml') || lower.includes('500ml')) intent = 'LOG_HYDRATION';
      else if (lower.includes('how much') || lower.includes('water have i had') || lower.includes('water today')) intent = 'WELLNESS_QUERY';

      return {
        category: RequestClassifierAgent.CATEGORIES.WELLNESS,
        confidence: 0.95,
        intent
      };
    }

    // 7. Device Actions & Application Launching (Dynamic Application Resolver)
    const appResolution = ApplicationResolver.resolve(raw);
    if (appResolution.isAppRequest) {
      return {
        category: RequestClassifierAgent.CATEGORIES.DEVICE_ACTION,
        confidence: appResolution.confidence,
        intent: 'OPEN_APPLICATION',
        application: appResolution.appName,
        packageName: appResolution.packageName
      };
    }

    if (lower === 'settings' || lower.includes('open settings') || lower.includes('system settings') || lower.includes('phone settings')) {
      return {
        category: RequestClassifierAgent.CATEGORIES.DEVICE_ACTION,
        confidence: 0.98,
        intent: 'OPEN_SETTINGS'
      };
    }

    if (lower.includes('battery status') || lower.includes('battery level') || lower.includes('device status') || lower.includes('phone status')) {
      return {
        category: RequestClassifierAgent.CATEGORIES.DEVICE_ACTION,
        confidence: 0.98,
        intent: 'DEVICE_STATUS'
      };
    }

    if (lower.startsWith('call ') || lower.startsWith('make a call') || lower.startsWith('dial ') || lower.includes('phone call')) {
      return {
        category: RequestClassifierAgent.CATEGORIES.DEVICE_ACTION,
        confidence: 0.98,
        intent: 'MAKE_CALL'
      };
    }

    if (lower.startsWith('send a message') || lower.startsWith('send message') || lower.startsWith('send sms') || lower.startsWith('text ')) {
      return {
        category: RequestClassifierAgent.CATEGORIES.DEVICE_ACTION,
        confidence: 0.98,
        intent: 'SEND_MESSAGE'
      };
    }

    if (
      lower.includes('turn on') ||
      lower.includes('turn off') ||
      lower.includes('flashlight') ||
      lower.includes('bluetooth') ||
      lower.includes('wifi') ||
      lower.includes('battery')
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.DEVICE_ACTION,
        confidence: 0.95,
        intent: 'DEVICE_CONTROL'
      };
    }

    // 7.5 Medical Safety Guardrails (Dosage alterations, prescriptions)
    if (
      ((lower.includes('increase') || lower.includes('decrease') || lower.includes('change') || lower.includes('adjust') || lower.includes('stop') || lower.includes('start') || lower.includes('double') || lower.includes('halve')) && (lower.includes('medication') || lower.includes('dosage') || lower.includes('dose') || lower.includes('medicine') || lower.includes('pill'))) ||
      lower.includes('what medication should i take')
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.QUESTION,
        confidence: 1.0,
        intent: 'MEDICAL_SAFETY_ALERT'
      };
    }

    // 8. Pure Conversation & Entertainment (Jokes, Stories, Small Talk, Greetings)
    if (
      lower.includes('joke') ||
      lower.includes('tell me a story') ||
      lower.includes('make me laugh') ||
      lower.includes('who are you') ||
      lower.includes('how are you') ||
      lower.includes('talk to me') ||
      lower.includes('repeat that') ||
      lower.includes('say that again') ||
      lower.includes('good morning') ||
      lower.includes('good evening') ||
      lower.includes('good afternoon') ||
      lower.includes('good night') ||
      lower.includes('give me motivation') ||
      lower.includes('help me decide what to eat') ||
      lower === 'hi' ||
      lower === 'hello' ||
      lower === 'hey' ||
      lower === 'jarvis' ||
      lower.startsWith('hey jarvis') ||
      lower.startsWith('hi jarvis') ||
      lower.startsWith('hello jarvis') ||
      lower.startsWith('good morning jarvis') ||
      lower.startsWith('good evening jarvis')
    ) {
      let intent = 'GENERAL_CONVERSATION';
      if (lower.includes('joke')) intent = 'JOKE_REQUEST';
      else if (lower.includes('story')) intent = 'STORY_REQUEST';
      else if (lower.includes('repeat that') || lower.includes('say that again')) intent = 'REPEAT_LAST_RESPONSE';
      else if (lower.startsWith('hello jarvis')) intent = 'GENERAL_CONVERSATION';
      else if (lower.includes('good morning') || lower.includes('good evening') || lower.includes('good afternoon') || lower === 'hi' || lower === 'hello' || lower === 'hey' || lower === 'jarvis' || lower.startsWith('hey jarvis') || lower.startsWith('hi jarvis')) intent = 'GREETING';

      return {
        category: RequestClassifierAgent.CATEGORIES.CONVERSATION,
        confidence: 0.99,
        intent
      };
    }

    // 8.5. Weather and Meteorology Queries
    if (
      lower.includes('weather') ||
      lower.includes('rain') ||
      lower.includes('forecast') ||
      lower.includes('temperature') ||
      lower.includes('umbrella') ||
      lower.includes('will it rain') ||
      lower.includes('is it raining') ||
      lower.includes('degrees outside')
    ) {
      let location = null;
      const match = raw.match(/(?:in|for|at)\s+([A-Za-z\s]+?)(?:\s+today|\s+tomorrow|\?|$)/i);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (!['the', 'my', 'this', 'a', 'area'].includes(candidate.toLowerCase())) {
          location = candidate;
        }
      }

      const isRain = lower.includes('rain') || lower.includes('umbrella');
      return {
        category: RequestClassifierAgent.CATEGORIES.QUESTION,
        confidence: 0.98,
        intent: isRain ? 'RAIN_QUERY' : 'WEATHER_QUERY',
        entities: location ? { location } : {}
      };
    }

    // 9. Questions & Explanations (Factual, Educational, Math)
    if (
      lower.includes('what is the capital of') ||
      lower.includes('capital of japan') ||
      lower.includes('explain quantum computing') ||
      lower.includes('explain ') ||
      lower.includes('what is two plus two') ||
      lower.includes('2+2') ||
      lower.includes('2 + 2') ||
      lower.startsWith('why is') ||
      lower.startsWith('how does') ||
      lower.startsWith('what is') ||
      lower.includes('what can you do') ||
      lower.includes('what are your capabilities')
    ) {
      return {
        category: RequestClassifierAgent.CATEGORIES.QUESTION,
        confidence: 0.95,
        intent: (lower.includes('two plus two') || lower.includes('2+2')) ? 'GENERAL_KNOWLEDGE_QUERY' : (lower.includes('capabilities') || lower.includes('what can you do') ? 'CAPABILITY_QUERY' : 'GENERAL_KNOWLEDGE')
      };
    }

    // 10. Default to General Personal Assistant Conversation
    return {
      category: RequestClassifierAgent.CATEGORIES.CONVERSATION,
      confidence: 0.8,
      intent: 'GENERAL_CONVERSATION'
    };
  }
}

module.exports = RequestClassifierAgent;
