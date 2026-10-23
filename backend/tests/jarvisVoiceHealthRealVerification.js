const assert = require('node:assert/strict');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const healthConnectRepo = require('../repositories/ai/healthConnectRepository');

async function runVoiceVerification() {
  console.log('--- STARTING REAL JARVIS VOICE HEALTH AUTHENTICITY AUDIT ---');
  const userId = 'user_authenticity_audit_test';
  const sessionId = `voice_health_sess_${Date.now()}`;

  // -------------------------------------------------------------
  // PART 1: Strict NO_DATA Verification (Mirroring Real Device state)
  // Health Connect has NO step records for today.
  // -------------------------------------------------------------
  healthConnectRepo.clearForUser(userId);

  console.log('\n[TEST 1A] Query steps when Health Connect = NO_DATA');
  const r1A = await masterOrchestrator.process(
    userId,
    'how many steps have I taken today',
    { sessionId, source: 'VOICE_INTERACTION' }
  );
  const t1A = r1A.speech || r1A.message || '';
  console.log('JARVIS Response 1A:', t1A);
  assert.equal(t1A, "I don't have any step data for today.", 'Must return exact NO_DATA message for steps');
  assert.ok(!t1A.includes('7,842') && !t1A.includes('7842'), 'Must NEVER say 7,842');
  assert.ok(!t1A.includes('0 steps'), 'Must NEVER say 0 steps');

  console.log('\n[TEST 1B] Follow-up "How much more do I need?" when steps = NO_DATA');
  const r1B = await masterOrchestrator.process(
    userId,
    'how much more do I need to reach my goal',
    { sessionId, source: 'VOICE_INTERACTION' }
  );
  const t1B = r1B.speech || r1B.message || '';
  console.log('JARVIS Response 1B:', t1B);
  assert.equal(
    t1B,
    "I don't have today's step count yet, so I can't calculate how much remains.",
    'Must explicitly state inability to calculate when step data is unavailable'
  );

  // -------------------------------------------------------------
  // PART 2: Real Steps & Follow-Up Calculation
  // User connects device with 5,000 real steps and 8,000 goal
  // -------------------------------------------------------------
  console.log('\n[TEST 2A] Query steps when Health Connect has real steps (e.g. 5,000)');
  healthConnectRepo.saveMetric(userId, 'steps', 5000, 'steps', 'Health Connect');
  const r2A = await masterOrchestrator.process(
    userId,
    'how many steps have I taken today',
    { sessionId, source: 'VOICE_INTERACTION', healthGoals: { stepsGoal: 8000 } }
  );
  const t2A = r2A.speech || r2A.message || '';
  console.log('JARVIS Response 2A:', t2A);
  assert.ok(t2A.includes('5,000') || t2A.includes('5000'), 'Must speak real step count');

  console.log('\n[TEST 2B] Follow-up "How much more do I need?" with real steps');
  const r2B = await masterOrchestrator.process(
    userId,
    'how much more do I need to reach my goal',
    { sessionId, source: 'VOICE_INTERACTION', healthGoals: { stepsGoal: 8000 } }
  );
  const t2B = r2B.speech || r2B.message || '';
  console.log('JARVIS Response 2B:', t2B);
  assert.ok(t2B.includes('3,000') || t2B.includes('3000'), 'Must calculate remaining steps accurately (8000 - 5000 = 3000)');

  // -------------------------------------------------------------
  // PART 3: Partial Health Summary Audit (Section 11)
  // Calories = 750, Steps = NO_DATA, HR = NO_DATA, BP = NO_DATA, etc.
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Partial health summary: Calories = 750, other metrics = NO_DATA');
  healthConnectRepo.clearForUser(userId);
  healthConnectRepo.saveMetric(userId, 'activeCalories', 750, 'kcal', 'Health Connect');

  const r3 = await masterOrchestrator.process(
    userId,
    'give me my health summary',
    { sessionId, source: 'VOICE_INTERACTION' }
  );
  const t3 = r3.speech || r3.message || '';
  console.log('JARVIS Response 3:', t3);
  assert.ok(t3.includes('750 calories'), 'Must mention 750 calories recorded');
  assert.ok(t3.toLowerCase().includes("don't have") || t3.toLowerCase().includes('not available'), 'Must report unavailable metrics');
  assert.ok(!t3.includes('0 steps') && !t3.includes('0 BPM') && !t3.includes('0/0'), 'Must NEVER convert unavailable metrics to zero');

  // -------------------------------------------------------------
  // PART 4: Unrecorded Vitals (Heart Rate, Blood Pressure)
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Unrecorded heart rate');
  const r4 = await masterOrchestrator.process(
    userId,
    "what's my heart rate",
    { sessionId, source: 'VOICE_INTERACTION' }
  );
  const t4 = r4.speech || r4.message || '';
  console.log('JARVIS Response 4:', t4);
  assert.ok(!t4.includes('0 BPM') && !t4.includes('0 bpm'), 'Must NEVER say 0 BPM');

  console.log('\n[TEST 5] Unrecorded blood pressure');
  const r5 = await masterOrchestrator.process(
    userId,
    "what's my blood pressure",
    { sessionId, source: 'VOICE_INTERACTION' }
  );
  const t5 = r5.speech || r5.message || '';
  console.log('JARVIS Response 5:', t5);
  assert.ok(!t5.includes('0/0') && !t5.includes('0 mmHg'), 'Must NEVER say 0/0');

  console.log('\n--- ALL VOICE AUTHENTICITY AUDIT TESTS PASSED ---');
}

runVoiceVerification().catch(err => {
  console.error('FATAL AUDIT TEST ERROR:', err);
  process.exit(1);
});
