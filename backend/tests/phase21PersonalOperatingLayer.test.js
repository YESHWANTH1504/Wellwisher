const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 21: JARVIS True Personal Operating Layer & Real-World Autonomy Suite', async (t) => {
  const userId = 1;

  // Test 1: "Hey JARVIS, schedule a meeting with Arun tomorrow at 5."
  await t.test('Test 1: Schedule meeting with Arun tomorrow at 5', async () => {
    const res = await defaultAgent.processRequest(userId, 'Schedule a meeting with Arun tomorrow at 5 PM', {
      conversationId: 'conv_p21_t1'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'SCHEDULE_REQUEST');
    assert(res.message.includes('5:00 PM') || res.message.includes('scheduled'));
  });

  // Test 2: "What do I have tomorrow?"
  await t.test('Test 2: What do I have tomorrow?', async () => {
    const res = await defaultAgent.processRequest(userId, 'What do I have tomorrow?', {
      conversationId: 'conv_p21_t2'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'SCHEDULE_QUERY');
    assert(typeof res.message === 'string');
  });

  // Test 3: "Which one is first?"
  await t.test('Test 3: Which one is first?', async () => {
    const convId = 'conv_p21_t3';
    await defaultAgent.processRequest(userId, 'What meetings do I have today?', { conversationId: convId });
    const res = await defaultAgent.processRequest(userId, 'Which one is first?', { conversationId: convId });
    assert.equal(res.success, true);
    assert(res.intent === 'SCHEDULE_FIRST_QUERY' || res.intent === 'SCHEDULE_QUERY');
  });

  // Test 4: "Move that to 6."
  await t.test('Test 4: Move that to 6', async () => {
    const res = await defaultAgent.processRequest(userId, 'Move that to 6 PM', {
      conversationId: 'conv_p21_t4'
    });
    assert.equal(res.success, true);
  });

  // Test 5: "Actually make it 6:30."
  await t.test('Test 5: Actually make it 6:30', async () => {
    const res = await defaultAgent.processRequest(userId, 'Actually make it 6:30 PM', {
      conversationId: 'conv_p21_t5'
    });
    assert.equal(res.success, true);
  });

  // Test 6: "Remind me 30 minutes before."
  await t.test('Test 6: Remind me 30 minutes before', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remind me 30 minutes before', {
      conversationId: 'conv_p21_t6'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEETING_BUFFER_REMINDER');
    assert(res.message.includes('30 minutes'));
  });

  // Test 7: "Cancel it."
  await t.test('Test 7: Cancel it', async () => {
    const res = await defaultAgent.processRequest(userId, 'Cancel that', {
      conversationId: 'conv_p21_t7'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ACTION_CANCELLED');
  });

  // Test 8: "Start my day."
  await t.test('Test 8: Start my day', async () => {
    const res = await defaultAgent.processRequest(userId, 'Start my day', {
      conversationId: 'conv_p21_t8'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
  });

  // Test 9: "Wrap up my day."
  await t.test('Test 9: Wrap up my day', async () => {
    const res = await defaultAgent.processRequest(userId, 'Wrap up my day', {
      conversationId: 'conv_p21_t9'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'EVENING_SUMMARY_QUERY');
  });

  // Test 10: "Remember that I prefer morning meetings."
  await t.test('Test 10: Remember that I prefer morning meetings', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remember that I prefer morning meetings', {
      conversationId: 'conv_p21_t10'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_REQUEST');
  });

  // Test 11: "What do you remember about me?"
  await t.test('Test 11: What do you remember about me?', async () => {
    const res = await defaultAgent.processRequest(userId, 'What do you remember about me?', {
      conversationId: 'conv_p21_t11'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_QUERY');
  });

  // Test 12: "Forget that preference."
  await t.test('Test 12: Forget that preference', async () => {
    const res = await defaultAgent.processRequest(userId, 'Forget that preference', {
      conversationId: 'conv_p21_t12'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_DELETE_REQUEST');
  });

  // Test 13: "Don't disturb me after 10 PM."
  await t.test('Test 13: Don\'t disturb me after 10 PM', async () => {
    const res = await defaultAgent.processRequest(userId, "Don't disturb me after 10 PM", {
      conversationId: 'conv_p21_t13'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'QUIET_HOURS_SETTING');
  });

  // Test 14: "What can you do?"
  await t.test('Test 14: What can you do?', async () => {
    const res = await defaultAgent.processRequest(userId, 'What can you do?', {
      conversationId: 'conv_p21_t14'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'CAPABILITY_QUERY');
  });

  // Test 15: "Stop."
  await t.test('Test 15: Stop', async () => {
    const res = await defaultAgent.processRequest(userId, 'Stop', {
      conversationId: 'conv_p21_t15'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ASSISTANT_STOP');
    assert.equal(res.message, 'Standing by.');
  });

  // Test 16: "Call Arun."
  await t.test('Test 16: Call Arun', async () => {
    const res = await defaultAgent.processRequest(userId, 'Call Arun', {
      conversationId: 'conv_p21_t16'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'COMMUNICATION_ACTION_REQUEST');
    assert(res.message.includes('Arun'));
  });

  // Test 17: "Open Maps."
  await t.test('Test 17: Open Maps', async () => {
    const res = await defaultAgent.processRequest(userId, 'Open Maps', {
      conversationId: 'conv_p21_t17'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'APP_LAUNCH_REQUEST');
    assert(res.message.includes('Maps'));
  });

  // Test 18: "Turn Bluetooth on."
  await t.test('Test 18: Turn Bluetooth on', async () => {
    const res = await defaultAgent.processRequest(userId, 'Turn Bluetooth on', {
      conversationId: 'conv_p21_t18'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DEVICE_CONTROL_REQUEST');
  });

  // Test 19: "Remind me if I haven't worked out by 8."
  await t.test('Test 19: Remind me if I haven\'t worked out by 8', async () => {
    const res = await defaultAgent.processRequest(userId, "Remind me if I haven't worked out by 8", {
      conversationId: 'conv_p21_t19'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'AUTOMATION_RULE_CREATION');
  });

  // Test 20: "Tell me what I need to focus on today."
  await t.test('Test 20: Tell me what I need to focus on today', async () => {
    const res = await defaultAgent.processRequest(userId, 'Tell me what I need to focus on today', {
      conversationId: 'conv_p21_t20'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
  });
});
