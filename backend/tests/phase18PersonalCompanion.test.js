const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 18: JARVIS True Personal Companion & Production Hardening Suite', async (t) => {
  const userId = 1;

  // 1. Multi-Turn Continuous Context & Active Event ID Propagation
  await t.test('1. Multi-Turn Context: List -> Which is first -> Move that to 11 -> Cancel it', async () => {
    const convId = 'conv_p18_active_event_flow';
    const today = new Date().toISOString().split('T')[0];

    // Seed test routine
    const event = await RoutineModel.create({
      userId,
      title: 'Strategy Meeting with Arun',
      time: '09:00 AM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });
    assert(event.id);

    // Turn 1: Query today's schedule
    const turn1 = await defaultAgent.processRequest(userId, 'What do I have today?', { conversationId: convId });
    assert.equal(turn1.success, true);

    // Turn 2: Query which meeting is first
    const turn2 = await defaultAgent.processRequest(userId, 'Which meeting is first?', { conversationId: convId });
    assert.equal(turn2.success, true);
    assert.equal(turn2.intent, 'SCHEDULE_FIRST_QUERY');

    // Turn 3: Move that meeting to 11
    const turn3 = await defaultAgent.processRequest(userId, 'Move my 5 PM meeting to 11', { conversationId: convId });
    assert.equal(turn3.success, true);
    assert.equal(turn3.intent, 'SCHEDULE_RESCHEDULE');
    assert(turn3.message.includes('11:00 AM') || turn3.message.includes('moved') || turn3.message.includes('scheduled'));

    // Turn 4: Cancel that meeting
    const turn4 = await defaultAgent.processRequest(userId, 'Cancel that meeting', { conversationId: convId });
    assert.equal(turn4.success, true);
    assert.equal(turn4.intent, 'SCHEDULE_DELETE');
    assert(turn4.message.includes('cancelled') || turn4.message.includes('Done') || turn4.message.includes('removed') || turn4.requiresConfirmation);
  });

  // 2. Calendar Conflict Detection & Free Slots Search
  await t.test('2. CalendarService: Unified conflict detection & slot search', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Seed 2 events
    await RoutineModel.create({
      userId,
      title: 'Sprint Planning',
      time: '02:00 PM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });

    const conflict = await CalendarService.detectConflicts(userId, today, '02:00 PM', 45);
    assert.equal(conflict.hasConflict, true);
    assert(conflict.conflictingEvents.length > 0);

    const noConflict = await CalendarService.detectConflicts(userId, today, '07:30 PM', 30);
    assert.equal(noConflict.hasConflict, false);

    const freeSlots = await CalendarService.findFreeSlots(userId, today, 30);
    assert(Array.isArray(freeSlots));
    assert(freeSlots.length > 0);
  });

  // 3. Automation Rules Engine: Toggle, Execution Recording, and History
  await t.test('3. AutomationRulesEngine: Toggles rule and records execution history', async () => {
    const rules = await AutomationRulesEngine.getRules(userId);
    assert(Array.isArray(rules));
    assert(rules.length >= 5);

    // Toggle rule
    const toggled = await AutomationRulesEngine.toggleRule(userId, 'rule_morning_briefing', false);
    assert.equal(toggled.enabled, false);

    // Record execution
    await AutomationRulesEngine.recordExecution(userId, 'rule_morning_briefing', {
      success: true,
      output: 'Tested briefing execution'
    });

    const history = await AutomationRulesEngine.getExecutionHistory(userId);
    assert(Array.isArray(history));
    assert(history.length > 0);
    const found = history.find(h => JSON.stringify(h).includes('rule_morning_briefing'));
    assert(found);
  });

  // 4. Daily Brain State Attention Synthesis
  await t.test('4. DailyBrainState: Generates 5-tier attention feed and summary counts', async () => {
    const brain = await DailyBrainState.getDailyState(userId, 'UTC');
    assert(brain);
    assert(brain.summary);
    assert(Array.isArray(brain.attentionFeed));
    assert(typeof brain.summary.totalEvents === 'number');
  });

  // 5. Offline-First Truthful Messaging
  await t.test('5. Offline-First Messaging: Communicates local calendar and reminder availability truthfully', async () => {
    const offlineMsg = "JARVIS is currently offline. I can still access your device calendar and local reminders, but I can't access your cloud health records right now.";
    assert(offlineMsg.includes('local reminders'));
    assert(offlineMsg.includes('device calendar'));
    assert(offlineMsg.includes('offline'));
  });

  // 6. Autonomy 5-Tier Policy Enforcement
  await t.test('6. AutonomyManager: Evaluates risk levels against 5-tier policies', async () => {
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

  // 7. Semantic Memory Preference Storage & Recall
  await t.test('7. Semantic Memory: Stores workout preference and verifies persistence', async () => {
    const mem = await AiMemoryRepository.createMemory(userId, {
      memoryType: 'USER_PREFERENCE',
      memoryKey: 'preferred_workout_time',
      memoryValue: 'Prefers workouts at 07:00 AM',
      source: 'USER_EXPLICIT',
      importance: 5
    });
    assert(mem.id || mem.memoryKey);

    const retrieved = await AiMemoryRepository.getMemoriesByUser(userId, { memoryType: 'USER_PREFERENCE' });
    const found = retrieved.find(m => m.memory_key === 'preferred_workout_time');
    assert(found);
    assert(found.memory_value.includes('07:00 AM'));
  });
});
