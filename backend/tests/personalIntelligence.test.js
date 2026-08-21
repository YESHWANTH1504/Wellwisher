const test = require('node:test');
const assert = require('node:assert');
const PersonalIntelligenceEngine = require('../services/jarvis/intelligence/personalIntelligenceEngine');
const HabitLearningEngine = require('../services/jarvis/intelligence/habitLearningEngine');
const ConversationPersonalityEngine = require('../services/jarvis/intelligence/conversationPersonalityEngine');
const WeeklyIntelligenceEngine = require('../services/jarvis/intelligence/weeklyIntelligenceEngine');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const { AiBehaviorPatternRepository } = require('../repositories/ai/aiBehaviorPatternRepository');

test('Phase 7 - Personal Intelligence & Personalization Suite', async (t) => {
  const userId = 303;
  const user2Id = 404;

  await t.test('1. USER_EXPLICIT memory strictly overrides AGENT_INFERRED habit', async () => {
    // 1. Insert inferred habit
    await AiMemoryRepository.createMemory(userId, {
      memoryType: 'ROUTINE_PREFERENCE',
      memoryKey: 'preferred_workout_time',
      memoryValue: 'User usually completes workouts in the evening.',
      source: 'AGENT_INFERRED',
      importance: 3,
      confidenceScore: 0.82
    });

    let profile = await PersonalIntelligenceEngine.buildProfile(userId, { forceRefresh: true });
    assert.strictEqual(profile.habits.preferredWorkoutTime.source, 'AGENT_INFERRED');
    assert.strictEqual(profile.habits.preferredWorkoutTime.value, 'User usually completes workouts in the evening.');

    // 2. User explicitly states different preference
    await AiMemoryRepository.createMemory(userId, {
      memoryType: 'ROUTINE_PREFERENCE',
      memoryKey: 'preferred_workout_time',
      memoryValue: 'I strictly workout in the morning at 6 AM',
      source: 'USER_EXPLICIT',
      importance: 5,
      confidenceScore: 1.0
    });

    profile = await PersonalIntelligenceEngine.buildProfile(userId, { forceRefresh: true });
    assert.strictEqual(profile.habits.preferredWorkoutTime.source, 'USER_EXPLICIT');
    assert.strictEqual(profile.habits.preferredWorkoutTime.value, 'I strictly workout in the morning at 6 AM');
  });

  await t.test('2. HabitLearningEngine requires threshold evidence before promotion to ACTIVE', async () => {
    const routine = { title: 'Evening Cardio', time: '07:00 PM' };

    // 1-4 observations: status should remain OBSERVING
    for (let i = 1; i <= 4; i++) {
      const pattern = await HabitLearningEngine.observeRoutineAction(userId, { actionType: 'COMPLETED', routine });
      assert.ok(pattern);
      assert.strictEqual(pattern.status, 'OBSERVING');
      assert.strictEqual(pattern.evidence_count, i);
    }

    // 5th observation: meets minimum observations (5) and confidence threshold
    const activatedPattern = await HabitLearningEngine.observeRoutineAction(userId, { actionType: 'COMPLETED', routine });
    assert.strictEqual(activatedPattern.status, 'ACTIVE');
    assert.strictEqual(activatedPattern.evidence_count, 5);
  });

  await t.test('3. ConversationPersonalityEngine applies style and tone guidelines', () => {
    const promptInst = ConversationPersonalityEngine.getPersonalityPromptInstructions({
      assistantName: 'JARVIS',
      responseStyle: 'DETAILED',
      tone: 'MOTIVATIONAL'
    });

    assert.ok(promptInst.includes('JARVIS'));
    assert.ok(promptInst.includes('Enthusiastic, encouraging, uplifting'));
    assert.ok(promptInst.includes('Provide thorough explanations'));

    const speech = ConversationPersonalityEngine.formatProactiveSpeech('Meeting starts in 10 minutes.', { tone: 'MOTIVATIONAL' });
    assert.ok(speech.includes("Let's make today count!"));
  });

  await t.test('4. WeeklyIntelligenceEngine computes 7-day productivity report', async () => {
    const summary = await WeeklyIntelligenceEngine.generateWeeklySummary(userId);
    assert.strictEqual(summary.userId, userId);
    assert.strictEqual(summary.period, 'LAST_7_DAYS');
    assert.ok(summary.stats.completionRatePercentage !== undefined);
  });

  await t.test('5. Privacy control: clearMemories removes memories according to scope', async () => {
    const testUser = 505;
    await AiMemoryRepository.createMemory(testUser, {
      memoryKey: 'explicit_fact',
      memoryValue: 'Prefers tea',
      source: 'USER_EXPLICIT'
    });

    await AiMemoryRepository.createMemory(testUser, {
      memoryKey: 'inferred_fact',
      memoryValue: 'Sleeps at 11 PM',
      source: 'AGENT_INFERRED'
    });

    // Clear only inferred memories
    await AiMemoryRepository.clearMemories(testUser, { inferredOnly: true });
    let mems = await AiMemoryRepository.getMemoriesByUser(testUser);
    assert.strictEqual(mems.length, 1);
    assert.strictEqual(mems[0].source, 'USER_EXPLICIT');

    // Clear all memories
    await AiMemoryRepository.clearMemories(testUser, { inferredOnly: false });
    mems = await AiMemoryRepository.getMemoriesByUser(testUser);
    assert.strictEqual(mems.length, 0);
  });

  await t.test('6. User data isolation: User 2 cannot access or mutate User 1 memories', async () => {
    const mem1 = await AiMemoryRepository.createMemory(userId, {
      memoryKey: 'private_schedule_habit',
      memoryValue: 'Likes silence during focus hours',
      source: 'USER_EXPLICIT'
    });

    // User 2 tries to fetch User 1 memory
    const unauthAccess = await AiMemoryRepository.getMemoryById(mem1.id, user2Id);
    assert.strictEqual(unauthAccess, null);

    // User 2 tries to delete User 1 memory
    const unauthDelete = await AiMemoryRepository.deleteMemory(mem1.id, user2Id);
    assert.strictEqual(unauthDelete, false);

    // User 1 can still access own memory
    const validAccess = await AiMemoryRepository.getMemoryById(mem1.id, userId);
    assert.ok(validAccess);
  });
});
