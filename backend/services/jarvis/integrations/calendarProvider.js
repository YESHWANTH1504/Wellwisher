/**
 * Phase 10: Multi-Provider Calendar Integration Architecture
 * Abstract interfaces and safe mock/production providers for Google Calendar, Outlook, and Device Calendars.
 */

class CalendarEvent {
  constructor({
    id,
    userId,
    title,
    startTime,
    endTime,
    date,
    location = '',
    description = '',
    provider = 'MOCK_CALENDAR',
    status = 'CONFIRMED'
  }) {
    this.id = id || `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.userId = userId;
    this.title = title;
    this.startTime = startTime;
    this.endTime = endTime;
    this.date = date;
    this.location = location;
    this.description = description;
    this.provider = provider;
    this.status = status;
  }
}

class CalendarAvailability {
  constructor({ date, startTime, endTime, durationMinutes = 30 }) {
    this.date = date;
    this.startTime = startTime;
    this.endTime = endTime;
    this.durationMinutes = durationMinutes;
  }
}

class CalendarConflict {
  constructor({ existingEvent, conflictingItem, conflictReason }) {
    this.existingEvent = existingEvent;
    this.conflictingItem = conflictingItem;
    this.conflictReason = conflictReason;
  }
}

class CalendarProvider {
  /**
   * List calendar events within a date range or specific date.
   */
  async listEvents(userId, { startDate, endDate, date } = {}) {
    return [];
  }

  /**
   * Get single event by ID.
   */
  async getEvent(userId, eventId) {
    return null;
  }

  /**
   * Find available time windows for appointments.
   */
  async findAvailability(userId, { date, durationMinutes = 30, workHoursOnly = true } = {}) {
    return [];
  }

  /**
   * Create an event (Requires User Confirmation).
   */
  async createEvent(userId, eventData = {}) {
    throw new Error('createEvent must be implemented by concrete provider');
  }

  /**
   * Update an event (Requires User Confirmation).
   */
  async updateEvent(userId, eventId, eventData = {}) {
    throw new Error('updateEvent must be implemented by concrete provider');
  }

  /**
   * Delete an event (Requires User Confirmation).
   */
  async deleteEvent(userId, eventId) {
    throw new Error('deleteEvent must be implemented by concrete provider');
  }

  /**
   * Detect conflicts between proposed time and existing events.
   */
  async detectConflicts(userId, { date, startTime, endTime, excludeEventId } = {}) {
    const events = await this.listEvents(userId, { date });
    const conflicts = [];

    for (const ev of events) {
      if (excludeEventId && ev.id === excludeEventId) continue;
      // Overlap condition: (StartA < EndB) and (EndA > StartB)
      if (this._timeToMinutes(startTime) < this._timeToMinutes(ev.endTime) &&
          this._timeToMinutes(endTime) > this._timeToMinutes(ev.startTime)) {
        conflicts.push(new CalendarConflict({
          existingEvent: ev,
          conflictingItem: { date, startTime, endTime },
          conflictReason: `Time overlaps with existing event: "${ev.title}" (${ev.startTime} - ${ev.endTime})`
        }));
      }
    }
    return conflicts;
  }

  _timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const clean = timeStr.trim();
    // Check 12-hour format with AM/PM
    const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12) {
      let hours = parseInt(match12[1], 10);
      const minutes = parseInt(match12[2], 10);
      const period = (match12[3] || '').toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }
    return 0;
  }
}

class GoogleCalendarProvider extends CalendarProvider {
  constructor(authConfig = {}) {
    super();
    this.authConfig = authConfig;
    this.name = 'GOOGLE_CALENDAR';
  }

  async listEvents(userId, options) {
    // In test/demo without live OAuth credentials, delegate safely to mock store
    return defaultMockCalendarProvider.listEvents(userId, options);
  }

  async createEvent(userId, eventData) {
    return defaultMockCalendarProvider.createEvent(userId, { ...eventData, provider: 'GOOGLE_CALENDAR' });
  }

  async updateEvent(userId, eventId, eventData) {
    return defaultMockCalendarProvider.updateEvent(userId, eventId, eventData);
  }

  async deleteEvent(userId, eventId) {
    return defaultMockCalendarProvider.deleteEvent(userId, eventId);
  }
}

class OutlookCalendarProvider extends CalendarProvider {
  constructor(authConfig = {}) {
    super();
    this.authConfig = authConfig;
    this.name = 'OUTLOOK_CALENDAR';
  }

  async listEvents(userId, options) {
    return defaultMockCalendarProvider.listEvents(userId, options);
  }

  async createEvent(userId, eventData) {
    return defaultMockCalendarProvider.createEvent(userId, { ...eventData, provider: 'OUTLOOK_CALENDAR' });
  }

  async updateEvent(userId, eventId, eventData) {
    return defaultMockCalendarProvider.updateEvent(userId, eventId, eventData);
  }

  async deleteEvent(userId, eventId) {
    return defaultMockCalendarProvider.deleteEvent(userId, eventId);
  }
}

class DeviceCalendarProvider extends CalendarProvider {
  constructor() {
    super();
    this.name = 'DEVICE_CALENDAR';
  }

  async listEvents(userId, options) {
    return defaultMockCalendarProvider.listEvents(userId, options);
  }

  async createEvent(userId, eventData) {
    return defaultMockCalendarProvider.createEvent(userId, { ...eventData, provider: 'DEVICE_CALENDAR' });
  }

  async updateEvent(userId, eventId, eventData) {
    return defaultMockCalendarProvider.updateEvent(userId, eventId, eventData);
  }

  async deleteEvent(userId, eventId) {
    return defaultMockCalendarProvider.deleteEvent(userId, eventId);
  }
}

class MockCalendarProvider extends CalendarProvider {
  constructor() {
    super();
    this.eventsStore = new Map(); // userId -> Array<CalendarEvent>
  }

  _getUserEvents(userId) {
    if (!this.eventsStore.has(userId)) {
      // Seed default events for mock testing
      this.eventsStore.set(userId, [
        new CalendarEvent({
          id: `seed_ev_1_${userId}`,
          userId,
          title: 'Morning Routine & Check-in',
          startTime: '08:00 AM',
          endTime: '08:45 AM',
          date: '2026-08-21',
          location: 'Home',
          provider: 'MOCK_CALENDAR'
        }),
        new CalendarEvent({
          id: `seed_ev_2_${userId}`,
          userId,
          title: 'Team Strategy Sync',
          startTime: '11:00 AM',
          endTime: '12:00 PM',
          date: '2026-08-21',
          location: 'Office / Video Call',
          provider: 'MOCK_CALENDAR'
        })
      ]);
    }
    return this.eventsStore.get(userId);
  }

  async listEvents(userId, { startDate, endDate, date } = {}) {
    const list = this._getUserEvents(userId);
    if (date) {
      return list.filter(e => e.date === date);
    }
    if (startDate && endDate) {
      return list.filter(e => e.date >= startDate && e.date <= endDate);
    }
    return [...list];
  }

  async getEvent(userId, eventId) {
    const list = this._getUserEvents(userId);
    return list.find(e => e.id === eventId) || null;
  }

  async findAvailability(userId, { date, durationMinutes = 30, workHoursOnly = true } = {}) {
    const targetDate = date || '2026-08-21';
    const events = await this.listEvents(userId, { date: targetDate });

    // Standard business hours: 09:00 AM (540m) to 05:00 PM (1020m)
    const dayStart = 9 * 60;
    const dayEnd = 17 * 60;
    const busyIntervals = events.map(e => ({
      start: this._timeToMinutes(e.startTime),
      end: this._timeToMinutes(e.endTime)
    })).sort((a, b) => a.start - b.start);

    const availableSlots = [];
    let currentCursor = dayStart;

    for (const interval of busyIntervals) {
      if (interval.start - currentCursor >= durationMinutes) {
        availableSlots.push(new CalendarAvailability({
          date: targetDate,
          startTime: this._minutesToTime(currentCursor),
          endTime: this._minutesToTime(interval.start),
          durationMinutes: interval.start - currentCursor
        }));
      }
      currentCursor = Math.max(currentCursor, interval.end);
    }

    if (dayEnd - currentCursor >= durationMinutes) {
      availableSlots.push(new CalendarAvailability({
        date: targetDate,
        startTime: this._minutesToTime(currentCursor),
        endTime: this._minutesToTime(dayEnd),
        durationMinutes: dayEnd - currentCursor
      }));
    }

    return availableSlots;
  }

  async createEvent(userId, eventData = {}) {
    const list = this._getUserEvents(userId);
    const newEvent = new CalendarEvent({
      id: eventData.id || `cal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title: eventData.title || 'Untitled Event',
      startTime: eventData.startTime || '10:00 AM',
      endTime: eventData.endTime || '11:00 AM',
      date: eventData.date || '2026-08-21',
      location: eventData.location || '',
      description: eventData.description || '',
      provider: eventData.provider || 'MOCK_CALENDAR'
    });
    list.push(newEvent);
    return { success: true, event: newEvent };
  }

  async updateEvent(userId, eventId, eventData = {}) {
    const list = this._getUserEvents(userId);
    const index = list.findIndex(e => e.id === eventId);
    if (index === -1) return { success: false, error: 'Event not found' };

    const existing = list[index];
    list[index] = new CalendarEvent({
      id: existing.id,
      userId,
      title: eventData.title || existing.title,
      startTime: eventData.startTime || existing.startTime,
      endTime: eventData.endTime || existing.endTime,
      date: eventData.date || existing.date,
      location: eventData.location !== undefined ? eventData.location : existing.location,
      description: eventData.description !== undefined ? eventData.description : existing.description,
      provider: existing.provider
    });
    return { success: true, event: list[index] };
  }

  async deleteEvent(userId, eventId) {
    const list = this._getUserEvents(userId);
    const prev = list.length;
    const filtered = list.filter(e => e.id !== eventId);
    this.eventsStore.set(userId, filtered);
    return { success: filtered.length < prev };
  }

  clearAll(userId) {
    if (userId) {
      this.eventsStore.delete(userId);
    } else {
      this.eventsStore.clear();
    }
  }

  _minutesToTime(mins) {
    let hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hStr}:${mStr} ${period}`;
  }
}

/**
 * Authoritative MySQL Calendar Provider for Project JARVIS (Phase 5.1 Hardened)
 * Directly binds to authoritative MySQL routines table, eliminating mock and in-memory calendar stores.
 */
class MySQLCalendarProvider extends CalendarProvider {
  constructor() {
    super();
    this.RoutineModel = require('../../../models/routineModel');
  }

  async listEvents(userId, { startDate, endDate, date } = {}) {
    if (!userId) return [];
    let rows = [];
    if (date) {
      rows = await this.RoutineModel.getByDate(userId, date);
    } else if (startDate && endDate) {
      rows = await this.RoutineModel.getByDateRange(userId, startDate, endDate);
    } else {
      const today = new Date().toISOString().split('T')[0];
      rows = await this.RoutineModel.getByDate(userId, today);
    }
    return (rows || []).map(r => new CalendarEvent({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      startTime: r.time,
      endTime: r.end_time || r.time,
      date: r.date,
      location: r.description || '',
      description: r.description || '',
      provider: 'MYSQL_ROUTINES',
      status: r.status || 'CONFIRMED'
    }));
  }

  async getEvent(userId, eventId) {
    if (!userId || !eventId) return null;
    const r = await this.RoutineModel.getById(eventId, userId);
    if (!r) return null;
    return new CalendarEvent({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      startTime: r.time,
      endTime: r.end_time || r.time,
      date: r.date,
      location: r.description || '',
      description: r.description || '',
      provider: 'MYSQL_ROUTINES',
      status: r.status || 'CONFIRMED'
    });
  }

  async createEvent(userId, eventData = {}) {
    const today = new Date().toISOString().split('T')[0];
    const created = await this.RoutineModel.create({
      id: eventData.id,
      userId,
      title: eventData.title || 'Untitled Event',
      time: eventData.startTime || eventData.time || '10:00 AM',
      endTime: eventData.endTime || null,
      date: eventData.date || today,
      description: eventData.description || eventData.location || '',
      category: 'calendar',
      eventType: 'event',
      source: 'jarvis_workflow'
    });
    return {
      success: true,
      event: new CalendarEvent({
        id: created.id,
        userId,
        title: created.title,
        startTime: created.time,
        endTime: created.end_time || created.time,
        date: created.date,
        location: created.description,
        provider: 'MYSQL_ROUTINES'
      })
    };
  }

  async updateEvent(userId, eventId, eventData = {}) {
    const updated = await this.RoutineModel.update(eventId, userId, {
      title: eventData.title,
      time: eventData.startTime || eventData.time,
      endTime: eventData.endTime,
      date: eventData.date,
      description: eventData.description || eventData.location
    });
    if (!updated) return { success: false, error: 'Event not found or update failed' };
    return {
      success: true,
      event: new CalendarEvent({
        id: updated.id,
        userId,
        title: updated.title,
        startTime: updated.time,
        endTime: updated.end_time || updated.time,
        date: updated.date,
        location: updated.description,
        provider: 'MYSQL_ROUTINES'
      })
    };
  }

  async deleteEvent(userId, eventId) {
    const deleted = await this.RoutineModel.delete(eventId, userId);
    return { success: Boolean(deleted) };
  }

  async findAvailability(userId, { date, durationMinutes = 30 } = {}) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const events = await this.listEvents(userId, { date: targetDate });

    const dayStart = 9 * 60;
    const dayEnd = 17 * 60;
    const busyIntervals = events.map(e => ({
      start: this._timeToMinutes(e.startTime),
      end: this._timeToMinutes(e.endTime)
    })).sort((a, b) => a.start - b.start);

    const availableSlots = [];
    let currentCursor = dayStart;

    for (const interval of busyIntervals) {
      if (interval.start - currentCursor >= durationMinutes) {
        availableSlots.push(new CalendarAvailability({
          date: targetDate,
          startTime: this._minutesToTime(currentCursor),
          endTime: this._minutesToTime(interval.start),
          durationMinutes: interval.start - currentCursor
        }));
      }
      currentCursor = Math.max(currentCursor, interval.end);
    }

    if (dayEnd - currentCursor >= durationMinutes) {
      availableSlots.push(new CalendarAvailability({
        date: targetDate,
        startTime: this._minutesToTime(currentCursor),
        endTime: this._minutesToTime(dayEnd),
        durationMinutes: dayEnd - currentCursor
      }));
    }

    return availableSlots;
  }

  _timeToMinutes(timeStr) {
    if (!timeStr) return 9 * 60;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return 9 * 60;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const p = match[3]?.toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  _minutesToTime(mins) {
    let hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hStr}:${mStr} ${period}`;
  }

  async clearAll(userId) {
    if (userId) {
      try {
        const pool = require('../../../config/db');
        await pool.query('DELETE FROM routines WHERE user_id = ?', [userId]);
      } catch (err) {
        // safe ignore for testing
      }
    }
  }
}

const authoritativeCalendarProvider = new MySQLCalendarProvider();
const defaultMockCalendarProvider = authoritativeCalendarProvider; // Backward compatibility alias

module.exports = {
  CalendarEvent,
  CalendarAvailability,
  CalendarConflict,
  CalendarProvider,
  GoogleCalendarProvider,
  OutlookCalendarProvider,
  DeviceCalendarProvider,
  MockCalendarProvider,
  MySQLCalendarProvider,
  authoritativeCalendarProvider,
  defaultMockCalendarProvider
};
