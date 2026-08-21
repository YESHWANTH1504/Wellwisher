process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');

const ContextEngine = require('../services/jarvis/context/contextEngine');
const TemporalContext = require('../services/jarvis/context/temporalContext');
const ContextRouter = require('../services/jarvis/context/contextRouter');
const ContextRanker = require('../services/jarvis/context/contextRanker');
const { SOURCE_STATUS } = require('../services/jarvis/context/contextSources');

const RoutineModel = require('../models/routineModel');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const AiConversationRepository = require('../repositories/ai/aiConversationRepository');
const pool = require('../config/db');

test('Phase 3 - Context Engine Architecture & User Context', async (t) => {
  const userId = 3001;

  await t.test('1. Rejects unauthenticated request without userId', async () => {
    await assert.rejects(
      async () => {
        await ContextEngine.buildContext(null, 'What is next?');
      },
      /Authenticated userId is required/
    );
  });

  await t.test('2. Builds context package without exposing sensitive credentials', async () => {
    const ctx = await ContextEngine.buildContext(userId, 'Plan my morning schedule');
    
    assert.ok(ctx.user);
    assert.equal(ctx.user.userId, userId);
    assert.equal(typeof ctx.user.password_hash, 'undefined', 'password_hash must never be in context');
    assert.equal(typeof ctx.user.jwt, 'undefined', 'jwt must never be in context');
    assert.ok(ctx.temporalContext);
    assert.ok(ctx.metadata.totalGenerationTimeMs >= 0);
  });
});

test('Phase 3 - Temporal Context & Relative Date Reasoning', async (t) => {
  await t.test('1. Resolves relative dates and diurnal periods accurately', () => {
    const baseDate = new Date('2026-08-20T08:30:00Z');
    const temporal = TemporalContext.resolve('UTC', baseDate);

    assert.equal(temporal.currentDate, '2026-08-20');
    assert.equal(temporal.period, 'morning');
    assert.equal(temporal.resolvedDates.tomorrow, '2026-08-21');
    assert.equal(temporal.resolvedDates.yesterday, '2026-08-19');
    assert.equal(temporal.resolvedDates.nextWeek, '2026-08-27');
  });

  await t.test('2. Timezone-aware day shift calculation', () => {
    const baseDate = new Date('2026-08-20T23:30:00Z');
    // In Asia/Kolkata (+5:30), 23:30 UTC is 05:00 on Aug 21
    const temporalKolkata = TemporalContext.resolve('Asia/Kolkata', baseDate);
    assert.equal(temporalKolkata.currentDate, '2026-08-21');
    assert.equal(temporalKolkata.period, 'morning');
  });
});

test('Phase 3 - Relevance Routing & Selective Data Retrieval', async (t) => {
  const userId = 3002;
  const today = new Date().toISOString().split('T')[0];

  // Setup test data
  await RoutineModel.create({
    id: 'rot_ctx_1',
    userId,
    title: 'Client Project Meeting',
    time: '11:00 AM',
    date: today
  });

  await pool.query(
    'INSERT INTO hydration_logs (user_id, amount_ml, date) VALUES (?, ?, ?)',
    [userId, 600, today]
  );

  await t.test('1. Hydration query selectively fetches wellness data and omits family', async () => {
    const ctx = await ContextEngine.buildContext(userId, 'How much water have I drank today?');
    
    assert.equal(ctx.sources.wellness.status, SOURCE_STATUS.AVAILABLE);
    assert.equal(ctx.wellnessSummary.hydration.totalMl, 600);
    assert.equal(ctx.sources.family.status, SOURCE_STATUS.NOT_RELEVANT, 'Family data should be omitted for hydration query');
  });

  await t.test('2. Schedule query retrieves today routines', async () => {
    const ctx = await ContextEngine.buildContext(userId, 'What is on my schedule today?');
    
    assert.equal(ctx.sources.schedule.status, SOURCE_STATUS.AVAILABLE);
    assert.ok(ctx.todaySchedule.length >= 1);
    assert.equal(ctx.todaySchedule[0].title, 'Client Project Meeting');
  });
});

test('Phase 3 - Memory Ranking & Budget Enforcement', async (t) => {
  const userId = 3003;

  // Insert multiple memories
  await AiMemoryRepository.createMemory(userId, {
    memoryType: 'ROUTINE_PREFERENCE',
    memoryKey: 'workout_schedule',
    memoryValue: 'User prefers early morning gym workout at 6:00 AM',
    importance: 5
  });

  await AiMemoryRepository.createMemory(userId, {
    memoryType: 'COMMUNICATION_PREFERENCE',
    memoryKey: 'reminder_style',
    memoryValue: 'Keep reminder notifications short and concise',
    importance: 3
  });

  await AiMemoryRepository.createMemory(userId, {
    memoryType: 'USER_PREFERENCE',
    memoryKey: 'color_theme',
    memoryValue: 'User prefers dark blue application background theme',
    importance: 1
  });

  await t.test('1. Ranks gym workout memory highest for workout request', async () => {
    const ctx = await ContextEngine.buildContext(userId, 'Schedule my morning workout');
    
    assert.ok(ctx.relevantMemories.length >= 1);
    const topMemory = ctx.relevantMemories[0];
    assert.equal(topMemory.memory_key, 'workout_schedule', 'Workout memory must rank first');
    assert.ok(topMemory._relevanceScore > 50);
  });

  await t.test('2. Context budget limits memory results', () => {
    const fakeMemories = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      memory_key: `key_${i}`,
      memory_value: `value statement ${i}`,
      importance: 3
    }));

    const ranked = ContextRanker.rankMemories(fakeMemories, 'test query', { limit: 5 });
    assert.equal(ranked.length, 5, 'Must be bounded to max 5 memories');
  });
});

test('Phase 3 - Bounded Conversation History & Tenant Isolation', async (t) => {
  const user1Id = 3004;
  const user2Id = 3005;

  const conv1 = await AiConversationRepository.createConversation(user1Id, { title: 'Health Chat' });
  for (let i = 1; i <= 15; i++) {
    await AiConversationRepository.addMessage(user1Id, {
      conversationId: conv1.id,
      role: i % 2 === 1 ? 'user' : 'assistant',
      content: `Message turn number ${i}`
    });
  }

  await t.test('1. Bounded recent conversation limits history to max 10 turns', async () => {
    const ctx = await ContextEngine.buildContext(user1Id, 'Continue our discussion', {
      conversationId: conv1.id
    });

    assert.ok(ctx.recentConversation.length <= 10, 'History should be bounded to recent 10 turns');
    assert.equal(ctx.recentConversation[ctx.recentConversation.length - 1].content, 'Message turn number 15');
  });

  await t.test('2. User 2 cannot access User 1 conversation history in context', async () => {
    const ctxUser2 = await ContextEngine.buildContext(user2Id, 'Continue our discussion', {
      conversationId: conv1.id
    });

    assert.equal(ctxUser2.recentConversation.length, 0, 'User 2 context must not contain User 1 messages');
  });
});
