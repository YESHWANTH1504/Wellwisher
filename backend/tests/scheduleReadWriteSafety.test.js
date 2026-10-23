const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const RoutineModel = require('../models/routineModel');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const RequestClassifierAgent = require('../services/jarvis/agent/RequestClassifierAgent');
const LLMAdapter = require('../services/jarvis/agent/llm/llmAdapter');

test('Schedule Read/Write Safety & Multi-Turn Verification', async (t) => {
  const orchestrator = masterOrchestrator;
  const classifier = new RequestClassifierAgent();
  const llm = new LLMAdapter();
  const testUserId = 1;
  const sessionId = `test_safety_${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  await t.test('1. RequestClassifierAgent classifies read queries as QUERY_SCHEDULE, NOT CREATE_SCHEDULE', () => {
    const readQueries = [
      'schedule',
      'schedule for today',
      'what is scheduled',
      "what's on my schedule",
      "what's scheduled today",
      'show me today\'s schedule',
      'what do I have today',
      'what am I doing today',
      'what is planned for today',
      'do I have anything scheduled today',
      'schedule tomorrow',
      'what about tomorrow'
    ];

    for (const q of readQueries) {
      const res = classifier.classify(q);
      assert.equal(
        res.intent,
        'QUERY_SCHEDULE',
        `Query "${q}" should classify as QUERY_SCHEDULE, got: ${res.intent}`
      );
    }
  });

  await t.test('2. LLMAdapter fallback plans "schedule for today" as get_today_schedule, NOT create_schedule', () => {
    const plan = llm._fallbackPlan('schedule for today', today, null);
    assert.equal(plan.type, 'TOOL_EXECUTION_PLAN');
    assert.equal(plan.intent, 'SCHEDULE_QUERY');
    assert.equal(plan.steps[0].toolName, 'calendar_get_today');
    assert.equal(plan.steps[0].arguments.date, today);
  });

  await t.test('3. Database Safety: "schedule for today" performs ZERO database mutations', async () => {
    // Count records before
    const beforeRoutines = await RoutineModel.getByDate(testUserId, today);
    const beforeCount = beforeRoutines.length;

    // Process read request through orchestrator
    const res = await orchestrator.processRequest(testUserId, 'schedule for today', {
      sessionId,
      source: 'manual'
    });

    // Count records after
    const afterRoutines = await RoutineModel.getByDate(testUserId, today);
    const afterCount = afterRoutines.length;

    assert.equal(
      afterCount,
      beforeCount,
      `Database record count must remain unchanged! Before: ${beforeCount}, After: ${afterCount}`
    );

    // Verify response does NOT say "Successfully scheduled" or invent "10:00 AM"
    const text = (res.speech || res.message || '').toLowerCase();
    assert.ok(
      !text.includes('successfully scheduled "for today"'),
      `Response should not state it scheduled "for today": ${text}`
    );
    assert.ok(
      !text.includes('10:00 am') || beforeRoutines.some(r => r.time && r.time.includes('10:00')),
      `Response should not invent 10:00 AM: ${text}`
    );
  });

  await t.test('4. Incomplete creation request "Schedule something" requests clarification, does NOT invent 10 AM', async () => {
    const beforeRoutines = await RoutineModel.getByDate(testUserId, today);
    const beforeCount = beforeRoutines.length;

    const res = await orchestrator.processRequest(testUserId, 'Schedule something', {
      sessionId,
      source: 'manual'
    });

    const afterRoutines = await RoutineModel.getByDate(testUserId, today);
    assert.equal(afterRoutines.length, beforeCount, 'Record count must not increase for incomplete creation!');

    // Verify clarification was requested
    assert.ok(
      res.requiresClarification || res.intent === 'CLARIFICATION' || res.intent === 'CLARIFICATION_REQUIRED',
      `Expected clarification request, got: ${JSON.stringify(res)}`
    );
    assert.ok(
      (res.speech || res.message || '').includes('schedule') && (res.speech || res.message || '').includes('time'),
      `Expected clarification asking for missing detail: ${res.speech || res.message}`
    );
  });

  let createdEventId = null;
  await t.test('5. Explicit creation "Schedule a meeting with Arun at 5 PM." creates exactly one routine in DB', async () => {
    const res = await orchestrator.processRequest(testUserId, 'Schedule a meeting with Arun at 5 PM.', {
      sessionId,
      source: 'manual'
    });

    assert.equal(res.success, true);
    assert.ok(res.steps && res.steps.length > 0);
    assert.ok(res.steps[0].toolName === 'create_schedule' || res.steps[0].toolName === 'calendar_create_event');

    const execData = res.steps[0].result?.data || res.steps[0].result;
    assert.ok(execData);
    assert.ok(execData.title.toLowerCase().includes('arun'));
    assert.ok(execData.time.includes('05:00') || execData.time.includes('5:00') || execData.time.includes('17:00'));

    createdEventId = execData.createdRoutine?.id || execData.scheduleId || execData.reminderId;
    assert.ok(createdEventId, 'Must return a valid routine/schedule ID');

    // Check in database directly
    const directLookup = await RoutineModel.getById(createdEventId, testUserId);
    assert.ok(directLookup, 'Created routine must exist in database');
    assert.ok(directLookup.title.toLowerCase().includes('arun'));
  });

  await t.test('6. Follow-up "Actually make that 6 PM." updates the existing routine WITHOUT creating duplicate', async () => {
    const beforeRoutines = await RoutineModel.getByDate(testUserId, today);
    const beforeCount = beforeRoutines.length;

    const res = await orchestrator.processRequest(testUserId, 'Actually make that 6 PM.', {
      sessionId,
      source: 'manual'
    });

    assert.equal(res.success, true);
    const afterRoutines = await RoutineModel.getByDate(testUserId, today);

    assert.equal(
      afterRoutines.length,
      beforeCount,
      `Duplicate was created! Before count: ${beforeCount}, After count: ${afterRoutines.length}`
    );

    // Verify database record was updated to 6 PM
    const updated = await RoutineModel.getById(createdEventId, testUserId);
    assert.ok(updated, 'Routine must still exist');
    assert.ok(updated.time.includes('06:00') || updated.time.includes('6:00') || updated.time.includes('18:00'), `Time should be 06:00 PM or 18:00, got: ${updated.time}`);
  });

  await t.test('7. Follow-up "Cancel that." cancels the exact active routine', async () => {
    const res = await orchestrator.processRequest(testUserId, 'Cancel that.', {
      sessionId,
      source: 'manual'
    });

    assert.equal(res.success, true);

    // Verify deleted in database
    const checkDeleted = await RoutineModel.getById(createdEventId, testUserId);
    assert.equal(checkDeleted, null, 'Routine must be soft-deleted in database');
  });

  await t.test('8. Multi-turn context conversation "What\'s on my schedule today?" -> "What about tomorrow?"', async () => {
    const turn1 = await orchestrator.processRequest(testUserId, "What's on my schedule today?", {
      sessionId,
      source: 'manual'
    });
    assert.equal(turn1.success, true);
    assert.ok(
      turn1.steps?.[0]?.toolName === 'get_today_schedule' ||
      turn1.intent === 'SCHEDULE_QUERY' ||
      (turn1.speech || turn1.message || '').toLowerCase().includes('schedule') ||
      (turn1.speech || turn1.message || '').toLowerCase().includes('clear'),
      `Expected today schedule answer or tool call, got: ${turn1.speech || turn1.message}`
    );

    const turn2 = await orchestrator.processRequest(testUserId, 'What about tomorrow?', {
      sessionId,
      source: 'manual'
    });
    assert.equal(turn2.success, true);
    assert.ok(
      turn2.steps?.[0]?.toolName === 'get_today_schedule' ||
      turn2.intent === 'SCHEDULE_QUERY' ||
      (turn2.speech || turn2.message || '').toLowerCase().includes('tomorrow') ||
      (turn2.speech || turn2.message || '').toLowerCase().includes('clear'),
      `Expected tomorrow schedule info or tool call, got: ${turn2.speech || turn2.message}`
    );
  });
});
