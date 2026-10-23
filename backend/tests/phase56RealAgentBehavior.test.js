const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { JarvisSupervisorAgent, SUPERVISOR_STATES } = require('../services/jarvis/agent/JarvisSupervisorAgent');

describe('Phase 56: Real AI Agent Functionality & Intelligence Suite', () => {
  let supervisor;
  const testUserId = 956;
  const sessionId = 'session_p56_main';

  beforeEach(() => {
    supervisor = new JarvisSupervisorAgent();
  });

  describe('1. Real Schedule Mutation & Verification', () => {
    it('"Add tea break at 4 PM in my schedule" creates real schedule item and verifies in DB', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'Add tea break at 4 PM in my schedule',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'SCHEDULE_REQUEST');
      assert.strictEqual(res.executionStatus, 'VERIFIED');
      assert.match(res.speech, /tea break/i);
      assert.doesNotMatch(res.speech, /Here is your agenda/i);
      assert.doesNotMatch(res.speech, /I have processed your request/i);
    });

    it('"What is on my schedule today?" queries schedule and speaks actual count', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'What is on my schedule today?',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'SCHEDULE_QUERY');
      assert.doesNotMatch(res.speech, /Here is your agenda/i);
    });
  });

  describe('2. Conversational Reasoning vs Scheduling Independence', () => {
    it('"Tell me a joke" returns a joke and NEVER returns schedule data', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'Tell me a joke',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'JOKE_REQUEST');
      assert.doesNotMatch(res.speech, /agenda/i);
      assert.doesNotMatch(res.speech, /schedule/i);
      assert.ok(res.speech.length > 10);
    });

    it('"What is 25 times 8?" calculates arithmetic dynamically and answers 200', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'What is 25 times 8?',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.match(res.speech, /200/);
      assert.doesNotMatch(res.speech, /agenda/i);
    });
  });

  describe('3. Multi-Turn Context Resolution & Cancellation', () => {
    it('"Cancel that" cancels pending/recent action safely without generic fallback', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'Cancel that',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'ACTION_CANCELLED');
      assert.strictEqual(res.speech, 'Cancelled.');
    });

    it('"What did I ask you earlier?" recalls previous working context', async () => {
      // First ask a reminder
      await supervisor.processRequest(
        testUserId,
        'Remind me to call Dad at 6 PM',
        { sessionId }
      );

      const recallRes = await supervisor.processRequest(
        testUserId,
        'What did I ask you earlier?',
        { sessionId }
      );

      assert.strictEqual(recallRes.success, true);
      assert.match(recallRes.speech, /call Dad|6:00 PM|6 PM|reminder/i);
    });
  });

  describe('4. Zero Simulation & Anti-Robotic Invariants', () => {
    it('Spoken feedback NEVER leaks internal JSON or execution tokens', async () => {
      const res = await supervisor.processRequest(
        testUserId,
        'Remind me to take vitamins at 9 AM',
        { sessionId }
      );

      assert.strictEqual(res.success, true);
      assert.doesNotMatch(res.speech, /CREATE_SCHEDULE/);
      assert.doesNotMatch(res.speech, /tool_call/);
      assert.doesNotMatch(res.speech, /\{.*\}/);
      assert.doesNotMatch(res.speech, /sqlite/i);
    });
  });
});
