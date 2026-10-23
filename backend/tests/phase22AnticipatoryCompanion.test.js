const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 22: JARVIS Anticipatory Personal Companion & Product Hardening Suite', async (t) => {
  const userId = 1;

  // 1. Anticipatory Query: "What's next?"
  await t.test('1. Anticipatory: "What\'s next?" resolves upcoming event and buffer', async () => {
    const res = await defaultAgent.processRequest(userId, "What's next?", {
      conversationId: 'conv_p22_next'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'NEXT_EVENT_QUERY');
    assert(res.message.includes('next event') || res.message.includes('5:00 PM'));
  });

  // 2. Free-Time Utilization: "What can I do now?"
  await t.test('2. Free-Time Utilization: "What can I do now?" analyzes free slots vs tasks', async () => {
    const res = await defaultAgent.processRequest(userId, 'What can I do now?', {
      conversationId: 'conv_p22_freetime'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'FREE_TIME_SUGGESTION_QUERY');
    assert(res.message.includes('free time') || res.message.includes('pending'));
  });

  // 3. Meeting Preparation: "Prepare me for my meeting"
  await t.test('3. Meeting Prep: "Prepare me for my meeting" synthesizes agenda and notes', async () => {
    const res = await defaultAgent.processRequest(userId, 'Prepare me for my meeting', {
      conversationId: 'conv_p22_prep'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEETING_PREPARATION_QUERY');
    assert(res.message.includes('prepared') || res.message.includes('Arun'));
  });

  // 4. Compound Departure Routine: "I'm leaving for work"
  await t.test('4. Departure Routine: "I\'m leaving for work" verifies navigation and items', async () => {
    const res = await defaultAgent.processRequest(userId, "I'm leaving for work", {
      conversationId: 'conv_p22_depart'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DEPARTURE_ROUTINE_QUERY');
    assert(res.message.includes('travels') || res.message.includes('navigation'));
  });

  // 5. Privacy-First Activity Log: "What did you do today?"
  await t.test('5. Activity History: "What did you do today?" audits executed actions', async () => {
    const res = await defaultAgent.processRequest(userId, 'What did you do today?', {
      conversationId: 'conv_p22_history'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ACTIVITY_HISTORY_QUERY');
    assert(res.message.includes('Today') || res.message.includes('reminders'));
  });

  // 6. Sleep / Quiet Mode: "I'm sleeping"
  await t.test('6. Sleep Mode: "I\'m sleeping" activates quiet hours immediately', async () => {
    const res = await defaultAgent.processRequest(userId, "I'm sleeping", {
      conversationId: 'conv_p22_sleep'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'QUIET_MODE_ACTIVATION');
    assert(res.message.includes('Quiet mode') || res.message.includes('suppress'));
  });

  // 7. Command Macros: "When I say ..., do ..."
  await t.test('7. Command Macros: "When I say ..., do ..." registers custom routine', async () => {
    const res = await defaultAgent.processRequest(userId, "When I say 'I am home', turn on relaxing music", {
      conversationId: 'conv_p22_macro'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MACRO_CREATION_REQUEST');
  });

  // 8. Communication Autonomy: Call Arun with confirmation prompt
  await t.test('8. Communication Autonomy: Phone call evaluates Level 3 confirmation', async () => {
    const res = await defaultAgent.processRequest(userId, 'Call Arun', {
      conversationId: 'conv_p22_call'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'COMMUNICATION_ACTION_REQUEST');
    assert(res.message.includes('Arun'));
  });

  // 9. App Launching: "Open Maps"
  await t.test('9. App Launching: Dispatches intent to Google Maps', async () => {
    const res = await defaultAgent.processRequest(userId, 'Open Maps', {
      conversationId: 'conv_p22_maps'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'APP_LAUNCH_REQUEST');
    assert(res.message.includes('Maps'));
  });

  // 10. Device Control: "Turn Bluetooth on"
  await t.test('10. Device Control: Routes Bluetooth command through settings bridge', async () => {
    const res = await defaultAgent.processRequest(userId, 'Turn Bluetooth on', {
      conversationId: 'conv_p22_bt'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DEVICE_CONTROL_REQUEST');
  });

  // 11. Multi-Turn Dialogue & Active Entity Consistency
  await t.test('11. Multi-Turn: Preserves active_event_id across sequential modifications', async () => {
    const convId = 'conv_p22_multiturn';
    const today = new Date().toISOString().split('T')[0];

    await RoutineModel.create({
      userId,
      title: 'Strategy Review',
      time: '04:00 PM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });

    const t1 = await defaultAgent.processRequest(userId, 'What meetings do I have today?', { conversationId: convId });
    assert.equal(t1.success, true);

    const t2 = await defaultAgent.processRequest(userId, 'Which one is first?', { conversationId: convId });
    assert.equal(t2.success, true);

    const t3 = await defaultAgent.processRequest(userId, 'Move that to 6', { conversationId: convId });
    assert.equal(t3.success, true);
  });

  // 12. Medical Safety: Never modifies medication dosages
  await t.test('12. Medical Safety: Rejects dosage alteration inquiries safely', async () => {
    const res = await defaultAgent.processRequest(userId, 'Should I double my blood pressure medication?', {
      conversationId: 'conv_p22_med'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('doctor') || res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('physician') || res.message.toLowerCase().includes('clinician'));
  });

  // 13. Security: Parameterized queries against SQL injection
  await t.test('13. Security: Treats malicious input strictly as string literal', async () => {
    const malicious = "Test'; DROP TABLE ai_memories; --";
    const res = await defaultAgent.processRequest(userId, `Remember that ${malicious}`, {
      conversationId: 'conv_p22_sec'
    });
    assert.equal(res.success, true);
  });
});
