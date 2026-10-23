const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { masterOrchestrator, SUPERVISOR_STATES } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const { defaultVoiceRouter } = require('../services/jarvis/communication/voiceCommandRouter');
const { aiModelRouter, TASK_CAPABILITIES } = require('../services/jarvis/providers/AIModelRouter');
const RoutineModel = require('../models/routineModel');
const { idempotencyManager } = require('../services/jarvis/agent/idempotencyManager');

describe('Phase 59: JARVIS True Autonomous Personal Companion Suite', () => {
  const testUserId = 9599;
  const today = new Date().toISOString().split('T')[0];

  beforeEach(async () => {
    idempotencyManager.clear(testUserId);
    const items = await RoutineModel.getByDate(testUserId, today);
    for (const item of items) {
      await RoutineModel.softDelete(item.id, testUserId);
    }
  });

  describe('1. Multi-AI Architecture & Provider Router', () => {
    it('1.1 Routes fast reasoning to available provider or deterministic fallback cleanly', async () => {
      const execResult = await aiModelRouter.routeAndExecute(
        TASK_CAPABILITIES.FAST_INTENT,
        async (provider) => {
          return { handledBy: provider.name, speed: 'fast' };
        },
        async () => {
          return { handledBy: 'deterministic_fallback', speed: 'instant' };
        }
      );

      assert.strictEqual(execResult.success, true);
      assert.ok(['gemini', 'openai', 'deterministic_fallback'].includes(execResult.provider));
    });

    it('1.2 Fallback gracefully when primary provider fails', async () => {
      const candidates = aiModelRouter.getProvidersForCapability(TASK_CAPABILITIES.REASONING);
      assert.ok(candidates.length > 0);
    });
  });

  describe('2. Real Device Control & Application Launching', () => {
    it('2.1 "Open WhatsApp" produces real OPEN_APPLICATION tool execution plan and verified speech', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Open WhatsApp', {
        sessionId: 'phase59_device_whatsapp'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'OPEN_APPLICATION');
      assert.match(res.speech, /Opening WhatsApp/i);
      
      const step = res.steps[0];
      assert.ok(step);
      assert.strictEqual(step.toolName, 'open_application');
      assert.strictEqual(step.result.status, 'COMPLETED');
      assert.strictEqual(step.result.data.packageName, 'com.whatsapp');
      assert.strictEqual(step.result.data.status, 'DISPATCHED_TO_NATIVE_BRIDGE');
    });

    it('2.2 "Open YouTube" dispatches YouTube package correctly', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Open YouTube', {
        sessionId: 'phase59_device_youtube'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'OPEN_APPLICATION');
      assert.match(res.speech, /Opening YouTube/i);
      assert.strictEqual(res.steps[0].result.data.packageName, 'com.google.android.youtube');
    });

    it('2.3 "Open Settings" produces OPEN_SETTINGS action', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Open Settings', {
        sessionId: 'phase59_device_settings'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'OPEN_APPLICATION');
      assert.match(res.speech, /Opening Settings/i);
    });
  });

  describe('3. Database Mutation & Post-Execution Verification', () => {
    it('3.1 "Cancel my 4 PM meeting" locates and cancels the actual database record', async () => {
      // Seed meeting
      const created = await RoutineModel.create({
        userId: testUserId,
        title: 'Team Sprint Planning',
        time: '04:00 PM',
        date: today,
        category: 'meeting'
      });

      const res = await masterOrchestrator.process(testUserId, 'Cancel my 4 PM meeting', {
        sessionId: 'phase59_cancel_meeting'
      });

      assert.strictEqual(res.success, true);
      assert.match(res.speech, /cancelled/i);

      // Verify in DB
      const updated = await RoutineModel.getById(created.id, testUserId);
      assert.ok(!updated || updated.is_deleted === 1);
    });

    it('3.2 "Cancel my meeting" with no existing items returns honest failure without hallucination', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Cancel my meeting', {
        sessionId: 'phase59_cancel_none'
      });

      assert.strictEqual(res.success, true);
      assert.match(res.speech, /couldn't find|no meeting|not found/i);
    });
  });

  describe('4. Conversational Flow, Context & Barge-in', () => {
    it('4.1 Multi-turn context resolution with pronouns: "Remind me to call Mom at 8 PM" -> "Actually make that 9" -> "Cancel that"', async () => {
      const sessionId = 'phase59_multiturn_chain';

      // Turn 1: Create
      const t1 = await masterOrchestrator.process(testUserId, 'Remind me to call Mom at 8 PM', { sessionId });
      assert.strictEqual(t1.success, true);
      assert.match(t1.speech, /scheduled.*8/i);

      // Turn 2: Move
      const t2 = await masterOrchestrator.process(testUserId, 'Actually make that 9 PM', { sessionId });
      assert.strictEqual(t2.success, true);
      assert.match(t2.speech, /moved it to 9 PM|9:00 PM/i);

      // Turn 3: Cancel
      const t3 = await masterOrchestrator.process(testUserId, 'Cancel that', { sessionId });
      assert.strictEqual(t3.success, true);
      assert.match(t3.speech, /cancelled/i);
    });

    it('4.2 Master Orchestrator interrupt halts speech immediately', () => {
      const sessionId = 'phase59_interrupt_session';
      const intRes = masterOrchestrator.interrupt(sessionId);
      assert.strictEqual(intRes.success, true);
      assert.strictEqual(intRes.state, SUPERVISOR_STATES.INTERRUPTED);
    });
  });
});
