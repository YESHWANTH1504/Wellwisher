const CalendarService = require('../integrations/calendarService');
const RoutineTemplateModel = require('../../../models/routineTemplateModel');
const TemporalContext = require('../context/temporalContext');
const { RISK_LEVELS } = require('./toolRegistry');

// Intelligent Emoji Mapper for Calendar & Routine Items
function getEventEmoji(event) {
  const t = (event.title || '').toLowerCase();
  const c = (event.category || '').toLowerCase();
  const et = (event.eventType || '').toLowerCase();

  // Sleep & Wake
  if (t.includes('wake') || t.includes('alarm')) return '🌅';
  if (t.includes('sleep') || t.includes('bed') || c === 'sleep' || et === 'sleep') return '🌙';

  // Meals & Nutrition
  if (t.includes('breakfast')) return '🍳';
  if (t.includes('lunch')) return '🍱';
  if (t.includes('dinner')) return '🍽️';
  if (t.includes('snack') || t.includes('evening snack')) return '🥪';
  if (t.includes('tea') || t.includes('coffee') || t.includes('hydration') || t.includes('water')) return '🍵';

  // Work & Productivity
  if (t.includes('login') || t.includes('logout') || t.includes('commute') || t.includes('office') || c === 'work' || et === 'work') return '💼';
  if (t.includes('meeting') || t.includes('call') || t.includes('sync') || t.includes('standup')) return '🤝';
  if (t.includes('prep') || t.includes('planning') || t.includes('review')) return '📝';

  // Fitness & Health
  if (t.includes('exercise') || t.includes('workout') || t.includes('gym') || t.includes('run') || t.includes('jog') || t.includes('walk') || c === 'exercise') return '🏃‍♂️';
  if (t.includes('medication') || t.includes('pill') || t.includes('doctor') || t.includes('dentist') || t.includes('clinic')) return '🩺';

  // Personal & Recreation
  if (t.includes('household') || t.includes('cleaning') || t.includes('grocer')) return '🏠';
  if (t.includes('family') || t.includes('friend') || t.includes('kids')) return '👨‍👩‍👧';
  if (t.includes('relax') || t.includes('free time') || t.includes('movie') || t.includes('read')) return '✨';

  return '📌';
}

// Format event time according to context.timeFormat ('12h' default or '24h')
function formatEventTime(timeStr, timeFormat = '12h') {
  if (!timeStr) return '';
  const mins = CalendarService.parseTimeToMinutes(timeStr);
  if (mins === null || isNaN(mins)) return timeStr;
  if (timeFormat === '24h') {
    return CalendarService.formatMinutesTo24H(mins);
  }
  return CalendarService.formatMinutesTo12H(mins);
}

// Robust time parser returning minutes from midnight (0..1439) or null if unparseable
function parseTimeToMins(str) {
  if (!str) return null;
  const s = String(str).toLowerCase().trim();
  const m = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3] ? m[3].toLowerCase() : null;
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  return (h * 60 + mins) % 1440;
}

// Helper to format agenda items into attractive structured format with emojis
function formatAgendaSummary(events, dateStr, dayOfWeek = '', timeFormat = '12h') {
  const dayLabel = dayOfWeek ? `${dayOfWeek}, ${dateStr}` : dateStr;

  if (!events || events.length === 0) {
    const visual = `✨ **Your schedule is clear for ${dayLabel}!** 🌿\n\nEnjoy your free time, or let me know if you'd like to add any tasks!`;
    const speech = `Your schedule is clear for ${dayLabel}.`;
    return { visual, speech };
  }

  const header = `📅 **Daily Schedule for ${dayLabel}** (${events.length} items):`;

  const lines = events.map(e => {
    const emoji = getEventEmoji(e);
    const timeFormatted = formatEventTime(e.formattedTime || e.time, timeFormat);
    let statusSuffix = '';
    if (e.status === 'completed') statusSuffix = ' ✅ *(Done)*';
    else if (e.status === 'skipped') statusSuffix = ' ⏭️ *(Skipped)*';
    else if (e.status === 'cancelled') statusSuffix = ' ❌ *(Cancelled)*';

    return `${emoji} **${timeFormatted}** — ${e.title}${statusSuffix}`;
  });

  const visual = `${header}\n\n${lines.join('\n')}`;

  // Natural spoken text for voice / TTS
  const speechItems = events
    .map(e => {
      const statusBadge = e.status === 'completed' ? ' (completed)' : (e.status === 'skipped' ? ' (skipped)' : '');
      const timeFormatted = formatEventTime(e.formattedTime || e.time, timeFormat);
      return `${e.title} at ${timeFormatted}${statusBadge}`;
    })
    .join(', ');

  const speech = `Here is your schedule for ${dayLabel}: ${speechItems}.`;

  return { visual, speech };
}

