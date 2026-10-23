const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { masterOrchestrator, SUPERVISOR_STATES } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const { defaultVoiceRouter } = require('../services/jarvis/communication/voiceCommandRouter');
const RoutineModel = require('../models/routineModel');
const { idempotencyManager } = require('../services/jarvis/agent/idempotencyManager');

describe('Phase 58: JARVIS Real Voice Conversation Pipeline Tests', () => {
  const testUserId = 9588;
  const today = new Date().toISOString().split('T')[0];

  beforeEach(async () => {
    idempotencyManager.clear(testUserId);
    const items = await RoutineModel.getByDate(testUserId, today);
    for (const item of items) {
      await RoutineModel.softDelete(item.id, testUserId);
    }
  });

  describe('1. Wake Word & Conversational Greeting Intelligence', () => {
    it('1. "Hi Jarvis" responds naturally as a greeting without deadlocks', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Hi Jarvis', {
        sessionId: 'session_voice_hi'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'GREETING');
      assert.match(res.speech, /Hi! I'm here|How can I (help|assist)/i);
      assert.doesNotMatch(res.speech, /schedule|agenda|failed/i);
    });

    it('2. "Hey Jarvis" responds naturally with active listening prompt', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Hey Jarvis', {
        sessionId: 'session_voice_hey'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'GREETING');
      assert.match(res.speech, /listening|here|help/i);
    });

    it('3. "Jarvis" responds with concise prompt "Yes? I\'m listening."', async () => {
      const res = await masterOrchestrator.process(testUserId, 'Jarvis', {
        sessionId: 'session_voice_solo'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'GREETING');
      assert.match(res.speech, /Yes|listening|here/i);
    });
  });

  describe('2. Voice Router & Master Orchestrator Integration', () => {
    it('4. Voice Router processes "Hey Jarvis, open WhatsApp" into native device action', async () => {
      const payload = {
        sessionId: 'voice_session_app_1',
        text: 'open WhatsApp',
        inputMode: 'VOICE',
        timestamp: Date.now().toString(),
        nonce: `nonce_${Date.now()}_1`
      };

      const res = await defaultVoiceRouter.routeVoiceCommand(testUserId, payload);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.sessionId, payload.sessionId);
      assert.match(res.speech, /Opening WhatsApp/i);
    });

    it('5. Voice Router processes "Hi Jarvis, what\'s on my schedule?" against SQLite DB', async () => {
      await RoutineModel.create({
        userId: testUserId,
        title: 'Project Architecture Sync',
        time: '10:00 AM',
        date: today
      });

      const payload = {
        sessionId: 'voice_session_sched_1',
        text: 'what is on my schedule today',
        inputMode: 'VOICE',
        timestamp: Date.now().toString(),
        nonce: `nonce_${Date.now()}_2`
      };

      const res = await defaultVoiceRouter.routeVoiceCommand(testUserId, payload);
      assert.strictEqual(res.success, true);
      assert.match(res.speech, /Project Architecture Sync|1 item/i);
    });

    it('6. Voice Router processes "Hey Jarvis, tell me a joke" without schedule hallucinations', async () => {
      const payload = {
        sessionId: 'voice_session_joke_1',
        text: 'tell me a joke',
        inputMode: 'VOICE',
        timestamp: Date.now().toString(),
        nonce: `nonce_${Date.now()}_3`
      };

      const res = await defaultVoiceRouter.routeVoiceCommand(testUserId, payload);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.intent, 'JOKE_REQUEST');
      assert.ok(res.speech.length > 10);
      assert.doesNotMatch(res.speech, /agenda|scheduled items|appointment/i);
    });
  });

  describe('3. Multi-Turn Voice Continuity & Pronoun Resolution', () => {
    it('7. Multi-Turn Voice: "Remind me to call Mom at 8 PM" -> "Actually make that 9" -> "Cancel that"', async () => {
      const sessionId = 'voice_multiturn_flow';

      // Turn 1: Create reminder
      const t1 = await defaultVoiceRouter.routeVoiceCommand(testUserId, {
        sessionId,
        text: 'remind me to call Mom at 8 PM',
        inputMode: 'VOICE',
        timestamp: Date.now().toString(),
        nonce: `nonce_${Date.now()}_t1`
      });
      assert.strictEqual(t1.success, true);
      assert.match(t1.speech, /call Mom.*8:00 PM|scheduled/i);

      // Verify in DB
      const db1 = await RoutineModel.getByDate(testUserId, today);
      assert.strictEqual(db1.length, 1);

      // Turn 2: Pronoun update "Actually make that 9"
      const t2 = await defaultVoiceRouter.routeVoiceCommand(testUserId, {
        sessionId,
        text: 'actually make that 9 PM',
        inputMode: 'VOICE',
        timestamp: Date.now().toString(),
        nonce: `nonce_${Date.now()}_t2`
      });
      assert.strictEqual(t2.success, true);
      assert.match(t2.speech, /moved it to.*9/i);

      // Turn 3: "Cancel that"
      const t3 = await defaultVoiceRouter.routeVoiceCommand(testUserId, {
        sessionId,
        text: 'cancel that',
        inputMode: 'VOICE',
        timestamp: Date.now().toString(),
        nonce: `nonce_${Date.now()}_t3`
      });
      assert.strictEqual(t3.success, true);
      assert.match(t3.speech, /cancelled/i);
    });
  });
});
