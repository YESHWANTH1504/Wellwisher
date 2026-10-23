const RoutineModel = require('../../../models/routineModel');
const pool = require('../../../config/db');

/**
 * EntityResolver
 * Deterministically resolves conversational entities (calendar events, reminders, apps, contacts)
 * against database records and active task context.
 * Strictly prevents arbitrary first-row mutation and prompts on ambiguity.
 */
class EntityResolver {
  /**
   * Resolve an event or reminder for modification or cancellation.
   */
  static async resolveEventOrReminder(userId, userQuery, activeTask = null) {
    if (!userId) throw new Error('EntityResolver requires authenticated userId');
    const query = (userQuery || '').toLowerCase().trim();

    // 1. Direct active task binding if pronoun ("that", "it", "the reminder", "the meeting")
    const isPronounQuery =
      query.includes('that') ||
      query.includes('it') ||
      query.startsWith('actually make that') ||
      query.startsWith('move that') ||
      query === 'cancel' ||
      query === 'cancel that' ||
      query === 'delete that';

    if (isPronounQuery && activeTask && (activeTask.eventId || activeTask.entityId || activeTask.reminderId)) {
      const targetId = activeTask.eventId || activeTask.entityId || activeTask.reminderId;
      const routine = await RoutineModel.getById(targetId, userId);
      if (routine) {
        return {
          resolved: true,
          ambiguous: false,
          entity: {
            id: routine.id,
            title: routine.title,
            time: routine.time,
            type: 'ROUTINE',
            source: 'ACTIVE_TASK'
          }
        };
      }
    }

    // 2. Fetch all user routines to match against query
    const userRoutines = await RoutineModel.getAll(userId);
    if (!userRoutines || userRoutines.length === 0) {
      return {
        resolved: false,
        ambiguous: false,
        candidates: [],
        message: 'No events or reminders found on your schedule.'
      };
    }

    // 3. Extract temporal filters from query
    let targetTimeMinutes = null;
    const timeMatch = query.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const p = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      if (p === 'PM' && h < 12) h += 12;
      if (p === 'AM' && h === 12) h = 0;
      targetTimeMinutes = h * 60 + m;
    }

    // 4. Filter matches based on keywords, title, or time
    const candidates = userRoutines.filter(r => {
      const titleLower = (r.title || '').toLowerCase();
      // Check title match (both directions)
      if (titleLower.includes(query) || query.includes(titleLower)) return true;

      // Clean prefix matching (e.g. "Phase 7 Standup Sync" vs "standup sync")
      const cleanTitle = titleLower.replace(/phase\s*\d+\s*/gi, '').trim();
      if (cleanTitle.length > 2 && (cleanTitle.includes(query) || query.includes(cleanTitle))) {
        return true;
      }

      // Check keyword matches (meeting, water, workout, doctor)
      const keywords = ['meeting', 'water', 'doctor', 'workout', 'gym', 'call', 'medicine', 'lunch', 'dinner', 'sync', 'standup'];
      for (const kw of keywords) {
        if (query.includes(kw) && titleLower.includes(kw)) {
          return true;
        }
      }

      // Check time match if specified
      if (targetTimeMinutes !== null && r.time) {
        const rMins = EntityResolver._timeStringToMinutes(r.time);
        if (Math.abs(rMins - targetTimeMinutes) <= 15) {
          return true;
        }
      }

      return false;
    });

    // 5. Evaluate ambiguity
    if (candidates.length === 1) {
      const c = candidates[0];
      return {
        resolved: true,
        ambiguous: false,
        entity: {
          id: c.id,
          title: c.title,
          time: c.time,
          type: 'ROUTINE',
          source: 'DATABASE_QUERY'
        }
      };
    }

    if (candidates.length > 1) {
      // Multiple candidates exist -> NEVER guess or pick first row!
      const candidateList = candidates.map(c => `"${c.title}" at ${c.time}`).join(' and ');
      return {
        resolved: false,
        ambiguous: true,
        candidates: candidates.map(c => ({ id: c.id, title: c.title, time: c.time })),
        prompt: query.includes('meeting')
          ? `Which meeting do you want me to cancel? You have ${candidateList}.`
          : `Which one do you mean? You have ${candidateList}.`
      };
    }

    // If query was generic like "cancel the meeting" and we have multiple meetings:
    const meetingRoutines = userRoutines.filter(r => (r.title || '').toLowerCase().includes('meeting'));
    if (meetingRoutines.length > 1) {
      const candidateList = meetingRoutines.map(c => `"${c.title}" at ${c.time}`).join(' and ');
      return {
        resolved: false,
        ambiguous: true,
        candidates: meetingRoutines.map(c => ({ id: c.id, title: c.title, time: c.time })),
        prompt: `Which meeting do you want me to cancel? You have ${candidateList}.`
      };
    }

    return {
      resolved: false,
      ambiguous: false,
      candidates: [],
      message: 'I could not find a matching event or reminder on your schedule.'
    };
  }

  /**
   * Helper to convert HH:MM AM/PM or HH:MM to minutes from midnight
   */
  static _timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3]?.toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
}

module.exports = EntityResolver;
