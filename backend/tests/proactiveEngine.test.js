const test = require('node:test');
const assert = require('node:assert');
const ProactiveEngine = require('../services/jarvis/proactive/proactiveEngine');
const ProactiveContextBuilder = require('../services/jarvis/proactive/proactiveContextBuilder');
const ProactiveScorer = require('../services/jarvis/proactive/proactiveScorer');
const ProactiveDecisionEngine = require('../services/jarvis/proactive/proactiveDecisionEngine');
const SmartReminderEngine = require('../services/jarvis/proactive/smartReminderEngine');
const DailyBriefingEngine = require('../services/jarvis/proactive/dailyBriefingEngine');
const EveningSummaryEngine = require('../services/jarvis/proactive/eveningSummaryEngine');
const SmartPlanner = require('../services/jarvis/proactive/smartPlanner');
const BehaviorPatternEngine = require('../services/jarvis/proactive/behaviorPatternEngine');
const { AiProactiveEventRepository } = require('../repositories/ai/aiProactiveEventRepository');
const { AiPreferenceRepository } = require('../repositories/ai/aiPreferenceRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 6 - Proactive Intelligence Engine Suite', async (t) => {
  const userId = 101;
  const user2Id = 202;

  await t.test('1. ProactiveScorer calculates deterministic priority score and handles fatigue penalty', () => {
    // Normal high priority task
    const normal = ProactiveScorer.calculateScore({
      timeUrgency: 35,
      importance: 25,
      relevance: 20,
      behaviorSignal: 10,
      notificationFatigue: 0
    });
    assert.strictEqual(normal.priority, 'CRITICAL');
    assert.strictEqual(normal.score, 90);

    // Same task with high notification fatigue penalty (e.g. 30 pts)
    const fatigued = ProactiveScorer.calculateScore({
      timeUrgency: 35,
      importance: 25,
      relevance: 20,
      behaviorSignal: 10,
      notificationFatigue: 30
    });
    assert.strictEqual(fatigued.priority, 'HIGH');
    assert.strictEqual(fatigued.score, 60);
  });

  await t.test('2. Quiet hours suppresses non-critical proactive events', async () => {
    const prefs = {
      proactiveAssistanceEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    };

    const nightTemporal = { currentTime: '23:30' };

    const nonCritical = { eventType: 'UPCOMING_TASK', priority: 'MEDIUM' };
    const decision = await ProactiveDecisionEngine.evaluateEventDelivery(userId, nonCritical, prefs, nightTemporal);
    assert.strictEqual(decision.shouldDeliver, false);
    assert.strictEqual(decision.reason, 'QUIET_HOURS_ACTIVE');

    const critical = { eventType: 'UPCOMING_TASK', priority: 'CRITICAL' };
    const critDecision = await ProactiveDecisionEngine.evaluateEventDelivery(userId, critical, prefs, nightTemporal);
    assert.strictEqual(critDecision.shouldDeliver, true);
  });

  await t.test('3. Duplicate suppression prevents repeated pending events for the same routine', async () => {
    // Insert pending event
    await AiProactiveEventRepository.createEvent(userId, {
      eventType: 'UPCOMING_TASK',
      priority: 'MEDIUM',
      title: 'Dentist Appointment in 30m',
      relatedEntityType: 'routine',
      relatedEntityId: 'rot_dentist_101',
      status: 'PENDING'
    });

    const prefs = {
      proactiveAssistanceEnabled: true,
      quietHoursEnabled: false,
      notificationFrequency: 'BALANCED'
    };

    const duplicateCandidate = {
      eventType: 'UPCOMING_TASK',
      priority: 'MEDIUM',
      relatedEntityType: 'routine',
      relatedEntityId: 'rot_dentist_101'
    };

    const decision = await ProactiveDecisionEngine.evaluateEventDelivery(userId, duplicateCandidate, prefs, { currentTime: '14:00' });
    assert.strictEqual(decision.shouldDeliver, false);
    assert.strictEqual(decision.reason, 'DUPLICATE_EVENT_PENDING');
  });

  await t.test('4. SmartReminderEngine detects upcoming and overdue tasks accurately', () => {
    const context = {
      routines: [
        { id: 'r1', title: 'Team Sync', time: '10:00 AM', status: 'upcoming', diffMinutes: 15 },
        { id: 'r2', title: 'Morning Medicine', time: '09:00 AM', status: 'upcoming', diffMinutes: -45 },
        { id: 'r3', title: 'Finished Task', time: '08:00 AM', status: 'completed', diffMinutes: -120 }
      ]
    };

    const reminders = SmartReminderEngine.evaluateReminders(context);
    assert.strictEqual(reminders.length, 2);
    
    const upcoming = reminders.find(r => r.eventType === 'UPCOMING_TASK');
    assert.ok(upcoming);
    assert.strictEqual(upcoming.relatedEntityId, 'r1');

    const overdue = reminders.find(r => r.eventType === 'OVERDUE_TASK');
    assert.ok(overdue);
    assert.strictEqual(overdue.relatedEntityId, 'r2');
  });

  await t.test('5. DailyBriefingEngine generates factual summary without hallucinations', () => {
    const context = {
      temporal: { currentDate: '2026-08-20', dayOfWeek: 'Thursday' },
      routines: [
        { id: 'r1', title: 'Morning Jog', time: '07:00 AM', status: 'completed' },
        { id: 'r2', title: 'Design Review', time: '11:00 AM', status: 'upcoming' }
      ],
      stats: { total: 2, completedCount: 1, upcomingCount: 1, missedCount: 0 },
      hydration: { totalMl: 400, goalMl: 2500 },
      preferences: { assistantName: 'JARVIS' }
    };

    const briefing = DailyBriefingEngine.generateBriefing(context);
    assert.strictEqual(briefing.eventType, 'DAILY_BRIEFING');
    assert.ok(briefing.message.includes('2 scheduled tasks'));
    assert.ok(briefing.message.includes('Design Review'));
  });

  await t.test('6. EveningSummaryEngine computes completion rate and unfinished tasks', () => {
    const context = {
      temporal: { currentDate: '2026-08-20', dayOfWeek: 'Thursday' },
      routines: [
        { id: 'r1', title: 'Task 1', status: 'completed' },
        { id: 'r2', title: 'Task 2', status: 'completed' },
        { id: 'r3', title: 'Task 3', status: 'upcoming' }
      ],
      stats: { total: 3, completedCount: 2, missedCount: 0, completionRate: 67 },
      hydration: { totalMl: 2200 }
    };

    const summary = EveningSummaryEngine.generateSummary(context);
    assert.strictEqual(summary.eventType, 'EVENING_SUMMARY');
    assert.strictEqual(summary.data.completedCount, 2);
    assert.strictEqual(summary.data.unfinishedCount, 1);
    assert.ok(summary.message.includes('67% completion'));
  });

  await t.test('7. SmartPlanner identifies free time windows and suggests structured plan', () => {
    const routines = [
      { time: '01:00 PM', title: 'Client Sync' },
      { time: '04:00 PM', title: 'Standup' }
    ];

    const plan = SmartPlanner.planFreeTime(routines, { period: 'afternoon' });
    assert.ok(plan.freeWindows.length > 0);
    assert.ok(plan.totalFreeMinutes >= 90);
    assert.ok(plan.proposedPlan.length > 0);
  });

  await t.test('8. BehaviorPatternEngine learns preferred workout timing into ai_memories', async () => {
    const routines = [
      { id: 'w1', title: 'Evening Gym Workout', time: '06:30 PM', status: 'completed' }
    ];

    const learned = await BehaviorPatternEngine.analyzeAndRecordPatterns(userId, routines);
    assert.strictEqual(learned.length, 1);
    assert.strictEqual(learned[0].key, 'preferred_workout_time');
    assert.ok(learned[0].value.includes('evening'));
  });

  await t.test('9. User data isolation: User 2 cannot see User 1 proactive feed', async () => {
    await AiProactiveEventRepository.createEvent(userId, {
      eventType: 'UPCOMING_TASK',
      priority: 'HIGH',
      title: 'Private Event User 1',
      message: 'Private notes'
    });

    const user1Feed = await AiProactiveEventRepository.getActiveFeed(userId);
    const user2Feed = await AiProactiveEventRepository.getActiveFeed(user2Id);

    assert.ok(user1Feed.some(e => e.title === 'Private Event User 1'));
    assert.ok(!user2Feed.some(e => e.title === 'Private Event User 1'));
  });

  await t.test('10. Preference updating preserves and applies proactive settings', async () => {
    await AiPreferenceRepository.updatePreferences(userId, {
      proactiveAssistanceEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
      notificationFrequency: 'HIGH'
    });

    const updated = await AiPreferenceRepository.getPreferences(userId);
    assert.strictEqual(updated.quietHoursStart, '23:00');
    assert.strictEqual(updated.quietHoursEnd, '06:00');
    assert.strictEqual(updated.notificationFrequency, 'HIGH');
  });
});