const scheduleTools = [
  // ==========================================
  // PHASE 9: CORE CALENDAR TOOLS
  // ==========================================

  {
    name: 'calendar_get_today',
    description: 'Retrieve the authoritative personal calendar and daily routine agenda for today. Pure read operation; never creates or alters events.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const timeFormat = context.timeFormat || '12h';
      const ctx = TemporalContext.resolve(timezone);
      const agenda = await CalendarService.getAgenda(context.userId, ctx.currentDate, timezone);
      const summary = formatAgendaSummary(agenda, ctx.currentDate, ctx.dayOfWeek, timeFormat);

      return {
        success: true,
        date: ctx.currentDate,
        dayOfWeek: ctx.dayOfWeek,
        dayOfWeekNumber: ctx.dayOfWeekNumber,
        isWeekend: ctx.isWeekend,
        isWorkingDay: ctx.isWorkingDay,
        count: agenda.length,
        events: agenda,
        message: summary.visual,
        speech: summary.speech
      };
    }
  },

  {
    name: 'calendar_get_date',
    description: 'Retrieve the authoritative agenda for a specific date (e.g. tomorrow, a specific weekday, or YYYY-MM-DD). Pure read operation.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['date'],
      properties: {
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format, or relative term like "tomorrow", "yesterday", "Saturday"' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const timeFormat = context.timeFormat || '12h';
      const targetDate = TemporalContext.resolveTargetDate(input.date, timezone);
      const dayCtx = TemporalContext.resolve(timezone, new Date(`${targetDate}T12:00:00Z`));
      const agenda = await CalendarService.getAgenda(context.userId, targetDate, timezone);
      const summary = formatAgendaSummary(agenda, targetDate, dayCtx.dayOfWeek, timeFormat);

      return {
        success: true,
        date: targetDate,
        dayOfWeek: dayCtx.dayOfWeek,
        dayOfWeekNumber: dayCtx.dayOfWeekNumber,
        isWeekend: dayCtx.isWeekend,
        isWorkingDay: dayCtx.isWorkingDay,
        count: agenda.length,
        events: agenda,
        message: summary.visual,
        speech: summary.speech
      };
    }
  },

  {
    name: 'calendar_get_week',
    description: 'Retrieve the full weekly agenda across 7 consecutive days starting from today or a given date. Pure read operation.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional, defaults to current date)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const start = input?.startDate ? TemporalContext.resolveTargetDate(input.startDate, timezone) : null;
      const weekAgenda = await CalendarService.getWeekAgenda(context.userId, start, timezone);
      
      const totalEvents = weekAgenda.reduce((acc, d) => acc + d.events.length, 0);

      const visualLines = weekAgenda.map(day => {
        const dateFormatted = day.date;
        const dayName = day.dayOfWeek;
        if (day.events.length === 0) {
          return `📅 **${dayName}** (${dateFormatted}): ✨ *Clear*`;
        }
        const eventBadges = day.events.slice(0, 5).map(e => `${getEventEmoji(e)} ${e.title} (${e.formattedTime || e.time})`).join('\n   • ');
        const more = day.events.length > 5 ? `\n   *(+${day.events.length - 5} more)*` : '';
        return `📅 **${dayName}** (${dateFormatted}):\n   • ${eventBadges}${more}`;
      });

      const visual = `🗓️ **Your 7-Day Agenda** (${weekAgenda[0]?.date} to ${weekAgenda[6]?.date}):\n\n${visualLines.join('\n\n')}\n\n📊 **Total scheduled items:** ${totalEvents}`;
      const speech = `You have ${totalEvents} scheduled events across the 7-day week from ${weekAgenda[0]?.dayOfWeek} to ${weekAgenda[6]?.dayOfWeek}.`;

      return {
        success: true,
        startDate: weekAgenda[0]?.date,
        endDate: weekAgenda[6]?.date,
        totalEvents,
        week: weekAgenda,
        message: visual,
        speech: speech
      };
    }
  },

  {
    name: 'calendar_get_next_event',
    description: 'Find the next upcoming calendar event or routine relative to the current local time.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const result = await CalendarService.getNextEvent(context.userId, timezone);
      if (!result) {
        return {
          success: true,
          hasNextEvent: false,
          message: '✨ You have no more upcoming events scheduled today or tomorrow.',
          speech: 'You have no more upcoming events scheduled today or tomorrow.'
        };
      }
      const emoji = getEventEmoji(result.event);
      return {
        success: true,
        hasNextEvent: true,
        nextEvent: result.event,
        minutesUntil: result.minutesUntil,
        relativeDescription: result.relativeDescription,
        message: `⏳ **Next Up:** ${emoji} **${result.event.title}** at **${result.event.formattedTime}** *(${result.relativeDescription})*`,
        speech: `Your next event is ${result.event.title} at ${result.event.formattedTime}, ${result.relativeDescription}.`
      };
    }
  },

  {
    name: 'calendar_get_current_event',
    description: 'Find the event or routine that is currently in progress right now.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const current = await CalendarService.getCurrentEvent(context.userId, timezone);
      if (!current) {
        return {
          success: true,
          hasCurrentEvent: false,
          message: '✨ You have no scheduled event in progress right now.',
          speech: 'You have no scheduled event in progress right now.'
        };
      }
      const emoji = getEventEmoji(current);
      return {
        success: true,
        hasCurrentEvent: true,
        currentEvent: current,
        message: `📍 **In Progress Now:** ${emoji} **${current.title}** (${current.formattedTime})`,
        speech: `Right now you have ${current.title} scheduled at ${current.formattedTime}.`
      };
    }
  },

  {
    name: 'calendar_find_event',
    description: 'Find a calendar event by title query, category, date, or event ID.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Semantic search term (e.g. "breakfast", "meeting with Arun", "gym")' },
        eventId: { type: 'string', description: 'Exact event ID if known' },
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format (optional)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : null;
      const matches = await CalendarService.findRelevantEvent(context.userId, {
        query: input?.query,
        eventId: input?.eventId,
        date: targetDate,
        timezone
      });
      return {
        success: true,
        count: matches.length,
        events: matches,
        message: matches.length > 0 ? `🔍 Found ${matches.length} matching event(s).` : `🔍 No matching events found.`
      };
    }
  },

  {
    name: 'calendar_create_event',
    description: 'Create a new calendar event, appointment, or one-time task in the authoritative calendar. Validates times and checks for conflicts.',
    category: 'schedule',
    permissionKey: 'create_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['title', 'time'],
      properties: {
        title: { type: 'string', description: 'Title of the event' },
        time: { type: 'string', description: 'Start time e.g. "03:00 PM", "15:00", "3 PM"' },
        date: { type: 'string', description: 'Target date in YYYY-MM-DD or relative like "tomorrow", "Saturday" (defaults to today)' },
        endTime: { type: 'string', description: 'Optional end time e.g. "04:00 PM"' },
        category: { type: 'string', description: 'Category e.g. work, personal, meeting, exercise, health' },
        eventType: { type: 'string', description: 'Event type e.g. appointment, task, reminder, routine' },
        description: { type: 'string', description: 'Optional description' },
        reminderEnabled: { type: 'boolean', description: 'Whether to schedule an OS alarm/reminder' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const title = (input?.title || '').trim();
      if (!title) throw new Error('Event title cannot be empty.');
      const rawTime = (input?.time || '').trim();
      if (!rawTime) throw new Error('Event time is required. What time should I schedule it?');

      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : TemporalContext.resolve(timezone).currentDate;

      const result = await CalendarService.createEvent(context.userId, {
        title,
        time: rawTime,
        date: targetDate,
        endTime: input?.endTime,
        category: input?.category,
        eventType: input?.eventType,
        description: input?.description,
        reminderEnabled: input?.reminderEnabled !== undefined ? Boolean(input.reminderEnabled) : true,
        timezone
      });

      const formattedTime = formatEventTime(result.event.time, context.timeFormat);
      const emoji = getEventEmoji(result.event);
      let message = `✅ **Scheduled!** ${emoji} **${result.event.title}** at **${formattedTime}** on **${targetDate}**.`;
      if (result.conflictWarning) {
        message += `\n⚠️ *Conflict note:* ${result.conflictWarning.message}`;
      }
      const speech = `Done. I've scheduled "${result.event.title}" at ${formattedTime} on ${targetDate}.`;

      return {
        success: true,
        event: result.event,
        eventId: result.event.id,
        entityId: result.event.id,
        reminderId: result.event.id,
        scheduleId: result.event.id,
        createdRoutine: result.event,
        title: result.event.title,
        date: targetDate,
        time: result.event.time,
        formattedTime,
        timezone,
        triggerAtMillis: result.triggerAtMillis,
        action: 'SCHEDULE_EVENT',
        status: 'CONFIRMED',
        hasConflict: Boolean(result.conflictWarning),
        conflictWarning: result.conflictWarning,
        message,
        speech
      };
    }
  },

  {
    name: 'calendar_update_event',
    description: 'Update an existing calendar event (e.g. "Move lunch to 2 PM", "Push meeting to 4"). Resolves target event by ID or contextual query.',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Exact ID of the event to update' },
        query: { type: 'string', description: 'Name of the event to update (e.g. "lunch", "meeting") if ID not provided' },
        newTime: { type: 'string', description: 'New time e.g. "02:00 PM", "2 PM"' },
        newDate: { type: 'string', description: 'New date in YYYY-MM-DD format (optional)' },
        newTitle: { type: 'string', description: 'New title (optional)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.eventId || input?.scheduleId || input?.reminderId;
      const queryStr = input?.query || input?.titleQuery;

      const RoutineModel = require('../../../models/routineModel');
      let existing = null;
      if (targetId) {
        try {
          existing = await RoutineModel.getById(targetId, context.userId);
        } catch (_) {}
      }

      if (!existing && queryStr) {
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: queryStr,
          date: input?.newDate ? TemporalContext.resolveTargetDate(input.newDate, timezone) : null,
          timezone
        });
        if (matches.length > 1) {
          const candidates = matches.map(m => ({
            eventId: m.id,
            title: m.title,
            date: m.target_date || m.date || 'Today',
            time: formatEventTime(m.start_time || m.time, context.timeFormat),
            rawTime: m.start_time || m.time,
            timezone
          }));
          const countWord = matches.length === 2 ? 'two' : `${matches.length}`;
          const speech = `I found ${countWord} matching events for "${queryStr}". Which one would you like me to update?`;
          const candidateList = candidates.map(c => `• **${c.title}** on ${c.date} at ${c.time} (ID: \`${c.eventId}\`)`).join('\n');
          const message = `⚠️ **Clarification needed:**\nI found ${matches.length} matching events:\n${candidateList}\n\nWhich one would you like me to update?`;
          return {
            success: false,
            requiresClarification: true,
            candidates,
            speech,
            message
          };
        } else if (matches.length === 1) {
          targetId = matches[0].id;
          existing = matches[0];
        }
      }

      if (!targetId) {
        throw new Error('Please specify which event to update.');
      }

      const updateData = {};
      const newTimeVal = input?.newTime || input?.targetTime || input?.time;
      if (newTimeVal) updateData.time = newTimeVal;
      if (input?.newDate || input?.targetDate) updateData.date = TemporalContext.resolveTargetDate(input.newDate || input.targetDate, timezone);
      if (input?.newTitle || input?.title) updateData.title = input.newTitle || input.title;

      const result = await CalendarService.updateEvent(context.userId, targetId, updateData);
      const formattedTime = formatEventTime(result.event.time, context.timeFormat);
      const emoji = getEventEmoji(result.event);
      const message = `🔄 **Updated!** ${emoji} **${result.event.title}** moved to **${formattedTime}**${updateData.date ? ` on **${updateData.date}**` : ''}.`;
      const speech = `Done. I've updated "${result.event.title}" to ${formattedTime}${updateData.date ? ` on ${updateData.date}` : ''}.`;

      return {
        success: true,
        event: result.event,
        eventId: result.event.id,
        entityId: result.event.id,
        reminderId: result.event.id,
        scheduleId: result.event.id,
        title: result.event.title,
        date: updateData.date || result.event.target_date || result.event.date,
        time: result.event.time,
        formattedTime,
        timezone,
        triggerAtMillis: result.triggerAtMillis,
        action: 'RESCHEDULE_EVENT',
        status: 'UPDATED',
        message,
        speech
      };
    }
  },

  {
    name: 'calendar_delete_event',
    description: 'Cancel or delete an event or task from the authoritative calendar and cancel its OS alarm (e.g. "Cancel my meeting", "Delete the tea break").',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Exact event ID to cancel' },
        query: { type: 'string', description: 'Name or description of event to cancel if ID not provided' },
        date: { type: 'string', description: 'Target date (optional)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.eventId || input?.scheduleId || input?.reminderId;
      const queryStr = input?.query || input?.titleQuery;

      // If targetId is actually a time string (e.g. "10:00 AM", "10 AM", "3 PM"), treat as time filter
      let targetTimeFilter = null;
      if (targetId && (targetId.includes(':') || /\b(am|pm)\b/i.test(targetId))) {
        targetTimeFilter = targetId;
        targetId = null;
      }

      const combinedStr = `${input?.time || ''} ${targetTimeFilter || ''} ${queryStr || ''} ${input?.rawText || ''} ${context?.canonicalRequest?.cleanedCommand || ''} ${context?.canonicalRequest?.rawTranscript || ''} ${input?.eventId || ''}`.toLowerCase();

      // Check if resolving a pending clarification from previous turn
      const { activeTaskManager } = require('../tasks/ActiveTaskManager');
      const activeTask = context.sessionId ? activeTaskManager.getActiveTask(context.sessionId, context.userId) : null;
      const pendingCandidates = context.workingMemory?.pendingClarification?.candidates || 
                                (activeTask?.type === 'PENDING_CLARIFICATION' ? activeTask.candidates : []) || [];
      if (!targetId && pendingCandidates.length > 0) {
        const parsedTargetMins = parseTimeToMins(combinedStr);
        if (parsedTargetMins !== null) {
          const matched = pendingCandidates.filter(c => {
            const cMins = parseTimeToMins(c.rawTime || c.time);
            return cMins === parsedTargetMins;
          });
          if (matched.length === 1) {
            targetId = matched[0].eventId;
          }
        }
        if (!targetId) {
          if (/\b(first|1st|morning)\b/i.test(combinedStr) && pendingCandidates[0]) {
            targetId = pendingCandidates[0].eventId;
          } else if (/\b(second|2nd|afternoon)\b/i.test(combinedStr) && pendingCandidates[1]) {
            targetId = pendingCandidates[1].eventId;
          }
        }
        if (!targetId) {
          const matchById = pendingCandidates.find(c => combinedStr.includes(c.eventId.toLowerCase()));
          if (matchById) {
            targetId = matchById.eventId;
          }
        }
      }

      const RoutineModel = require('../../../models/routineModel');
      let existing = null;
      if (targetId) {
        try {
          existing = await RoutineModel.getById(targetId, context.userId);
        } catch (_) {}
      }

      if (!existing && queryStr) {
        let matches = await CalendarService.findRelevantEvent(context.userId, {
          query: queryStr,
          date: input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : null,
          timezone
        });

        if (matches.length > 1) {
          // Disambiguate if a specific time is mentioned in input, eventId or query
          const parsedTargetMins = parseTimeToMins(combinedStr);
          if (parsedTargetMins !== null) {
            const matchingCandidates = matches.filter(m => {
              const mMins = parseTimeToMins(m.start_time || m.time);
              return mMins === parsedTargetMins;
            });
            if (matchingCandidates.length === 1) {
              targetId = matchingCandidates[0].id;
              existing = matchingCandidates[0];
              matches = matchingCandidates;
            }
          }
        }

        if (matches.length > 1) {
          const candidates = matches.map(m => ({
            eventId: m.id,
            title: m.title,
            date: m.target_date || m.date || 'Today',
            time: formatEventTime(m.start_time || m.time, context.timeFormat),
            rawTime: m.start_time || m.time,
            timezone
          }));
          const countWord = matches.length === 2 ? 'two' : `${matches.length}`;
          const speech = `I found ${countWord} ${queryStr} appointments. Which one would you like me to cancel?`;
          const candidateList = candidates.map(c => `• **${c.title}** on ${c.date} at ${c.time} (ID: \`${c.eventId}\`)`).join('\n');
          const message = `⚠️ **Clarification needed:**\nI found ${matches.length} matching events:\n${candidateList}\n\nWhich one would you like me to cancel?`;
          return {
            success: false,
            requiresClarification: true,
            candidates,
            speech,
            message
          };
        } else if (matches.length === 1) {
          targetId = matches[0].id;
          existing = matches[0];
        }
      }

      if (!targetId) {
        const itemLabel = queryStr || 'matching item';
        return {
          success: false,
          requiresClarification: false,
          error: 'EVENT_NOT_FOUND',
          speech: `I couldn't find a ${itemLabel} on your schedule to cancel.`,
          message: `I couldn't find a ${itemLabel} on your schedule to cancel.`
        };
      }

      const result = await CalendarService.cancelEvent(context.userId, targetId);
      if (context.workingMemory?.pendingClarification) {
        delete context.workingMemory.pendingClarification;
      }
      const message = `🗑️ **Cancelled!** "${result.cancelledEvent.title}" has been removed from your calendar.`;
      const speech = `Done. I've cancelled "${result.cancelledEvent.title}".`;
      return {
        success: true,
        cancelledEvent: result.cancelledEvent,
        eventId: targetId,
        entityId: targetId,
        reminderId: targetId,
        title: result.cancelledEvent.title,
        date: result.cancelledEvent.target_date || result.cancelledEvent.date,
        time: result.cancelledEvent.time,
        timezone,
        action: 'CANCEL_EVENT',
        status: 'CANCELLED',
        message,
        speech
      };
    }
  },

  {
    name: 'calendar_complete_event',
    description: 'Mark a calendar event or routine as completed (e.g. "I finished breakfast", "Mark workout complete", "Done with exercise").',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Exact event ID if known' },
        query: { type: 'string', description: 'Name of the task/routine to mark completed (e.g. "breakfast", "exercise")' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.eventId;

      if (!targetId && input?.query) {
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: input.query,
          timezone
        });
        if (matches.length === 0) {
          throw new Error(`I couldn't find an event matching "${input.query}".`);
        }
        targetId = matches[0].id;
      }

      if (!targetId) {
        throw new Error('Please specify which event you completed.');
      }

      const completed = await CalendarService.completeEvent(context.userId, targetId);
      const emoji = getEventEmoji(completed);
      const message = `🎉 **Awesome!** Marked ${emoji} **${completed.title}** as completed! ✅`;
      const speech = `Great job! I've marked "${completed.title}" as completed.`;
      return {
        success: true,
        event: completed,
        message,
        speech
      };
    }
  },

  {
    name: 'calendar_skip_event',
    description: 'Mark a calendar event or routine as skipped for today without modifying recurring templates (e.g. "Skip lunch today", "Skip exercise today").',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Exact event ID if known' },
        query: { type: 'string', description: 'Name of the task/routine to skip (e.g. "lunch", "workout")' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.eventId;

      if (!targetId && input?.query) {
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: input.query,
          timezone
        });
        if (matches.length === 0) {
          throw new Error(`I couldn't find an event matching "${input.query}".`);
        }
        targetId = matches[0].id;
      }

      if (!targetId) {
        throw new Error('Please specify which event to skip.');
      }

      const skipped = await CalendarService.skipEvent(context.userId, targetId);
      const emoji = getEventEmoji(skipped);
      const message = `⏭️ **Understood.** Skipped ${emoji} **${skipped.title}** for today.`;
      const speech = `Understood. I've skipped "${skipped.title}" for today.`;
      return {
        success: true,
        event: skipped,
        message,
        speech
      };
    }
  },

  {
    name: 'calendar_check_conflicts',
    description: 'Check for schedule conflicts with a proposed time and duration.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['time'],
      properties: {
        time: { type: 'string', description: 'Proposed time e.g. "01:00 PM", "1 PM"' },
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format (optional, defaults to today)' },
        durationMinutes: { type: 'number', description: 'Duration in minutes (defaults to 45)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : TemporalContext.resolve(timezone).currentDate;
      const res = await CalendarService.detectConflicts(context.userId, targetDate, input.time, input.durationMinutes || 45);

      return {
        success: true,
        hasConflict: res.hasConflict,
        conflictCount: res.conflictCount,
        conflictingEvents: res.conflictingEvents,
        message: res.hasConflict
          ? `You have a conflict with "${res.conflictingEvents[0].title}" at ${res.conflictingEvents[0].time}.`
          : `That time slot is completely open.`
      };
    }
  },

  {
    name: 'calendar_get_routines',
    description: 'Retrieve all recurring routine templates configured for this user.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const templates = await RoutineTemplateModel.getByUser(context.userId);
      return {
        success: true,
        count: templates.length,
        routines: templates,
        message: `You have ${templates.length} recurring routine templates.`
      };
    }
  },

  {
    name: 'calendar_create_routine',
    description: 'Create a new recurring routine template that repeats on specified weekdays (e.g. "every weekday", "every Saturday").',
    category: 'schedule',
    permissionKey: 'create_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['title', 'startTime'],
      properties: {
        title: { type: 'string', description: 'Title of recurring routine' },
        startTime: { type: 'string', description: 'Start time e.g. "06:30 AM", "06:30"' },
        endTime: { type: 'string', description: 'End time e.g. "07:00 AM"' },
        weekdayMask: { type: 'string', description: 'Comma-separated days: 1,2,3,4,5 (Mon-Fri), 6 (Sat), 0 (Sun), 0,1,2,3,4,5,6 (Everyday)' },
        category: { type: 'string', description: 'Category e.g. sleep, meal, work, exercise, break, personal' }
      }
    },
    execute: async (context, input) => {
      const created = await RoutineTemplateModel.create({
        userId: context.userId,
        title: input.title,
        startTime: CalendarService.normalizeTime(input.startTime),
        endTime: input.endTime ? CalendarService.normalizeTime(input.endTime) : null,
        weekdayMask: input.weekdayMask || '1,2,3,4,5',
        category: input.category || 'routine',
        timezone: context.timezone || 'UTC'
      });
      return {
        success: true,
        routine: created,
        message: `Done. I've created your recurring routine "${created.title}" at ${created.start_time}.`
      };
    }
  },

  {
    name: 'calendar_update_routine',
    description: 'Update a recurring routine template (e.g. "Make my wake-up 6:30 every weekday", "Make Saturday wake-up 9").',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'Exact template ID if known' },
        query: { type: 'string', description: 'Title of routine to update e.g. "wake up", "breakfast"' },
        startTime: { type: 'string', description: 'New start time e.g. "06:30", "6:30 AM"' },
        endTime: { type: 'string', description: 'New end time (optional)' },
        weekdayMask: { type: 'string', description: 'Updated weekday mask (optional)' }
      }
    },
    execute: async (context, input) => {
      let targetId = input?.templateId;

      if (!targetId && input?.query) {
        const templates = await RoutineTemplateModel.getByUser(context.userId);
        const q = input.query.toLowerCase().trim();
        const match = templates.find(t => (t.title || '').toLowerCase().includes(q));
        if (!match) {
          throw new Error(`I couldn't find a recurring routine matching "${input.query}".`);
        }
        targetId = match.id;
      }

      if (!targetId) {
        throw new Error('Please specify which recurring routine to update.');
      }

      const updateData = {};
      if (input?.startTime) updateData.startTime = CalendarService.normalizeTime(input.startTime);
      if (input?.endTime) updateData.endTime = CalendarService.normalizeTime(input.endTime);
      if (input?.weekdayMask) updateData.weekdayMask = input.weekdayMask;

      const updated = await CalendarService.updateRoutineTemplate(context.userId, targetId, updateData);
      return {
        success: true,
        routine: updated,
        message: `Done. I've updated your recurring routine "${updated.title}" to ${updated.start_time}.`
      };
    }
  },

  {
    name: 'calendar_delete_routine',
    description: 'Delete a recurring routine template (e.g. "Don\'t exercise on Fridays", "Remove Sunday planning").',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'Exact template ID if known' },
        query: { type: 'string', description: 'Name of the recurring routine to delete' }
      }
    },
    execute: async (context, input) => {
      let targetId = input?.templateId;

      if (!targetId && input?.query) {
        const templates = await RoutineTemplateModel.getByUser(context.userId);
        const q = input.query.toLowerCase().trim();
        const match = templates.find(t => (t.title || '').toLowerCase().includes(q));
        if (!match) {
          throw new Error(`I couldn't find a recurring routine matching "${input.query}".`);
        }
        targetId = match.id;
      }

      if (!targetId) {
        throw new Error('Please specify which recurring routine to delete.');
      }

      await CalendarService.deleteRoutineTemplate(context.userId, targetId);
      return {
        success: true,
        message: `Done. I've removed that recurring routine.`
      };
    }
  },

  // ==========================================
  // LEGACY ALIASES (Routed cleanly through CalendarService)
  // ==========================================

  {
    name: 'get_today_schedule',
    description: 'Retrieve all scheduled routines, meetings, and reminders for today or a specific date.',
    category: 'schedule',
    permissionKey: 'get_schedule',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date in YYYY-MM-DD format (optional, defaults to current date)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : TemporalContext.resolve(timezone).currentDate;
      const agenda = await CalendarService.getAgenda(context.userId, targetDate, timezone);
      const dayCtx = TemporalContext.resolve(timezone, new Date(`${targetDate}T12:00:00Z`));
      const message = formatAgendaSummary(agenda, targetDate, dayCtx.dayOfWeek);

      return {
        success: true,
        date: targetDate,
        count: agenda.length,
        routines: agenda,
        message
      };
    }
  },

  {
    name: 'create_schedule',
    description: 'Create a new daily routine or calendar event for the user.',
    category: 'schedule',
    permissionKey: 'create_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['title', 'time'],
      properties: {
        title: { type: 'string', description: 'Title of the routine' },
        time: { type: 'string', description: 'Start time e.g. "08:00 AM", "05:00 PM"' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        category: { type: 'string', description: 'Category' },
        description: { type: 'string', description: 'Optional detailed description' },
        reminderEnabled: { type: 'boolean', description: 'Whether to trigger audio/banner notification' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const title = (input?.title || '').trim();
      if (!title) throw new Error('Routine title cannot be empty.');
      const rawTime = (input?.time || '').trim();
      if (!rawTime) throw new Error('Routine time cannot be empty. What time should it be scheduled for?');

      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : TemporalContext.resolve(timezone).currentDate;

      const result = await CalendarService.createEvent(context.userId, {
        title,
        time: rawTime,
        date: targetDate,
        category: input?.category || 'custom',
        description: input?.description,
        reminderEnabled: input?.reminderEnabled !== undefined ? Boolean(input.reminderEnabled) : true,
        timezone
      });

      return {
        success: true,
        createdRoutine: result.event,
        reminderId: result.event.id,
        scheduleId: result.event.id,
        title: result.event.title,
        time: result.event.time,
        date: result.event.date,
        triggerAtMillis: result.triggerAtMillis,
        action: 'SCHEDULE_EVENT',
        message: `Successfully scheduled "${result.event.title}" at ${result.event.time} on ${result.event.date}.`
      };
    }
  },

  {
    name: 'create_reminder',
    description: 'Create a persistent, exact-alarm reminder for the user that survives app closure and device reboots.',
    category: 'schedule',
    permissionKey: 'create_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['title', 'time'],
      properties: {
        title: { type: 'string', description: 'What to remind the user about' },
        time: { type: 'string', description: 'Exact time for reminder' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (optional)' },
        description: { type: 'string', description: 'Optional additional reminder details' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const title = (input?.title || '').trim();
      if (!title) throw new Error('Reminder title cannot be empty.');
      const rawTime = (input?.time || '').trim();
      if (!rawTime) throw new Error('Reminder time cannot be empty.');

      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : TemporalContext.resolve(timezone).currentDate;

      const result = await CalendarService.createEvent(context.userId, {
        title,
        time: rawTime,
        date: targetDate,
        category: 'reminder',
        eventType: 'reminder',
        description: input?.description,
        reminderEnabled: true,
        timezone
      });

      return {
        success: true,
        reminderId: result.event.id,
        title: result.event.title,
        time: result.event.time,
        date: result.event.date,
        triggerAtMillis: result.triggerAtMillis,
        action: 'SCHEDULE_REMINDER',
        message: `I've set a reminder to ${title} at ${result.event.time}.`
      };
    }
  },

  {
    name: 'set_reminder',
    description: 'Create a persistent reminder (alias for create_reminder).',
    category: 'schedule',
    permissionKey: 'create_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['title', 'time'],
      properties: {
        title: { type: 'string', description: 'What to remind the user about' },
        time: { type: 'string', description: 'Exact time for reminder' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (optional)' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      const targetDate = input?.date ? TemporalContext.resolveTargetDate(input.date, timezone) : TemporalContext.resolve(timezone).currentDate;
      const result = await CalendarService.createEvent(context.userId, {
        title: input.title,
        time: input.time,
        date: targetDate,
        category: 'reminder',
        eventType: 'reminder',
        reminderEnabled: true,
        timezone
      });
      return {
        success: true,
        reminderId: result.event.id,
        title: result.event.title,
        time: result.event.time,
        date: result.event.date,
        triggerAtMillis: result.triggerAtMillis,
        action: 'SCHEDULE_REMINDER',
        message: `I've set a reminder to ${input.title} at ${result.event.time}.`
      };
    }
  },

  {
    name: 'update_reminder',
    description: 'Update or reschedule an existing persistent reminder.',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['targetTime'],
      properties: {
        reminderId: { type: 'string', description: 'ID of reminder' },
        titleQuery: { type: 'string', description: 'Title of reminder' },
        targetTime: { type: 'string', description: 'New time' },
        targetDate: { type: 'string', description: 'New date' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.reminderId;

      if (!targetId && input?.titleQuery) {
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: input.titleQuery,
          timezone
        });
        if (matches.length > 0) targetId = matches[0].id;
      }

      if (!targetId) {
        // Fallback: most recent reminder
        const today = TemporalContext.resolve(timezone).currentDate;
        const agenda = await CalendarService.getAgenda(context.userId, today, timezone);
        const rems = agenda.filter(e => e.category === 'reminder' || e.eventType === 'reminder');
        if (rems.length > 0) targetId = rems[rems.length - 1].id;
      }

      if (!targetId) throw new Error('Reminder not found to update.');

      const result = await CalendarService.updateEvent(context.userId, targetId, {
        time: input.targetTime,
        date: input?.targetDate ? TemporalContext.resolveTargetDate(input.targetDate, timezone) : undefined
      });

      return {
        success: true,
        reminderId: targetId,
        title: result.event.title,
        time: result.event.time,
        date: result.event.date,
        triggerAtMillis: result.triggerAtMillis,
        action: 'RESCHEDULE_REMINDER',
        message: `Done. I've moved your reminder to ${result.event.time}.`
      };
    }
  },

  {
    name: 'cancel_reminder',
    description: 'Cancel an active reminder by ID or title query.',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        reminderId: { type: 'string', description: 'ID of reminder' },
        titleQuery: { type: 'string', description: 'Title or description of reminder' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.reminderId;

      if (!targetId && (input?.titleQuery || input?.query)) {
        const queryTerm = input.titleQuery || input.query;
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: queryTerm,
          timezone
        });
        if (matches.length > 0) targetId = matches[0].id;
      }

      if (!targetId) {
        return {
          success: false,
          reason: 'NO_MATCHING_REMINDER',
          message: `Please specify which reminder you would like me to cancel.`
        };
      }

      const res = await CalendarService.cancelEvent(context.userId, targetId);
      return {
        success: true,
        reminderId: targetId,
        cancelledTitle: res.cancelledEvent.title,
        action: 'CANCEL_REMINDER',
        message: `Done. I've cancelled your reminder for "${res.cancelledEvent.title}".`
      };
    }
  },

  {
    name: 'move_event',
    description: 'Move or reschedule an event to a new time.',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['targetTime'],
      properties: {
        eventId: { type: 'string', description: 'ID of event' },
        titleQuery: { type: 'string', description: 'Title of event' },
        targetTime: { type: 'string', description: 'New time' },
        targetDate: { type: 'string', description: 'New date' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.eventId;

      if (!targetId && input?.titleQuery) {
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: input.titleQuery,
          timezone
        });
        if (matches.length > 0) targetId = matches[0].id;
      }

      if (!targetId) throw new Error('Event not found to move.');

      const result = await CalendarService.updateEvent(context.userId, targetId, {
        time: input.targetTime,
        date: input?.targetDate ? TemporalContext.resolveTargetDate(input.targetDate, timezone) : undefined
      });

      return {
        success: true,
        updatedEvent: result.event,
        reminderId: targetId,
        triggerAtMillis: result.triggerAtMillis,
        action: 'RESCHEDULE_EVENT',
        message: `Done. I've moved "${result.event.title}" to ${result.event.time}.`
      };
    }
  },

  {
    name: 'cancel_event',
    description: 'Cancel an event by title query or ID.',
    category: 'schedule',
    permissionKey: 'update_schedule',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Event ID' },
        titleQuery: { type: 'string', description: 'Event title' }
      }
    },
    execute: async (context, input) => {
      const timezone = context.timezone || 'UTC';
      let targetId = input?.eventId;

      if (!targetId && input?.titleQuery) {
        const matches = await CalendarService.findRelevantEvent(context.userId, {
          query: input.titleQuery,
          timezone
        });
        if (matches.length > 0) targetId = matches[0].id;
      }

      if (!targetId) throw new Error('Event not found to cancel.');

      const res = await CalendarService.cancelEvent(context.userId, targetId);
      return {
        success: true,
        cancelledEvent: res.cancelledEvent,
        reminderId: targetId,
        action: 'CANCEL_EVENT',
        message: `Done. I've cancelled "${res.cancelledEvent.title}".`
      };
    }
  }
];

module.exports = scheduleTools;
module.exports.scheduleTools = scheduleTools;
module.exports.parseTimeToMinutes = CalendarService.parseTimeToMinutes.bind(CalendarService);
module.exports.formatMinutesToTime = CalendarService.formatMinutesTo12H.bind(CalendarService);
module.exports.calculateTriggerAtMillis = CalendarService.calculateTriggerAtMillis.bind(CalendarService);
