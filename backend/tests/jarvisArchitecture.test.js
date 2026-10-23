const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
const pool = require('../config/db');
const { masterOrchestrator, SUPERVISOR_STATES } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const { aiProviderRegistry } = require('../services/jarvis/providers/AIProviderRegistry');
const { aiModelRouter, TASK_CAPABILITIES } = require('../services/jarvis/providers/AIModelRouter');
const SeniorCareProfile = require('../services/jarvis/profiles/SeniorCareProfile');
const ProfessionalProfile = require('../services/jarvis/profiles/ProfessionalProfile');
const RoutineModel = require('../models/routineModel');
const { idempotencyManager } = require('../services/jarvis/agent/idempotencyManager');

describe('Phase 58: JARVIS Multi-AI Personal Companion Architecture Suite', () => {
  const testUserId = 9580;
  const today = new Date().toISOString().split('T')[0];

  beforeEach(async () => {
    idempotencyManager.clear(testUserId);
    await pool.query('DELETE FROM routines WHERE user_id = ?', [testUserId]);
    await pool.query('DELETE FROM ai_conversation_messages WHERE conversation_id IN (SELECT id FROM ai_conversations WHERE user_id = ?)', [testUserId]);
    await pool.query('DELETE FROM ai_conversations WHERE user_id = ?', [testUserId]);
  });

  describe('1. Multi-AI Provider Registry & Intelligent Router', () => {
    it('Registers all core AI providers (OpenAI, Gemini, ElevenLabs, LiveKit)', () => {
      const providers = aiProviderRegistry.getAll();
      assert.ok(providers.length >= 4);
      assert.ok(aiProviderRegistry.get('openai'));
      assert.ok(aiProviderRegistry.get('gemini'));
      assert.ok(aiProviderRegistry.get('elevenlabs'));
      assert.ok(aiProviderRegistry.get('livekit'));
    });

    it('Routes capabilities to appropriate primary and secondary models', () => {
      const ttsProviders = aiModelRouter.getProvidersForCapability(TASK_CAPABILITIES.TTS);
      assert.ok(ttsProviders.some(p => p.name === 'elevenlabs'));

      const voiceProviders = aiModelRouter.getProvidersForCapability(TASK_CAPABILITIES.REALTIME_VOICE);
      assert.ok(voiceProviders.some(p => p.name === 'livekit'));

      const reasoningProviders = aiModelRouter.getProvidersForCapability(TASK_CAPABILITIES.REASONING);
      assert.ok(reasoningProviders.some(p => p.name === 'gemini' || p.name === 'openai'));
    });
  });

  describe('2. Master Orchestrator Lifecycle & Multi-Turn State', () => {
    it('Creates structured session and executes end-to-end command lifecycle', async () => {
      const session = masterOrchestrator.createSession(testUserId);
      assert.ok(session.sessionId);
      assert.strictEqual(session.userId, testUserId);

      const res = await masterOrchestrator.process(testUserId, 'Good morning Jarvis', {
        sessionId: session.sessionId
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.requestId);
      assert.strictEqual(res.sessionId, session.sessionId);
      assert.ok(res.speech.length > 5);
    });

    it('Executes barge-in interruption cleanly', () => {
      const res = masterOrchestrator.interrupt('session_active_test');
      assert.strictEqual(res.interrupted, true);
      assert.strictEqual(res.state, SUPERVISOR_STATES.INTERRUPTED);
    });
  });

  describe('3. Backend Domain Capabilities (SeniorCare & Professional Profiles)', () => {
    it('SeniorCareProfile retrieves complete health, medication and SOS summary', async () => {
      const summary = await SeniorCareProfile.getSummary(testUserId);
      assert.ok(Array.isArray(summary.medications));
      assert.strictEqual(typeof summary.todayHydrationMl, 'number');
      assert.ok(Array.isArray(summary.emergencyContacts));

      const sos = await SeniorCareProfile.triggerSos(testUserId, 'Emergency test');
      assert.strictEqual(sos.status, 'EMERGENCY_TRIGGERED');
      assert.strictEqual(sos.userId, testUserId);
    });

    it('ProfessionalProfile generates workday briefing and focus blocks', async () => {
      await RoutineModel.create({
        userId: testUserId,
        title: 'Project Architecture Sync',
        time: '11:00 AM',
        date: today,
        category: 'work'
      });

      const briefing = await ProfessionalProfile.getWorkdayBriefing(testUserId, today);
      assert.strictEqual(briefing.date, today);
      assert.strictEqual(briefing.meetings.length, 1);
      assert.strictEqual(briefing.meetings[0].title, 'Project Architecture Sync');

      const focus = await ProfessionalProfile.planFocusBlock(testUserId, {
        title: 'Deep Coding Block',
        time: '03:00 PM',
        durationMinutes: 90
      });
      assert.ok(focus.id);
      assert.strictEqual(focus.title, 'Deep Coding Block');
    });
  });

  describe('4. Autonomous Actions & Zero-Guess Verification Invariants', () => {
    it('Refuses to cancel non-existent items and preserves all unrelated routines', async () => {
      await RoutineModel.create({ userId: testUserId, title: 'Lunch', time: '01:00 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Tea break', time: '04:00 PM', date: today });

      const res = await masterOrchestrator.process(testUserId, 'Cancel the meeting from my schedule', {
        sessionId: `sess_cancel_test_${Date.now()}`
      });

      assert.match(res.speech, /couldn't find a meeting|no matching|which meeting|specify which/i);

      // Verify DB state
      const dbItems = await RoutineModel.getByDate(testUserId, today);
      const lunch = dbItems.find(i => i.title.includes('Lunch'));
      const tea = dbItems.find(i => i.title.includes('Tea break'));
      assert.ok(lunch, 'Lunch must not be deleted');
      assert.ok(tea, 'Tea break must not be deleted');
    });

    it('Cancels exact meeting when found and verifies database soft-deletion', async () => {
      await RoutineModel.create({ userId: testUserId, title: 'Sprint Review Meeting', time: '03:00 PM', date: today });
      await RoutineModel.create({ userId: testUserId, title: 'Tea break', time: '04:00 PM', date: today });

      const res = await masterOrchestrator.process(testUserId, 'Cancel the meeting from my schedule', {
        sessionId: `sess_cancel_exact_${Date.now()}`
      });

      assert.strictEqual(res.success, true);
      assert.match(res.speech, /cancelled.*meeting/i);

      const dbItems = await RoutineModel.getByDate(testUserId, today);
      const meeting = dbItems.find(i => i.title.includes('Sprint Review'));
      const tea = dbItems.find(i => i.title.includes('Tea break'));

      assert.strictEqual(meeting, undefined, 'Meeting must be soft-deleted in DB');
      assert.ok(tea, 'Tea break must remain intact');
    });
  });

  after(async () => {
    await pool.end();
  });
});
