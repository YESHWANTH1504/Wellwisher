const RoutineModel = require('../../../models/routineModel');
const RoutineTemplateModel = require('../../../models/routineTemplateModel');
const TemporalContext = require('../context/temporalContext');

class CalendarService {
  /**
   * Parse any time string into minutes from midnight (0..1439)
   * Supports: "07:00", "7:00 AM", "7 AM", "12 PM", "noon", "midnight", "19:00", "7:30pm"
   */
  static parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const lower = timeStr.toLowerCase().trim();
    if (lower === 'noon') return 12 * 60;
    if (lower === 'midnight') return 0;

    // Relative offset e.g. "in 30 minutes"
    const relMatch = lower.match(/(?:in\s+)?(\d+)\s*(min|minute|minutes|m|hour|hours|h)\b/i);
    if (relMatch) {
      const num = parseInt(relMatch[1], 10);
      const unit = relMatch[2].toLowerCase();
      const addMinutes = unit.startsWith('h') ? num * 60 : num;
      const now = new Date();
      return (now.getHours() * 60 + now.getMinutes() + addMinutes) % 1440;
    }

    // Standard 12h or 24h
    const match = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!match) return 0;

    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const period = match[3];

    if (period) {
      if (period === 'pm' && hour < 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
    }
    return (hour * 60 + minute) % 1440;
  }

  /**
   * Convert minutes from midnight into 24-hour HH:MM string
   */
  static formatMinutesTo24H(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Convert minutes from midnight into friendly 12-hour AM/PM string
   */
  static formatMinutesTo12H(minutes) {
    let h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, '0')} ${period}`;
  }

  /**
   * Normalize input time string into standard HH:MM (24-hour)
   */
  static normalizeTime(timeStr) {
    const mins = this.parseTimeToMinutes(timeStr);
    return this.formatMinutesTo24H(mins);
  }

  /**
   * Format any Date object or string into canonical YYYY-MM-DD local date string
   */
  static formatDateOnly(d) {
    if (!d) return '';
    if (d instanceof Date) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof d === 'string') {
      return d.split('T')[0].trim();
    }
    return String(d);
  }

  /**
   * Calculate exact trigger timestamp in milliseconds for Android AlarmManager
   */
  static calculateTriggerAtMillis(dateStr, timeStr, timezone = 'UTC') {
    const minutes = this.parseTimeToMinutes(timeStr);
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;

    const date = this.formatDateOnly(dateStr) || this.formatDateOnly(new Date());
    const [y, m, d] = date.split('-').map(Number);

    const target = new Date();
    target.setFullYear(y, m - 1, d);
    target.setHours(hour, minute, 0, 0);

    return target.getTime();
  }

  /**
   * Idempotent initialization of default routines
   */
  static async initializeDefaultRoutines(userId, timezone = 'UTC') {
    if (!userId) throw new Error('Cannot initialize routines without authenticated userId');
    return await RoutineTemplateModel.initializeDefaultRoutines(userId, timezone);
  }

  /**
   * Get Authoritative Agenda for a given date.
   * PURE & IDEMPOTENT:
   * Reading 1 time or 10,000 times produces identical data with 0 duplicates.
   */
  static async getAgenda(userId, dateStr, timezone = 'UTC') {
    if (!userId) throw new Error('Cannot get agenda without authenticated userId');
    const targetDate = this.formatDateOnly(dateStr) || TemporalContext.resolve(timezone).currentDate;

    // 1. Ensure default routines are initialized idempotently
    await this.initializeDefaultRoutines(userId, timezone);

    // 2. Determine target day of week number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const targetDateObj = new Date(`${targetDate}T12:00:00Z`);
    const dayOfWeekNumber = targetDateObj.getUTCDay();

    // 3. Retrieve matching routine templates for this day of the week
    const matchingTemplates = await RoutineTemplateModel.getByWeekday(userId, dayOfWeekNumber);

    // 4. Materialize routine instances idempotently for this date
    for (const tmpl of matchingTemplates) {
      const existing = await RoutineModel.getByTemplateAndDate(userId, tmpl.id, targetDate);
      if (!existing) {
        // Materialize using deterministic instance ID: inst_${template.id}_${targetDate}
        const instanceId = `inst_${tmpl.id}_${targetDate}`;
        try {
          await RoutineModel.create({
            id: instanceId,
            userId,
            title: tmpl.title,
            description: tmpl.title,
            time: tmpl.start_time,
            endTime: tmpl.end_time,
            category: tmpl.category,
            eventType: tmpl.event_type,
            status: 'scheduled',
            date: targetDate,
            timezone,
            isAllDay: false,
            templateId: tmpl.id,
            source: 'routine',
            reminderEnabled: tmpl.reminder_enabled === 1 || tmpl.reminder_enabled === true,
            reminderMinutesBefore: tmpl.reminder_offset || 0,
            priority: 'normal'
          });
        } catch (err) {
          // Ignore unique constraint collision from race conditions
        }
      }
    }

    // 5. Read all active events for this date (where deleted_at IS NULL)
    const events = await RoutineModel.getByDate(userId, targetDate);

    // 6. Sort events strictly chronologically
    events.sort((a, b) => this.parseTimeToMinutes(a.time) - this.parseTimeToMinutes(b.time));

    return events.map(e => ({
      id: e.id,
      userId: e.user_id,
      title: e.title,
      description: e.description || '',
      time: e.time,
      endTime: e.end_time || null,
      formattedTime: this.formatMinutesTo12H(this.parseTimeToMinutes(e.time)),
      category: e.category,
      eventType: e.event_type,
      status: e.status, // 'scheduled', 'completed', 'skipped', 'cancelled'
      date: this.formatDateOnly(e.date),
      timezone: e.timezone || timezone,
      templateId: e.template_id || null,
      source: e.source || 'system',
      reminderEnabled: Boolean(e.reminder_enabled),
      completedAt: e.completed_at || null
    }));
  }

  static async getTodayAgenda(userId, timezone = 'UTC') {
    const today = TemporalContext.resolve(timezone).currentDate;
    return await this.getAgenda(userId, today, timezone);
  }

  static async getTomorrowAgenda(userId, timezone = 'UTC') {
    const tomorrow = TemporalContext.resolve(timezone).resolvedDates.tomorrow;
    return await this.getAgenda(userId, tomorrow, timezone);
  }

  static async getWeekAgenda(userId, startDateStr = null, timezone = 'UTC') {
    const start = startDateStr || TemporalContext.resolve(timezone).currentDate;
    const startMs = new Date(`${start}T12:00:00Z`).getTime();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startMs + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayCtx = TemporalContext.resolve(timezone, new Date(`${dayDate}T12:00:00Z`));
      const agenda = await this.getAgenda(userId, dayDate, timezone);
      days.push({
        date: dayDate,
        dayOfWeek: dayCtx.dayOfWeek,
        dayOfWeekNumber: dayCtx.dayOfWeekNumber,
        isWeekend: dayCtx.isWeekend,
        events: agenda
      });
    }
    return days;
  }

  static async getEventsForDate(userId, dateStr, timezone = 'UTC') {
    return await this.getAgenda(userId, dateStr, timezone);
  }

  /**
   * Get Next Upcoming Event relative to current time
   */
  static async getNextEvent(userId, timezone = 'UTC') {
    const ctx = TemporalContext.resolve(timezone);
    const nowMinutes = this.parseTimeToMinutes(ctx.currentTime);
    const todayAgenda = await this.getAgenda(userId, ctx.currentDate, timezone);

    // Find next event today
    const upcomingToday = todayAgenda.filter(e => {
      if (e.status === 'cancelled' || e.status === 'skipped') return false;
      const evMinutes = this.parseTimeToMinutes(e.time);
      return evMinutes > nowMinutes;
    });

    if (upcomingToday.length > 0) {
      const next = upcomingToday[0];
      const evMinutes = this.parseTimeToMinutes(next.time);
      const diffMinutes = evMinutes - nowMinutes;
      return {
        event: next,
        minutesUntil: diffMinutes,
        relativeDescription: `in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`
      };
    }

    // Check tomorrow's first event
    const tomorrowAgenda = await this.getAgenda(userId, ctx.resolvedDates.tomorrow, timezone);
    const validTomorrow = tomorrowAgenda.filter(e => e.status !== 'cancelled' && e.status !== 'skipped');
    if (validTomorrow.length > 0) {
      const next = validTomorrow[0];
      const evMinutes = this.parseTimeToMinutes(next.time);
      const diffMinutes = (1440 - nowMinutes) + evMinutes;
      return {
        event: next,
        minutesUntil: diffMinutes,
        relativeDescription: `tomorrow at ${next.formattedTime}`
      };
    }

    return null;
  }

  /**
   * Get Current Active Event relative to current time
   */
  static async getCurrentEvent(userId, timezone = 'UTC') {
    const ctx = TemporalContext.resolve(timezone);
    const nowMinutes = this.parseTimeToMinutes(ctx.currentTime);
    const todayAgenda = await this.getAgenda(userId, ctx.currentDate, timezone);

    for (const e of todayAgenda) {
      if (e.status === 'cancelled' || e.status === 'skipped') continue;
      const startM = this.parseTimeToMinutes(e.time);
      const endM = e.endTime ? this.parseTimeToMinutes(e.endTime) : (startM + 45);
      if (nowMinutes >= startM && nowMinutes < endM) {
        return e;
      }
    }
    return null;
  }

  /**
   * Detect conflicts for a proposed time slot
   */
  static async detectConflicts(userId, dateStr, proposedTime, durationMinutes = 45, excludeId = null) {
    const events = await this.getAgenda(userId, dateStr);
    const pStart = this.parseTimeToMinutes(proposedTime);
    const pEnd = pStart + durationMinutes;

    const conflicts = [];
    for (const ev of events) {
      if (excludeId && ev.id === excludeId) continue;
      if (ev.status === 'cancelled' || ev.status === 'skipped') continue;

      const evStart = this.parseTimeToMinutes(ev.time);
      const evEnd = ev.endTime ? this.parseTimeToMinutes(ev.endTime) : (evStart + 45);

      if (Math.max(pStart, evStart) < Math.min(pEnd, evEnd)) {
        conflicts.push(ev);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflictingEvents: conflicts
    };
  }

  /**
   * Create a new custom or one-time calendar event
   */
  static async createEvent(userId, eventData) {
    if (!userId) throw new Error('Cannot create event without authenticated userId');
    const { title, time, date, endTime, category, eventType, description, reminderEnabled, timezone = 'UTC' } = eventData;
    if (!title || !title.trim()) throw new Error('Event title cannot be empty.');
    if (!time || !time.trim()) throw new Error('Event time cannot be empty. What time should it be scheduled for?');

    const dateStr = this.formatDateOnly(date) || TemporalContext.resolve(timezone).currentDate;
    const normalizedTime = this.normalizeTime(time);
    const normalizedEndTime = endTime ? this.normalizeTime(endTime) : null;

    // Check conflicts
    const conflictResult = await this.detectConflicts(userId, dateStr, normalizedTime, 45);

    const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await RoutineModel.create({
      id: eventId,
      userId,
      title: title.trim(),
      description: description || '',
      time: normalizedTime,
      endTime: normalizedEndTime,
      category: category || 'personal',
      eventType: eventType || 'task',
      status: 'scheduled',
      date: dateStr,
      timezone,
      isAllDay: false,
      templateId: null,
      source: 'manual',
      reminderEnabled: reminderEnabled !== undefined ? Boolean(reminderEnabled) : true,
      priority: 'normal'
    });

    const triggerAtMillis = this.calculateTriggerAtMillis(dateStr, normalizedTime, timezone);

    console.log(`[CALENDAR_CREATE] userId=${userId} eventId=${created.id} title="${created.title}" time=${created.time} date=${created.date} result=SUCCESS`);

    return {
      event: created,
      triggerAtMillis,
      conflictWarning: conflictResult.hasConflict ? {
        message: `You already have "${conflictResult.conflictingEvents[0].title}" scheduled at ${conflictResult.conflictingEvents[0].time}.`,
        conflictingEvents: conflictResult.conflictingEvents
      } : null
    };
  }

  /**
   * Update an existing event by ID
   */
  static async updateEvent(userId, eventId, updateData) {
    if (!userId || !eventId) throw new Error('Both userId and eventId are required to update an event');
    const existing = await RoutineModel.getById(eventId, userId);
    if (!existing) {
      throw new Error(`Event with ID "${eventId}" was not found.`);
    }

    const newTime = updateData.time ? this.normalizeTime(updateData.time) : existing.time;
    const newEndTime = updateData.endTime ? this.normalizeTime(updateData.endTime) : existing.end_time;
    const existingDate = this.formatDateOnly(existing.date);
    const newDate = updateData.date ? this.formatDateOnly(updateData.date) : existingDate;

    const updated = await RoutineModel.update(eventId, userId, {
      ...updateData,
      time: newTime,
      endTime: newEndTime,
      date: newDate
    });

    const triggerAtMillis = this.calculateTriggerAtMillis(newDate, newTime, existing.timezone || 'UTC');

    console.log(`[CALENDAR_UPDATE] userId=${userId} eventId=${eventId} oldTime=${existing.time} newTime=${newTime} result=SUCCESS`);

    return {
      event: updated,
      triggerAtMillis
    };
  }

  /**
   * Cancel an event by ID
   */
  static async cancelEvent(userId, eventId) {
    if (!userId || !eventId) throw new Error('Both userId and eventId are required to cancel an event');
    const existing = await RoutineModel.getById(eventId, userId);
    if (!existing) {
      throw new Error(`Event with ID "${eventId}" was not found.`);
    }

    await RoutineModel.softDelete(eventId, userId);

    console.log(`[CALENDAR_DELETE] userId=${userId} eventId=${eventId} title="${existing.title}" result=SUCCESS`);

    return {
      success: true,
      cancelledEvent: { ...existing, status: 'cancelled' }
    };
  }

  /**
   * Mark an event completed
   */
  static async completeEvent(userId, eventId) {
    if (!userId || !eventId) throw new Error('Both userId and eventId are required to complete an event');
    const existing = await RoutineModel.getById(eventId, userId);
    if (!existing) {
      throw new Error(`Event with ID "${eventId}" was not found.`);
    }

    const completedAt = new Date();
    const updated = await RoutineModel.setStatus(eventId, userId, 'completed', completedAt);

    console.log(`[CALENDAR_COMPLETE] userId=${userId} eventId=${eventId} completedAt=${completedAt.toISOString()} result=SUCCESS`);

    return updated;
  }

  /**
   * Mark an event skipped
   */
  static async skipEvent(userId, eventId) {
    if (!userId || !eventId) throw new Error('Both userId and eventId are required to skip an event');
    const existing = await RoutineModel.getById(eventId, userId);
    if (!existing) {
      throw new Error(`Event with ID "${eventId}" was not found.`);
    }

    const updated = await RoutineModel.setStatus(eventId, userId, 'skipped', null);

    console.log(`[CALENDAR_SKIP] userId=${userId} eventId=${eventId} result=SUCCESS`);

    return updated;
  }

  /**
   * Find relevant event using conversational context or semantic queries
   */
  static async findRelevantEvent(userId, { query, eventId, date, timezone = 'UTC' }) {
    if (eventId) {
      const ev = await RoutineModel.getById(eventId, userId);
      if (ev) return [ev];
    }

    const targetDate = this.formatDateOnly(date) || TemporalContext.resolve(timezone).currentDate;
    const agenda = await this.getAgenda(userId, targetDate, timezone);

    if (!query || !query.trim()) return agenda;

    const q = query.toLowerCase().trim();
    return agenda.filter(ev => {
      const t = (ev.title || '').toLowerCase();
      const c = (ev.category || '').toLowerCase();
      const d = (ev.description || '').toLowerCase();
      const tm = (ev.time || '').toLowerCase();
      if (t.includes(q) || c.includes(q) || d.includes(q) || tm.includes(q)) return true;

      // Semantic associations
      if (q === 'workout' && t.includes('exercise')) return true;
      if (q === 'exercise' && (t.includes('workout') || t.includes('walk'))) return true;
      if (q === 'tea' && (t.includes('tea') || t.includes('hydration'))) return true;
      if (q === 'break' && (t.includes('break') || t.includes('hydration') || t.includes('tea'))) return true;
      if (q === 'work' && (t.includes('login') || t.includes('logout') || t.includes('commute'))) return true;
      return false;
    });
  }

  /**
   * Update a recurring routine template (e.g. "every weekday")
   */
  static async updateRoutineTemplate(userId, templateId, updateData) {
    if (!userId || !templateId) throw new Error('Both userId and templateId are required to update a routine template');
    const updated = await RoutineTemplateModel.update(templateId, userId, updateData);
    console.log(`[ROUTINE_TEMPLATE_UPDATE] userId=${userId} templateId=${templateId} result=SUCCESS`);
    return updated;
  }

  /**
   * Delete a recurring routine template
   */
  static async deleteRoutineTemplate(userId, templateId) {
    if (!userId || !templateId) throw new Error('Both userId and templateId are required to delete a routine template');
    const success = await RoutineTemplateModel.softDelete(templateId, userId);
    console.log(`[ROUTINE_TEMPLATE_DELETE] userId=${userId} templateId=${templateId} result=SUCCESS`);
    return success;
  }
}

module.exports = CalendarService;
