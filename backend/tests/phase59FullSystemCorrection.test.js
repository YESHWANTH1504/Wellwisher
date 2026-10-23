const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const { activeTaskManager } = require('../services/jarvis/tasks/ActiveTaskManager');
const RoutineModel = require('../models/routineModel');

describe('Phase 59 Master Implementation: Full System Correction Suite', () => {
  const testUserId = 9899;
  const today = new Date().toISOString().split('T')[0];
  const sessionId = 'session_phase59_master_test';

  before(async () => {
    activeTaskManager.clearActiveTask(sessionId);
    const items = await RoutineModel.getByDate(testUserId, today);
    for (const item of items) {
      await RoutineModel.softDelete(item.id, testUserId);
    }
  });

  describe('1. The Canonical 40-Step Master Acceptance Sequence', () => {
    it('1.1 Greeting: "Hey Jarvis" -> Returns welcoming conversational greeting', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Hey Jarvis', { sessionId });
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /hey|hello|listening|here/i);
    });

    it('1.2 Action 1: "Open WhatsApp" -> Resolves OPEN_APPLICATION, launches package, sets active task', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Open WhatsApp', { sessionId });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'OPEN_APPLICATION');
      assert.match(res.speech, /Opening WhatsApp/i);

      const activeTask = activeTaskManager.getActiveTask(sessionId);
      assert.ok(activeTask);
      assert.strictEqual(activeTask.type, 'OPEN_APPLICATION');
      assert.strictEqual(activeTask.application, 'WhatsApp');
    });

    it('1.3 Contextual Follow-up 1: "What is taking so long?" -> Remembers active WhatsApp task and acknowledges status', async () => {
      // Seed active task
      activeTaskManager.setActiveTask(sessionId, {
        type: 'OPEN_APPLICATION',
        application: 'WhatsApp',
        packageName: 'com.whatsapp',
        status: 'COMPLETED',
        verified: true
      });

      const res = await masterOrchestrator.process(testUserId, 'What is taking so long?', { sessionId });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'CURRENT_TASK_STATUS');
      assert.match(res.speech, /WhatsApp is already open|Sorry about the delay/i);
    });

    it('1.4 Action 2: "Open Settings" -> Launches Android Settings', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Open Settings', { sessionId });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'OPEN_APPLICATION');
      assert.match(res.speech, /Opening Settings/i);
    });

    it('1.5 Contextual Follow-up 2: "Actually, go back to WhatsApp" -> Resolves previous app entity and switches back', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Actually, go back to WhatsApp', { sessionId });
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /back in WhatsApp|WhatsApp/i);
    });

    it('1.6 Multi-Turn Action: "Remind me to call Mom at 8" -> Creates reminder and sets working memory', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Remind me to call Mom at 8', { sessionId });
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /scheduled.*8|remind.*8/i);
    });

    it('1.7 Multi-Turn Follow-up 1: "Actually make that 9" -> Updates reminder to 9 PM', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Actually make that 9', { sessionId });
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /moved it to.*9|9:00 PM/i);
    });

    it('1.8 Multi-Turn Follow-up 2: "Cancel that" -> Cancels reminder and clears working memory', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Cancel that', { sessionId });
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /cancelled/i);
    });

    it('1.9 Conversational Humor: "Tell me a joke" -> Returns natural joke without schedule confusion', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Tell me a joke', { sessionId });
      assert.strictEqual(res.success, true);
      assert.ok(res.intent === 'JOKE_REQUEST' || res.intent === 'JOKE');
      assert.ok(res.speech.length > 10);
      assert.ok(!res.speech.toLowerCase().includes('schedule'));
    });

    it('1.10 Factual Schedule: "What\'s on my schedule today?" -> Factual summary of database data', async () => {
      const res = await masterOrchestrator.process(testUserId, "What's on my schedule today?", { sessionId });
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'SCHEDULE_QUERY');
      assert.match(res.speech, /nothing on your schedule|no routines|no events|clear/i);
    });
  });
});
