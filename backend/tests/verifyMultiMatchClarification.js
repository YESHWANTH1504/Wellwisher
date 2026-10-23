const RoutineModel = require('../models/RoutineModel');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const db = require('../config/db');

async function testMultiMatch() {
  const dateStr = '2026-09-10';
  await db.query('DELETE FROM routines WHERE user_id = 1 AND title LIKE "%Doctor Appointment%"');

  const r1 = await RoutineModel.create({
    userId: 1,
    title: 'Doctor Appointment',
    time: '10:00:00',
    date: dateStr,
    category: 'HEALTH'
  });
  const r2 = await RoutineModel.create({
    userId: 1,
    title: 'Doctor Appointment',
    time: '15:00:00',
    date: dateStr,
    category: 'HEALTH'
  });
  console.log('[MULTI_MATCH] Created r1:', r1.id, 'at 10:00 and r2:', r2.id, 'at 15:00');

  const sessionId = 'test_multi_match_' + Date.now();

  // Step 1: User says "Cancel my doctor appointment."
  console.log('[MULTI_MATCH] Step 1: User says "Cancel my doctor appointment."');
  const res1 = await masterOrchestrator.process(1, 'Cancel my doctor appointment.', {
    source: 'VOICE_INTERACTION',
    timeFormat: '12h',
    sessionId
  });

  const text1 = res1.speech || res1.message || '';
  console.log('[MULTI_MATCH] Response 1 text:', text1);
  const checkR1 = await RoutineModel.getById(r1.id, 1);
  const checkR2 = await RoutineModel.getById(r2.id, 1);
  console.log('[MULTI_MATCH] Check after request: r1 exists =', !!checkR1, ', r2 exists =', !!checkR2);

  if (!checkR1 || !checkR2) {
    console.error('[MULTI_MATCH] FAIL: One of the appointments was prematurely deleted!');
    process.exit(1);
  }

  // Step 2: User clarifies: "Cancel the 10 AM one"
  console.log('[MULTI_MATCH] Step 2: User clarifies "Cancel the 10 AM one"');
  const res2 = await masterOrchestrator.process(1, 'Cancel the 10 AM one', {
    source: 'VOICE_INTERACTION',
    timeFormat: '12h',
    sessionId
  });
  const text2 = res2.speech || res2.message || '';
  console.log('[MULTI_MATCH] Response 2 text:', text2);

  const checkR1After = await RoutineModel.getById(r1.id, 1);
  const checkR2After = await RoutineModel.getById(r2.id, 1);
  console.log('[MULTI_MATCH] Final check: r1 (10 AM) exists =', !!checkR1After, ', r2 (3 PM) exists =', !!checkR2After);

  if (!checkR1After && checkR2After) {
    console.log('[MULTI_MATCH] SUCCESS: Only the chosen 10 AM appointment was deleted. 3 PM remains intact.');
  } else {
    console.error('[MULTI_MATCH] FAIL: Unexpected state after clarification');
    process.exit(1);
  }

  process.exit(0);
}

testMultiMatch().catch(e => {
  console.error(e);
  process.exit(1);
});
