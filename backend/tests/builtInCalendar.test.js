const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../config/db');
const RoutineTemplateModel = require('../models/routineTemplateModel');
const RoutineModel = require('../models/routineModel');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const TemporalContext = require('../services/jarvis/context/temporalContext');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const LLMAdapter = require('../services/jarvis/agent/llm/llmAdapter');
const scheduleTools = require('../services/jarvis/tools/scheduleTools');

test('Authoritative Built-In Calendar & Daily Routine Engine Suite', async (t) => {
  const testUserId = 8888;
  const testUserB = 9999;
  const timezone = 'UTC';
  const llm = new LLMAdapter();

  // Helper dates:
  // 2026-09-07 is Monday
  // 2026-09-08 is Tuesday
  // 2026-09-11 is Friday
  // 2026-09-12 is Saturday
  // 2026-09-13 is Sunday
  const mondayDate = '2026-09-07';
  const tuesdayDate = '2026-09-08';
  const fridayDate = '2026-09-11';
  const saturdayDate = '2026-09-12';
  const sundayDate = '2026-09-13';

  // Setup test users & cleanup prior data
  try {
    await pool.query('DELETE FROM routines WHERE user_id IN (?, ?)', [testUserId, testUserB]);
    await pool.query('DELETE FROM routine_templates WHERE user_id IN (?, ?)', [testUserId, testUserB]);
    await pool.query(
      'INSERT IGNORE INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      [testUserId, 'Calendar User A', 'calA@test.com', 'hashA', testUserB, 'Calendar User B', 'calB@test.com', 'hashB']
    );
  } catch (_) {}

  await t.test('1. Default Routine Initialization: Creates Weekday, Saturday, Sunday templates', async () => {
    const templates = await CalendarService.initializeDefaultRoutines(testUserId, timezone);
    assert.ok(templates.length >= 30, `Expected at least 30 default routine templates, got ${templates.length}`);

    const weekdayTemplates = templates.filter(t => t.weekday_mask === '1,2,3,4,5');
    const satTemplates = templates.filter(t => t.weekday_mask === '6');
    const sunTemplates = templates.filter(t => t.weekday_mask === '0');

    assert.equal(weekdayTemplates.length, 10, 'Weekday (Mon-Fri) must have 10 default routines');
    assert.equal(satTemplates.length, 10, 'Saturday must have 10 default routines');
    assert.equal(sunTemplates.length, 10, 'Sunday must have 10 default routines');
  });

  await t.test('2. Idempotent Initialization: Calling 10 times produces zero duplicates', async () => {
    for (let i = 0; i < 10; i++) {
      await CalendarService.initializeDefaultRoutines(testUserId, timezone);
    }
    const templates = await RoutineTemplateModel.getByUser(testUserId);
    assert.equal(templates.length, 30, 'Templates count must strictly remain 30 without duplicates');
  });

  await t.test('3. Monday Routine: Contains working day schedule', async () => {
    const agenda = await CalendarService.getAgenda(testUserId, mondayDate, timezone);
    assert.equal(agenda.length, 10, 'Monday agenda must have 10 routines');

    const titles = agenda.map(e => e.title);
    assert.ok(titles.includes('Wake Up'), 'Must include Wake Up');
    assert.ok(titles.includes('Breakfast'), 'Must include Breakfast');
    assert.ok(titles.includes('Login / Commute to Office'), 'Must include Login / Commute to Office');
    assert.ok(titles.includes('Hydration / Tea Break'), 'Must include Hydration / Tea Break');
    assert.ok(titles.includes('Lunch Break'), 'Must include Lunch Break');
    assert.ok(titles.includes('Evening Snacks'), 'Must include Evening Snacks');
    assert.ok(titles.includes('Logout'), 'Must include Logout');
    assert.ok(titles.includes('Exercise'), 'Must include Exercise');
    assert.ok(titles.includes('Dinner'), 'Must include Dinner');
    assert.ok(titles.includes('Sleep'), 'Must include Sleep');
  });

  await t.test('4. Tuesday Routine: Identical weekday working day routine', async () => {
    const agenda = await CalendarService.getAgenda(testUserId, tuesdayDate, timezone);
    assert.equal(agenda.length, 10, 'Tuesday agenda must have 10 routines');
    assert.equal(agenda[0].title, 'Wake Up');
    assert.equal(agenda[0].time, '07:00');
  });

  await t.test('5. Friday Routine: Identical weekday working day routine', async () => {
    const agenda = await CalendarService.getAgenda(testUserId, fridayDate, timezone);
    assert.equal(agenda.length, 10, 'Friday agenda must have 10 routines');
    assert.equal(agenda[4].title, 'Lunch Break');
    assert.equal(agenda[4].time, '13:00');
  });

  await t.test('6. Saturday Routine: Weekend routine with Personal / Household Tasks', async () => {
    const agenda = await CalendarService.getAgenda(testUserId, saturdayDate, timezone);
    assert.equal(agenda.length, 10, 'Saturday agenda must have 10 routines');

    const titles = agenda.map(e => e.title);
    assert.ok(titles.includes('Wake Up'), 'Saturday must have Wake Up at 08:00');
    assert.ok(titles.includes('Personal / Household Tasks'), 'Saturday must have Household Tasks');
    assert.ok(titles.includes('Outdoor Activity / Exercise'), 'Saturday must have Outdoor Activity');
    assert.ok(titles.includes('Relax'), 'Saturday must have Relax');
    assert.equal(agenda[0].time, '08:00', 'Saturday Wake Up should be 08:00');
  });

  await t.test('7. Sunday Routine: Family time, planning and preparation', async () => {
    const agenda = await CalendarService.getAgenda(testUserId, sundayDate, timezone);
    assert.equal(agenda.length, 10, 'Sunday agenda must have 10 routines');

    const titles = agenda.map(e => e.title);
    assert.ok(titles.includes('Personal / Family Time'), 'Sunday must have Family Time');
    assert.ok(titles.includes('Planning / Preparation'), 'Sunday must have Planning');
    assert.ok(titles.includes('Prepare for Monday'), 'Sunday must have Prepare for Monday');
  });

  await t.test('8. Pure Agenda Read: Calling getAgenda does not alter completion or status', async () => {
    const agenda1 = await CalendarService.getAgenda(testUserId, mondayDate, timezone);
    const agenda2 = await CalendarService.getAgenda(testUserId, mondayDate, timezone);
    assert.deepEqual(agenda1, agenda2, 'Multiple reads must produce identical pure results');
  });

  await t.test('9. getAgenda 10 times -> zero duplicates', async () => {
    for (let i = 0; i < 10; i++) {
      await CalendarService.getAgenda(testUserId, mondayDate, timezone);
    }
    const allInstances = await RoutineModel.getByDate(testUserId, mondayDate);
    assert.equal(allInstances.length, 10, 'Total materialized instances in DB for Monday must strictly be 10');
  });

  await t.test('10. "What is my schedule?" -> Strictly READ operation', () => {
    const plan = llm._fallbackPlan('What is my schedule?', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_QUERY');
    assert.equal(plan.steps[0].toolName, 'calendar_get_today');
  });

  await t.test('11. "Schedule for today" -> Strictly READ operation, ZERO events created', () => {
    const plan = llm._fallbackPlan('schedule for today', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_QUERY');
    assert.equal(plan.steps[0].toolName, 'calendar_get_today');
    assert.notEqual(plan.steps[0].toolName, 'calendar_create_event');
  });

  await t.test('12. "What is scheduled today?" -> Strictly READ operation', () => {
    const plan = llm._fallbackPlan('What is scheduled today?', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_QUERY');
    assert.equal(plan.steps[0].toolName, 'calendar_get_today');
  });

  await t.test('13. "Add gym at 6 PM" -> CREATE event with real title and time', async () => {
    const plan = llm._fallbackPlan('Add gym at 6 PM', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_REQUEST');
    assert.equal(plan.steps[0].toolName, 'calendar_create_event');
    assert.equal(plan.steps[0].arguments.title, 'Gym');
    assert.equal(plan.steps[0].arguments.time, '06:00 PM');

    const created = await CalendarService.createEvent(testUserId, {
      title: 'Gym',
      time: '06:00 PM',
      date: mondayDate,
      timezone
    });
    assert.ok(created.event.id);
    assert.equal(created.event.title, 'Gym');
    assert.equal(created.event.time, '18:00');
  });

  await t.test('14. "Move lunch to 2 PM" -> UPDATE event instance time', async () => {
    const plan = llm._fallbackPlan('Move lunch to 2 PM', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_RESCHEDULE');
    assert.equal(plan.steps[0].toolName, 'calendar_update_event');

    // Find today's lunch instance
    const lunchMatches = await CalendarService.findRelevantEvent(testUserId, { query: 'lunch', date: mondayDate });
    assert.ok(lunchMatches.length > 0, 'Should find lunch on Monday');
    const lunchId = lunchMatches[0].id;

    const res = await CalendarService.updateEvent(testUserId, lunchId, { time: '02:00 PM' });
    assert.equal(res.event.id, lunchId, 'Event ID must remain stable across updates');
    assert.equal(res.event.time, '14:00', 'Time must be updated to 14:00');
  });

  await t.test('15. "Make wake-up 6:30 every weekday" -> Recurring template UPDATE', async () => {
    const plan = llm._fallbackPlan('Make wake-up 6:30 every weekday', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_RESCHEDULE');
    assert.equal(plan.steps[0].toolName, 'calendar_update_routine');

    const templates = await RoutineTemplateModel.getByUser(testUserId);
    const wakeupTemplate = templates.find(t => t.title === 'Wake Up' && t.weekday_mask === '1,2,3,4,5');
    assert.ok(wakeupTemplate, 'Weekday wake-up template must exist');

    const updated = await CalendarService.updateRoutineTemplate(testUserId, wakeupTemplate.id, {
      startTime: '06:30'
    });
    assert.equal(updated.start_time, '06:30', 'Routine template start time must be 06:30');
  });

  await t.test('16. "I finished breakfast" -> Mark instance completed', async () => {
    const plan = llm._fallbackPlan('I finished breakfast', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_COMPLETION');
    assert.equal(plan.steps[0].toolName, 'calendar_complete_event');

    const breakfastMatches = await CalendarService.findRelevantEvent(testUserId, { query: 'breakfast', date: mondayDate });
    const breakfast = breakfastMatches[0];

    const completed = await CalendarService.completeEvent(testUserId, breakfast.id);
    assert.equal(completed.status, 'completed', 'Status must be completed');
    assert.ok(completed.completed_at, 'completed_at timestamp must be set');
  });

  await t.test('17. "Skip lunch today" -> Mark instance skipped', async () => {
    const plan = llm._fallbackPlan('Skip lunch today', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_SKIP');
    assert.equal(plan.steps[0].toolName, 'calendar_skip_event');

    const lunchMatches = await CalendarService.findRelevantEvent(testUserId, { query: 'lunch', date: mondayDate });
    const lunch = lunchMatches[0];

    const skipped = await CalendarService.skipEvent(testUserId, lunch.id);
    assert.equal(skipped.status, 'skipped', 'Status must be skipped');
  });

  await t.test('18. "Cancel my tea break" -> Correct event cancelled', async () => {
    const teaMatches = await CalendarService.findRelevantEvent(testUserId, { query: 'tea', date: mondayDate });
    assert.ok(teaMatches.length > 0, 'Tea break must exist');
    const teaId = teaMatches[0].id;

    const res = await CalendarService.cancelEvent(testUserId, teaId);
    assert.equal(res.success, true);
    assert.equal(res.cancelledEvent.id, teaId);

    // Verify soft-deleted from active agenda
    const updatedAgenda = await CalendarService.getAgenda(testUserId, mondayDate, timezone);
    const findCancelled = updatedAgenda.find(e => e.id === teaId);
    assert.equal(findCancelled, undefined, 'Cancelled event must not appear in active agenda');
  });

  await t.test('19. "Cancel that" -> Active context resolution', () => {
    const activeTask = { reminderId: 'rem_12345', title: 'Dentist Appointment' };
    const plan = llm._fallbackPlan('Cancel that', mondayDate, activeTask);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.steps[0].toolName, 'cancel_reminder');
    assert.equal(plan.steps[0].arguments.reminderId, 'rem_12345');
  });

  await t.test('20. "What\'s next?" -> Chronological resolution relative to current time', async () => {
    const nextEvent = await CalendarService.getNextEvent(testUserId, timezone);
    assert.ok(nextEvent, 'Should calculate next event');
    assert.ok(nextEvent.event.title, 'Next event must have a title');
    assert.ok(typeof nextEvent.minutesUntil === 'number', 'minutesUntil must be numeric');
  });

  await t.test('21. Conflict Detection: Detects overlap with existing event', async () => {
    // 09:00 Breakfast exists
    const conflict = await CalendarService.detectConflicts(testUserId, mondayDate, '09:15 AM', 30);
    assert.equal(conflict.hasConflict, true, 'Should detect conflict at 09:15 with Breakfast');
    assert.ok(conflict.conflictingEvents[0].title.includes('Breakfast'));

    // 15:00 is free (between lunch and snacks)
    const freeSlot = await CalendarService.detectConflicts(testUserId, mondayDate, '03:00 PM', 30);
    assert.equal(freeSlot.hasConflict, false, '3:00 PM should have no conflicts');
  });

  await t.test('22. Event Update: Changes date/time without altering ID', async () => {
    const ev = await CalendarService.createEvent(testUserId, {
      title: 'Doctor Follow-up',
      time: '11:00 AM',
      date: mondayDate,
      timezone
    });

    const updated = await CalendarService.updateEvent(testUserId, ev.event.id, {
      time: '11:30 AM'
    });
    assert.equal(updated.event.id, ev.event.id);
    assert.equal(updated.event.time, '11:30');
  });

  await t.test('23. Event Deletion: Soft deletes and marks cancelled', async () => {
    const ev = await CalendarService.createEvent(testUserId, {
      title: 'Temporary Call',
      time: '04:30 PM',
      date: mondayDate,
      timezone
    });

    const deleted = await CalendarService.cancelEvent(testUserId, ev.event.id);
    assert.equal(deleted.success, true);
    assert.equal(deleted.cancelledEvent.status, 'cancelled');
  });

  await t.test('24. User Isolation: User A events never appear in User B calendar', async () => {
    // Create custom event for User A
    const evA = await CalendarService.createEvent(testUserId, {
      title: 'User A Secret Strategy Meeting',
      time: '02:30 PM',
      date: mondayDate,
      timezone
    });

    // Initialize & get agenda for User B
    const agendaB = await CalendarService.getAgenda(testUserB, mondayDate, timezone);
    const foundInB = agendaB.find(e => e.title === 'User A Secret Strategy Meeting');
    assert.equal(foundInB, undefined, 'User B must never see User A custom event');

    // Attempt mutation by User B on User A event
    await assert.rejects(
      async () => {
        await CalendarService.updateEvent(testUserB, evA.event.id, { time: '05:00 PM' });
      },
      /not found/i,
      'User B must not be permitted to mutate User A event'
    );
  });

  await t.test('25. Duplicate Prevention: Unique constraint prevents duplicate materialization', async () => {
    const countBefore = (await RoutineModel.getByDate(testUserId, mondayDate)).length;
    // Attempt manual duplicate create with same template and date
    const template = (await RoutineTemplateModel.getByUser(testUserId))[0];
    try {
      await RoutineModel.create({
        id: `dup_test_${Date.now()}`,
        userId: testUserId,
        title: template.title,
        time: template.start_time,
        date: mondayDate,
        templateId: template.id
      });
    } catch (_) {}

    const countAfter = (await RoutineModel.getByDate(testUserId, mondayDate)).length;
    assert.equal(countAfter, countBefore, 'Database constraints must block duplicate template instances for same date');
  });

  await t.test('26. Reminder Rescheduling: Calculates exact trigger timestamp', () => {
    const triggerAt = CalendarService.calculateTriggerAtMillis('2026-09-07', '03:00 PM', 'UTC');
    assert.ok(triggerAt > 0, 'Trigger timestamp must be valid epoch millis');
    const d = new Date(triggerAt);
    assert.equal(d.getHours(), 15, 'Hour must be 15 (3 PM)');
    assert.equal(d.getMinutes(), 0, 'Minute must be 0');
  });

  await t.test('27. Reminder Cancellation: Returns cancel action payload', async () => {
    const created = await CalendarService.createEvent(testUserId, {
      title: 'Medication Pill Reminder',
      time: '08:00 AM',
      date: mondayDate,
      reminderEnabled: true,
      timezone
    });

    const res = await CalendarService.cancelEvent(testUserId, created.event.id);
    assert.equal(res.success, true);
    assert.equal(res.cancelledEvent.id, created.event.id);
  });

  await t.test('28. General AI Joke: "Tell me a joke" remains General AI', () => {
    const plan = llm._fallbackPlan('Tell me a joke', mondayDate, null);
    assert.equal(plan.type, 'FINAL_RESPONSE');
    assert.equal(plan.intent, 'JOKE');
    assert.ok(plan.message.length > 5);
  });

  await t.test('29. Current Information: "What\'s happening in the world today?" routes to news', () => {
    const plan = llm._fallbackPlan('What is happening in the world today?', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'CURRENT_INFORMATION_QUERY');
    assert.equal(plan.steps[0].toolName, 'get_current_information');
  });

  await t.test('30. Device Commands: "Open WhatsApp" remains device action', () => {
    const plan = llm._fallbackPlan('Open WhatsApp', mondayDate, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'OPEN_APPLICATION');
    assert.equal(plan.steps[0].arguments.appName, 'WhatsApp');
  });

  await t.test('31. Natural Language Generalization: Varied phrasing correctly routes to READ', () => {
    const readPhrases = [
      'What have I got planned?',
      "What's happening today?",
      'Am I busy today?',
      'What does today look like?',
      'What am I up to today?',
      'Anything planned for tomorrow?',
      "What's happening Saturday?",
      'Show this week'
    ];

    for (const phrase of readPhrases) {
      const plan = llm._fallbackPlan(phrase, mondayDate, null);
      assert.equal(plan.type, 'TOOL_EXECUTION_PLAN', `Failed for: "${phrase}"`);
      assert.equal(plan.intent, 'SCHEDULE_QUERY', `Failed intent for: "${phrase}"`);
      assert.ok(
        plan.steps[0].toolName.startsWith('calendar_get_'),
        `Tool for "${phrase}" should be a calendar_get_* read tool, got: ${plan.steps[0].toolName}`
      );
    }
  });

  await t.test('32. General AI Regression: Unrelated knowledge queries never enter calendar', () => {
    const generalQueries = [
      'What is quantum computing?',
      'Explain recursion.',
      "What's the capital of Japan?",
      'Who is the president of France?',
      'Why is the sky blue?',
      'Give me some ideas for dinner.',
      'Help me plan my weekend.',
      'What is taking so long?'
    ];

    for (const q of generalQueries) {
      const plan = llm._fallbackPlan(q, mondayDate, null);
      assert.equal(plan.type, 'FINAL_RESPONSE', `Query "${q}" should produce a direct response`);
      assert.notEqual(plan.intent, 'SCHEDULE_QUERY', `Query "${q}" must not be classified as schedule`);
      assert.notEqual(plan.intent, 'SCHEDULE_REQUEST', `Query "${q}" must not create schedule`);
    }
  });

  // Clean up test users after completion
  try {
    await pool.query('DELETE FROM routines WHERE user_id IN (?, ?)', [testUserId, testUserB]);
    await pool.query('DELETE FROM routine_templates WHERE user_id IN (?, ?)', [testUserId, testUserB]);
  } catch (_) {}
});
