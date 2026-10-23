/**
 * ConversationAgent
 * Maintains multi-turn conversation context, resolves pronouns and implicit context,
 * identifies follow-ups, and formulates clarification questions.
 */
class ConversationAgent {
  constructor(options = {}) {
    this.historyLimit = options.historyLimit || 10;
  }

  /**
   * Resolve multi-turn context and merge slot values
   */
  resolveMultiTurnIntent(currentText, sessionContext = {}) {
    const raw = (currentText || '').trim();
    const lower = raw.toLowerCase();

    // Check if session has pending slots
    const pendingIntent = sessionContext.pendingIntent || null;
    const pendingSlots = sessionContext.pendingSlots || {};

    // 1. Time / Timing follow-up resolution
    if (pendingIntent === 'CREATE_REMINDER_TIME_PENDING' || pendingIntent === 'SCHEDULE_TIME_PENDING') {
      const timeMatch = raw.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)|\d{1,2}\s*(?:am|pm|AM|PM)|tomorrow\s*at\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?|\b\d{1,2}\b)/i);
      if (timeMatch || lower.includes('pm') || lower.includes('am') || lower.includes('tomorrow') || lower.includes('tonight')) {
        let resolvedTime = timeMatch ? timeMatch[0] : raw;
        if (/^\d{1,2}$/.test(resolvedTime.trim())) {
          resolvedTime = `${resolvedTime}:00 PM`;
        } else if (/^at\s+\d{1,2}\.?$/i.test(raw.trim())) {
          const num = raw.replaceAll(/[^\d]/g, '');
          resolvedTime = `${num}:00 PM`;
        }
        const mergedTitle = pendingSlots.title || 'Reminder';
        return {
          isFollowUp: true,
          resolvedIntent: 'CREATE_REMINDER',
          resolvedQuery: `Create a reminder to ${mergedTitle} at ${resolvedTime}`,
          slots: { ...pendingSlots, time: resolvedTime },
          clearPending: true
        };
      }
    }

    // 1.5 Weather Location follow-up resolution ("What's the weather like?" -> "Chennai")
    if (pendingIntent === 'WEATHER_QUERY' || pendingIntent === 'WEATHER_CLARIFICATION' || pendingIntent === 'RAIN_QUERY') {
      const isRain = pendingIntent === 'RAIN_QUERY' || pendingSlots.queryType === 'rain';
      const cleanCity = raw.replace(/^[.,!?;:]+|[.,!?;:]+$/g, '').trim();
      if (cleanCity && cleanCity.length > 1 && !cleanCity.toLowerCase().startsWith('cancel') && !cleanCity.toLowerCase().startsWith('stop')) {
        return {
          isFollowUp: true,
          resolvedIntent: isRain ? 'RAIN_QUERY' : 'WEATHER_QUERY',
          resolvedQuery: isRain ? `Will it rain today in ${cleanCity}?` : `What is the weather in ${cleanCity}?`,
          slots: { ...pendingSlots, location: cleanCity, queryType: isRain ? 'rain' : 'general' },
          clearPending: true
        };
      }
    }

    // 1.6 Context-dependent weather date shift ("What about tomorrow?" following weather query)
    if (lower === 'what about tomorrow' || lower === 'what about tomorrow?' || lower === 'how about tomorrow' || lower === 'how about tomorrow?') {
      const lastWeatherLoc = sessionContext.lastWeatherLocation || sessionContext.workingMemory?.lastWeatherLocation;
      if (lastWeatherLoc) {
        return {
          isFollowUp: true,
          resolvedIntent: 'WEATHER_QUERY',
          resolvedQuery: `What is the weather in ${lastWeatherLoc} tomorrow?`,
          slots: { location: lastWeatherLoc, date: 'tomorrow' }
        };
      }
    }

    // 2. Cancellation / Interruption phrasing (Pronoun/session cancellation only)
    const normalized = lower.replace(/[.,!?;:]+$/, '').trim();
    const isSpecificEntityCancellation = normalized.includes('meeting') || normalized.includes('appointment') || normalized.includes('tea break') || normalized.includes('from my schedule') || normalized.includes('on my calendar') || normalized.includes('doctor');
    if (!isSpecificEntityCancellation && (
      normalized === 'cancel' ||
      normalized === 'cancel that' ||
      normalized === 'cancel it' ||
      normalized === 'cancel that reminder' ||
      normalized === 'cancel that action' ||
      normalized === 'delete that' ||
      normalized === 'delete that reminder' ||
      normalized === 'never mind' ||
      normalized === 'stop' ||
      normalized === 'don\'t do that' ||
      normalized === 'actually don\'t do that' ||
      normalized.startsWith('actually cancel') ||
      normalized.startsWith('don\'t ')
    )) {
      return {
        isCancellation: true,
        resolvedIntent: 'ACTION_CANCELLED',
        resolvedQuery: 'cancel',
        clearPending: true
      };
    }

    // 3. Pronoun / Reference resolution ("move that to 6 PM", "actually make it 8", "actually make that 8 PM", "change it to tomorrow")
    if (
      lower.startsWith('move that to ') ||
      lower.startsWith('move it to ') ||
      lower.startsWith('change that to ') ||
      lower.startsWith('change it to ') ||
      lower.startsWith('reschedule that to ') ||
      lower.startsWith('reschedule it to ') ||
      lower.startsWith('make it ') ||
      lower.startsWith('make that ') ||
      lower.startsWith('actually make it ') ||
      lower.startsWith('actually make that ')
    ) {
      const newTarget = raw.replace(/^(actually make that|actually make it|make that|make it|move that to|move it to|change that to|change it to|reschedule that to|reschedule it to)\s+/i, '').trim();
      return {
        isFollowUp: true,
        resolvedIntent: 'RESCHEDULE_LAST_ITEM',
        resolvedQuery: `Reschedule last item to ${newTarget}`,
        slots: { target: newTarget }
      };
    }

    // 4. Memory / Context recall questions ("What did I ask you earlier?", "What did I ask you to do?")
    if (
      lower.includes('what did i ask') ||
      lower.includes('what did i tell you') ||
      lower.includes('what did you just schedule') ||
      lower.includes('what did we talk about')
    ) {
      return {
        isFollowUp: true,
        resolvedIntent: 'RECALL_RECENT_CONTEXT',
        resolvedQuery: 'What did I ask you recently?',
        slots: {}
      };
    }

    return {
      isFollowUp: false,
      resolvedIntent: null,
      resolvedQuery: currentText,
      slots: {}
    };
  }

  /**
   * Generate clarification response when parameters are missing
   */
  generateClarification(missingField, intent) {
    if (missingField === 'time') {
      return 'What time should I schedule that for?';
    }
    if (missingField === 'title') {
      return 'What would you like me to remind you about?';
    }
    return 'Could you please provide more details?';
  }
}

module.exports = ConversationAgent;
