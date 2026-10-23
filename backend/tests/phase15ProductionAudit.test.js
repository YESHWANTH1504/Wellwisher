const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const { confirmationManager } = require('../services/jarvis/agent/confirmationManager');

test('Phase 15: JARVIS Final Production Audit, Gap Analysis & Security Hardening Suite', async (t) => {
  const userId = 'user_p15_prod_001';
  const otherUserId = 'user_p15_intruder_002';

  // --- Challenge 1: Real Natural Language Understanding ---
  await t.test('1.1 NLU: "What\'s happening today?" resolves to DAILY_FOCUS_QUERY with real multi-tool execution', async () => {
    const res = await defaultAgent.processRequest(userId, "What's happening today?");
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
    const steps = res.steps || res.executionSteps || [];
    assert(steps.length >= 2, 'Must execute multi-domain tools');
  });

  await t.test('1.2 NLU: "Anything important I should deal with?" resolves to DAILY_FOCUS_QUERY', async () => {
    const res = await defaultAgent.processRequest(userId, 'Anything important I should deal with?');
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
  });

  await t.test('1.3 NLU: "I prefer working out early. Remember that for me." resolves to MEMORY_REQUEST', async () => {
    const res = await defaultAgent.processRequest(userId, 'I prefer working out early. Remember that for me.');
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_REQUEST');
  });

  await t.test('1.4 NLU: "What do you know about my habits?" resolves to MEMORY_QUERY', async () => {
    const res = await defaultAgent.processRequest(userId, 'What do you know about my habits?');
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_QUERY');
  });

  // --- Challenge 2: Multi-Turn Context & Memory (3-Turn Sequential Flows) ---
  await t.test('2.1 Multi-Turn 3-Turn Flow A: Appointments -> Which one is first -> Move that to tomorrow', async () => {
    const convId = 'conv_p15_3turn_a';

    // Turn 1
    const turn1 = await defaultAgent.processRequest(userId, 'What appointments are coming up?', { conversationId: convId });
    assert.equal(turn1.success, true);
    assert.equal(turn1.intent, 'APPOINTMENTS_QUERY');

    // Turn 2
    const turn2 = await defaultAgent.processRequest(userId, 'Which one is first?', { conversationId: convId });
    assert.equal(turn2.success, true);
    assert.equal(turn2.intent, 'APPOINTMENTS_QUERY');

    // Turn 3
    const turn3 = await defaultAgent.processRequest(userId, 'Move that to tomorrow.', { conversationId: convId });
    assert.equal(turn3.success, true);
    assert.equal(turn3.intent, 'SCHEDULE_REQUEST');
  });

  await t.test('2.2 Multi-Turn 3-Turn Flow B: Health Trends -> What stands out -> What should I discuss with my doctor', async () => {
    const convId = 'conv_p15_3turn_b';

    // Turn 1
    const turn1 = await defaultAgent.processRequest(userId, 'Show my health trends.', { conversationId: convId });
    assert.equal(turn1.success, true);
    assert.equal(turn1.intent, 'HEALTH_TRENDS_QUERY');

    // Turn 2
    const turn2 = await defaultAgent.processRequest(userId, 'What stands out?', { conversationId: convId });
    assert.equal(turn2.success, true);
    assert.equal(turn2.intent, 'HEALTH_ALERTS_QUERY');

    // Turn 3
    const turn3 = await defaultAgent.processRequest(userId, 'What should I discuss with my doctor about this?', { conversationId: convId });
    assert.equal(turn3.success, true);
    assert.equal(turn3.intent, 'DOCTOR_BRIEFING_REQUEST');
  });

  // --- Challenge 4: Adversarial Confirmation Security ---
  await t.test('4.1 Adversarial: Modification of target arguments is rejected', async () => {
    const tokenObj = confirmationManager.createToken({
      userId,
      tool: 'delete_schedule',
      arguments: { scheduleId: 'rot_p15_secret_1' }
    });

    const tampered = confirmationManager.validateAndConsume(
      tokenObj.confirmationId,
      userId,
      'delete_schedule',
      { scheduleId: 'rot_p15_TAMPERED' }
    );
    assert.equal(tampered.valid, false);
    assert.equal(tampered.errorCode, 'CONFIRMATION_ARGUMENTS_MISMATCH');
  });

  await t.test('4.2 Adversarial: Cross-user token execution is rejected', async () => {
    const tokenObj = confirmationManager.createToken({
      userId,
      tool: 'delete_schedule',
      arguments: { scheduleId: 'rot_p15_secret_2' }
    });

    const crossUser = confirmationManager.validateAndConsume(
      tokenObj.confirmationId,
      otherUserId,
      'delete_schedule',
      { scheduleId: 'rot_p15_secret_2' }
    );
    assert.equal(crossUser.valid, false);
    assert.equal(crossUser.errorCode, 'UNAUTHORIZED_CONFIRMATION');
  });

  // --- Medical Safety Final Hardening ---
  await t.test('5.1 Medical Safety: "Is this result dangerous?" triggers non-diagnostic triage disclaimer', async () => {
    const res = await defaultAgent.processRequest(userId, 'Is this result dangerous?');
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEDICAL_NON_DIAGNOSTIC_QUERY');
    assert(res.message.includes('cannot diagnose medical conditions or provide clinical emergency triage'));
  });

  await t.test('5.2 Medical Safety: "What medication should I take?" triggers non-prescriptive disclaimer', async () => {
    const res = await defaultAgent.processRequest(userId, 'What medication should I take?');
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEDICAL_SAFETY_ALERT');
    assert(res.message.includes('cannot prescribe medications'));
  });
});
