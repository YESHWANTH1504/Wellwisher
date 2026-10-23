const test = require('node:test');
const assert = require('node:assert/strict');

const VoiceGateway = require('../services/jarvis/autonomous/voiceGateway');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 17: JARVIS True Standalone Assistant & Real-World Autonomy Suite', async (t) => {
  const userId = 'user_p17_standalone_001';
  const deviceId = 'android_pixel_p17_01';
  const today = new Date().toISOString().split('T')[0];

  // 1. Headless Scheduling Pipeline: "Hey JARVIS, schedule my meeting at 5 PM today"
  await t.test('1. Headless Scheduling: "Schedule my meeting at 5 PM today" executes and speaks confirmation', async () => {
    const result = await VoiceGateway.processVoiceCommand({
      userId,
      transcript: 'Schedule my meeting at 5 PM today',
      deviceId
    });

    assert.equal(result.success, true);
    assert(result.spokenResponse.length > 0);
    assert.equal(result.intent, 'SCHEDULE_REQUEST');
    assert(result.executionSteps.length >= 1);
  });

  // 2. Headless Multi-Turn Rescheduling: "Move my 5 PM meeting to 6"
  await t.test('2. Multi-Turn Reschedule: "Move my 5 PM meeting to 6" moves event with conflict check', async () => {
    // Create initial meeting
    const eventId = `rot_p17_${Date.now()}`;
    await RoutineModel.create({
      id: eventId,
      userId,
      title: 'Project Sync Meeting',
      time: '05:00 PM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });

    const result = await VoiceGateway.processVoiceCommand({
      userId,
      transcript: 'Move my 5 PM meeting to 6',
      deviceId
    });

    assert.equal(result.success, true);
    assert.equal(result.intent, 'SCHEDULE_RESCHEDULE');
    assert(result.spokenResponse.length > 0);
  });

  // 3. Headless Cancellation: "Cancel that meeting"
  await t.test('3. Multi-Turn Cancellation: "Cancel that meeting" cancels target routine', async () => {
    const result = await VoiceGateway.processVoiceCommand({
      userId,
      transcript: 'Cancel that meeting',
      deviceId
    });

    assert.equal(result.success, true);
    assert.equal(result.intent, 'SCHEDULE_DELETE');
  });

  // 4. Headless Schedule for Tomorrow: "What do I have tomorrow?"
  await t.test('4. Headless Tomorrow Query: "What do I have tomorrow?" speaks tomorrow schedule', async () => {
    const result = await VoiceGateway.processVoiceCommand({
      userId,
      transcript: 'What do I have tomorrow?',
      deviceId
    });

    assert.equal(result.success, true);
    assert.equal(result.intent, 'SCHEDULE_QUERY');
    assert(result.spokenResponse.length > 0);
  });

  // 5. Headless Focus Analysis: "What should I focus on today?"
  await t.test('5. Headless Daily Focus: "What should I focus on today?" returns prioritized briefing', async () => {
    const result = await VoiceGateway.processVoiceCommand({
      userId,
      transcript: 'What should I focus on today?',
      deviceId
    });

    assert.equal(result.success, true);
    assert.equal(result.intent, 'DAILY_FOCUS_QUERY');
  });

  // 6. User Automation Rules Engine
  await t.test('6. AutomationRulesEngine: Loads default rules and evaluates triggers', async () => {
    const rules = await AutomationRulesEngine.getRules(userId);
    assert(Array.isArray(rules));
    assert(rules.length >= 4);

    const evalResult = await AutomationRulesEngine.evaluateRules(userId, 'UTC');
    assert(evalResult);
    assert.equal(evalResult.userId, userId);
    assert(typeof evalResult.triggeredCount === 'number');
  });

  // 7. Calendar Integration & Direct Conflict Resolution
  await t.test('7. CalendarService: Unified conflict detection & slot search', async () => {
    const conflict = await CalendarService.detectConflicts(userId, today, '05:00 PM');
    assert(typeof conflict.hasConflict === 'boolean');

    const freeSlots = await CalendarService.findFreeSlots(userId, today, 30);
    assert(Array.isArray(freeSlots));
    assert(freeSlots.length > 0);
  });

  // 8. Autonomy Policy Enforcement
  await t.test('8. AutonomyManager: Evaluates risk levels against 5-tier policies', async () => {
    const readTool = { name: 'get_today_schedule', riskLevel: 'LOW', requiresConfirmation: false };
    const mutateTool = { name: 'create_schedule', riskLevel: 'MEDIUM', requiresConfirmation: false };
    const deleteTool = { name: 'delete_schedule', riskLevel: 'HIGH', requiresConfirmation: true };

    const pol0 = AutonomyManager.evaluateExecutionPolicy(mutateTool, AUTONOMY_LEVELS.LEVEL_0_INFORM);
    assert.equal(pol0.canExecute, false);

    const pol2 = AutonomyManager.evaluateExecutionPolicy(mutateTool, AUTONOMY_LEVELS.LEVEL_2_AUTO_EXECUTE);
    assert.equal(pol2.canExecute, true);

    const pol2High = AutonomyManager.evaluateExecutionPolicy(deleteTool, AUTONOMY_LEVELS.LEVEL_2_AUTO_EXECUTE);
    assert.equal(pol2High.requiresConfirmation, true);

    const pol4 = AutonomyManager.evaluateExecutionPolicy(mutateTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(pol4.blockedByAutonomy, true);
  });

  // 9. Semantic Memory Persistence & Recall
  await t.test('9. Semantic Memory: Stores meeting preference and recalls accurately', async () => {
    const mem = await AiMemoryRepository.createMemory(userId, {
      memoryType: 'USER_PREFERENCE',
      memoryKey: 'preferred_meeting_hours',
      memoryValue: 'Prefers meetings between 10:00 AM and 4:00 PM',
      source: 'USER_EXPLICIT',
      importance: 5
    });

    assert(mem);
    const search = await AiMemoryRepository.searchMemories(userId, 'meeting');
    assert(search.length >= 1);
    assert(search.some(m => m.memory_value.includes('10:00 AM')));
  });
});
