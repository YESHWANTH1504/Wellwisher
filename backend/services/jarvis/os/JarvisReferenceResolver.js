const { activeTaskManager } = require('../tasks/ActiveTaskManager');
const { defaultConversationState } = require('./JarvisConversationState');
const { defaultTemporalIntelligence } = require('./JarvisTemporalIntelligence');
const { defaultWorldModel, RELATION_TYPES } = require('./JarvisWorldModel');
const CalendarService = require('../integrations/calendarService');

/**
 * JarvisReferenceResolver
 * Deterministic multi-turn semantic reference resolution layer.
 * Resolves pronouns, ordinals, temporal shifts, and contextual targets
 * according to strict deterministic priority rules.
 */
class JarvisReferenceResolver {
  /**
   * Universal resolution method
   * @param {string} rawUtterance
   * @param {string} sessionId
   * @param {Object} options { userId, timezone }
   */
  static resolve(rawUtterance = '', sessionId, options = {}) {
    const raw = (rawUtterance || '').toLowerCase().trim();
    const cleanRaw = raw.replace(/[.!?,]+$/, '').trim();
    const userId = options.userId || null;

    // Get active task and conversation state
    const activeTask = activeTaskManager.getActiveTask(sessionId, userId);
    const key = `${userId}:${sessionId}`;
    const convState = defaultConversationState._states.get(key) || null;
    const lockedEntity = convState?.activeEntity || null;
    const candidates = (activeTask?.candidates && activeTask.candidates.length > 0)
      ? activeTask.candidates
      : (convState?.candidateEntities || []);

    // 1. Exact Stop / Interruption
    if (cleanRaw === 'stop' || cleanRaw === 'shut up' || cleanRaw === 'be quiet' || cleanRaw === 'silence') {
      return {
        isReference: true,
        referenceType: 'STOP_PLAYBACK',
        speech: 'Stopping.',
        clearTask: false
      };
    }

    // 2. Ordinal Queries ("What is the second meeting?", "Show me the second meeting", "Which is the second one?")
    const ordinalQueryMatch = raw.match(/(?:what\s+is|show\s+me|tell\s+me\s+about|which\s+is|what\s+about)\s+(?:the\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th)(?:\s+(meeting|event|item|one))?/i);
    const directOrdinalMatch = raw.match(/^(?:the\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th)\s+(meeting|event|item|one)?$/i);

    if ((ordinalQueryMatch || directOrdinalMatch) && candidates.length > 0) {
      const match = ordinalQueryMatch || directOrdinalMatch;
      const ordWord = match[1].toLowerCase();
      let ordIdx = 0;
      if (ordWord === 'first' || ordWord === '1st') ordIdx = 0;
      else if (ordWord === 'second' || ordWord === '2nd') ordIdx = 1;
      else if (ordWord === 'third' || ordWord === '3rd') ordIdx = 2;
      else if (ordWord === 'fourth' || ordWord === '4th') ordIdx = 3;
      else if (ordWord === 'last') ordIdx = candidates.length - 1;

      // Filter candidates if "meeting" was specified
      let candidatePool = candidates;
      const categoryFilter = match[2] ? match[2].toLowerCase() : null;
      if (categoryFilter === 'meeting') {
        const meetingsOnly = candidates.filter(c =>
          (c.title || '').toLowerCase().includes('meeting') ||
          (c.title || '').toLowerCase().includes('sync') ||
          (c.title || '').toLowerCase().includes('review') ||
          (c.title || '').toLowerCase().includes('standup') ||
          (c.eventType || '').toLowerCase().includes('meeting')
        );
        if (meetingsOnly.length > ordIdx) {
          candidatePool = meetingsOnly;
        }
      }

      if (ordIdx >= 0 && ordIdx < candidatePool.length) {
        const selected = candidatePool[ordIdx];

        // Format nice 12-hour time
        let formattedTime = selected.formattedTime || selected.time;
        if (formattedTime && /^\d{1,2}:\d{2}$/.test(formattedTime)) {
          const [h, m] = formattedTime.split(':').map(Number);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const dispH = h % 12 === 0 ? 12 : h % 12;
          formattedTime = `${dispH}:${m.toString().padStart(2, '0')} ${ampm}`;
        }

        const ordinalWords = ['first', 'second', 'third', 'fourth', 'fifth'];
        const ordinalDisplay = ordinalWords[ordIdx] || `${ordIdx + 1}th`;
        const speech = `The ${ordinalDisplay} meeting is ${selected.title} at ${formattedTime}.`;

        // Synchronously lock in conversation state cache
        if (convState) {
          convState.activeEntity = {
            id: selected.id || selected.eventId,
            eventId: selected.eventId || selected.id,
            entityType: 'CALENDAR_EVENT',
            title: selected.title,
            displayName: selected.title,
            time: selected.time,
            date: selected.date,
            ordinal: ordIdx + 1,
            locked: true,
            lockedAt: Date.now()
          };
          // Persist in background
          defaultConversationState.persist(sessionId, userId).catch(() => {});
        }

        // Also sync activeTask
        activeTaskManager.setActiveTask(sessionId, {
          userId,
          id: selected.id || selected.eventId,
          eventId: selected.id || selected.eventId,
          title: selected.title,
          time: selected.time,
          date: selected.date,
          type: 'CALENDAR_EVENT',
          status: 'LOCKED',
          candidates
        });

        return {
          isReference: true,
          referenceType: 'ORDINAL_QUERY',
          intent: 'CALENDAR_ORDINAL_SELECTION',
          targetEntity: selected,
          speech,
          clearTask: false
        };
      }
    }

    // 3. Relative Reminder ("Remind me one hour before", "Remind me before it", "Remind me 30 mins before")
    const relativeReminderMatch = raw.match(/remind\s+me\s+(?:(\d+|one|two|three)?\s*(hours?|hrs?|minutes?|mins?)?\s*)?(before(?:\s+(?:it|that|the meeting))?|prior)/i);
    if (relativeReminderMatch && (lockedEntity || (activeTask && activeTask.time))) {
      const anchor = lockedEntity || activeTask;
      const temporalRes = defaultTemporalIntelligence.resolveTemporal(raw, {
        anchorDate: anchor.date || new Date().toISOString().split('T')[0],
        anchorTime: anchor.time || '14:00',
        anchorEntity: anchor
      });

      const reminderTime = temporalRes.time || '13:00';
      const [h, m] = reminderTime.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const dispH = h % 12 === 0 ? 12 : h % 12;
      const formattedReminderTime = `${dispH}:${m.toString().padStart(2, '0')} ${ampm}`;

      const speech = `Sure. I'll remind you at ${formattedReminderTime}.`;

      return {
        isReference: true,
        referenceType: 'CREATE_RELATIVE_REMINDER',
        intent: 'REMINDER_CREATE',
        targetEntity: anchor,
        actionPlan: {
          steps: [
            {
              stepNumber: 1,
              toolName: 'create_reminder',
              arguments: {
                title: anchor.title || 'Event',
                time: reminderTime,
                date: anchor.date || temporalRes.date,
                relatedEventId: anchor.id || anchor.eventId
              }
            }
          ]
        },
        speech,
        clearTask: false
      };
    }

    // 4. Cancellation ("Cancel that reminder", "Cancel that", "Delete that")
    if (raw === 'cancel' || raw === 'cancel that' || raw === 'cancel that reminder' || raw === 'delete that' || raw === 'nevermind') {
      const isExplicitReminder = raw.includes('reminder');
      const lastCreated = convState?.lastCreatedEntity;
      const targetIsReminder = isExplicitReminder || (lastCreated && lastCreated.type === 'REMINDER') || (activeTask?.type === 'REMINDER');

      if (targetIsReminder && lastCreated && lastCreated.id) {
        // Target specifically the reminder, preserving the calendar event!
        return {
          isReference: true,
          referenceType: 'CANCEL_ACTIVE_REMINDER',
          intent: 'CANCEL_REMINDER',
          targetEntity: lastCreated,
          actionPlan: {
            steps: [
              {
                stepNumber: 1,
                toolName: 'cancel_reminder',
                arguments: {
                  reminderId: lastCreated.id,
                  id: lastCreated.id
                }
              }
            ]
          },
          speech: `Cancelled! Reminder for "${lastCreated.title || 'Item'}" has been removed.`,
          clearTask: false
        };
      }

      // Default active task / locked entity cancellation
      const targetId = lockedEntity?.id || activeTask?.reminderId || activeTask?.eventId || activeTask?.scheduleId || activeTask?.id;
      if (targetId) {
        const isReminder = targetIsReminder || activeTask?.type === 'REMINDER' || Boolean(activeTask?.reminderId);
        const title = lockedEntity?.title || activeTask?.title || 'Item';

        return {
          isReference: true,
          referenceType: 'CANCEL_ACTIVE_TASK',
          intent: 'CANCEL_CURRENT_ACTION',
          targetEntity: { id: targetId, title, type: isReminder ? 'REMINDER' : 'CALENDAR_EVENT' },
          actionPlan: {
            steps: [
              {
                stepNumber: 1,
                toolName: isReminder ? 'cancel_reminder' : 'calendar_delete_event',
                arguments: { reminderId: targetId, eventId: targetId, id: targetId }
              }
            ]
          },
          clearTask: true,
          speech: `Cancelled! "${title}" has been removed.`
        };
      }
    }

    // 5. Rescheduling Shift: Time ("Move it to 4 PM", "Actually make it 5", "Actually make that 9 PM")
    const timeShiftMatch = raw.match(/(?:actually\s+)?(?:make\s+(?:it|that)|move\s+(?:it|that)\s+to|change\s+(?:it|that)\s+to|reschedule\s+to)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (timeShiftMatch) {
      // Deterministic priority: 1. Locked activeEntity, 2. activeTask, 3. candidates[0]
      const targetEntity = lockedEntity || activeTask || (candidates.length > 0 ? candidates[0] : null);
      if (targetEntity && (targetEntity.id || targetEntity.eventId)) {
        const targetId = targetEntity.id || targetEntity.eventId;
        const targetTitle = targetEntity.title || 'Item';

        let newTimeRaw = timeShiftMatch[1].trim();
        // Contextual AM/PM preservation: if no AM/PM provided and current entity is PM, preserve PM
        if (!/am|pm/i.test(newTimeRaw)) {
          const numH = parseInt(newTimeRaw.split(':')[0], 10);
          if (numH >= 1 && numH <= 11) {
            let prevH = 12;
            if (targetEntity.time) {
              prevH = parseInt(targetEntity.time.split(':')[0], 10) || 12;
            }
            if (prevH >= 12) {
              newTimeRaw += ' PM';
            }
          }
        }
        const newMinutes = CalendarService.parseTimeToMinutes(newTimeRaw);
        const newTime24 = CalendarService.formatMinutesTo24H(newMinutes);
        const newTime12 = CalendarService.formatMinutesTo12H(newMinutes);

        // Update locked entity time in-place
        if (lockedEntity) {
          lockedEntity.time = newTime24;
        }

        return {
          isReference: true,
          referenceType: 'RESCHEDULE_ACTIVE_TASK',
          intent: 'RESCHEDULE_LAST_ITEM',
          newTime: newTime24,
          targetEntity: {
            id: targetId,
            title: targetTitle,
            type: 'CALENDAR_EVENT'
          },
          actionPlan: {
            steps: [
              {
                stepNumber: 1,
                toolName: 'calendar_update_event',
                arguments: {
                  eventId: targetId,
                  id: targetId,
                  time: newTime24,
                  newTime: newTime24
                }
              }
            ]
          },
          speech: `Updated! "${targetTitle}" moved to ${newTime12}.`
        };
      }
    }

    // 6. Rescheduling Shift: Relative Date ("Move it to tomorrow", "Actually Friday", "Move it to Friday")
    const dateShiftMatch = raw.match(/(?:actually\s+)?(?:make\s+(?:it|that)|move\s+(?:it|that)\s+to|change\s+(?:it|that)\s+to)\s+(tomorrow|day after tomorrow|friday|monday|tuesday|wednesday|thursday|saturday|sunday)/i);
    const directDateMatch = raw.match(/^actually\s+(friday|monday|tuesday|wednesday|thursday|saturday|sunday|tomorrow)$/i);

    if (dateShiftMatch || directDateMatch) {
      const match = dateShiftMatch || directDateMatch;
      const targetEntity = lockedEntity || activeTask || (candidates.length > 0 ? candidates[0] : null);
      if (targetEntity && (targetEntity.id || targetEntity.eventId)) {
        const targetId = targetEntity.id || targetEntity.eventId;
        const targetTitle = targetEntity.title || 'Item';
        const dateExpr = match[1].toLowerCase();

        const temporal = defaultTemporalIntelligence.resolveTemporal(dateExpr, {
          anchorDate: targetEntity.date || new Date().toISOString().split('T')[0]
        });

        if (lockedEntity) {
          lockedEntity.date = temporal.date;
        }

        return {
          isReference: true,
          referenceType: 'RESCHEDULE_DATE',
          intent: 'RESCHEDULE_LAST_ITEM',
          targetDate: temporal.date,
          targetEntity: {
            id: targetId,
            title: targetTitle,
            type: 'CALENDAR_EVENT'
          },
          actionPlan: {
            steps: [
              {
                stepNumber: 1,
                toolName: 'calendar_update_event',
                arguments: {
                  eventId: targetId,
                  id: targetId,
                  date: temporal.date,
                  newDate: temporal.date
                }
              }
            ]
          },
          speech: `Updated! "${targetTitle}" moved to ${temporal.date}.`
        };
      }
    }

    // 7. Query Status
    if (raw.includes('what is taking so long') || raw.includes('whats taking so long') || raw.includes('are you done')) {
      if (activeTask && activeTask.status === 'RUNNING') {
        return {
          isReference: true,
          referenceType: 'TASK_STATUS_INQUIRY',
          speech: `I am currently processing your request for "${activeTask.title || 'task'}". Just a moment.`,
          clearTask: false
        };
      }
    }

    return {
      isReference: false
    };
  }
}

module.exports = JarvisReferenceResolver;
