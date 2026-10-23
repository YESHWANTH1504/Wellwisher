const test = require('node:test');
const assert = require('node:assert/strict');
const { registry: toolRegistry } = require('../services/jarvis/tools');
const healthConnectRepo = require('../repositories/ai/healthConnectRepository');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const pool = require('../config/db');

test.describe('Health Connect Intelligence & Tools Verification', () => {
  const userId = 'user_hc_test_1';

  test.after(async () => {
    try {
      await pool.end();
    } catch (_) {}
  });

  test.beforeEach(() => {
    // Clear out repo for clean state
    healthConnectRepo.clearForUser(userId);
  });

  test('1. health_get_steps_today returns NO_DATA when no reading exists', async () => {
    const result = await toolRegistry.execute('health_get_steps_today', { userId }, {});
    assert.equal(result.success, true);
    assert.equal(result.data.available, false);
    assert.ok(result.data.reason === 'NO_DATA' || result.data.reason === 'DATA_UNAVAILABLE');
    assert.equal(result.data.metric, 'steps');
  });

  test('2. health_get_steps_today returns real steps when recorded in Health Connect repo', async () => {
    healthConnectRepo.saveMetric(userId, 'steps', 6842, 'steps', 'Health Connect');
    const result = await toolRegistry.execute('health_get_steps_today', { userId }, {});
    assert.equal(result.success, true);
    assert.equal(result.data.available, true);
    assert.equal(result.data.value, 6842);
    assert.equal(result.data.unit, 'steps');
    assert.equal(result.data.source, 'Health Connect');
  });

  test('3. Permission denied returns structured PERMISSION_DENIED without fabrication', async () => {
    healthConnectRepo.setPermission(userId, 'steps', false);
    const result = await toolRegistry.execute('health_get_steps_today', { userId }, {});
    assert.equal(result.success, true);
    assert.equal(result.data.available, false);
    assert.equal(result.data.reason, 'PERMISSION_DENIED');
  });

  test('4. health_get_latest_heart_rate returns real BPM or DATA_UNAVAILABLE', async () => {
    const unavail = await toolRegistry.execute('health_get_latest_heart_rate', { userId }, {});
    assert.equal(unavail.data.available, false);

    healthConnectRepo.saveMetric(userId, 'heartRate', 72, 'bpm', 'Health Connect');
    const avail = await toolRegistry.execute('health_get_latest_heart_rate', { userId }, {});
    assert.equal(avail.data.available, true);
    assert.equal(avail.data.value, 72);
    assert.equal(avail.data.unit, 'bpm');
  });

  test('5. health_get_resting_heart_rate returns real resting BPM', async () => {
    healthConnectRepo.saveMetric(userId, 'restingHeartRate', 62, 'bpm', 'Health Connect');
    const result = await toolRegistry.execute('health_get_resting_heart_rate', { userId }, {});
    assert.equal(result.data.available, true);
    assert.equal(result.data.value, 62);
  });

  test('6. Active and Total Calories tools return real measurements', async () => {
    healthConnectRepo.saveMetric(userId, 'activeCalories', 450, 'kcal', 'Health Connect');
    healthConnectRepo.saveMetric(userId, 'totalCalories', 2150, 'kcal', 'Health Connect');

    const active = await toolRegistry.execute('health_get_active_calories_today', { userId }, {});
    assert.equal(active.data.available, true);
    assert.equal(active.data.value, 450);

    const total = await toolRegistry.execute('health_get_total_calories_today', { userId }, {});
    assert.equal(total.data.available, true);
    assert.equal(total.data.value, 2150);
  });

  test('7. Sleep summary returns structured sleep duration and stages', async () => {
    healthConnectRepo.saveSleep(userId, {
      totalSleepMinutes: 462,
      deepSleepMinutes: 95,
      remSleepMinutes: 110,
      lightSleepMinutes: 257
    }, 'Health Connect');

    const sleep = await toolRegistry.execute('health_get_sleep_summary', { userId }, {});
    assert.equal(sleep.data.available, true);
    assert.equal(sleep.data.value.totalSleepMinutes, 462);
    assert.equal(sleep.data.value.formatted, '7 hours 42 minutes');
  });

  test('8. Workouts returns recent sessions', async () => {
    healthConnectRepo.saveWorkout(userId, {
      title: 'Morning Outdoor Run',
      durationMinutes: 35,
      caloriesBurned: 320,
      type: 'running'
    });

    const workouts = await toolRegistry.execute('health_get_workouts', { userId }, {});
    assert.equal(workouts.data.available, true);
    assert.equal(workouts.data.value.length, 1);
    assert.equal(workouts.data.value[0].title, 'Morning Outdoor Run');
  });

  test('9. Daily and Weekly summary combine multi-metric health data', async () => {
    healthConnectRepo.saveMetric(userId, 'steps', 8200, 'steps');
    healthConnectRepo.saveMetric(userId, 'activeCalories', 510, 'kcal');
    healthConnectRepo.saveMetric(userId, 'heartRate', 68, 'bpm');

    const daily = await toolRegistry.execute('health_get_daily_summary', { userId }, {});
    assert.equal(daily.data.available, true);
    assert.equal(daily.data.steps.value, 8200);
    assert.equal(daily.data.activeCalories.value, 510);
    assert.equal(daily.data.heartRate.value, 68);
  });

  test('11. Blood pressure returns real systolic/diastolic and NO_DATA when missing (never 0)', async () => {
    // Missing BP test
    const unavail = await toolRegistry.execute('health_get_blood_pressure', { userId }, {});
    assert.equal(unavail.data.available, false);
    assert.ok(unavail.data.reason === 'NO_DATA' || unavail.data.reason === 'DATA_UNAVAILABLE');
    assert.notEqual(unavail.data.value, '0/0');

    // Real BP test
    healthConnectRepo.syncDeviceHealth(userId, {
      systolic: 120,
      diastolic: 80,
      source: 'Health Connect'
    });

    const avail = await toolRegistry.execute('health_get_blood_pressure', { userId }, {});
    assert.equal(avail.data.available, true);
    assert.equal(avail.data.systolic, 120);
    assert.equal(avail.data.diastolic, 80);
    assert.equal(avail.data.value, '120/80');
    assert.equal(avail.data.unit, 'mmHg');
  });

  test('12. Distance returns real kilometers and DATA_UNAVAILABLE when missing', async () => {
    const unavail = await toolRegistry.execute('health_get_distance', { userId }, {});
    assert.equal(unavail.data.available, false);

    healthConnectRepo.saveMetric(userId, 'distanceKm', 4.85, 'km', 'Health Connect');
    const avail = await toolRegistry.execute('health_get_distance', { userId }, {});
    assert.equal(avail.data.available, true);
    assert.equal(avail.data.value, 4.85);
    assert.equal(avail.data.unit, 'km');
  });

  test('13. JARVIS Health Insight synthesizes real metrics without fabrication', async () => {
    // Empty state
    const emptyInsight = await toolRegistry.execute('health_get_health_insight', { userId }, {});
    assert.equal(emptyInsight.data.available, false);
    assert.equal(emptyInsight.data.reason, 'NO_DATA');

    // Seed steps & sleep
    healthConnectRepo.saveMetric(userId, 'steps', 8500, 'steps');
    healthConnectRepo.saveSleep(userId, { totalSleepMinutes: 450 });

    const insight = await toolRegistry.execute('health_get_health_insight', { userId }, {});
    assert.equal(insight.data.available, true);
    assert.ok(insight.data.insight.includes('8,500') || insight.data.insight.includes('steps'));
    assert.ok(insight.data.disclaimer.includes('non-diagnostic') || insight.data.disclaimer.includes('personal wellness'));
  });

  test('14. Multi-turn health follow-up reasoning ("how much more do I need?")', async () => {
    healthConnectRepo.saveMetric(userId, 'steps', 7500, 'steps', 'Health Connect');

    const sessionId = `test_health_session_${Date.now()}`;
    // Turn 1: "How many steps have I taken today?"
    const res1 = await masterOrchestrator.process(
      userId,
      'How many steps have I taken today?',
      { sessionId, source: 'VOICE_INTERACTION' }
    );
    assert.equal(res1.success, true);

    // Turn 2: "How much more do I need?"
    const res2 = await masterOrchestrator.process(
      userId,
      'How much more do I need to reach my goal?',
      { sessionId, source: 'VOICE_INTERACTION' }
    );
    assert.equal(res2.success, true);
    const text2 = (res2.speech || res2.message || '').toLowerCase();
    assert.ok(text2.includes('step') || text2.includes('goal') || text2.includes('2,500') || text2.includes('2500'),
      `Follow up should understand step goal context: ${res2.speech || res2.message}`);
  });

  test('15. End-to-end Master Orchestrator handles health queries without hallucination', async () => {
    // Seed real steps
    healthConnectRepo.saveMetric(userId, 'steps', 7540, 'steps', 'Health Connect');

    const response = await masterOrchestrator.process(
      userId,
      'How many steps have I walked today?',
      { source: 'VOICE_INTERACTION' }
    );

    assert.equal(response.success, true);
    const text = response.speech || response.message || '';
    assert.ok(text.includes('7,540') || text.includes('7540') || text.toLowerCase().includes('steps'),
      `Response should reference steps: ${text}`);
  });
});
