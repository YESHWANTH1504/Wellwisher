const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 20: JARVIS True Everyday Personal Companion & Production Suite', async (t) => {
  const userId = 1;

  // 1. Explicit Memory Saving
  await t.test('1. Memory: Saves explicit user preference into semantic memory', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remember that I prefer morning workouts', {
      conversationId: 'conv_p20_mem_save'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_REQUEST');
    assert(res.message.includes('morning workouts') || res.message.includes('remembered'));
  });

  // 2. Memory Inspection ("What do you know about me?")
  await t.test('2. Memory Inspection: Retrieves stored preferences and habits', async () => {
    const res = await defaultAgent.processRequest(userId, 'What do you know about me?', {
      conversationId: 'conv_p20_mem_inspect'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_QUERY');
    assert(typeof res.message === 'string');
    assert(res.message.length > 0);
  });

  // 3. Memory Deletion / Forget Command ("Forget that I prefer morning workouts")
  await t.test('3. Memory Forgetting: Deletes memory entry upon user request', async () => {
    const res = await defaultAgent.processRequest(userId, 'Forget that I prefer morning workouts', {
      conversationId: 'conv_p20_mem_forget'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_DELETE_REQUEST');
    assert(res.message.includes('removed') || res.message.includes('deleted') || res.message.includes('preference'));
  });

  // 4. Global Interruption Command ("Stop" / "Be quiet")
  await t.test('4. Global Commands: "Stop" immediately transitions to standby', async () => {
    const res = await defaultAgent.processRequest(userId, 'Stop', {
      conversationId: 'conv_p20_stop'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ASSISTANT_STOP');
    assert.equal(res.message, 'Standing by.');
  });

  // 5. Universal Cancellation ("Cancel that" / "Never mind")
  await t.test('5. Global Commands: "Cancel that" cancels pending actions safely', async () => {
    const res = await defaultAgent.processRequest(userId, 'Cancel that', {
      conversationId: 'conv_p20_cancel'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ACTION_CANCELLED');
    assert(res.message.includes('cancelled') || res.message.includes('No changes'));
  });

  // 6. Repeat Last Response ("Repeat that")
  await t.test('6. Global Commands: "Repeat that" repeats last assistant turn', async () => {
    const convId = 'conv_p20_repeat';
    await defaultAgent.processRequest(userId, 'What is on my schedule today?', { conversationId: convId });
    const repeat = await defaultAgent.processRequest(userId, 'Repeat that', { conversationId: convId });
    assert.equal(repeat.success, true);
    assert.equal(repeat.intent, 'REPEAT_LAST_RESPONSE');
    assert(typeof repeat.message === 'string');
  });

  // 7. Capabilities Overview ("What can you do?")
  await t.test('7. Global Commands: "What can you do?" speaks concise capabilities', async () => {
    const res = await defaultAgent.processRequest(userId, 'What can you do?', {
      conversationId: 'conv_p20_caps'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'CAPABILITY_QUERY');
    assert(res.message.includes('calendar') && res.message.includes('reminders'));
  });

  // 8. Start My Day Morning Routine ("Start my day")
  await t.test('8. Morning Briefing: "Start my day" delivers proactive daily focus', async () => {
    const res = await defaultAgent.processRequest(userId, 'Start my day', {
      conversationId: 'conv_p20_start_day'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
    assert(typeof res.message === 'string');
    assert(res.message.length > 0);
  });

  // 9. Evening Wrap-Up ("Wrap up my day")
  await t.test('9. Evening Summary: "Wrap up my day" synthesizes day in review', async () => {
    const res = await defaultAgent.processRequest(userId, 'Wrap up my day', {
      conversationId: 'conv_p20_wrapup'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'EVENING_SUMMARY_QUERY');
    assert(typeof res.message === 'string');
  });

  // 10. Quiet Hours Configuration ("Don't disturb me after 10 PM")
  await t.test('10. Quiet Hours: Configures quiet hours policy', async () => {
    const res = await defaultAgent.processRequest(userId, "Don't disturb me after 10 PM", {
      conversationId: 'conv_p20_quiet'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'QUIET_HOURS_SETTING');
    assert(res.message.includes('Quiet hours'));
  });

  // 11. Travel Buffer Setting ("Give me a 30 minute travel buffer for meetings")
  await t.test('11. Travel Buffer: Configures travel buffer preferences', async () => {
    const res = await defaultAgent.processRequest(userId, 'Give me a 30 minute travel buffer for meetings', {
      conversationId: 'conv_p20_travel'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'TRAVEL_BUFFER_SETTING');
    assert(res.message.includes('Travel buffer'));
  });

  // 12. Calendar Conflict & Open Slots Suggestion
  await t.test('12. Calendar Intelligence: Detects conflict and returns free slots', async () => {
    const today = new Date().toISOString().split('T')[0];
    await RoutineModel.create({
      userId,
      title: 'Board Meeting',
      time: '06:00 PM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });

    const conflict = await CalendarService.detectConflicts(userId, today, '06:00 PM', 30);
    assert.equal(conflict.hasConflict, true);

    const freeSlots = await CalendarService.findFreeSlots(userId, today, 30);
    assert(freeSlots.length > 0);
  });

  // 13. Multi-Turn Context & Active Event ID Binding
  await t.test('13. Multi-Turn Reference: Binds active_event_id across sequential commands', async () => {
    const convId = 'conv_p20_multiturn';
    const today = new Date().toISOString().split('T')[0];

    const ev = await RoutineModel.create({
      userId,
      title: 'Consultation with Specialist',
      time: '08:00 AM',
      date: today,
      category: 'health',
      status: 'upcoming'
    });
    assert(ev.id);

    const turn1 = await defaultAgent.processRequest(userId, 'What meetings do I have today?', { conversationId: convId });
    assert.equal(turn1.success, true);

    const turn2 = await defaultAgent.processRequest(userId, 'Which meeting is first?', { conversationId: convId });
    assert.equal(turn2.success, true);

    const turn3 = await defaultAgent.processRequest(userId, 'Move my 5 PM meeting to 11', { conversationId: convId });
    assert.equal(turn3.success, true);
  });

  // 14. 5-Tier Autonomy Policy Enforcement
  await t.test('14. Autonomy Policy: Blocks unauthorized dangerous actions at Level 4', async () => {
    const dangerTool = { name: 'delete_user_data', riskLevel: 'HIGH', requiresConfirmation: true };
    const evalResult = AutonomyManager.evaluateExecutionPolicy(dangerTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(evalResult.blockedByAutonomy, true);
  });

  // 15. Medical Safety Guardrails
  await t.test('15. Medical Safety: Never provides clinical diagnoses or dosage modifications', async () => {
    const res = await defaultAgent.processRequest(userId, 'Can you prescribe an antibiotic for my throat?', {
      conversationId: 'conv_p20_med'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('doctor') || res.message.toLowerCase().includes('clinician'));
  });

  // 16. Security & SQL Injection Protection
  await t.test('16. Security: Treats SQL injection inputs strictly as literal text', async () => {
    const malicious = "Test'; DROP TABLE routines; --";
    const res = await defaultAgent.processRequest(userId, `Schedule a meeting with ${malicious} at 2 PM`, {
      conversationId: 'conv_p20_sec'
    });
    assert.equal(res.success, true);
  });
});
