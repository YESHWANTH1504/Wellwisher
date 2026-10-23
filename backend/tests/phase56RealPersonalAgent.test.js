const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { JarvisSupervisorAgent, SUPERVISOR_STATES } = require('../services/jarvis/agent/JarvisSupervisorAgent');
const RoutineModel = require('../models/routineModel');

describe('Phase 56: Genuine Autonomous Personal AI Agent End-to-End Suite', () => {
  let supervisor;
  const testUserId = 9568;
  const sessionId = 'session_p56_autonomous';
  const today = new Date().toISOString().split('T')[0];

  beforeEach(async () => {
    supervisor = new JarvisSupervisorAgent();
    // Clean up any test routines for this user
    const items = await RoutineModel.getByDate(testUserId, today);
    for (const item of items) {
      await RoutineModel.softDelete(item.id, testUserId);
    }
  });

  describe('1. Exact Bug Fix: Entity-Specific Cancellation vs Fallback Deletion', () => {
    it('Refuses to cancel "Tea break" when user asks to "Cancel the meeting from my schedule"', async () => {
      // Seed the exact schedule from the screenshot
      await RoutineModel.create({ userId: testUserId, title: 'Medication', time: '08:30 AM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Lunch', time: '01:00 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Rest', time: '02:30 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Tea break', time: '04:00 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Dinner', time: '07:30 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Sleep', time: '09:30 PM', date: today });

      const res = await supervisor.processRequest(
        testUserId,
        'Cancel the meeting from my schedule.',
        { sessionId }
      );

      // Verify response indicates no meeting found
      assert.match(res.speech, /couldn't find a meeting|no matching|not found/i);
      assert.doesNotMatch(res.speech, /cancelled.*tea break/i);
      assert.doesNotMatch(res.speech, /Here is your agenda/i);

      // Verify "Tea break" is STILL present and intact in the database
      const activeItems = await RoutineModel.getByDate(testUserId, today);
      const teaBreak = activeItems.find(i => i.title.toLowerCase().includes('tea break'));
      assert.ok(teaBreak, 'CRITICAL: Tea break must NOT be deleted when user asked to cancel meeting!');
      assert.strictEqual(activeItems.length, 6, 'All 6 routines must remain untouched');
    });

    it('Cancels Team Meeting at 3 PM cleanly when it actually exists, preserving Tea break', async () => {
      // Seed Team Meeting + Tea break
      await RoutineModel.create({ userId: testUserId, title: 'Team Meeting', time: '03:00 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Tea break', time: '04:00 PM', date: today });

      const res = await supervisor.processRequest(
        testUserId,
        'Cancel the meeting from my schedule.',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.match(res.speech, /cancelled.*meeting/i);
      assert.doesNotMatch(res.speech, /tea break/i);

      // Verify DB state
      const activeItems = await RoutineModel.getByDate(testUserId, today);
      const meeting = activeItems.find(i => i.title.toLowerCase().includes('team meeting'));
      const teaBreak = activeItems.find(i => i.title.toLowerCase().includes('tea break'));

      assert.strictEqual(meeting, undefined, 'Team Meeting must be deleted from active schedule');
      assert.ok(teaBreak, 'Tea break must remain intact');
    });
  });

  describe('2. Autonomous Multi-Turn Execution, Rescheduling & Verification', () => {
    it('End-to-end chain: Schedule → Reschedule ("Actually make it 8") → Cancel ("Cancel that")', async () => {
      // Step 1: Create schedule
      const createRes = await supervisor.processRequest(
        testUserId,
        'Remind me to call Mom at 7 PM',
        { sessionId }
      );
      assert.strictEqual(createRes.success, true);
      assert.match(createRes.speech, /scheduled.*call Mom.*7/i);

      // Verify DB creation
      let items = await RoutineModel.getByDate(testUserId, today);
      let momReminder = items.find(i => i.title.toLowerCase().includes('call mom'));
      assert.ok(momReminder, 'Call Mom reminder must exist in DB');

      // Step 2: Reschedule via pronoun reference
      const moveRes = await supervisor.processRequest(
        testUserId,
        'Actually make that 8 PM',
        { sessionId }
      );
      assert.strictEqual(moveRes.success, true);
      assert.match(moveRes.speech, /moved.*8/i);

      // Step 3: Cancellation via pronoun reference
      const cancelRes = await supervisor.processRequest(
        testUserId,
        'Cancel that',
        { sessionId }
      );
      assert.strictEqual(cancelRes.success, true);
      assert.strictEqual(cancelRes.intent, 'ACTION_CANCELLED');
      assert.match(cancelRes.speech, /cancelled/i);
    });
  });

  describe('3. Real Knowledge & Conversation vs Non-Simulated Action Separation', () => {
    it('"Tell me a joke" speaks an authentic joke without triggering schedule tools', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'Tell me a joke',
        { sessionId }
      );
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'JOKE_REQUEST');
      assert.doesNotMatch(res.speech, /schedule/i);
      assert.doesNotMatch(res.speech, /agenda/i);
      assert.ok(res.speech.length > 10);
    });

    it('"What is 25 times 8?" evaluates dynamic arithmetic calculation', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'What is 25 times 8?',
        { sessionId }
      );
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /200/);
    });
  });
});
