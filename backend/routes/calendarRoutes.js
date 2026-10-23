const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const RoutineTemplateModel = require('../models/routineTemplateModel');
const TemporalContext = require('../services/jarvis/context/temporalContext');

// Apply JWT authentication to all calendar routes
router.use(verifyToken);

/**
 * GET /api/jarvis/calendar/today
 * Retrieve today's complete authoritative agenda
 */
router.get('/today', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const timezone = req.query.timezone || 'UTC';
    const agenda = await CalendarService.getTodayAgenda(userId, timezone);
    const ctx = TemporalContext.resolve(timezone);

    res.json({
      success: true,
      date: ctx.currentDate,
      dayOfWeek: ctx.dayOfWeek,
      dayOfWeekNumber: ctx.dayOfWeekNumber,
      isWeekend: ctx.isWeekend,
      isWorkingDay: ctx.isWorkingDay,
      count: agenda.length,
      events: agenda
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jarvis/calendar/date/:date
 * Retrieve authoritative agenda for a specific date (YYYY-MM-DD or relative like 'tomorrow')
 */
router.get('/date/:date', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const timezone = req.query.timezone || 'UTC';
    const targetDate = TemporalContext.resolveTargetDate(req.params.date, timezone);
    const agenda = await CalendarService.getAgenda(userId, targetDate, timezone);
    const dayCtx = TemporalContext.resolve(timezone, new Date(`${targetDate}T12:00:00Z`));

    res.json({
      success: true,
      date: targetDate,
      dayOfWeek: dayCtx.dayOfWeek,
      dayOfWeekNumber: dayCtx.dayOfWeekNumber,
      isWeekend: dayCtx.isWeekend,
      isWorkingDay: dayCtx.isWorkingDay,
      count: agenda.length,
      events: agenda
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jarvis/calendar/week
 * Retrieve 7-day weekly schedule
 */
router.get('/week', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const timezone = req.query.timezone || 'UTC';
    const startDate = req.query.startDate ? TemporalContext.resolveTargetDate(req.query.startDate, timezone) : null;
    const week = await CalendarService.getWeekAgenda(userId, startDate, timezone);

    res.json({
      success: true,
      week
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jarvis/calendar/next
 * Get the next upcoming event
 */
router.get('/next', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const timezone = req.query.timezone || 'UTC';
    const nextEvent = await CalendarService.getNextEvent(userId, timezone);

    res.json({
      success: true,
      hasNextEvent: Boolean(nextEvent),
      data: nextEvent
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/jarvis/calendar/events
 * Create a new calendar event or task
 */
router.post('/events', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const timezone = req.body.timezone || req.query.timezone || 'UTC';
    const { title, time, date, endTime, category, eventType, description, reminderEnabled } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'TITLE_REQUIRED', message: 'Event title is required.' });
    }
    if (!time || !time.trim()) {
      return res.status(400).json({ success: false, error: 'TIME_REQUIRED', message: 'Event time is required.' });
    }

    const result = await CalendarService.createEvent(userId, {
      title,
      time,
      date,
      endTime,
      category,
      eventType,
      description,
      reminderEnabled,
      timezone
    });

    res.status(201).json({
      success: true,
      event: result.event,
      triggerAtMillis: result.triggerAtMillis,
      conflictWarning: result.conflictWarning
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/jarvis/calendar/events/:id
 * Update an existing event
 */
router.patch('/events/:id', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const eventId = req.params.id;
    const result = await CalendarService.updateEvent(userId, eventId, req.body);

    res.json({
      success: true,
      event: result.event,
      triggerAtMillis: result.triggerAtMillis
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/jarvis/calendar/events/:id
 * Cancel / delete an event
 */
router.delete('/events/:id', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const eventId = req.params.id;
    const result = await CalendarService.cancelEvent(userId, eventId);

    res.json({
      success: true,
      cancelledEvent: result.cancelledEvent
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/jarvis/calendar/events/:id/complete
 * Mark event completed
 */
router.post('/events/:id/complete', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const eventId = req.params.id;
    const completed = await CalendarService.completeEvent(userId, eventId);

    res.json({
      success: true,
      event: completed
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/jarvis/calendar/events/:id/skip
 * Mark event skipped
 */
router.post('/events/:id/skip', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const eventId = req.params.id;
    const skipped = await CalendarService.skipEvent(userId, eventId);

    res.json({
      success: true,
      event: skipped
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jarvis/calendar/conflicts
 * Check for schedule conflicts
 */
router.get('/conflicts', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const timezone = req.query.timezone || 'UTC';
    const { time, date, duration } = req.query;

    if (!time) {
      return res.status(400).json({ success: false, error: 'TIME_REQUIRED', message: 'time parameter is required.' });
    }

    const targetDate = date ? TemporalContext.resolveTargetDate(date, timezone) : TemporalContext.resolve(timezone).currentDate;
    const durationMins = duration ? parseInt(duration, 10) : 45;

    const conflicts = await CalendarService.detectConflicts(userId, targetDate, time, durationMins);
    res.json({
      success: true,
      ...conflicts
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jarvis/calendar/routines
 * Get recurring routine templates
 */
router.get('/routines', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const templates = await RoutineTemplateModel.getByUser(userId);

    res.json({
      success: true,
      routines: templates
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/jarvis/calendar/routines
 * Create a new recurring routine template
 */
router.post('/routines', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const { title, startTime, endTime, weekdayMask, category, eventType } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', message: 'Title and startTime are required.' });
    }

    const created = await RoutineTemplateModel.create({
      userId,
      title,
      startTime: CalendarService.normalizeTime(startTime),
      endTime: endTime ? CalendarService.normalizeTime(endTime) : null,
      weekdayMask: weekdayMask || '1,2,3,4,5',
      category: category || 'routine',
      eventType: eventType || 'routine',
      timezone: req.body.timezone || 'UTC'
    });

    res.status(201).json({
      success: true,
      routine: created
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/jarvis/calendar/routines/:id
 * Update a recurring routine template
 */
router.patch('/routines/:id', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const templateId = req.params.id;
    const updated = await CalendarService.updateRoutineTemplate(userId, templateId, req.body);

    res.json({
      success: true,
      routine: updated
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/jarvis/calendar/routines/:id
 * Delete a recurring routine template
 */
router.delete('/routines/:id', async (req, res, next) => {
  try {
    const userId = req.userId || req.user?.id;
    const templateId = req.params.id;
    const success = await CalendarService.deleteRoutineTemplate(userId, templateId);

    res.json({
      success,
      message: success ? 'Routine template deleted.' : 'Failed to delete template.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
