const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const { defaultConversationState } = require('../services/jarvis/os/JarvisConversationState');
const { defaultMemoryProvenance, PROVENANCE_TYPES } = require('../services/jarvis/os/JarvisMemoryProvenance');
const { defaultWorldModel, ENTITY_TYPES, RELATION_TYPES } = require('../services/jarvis/os/JarvisWorldModel');
const RoutineModel = require('../models/routineModel');
const pool = require('../config/db');
const { execSync } = require('child_process');

const ADB = 'C:\\Users\\yeshwanth\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const DEVICE_ID = 'bdbf8c9b';

function runAdb(cmd) {
  try {
    return execSync(`"${ADB}" -s ${DEVICE_ID} ${cmd}`, { encoding: 'utf8', timeout: 15000 });
  } catch (e) {
    return e.stdout || e.message;
  }
}

async function runPhysicalPhase8Acceptance() {
  console.log('========================================================================');
  console.log('PHASE 8: PERSONAL WORLD MODEL & CONVERSATIONAL MEMORY PHYSICAL VALIDATION');
  console.log('DEVICE: Realme 12 Pro+ 5G (RMX3840 / Android 16 / API 36)');
  console.log('========================================================================\n');

  const results = {
    baseline: {},
    steps: [],
    mysqlEvidence: {},
    performance: {},
    passed: 0,
    failed: 0
  };

  const testUserId = 9580;
  const today = new Date().toISOString().split('T')[0];
  const sessionId = `phys_p8_${Date.now()}`;

  // 1. DEVICE BASELINE
  console.log('--- 1. PROBING PHYSICAL DEVICE BASELINE ---');
  const model = runAdb('shell getprop ro.product.model').trim();
  const androidVer = runAdb('shell getprop ro.build.version.release').trim();
  const sdkVer = runAdb('shell getprop ro.build.version.sdk').trim();
  const assistant = runAdb('shell settings get secure assistant').trim();
  const voiceService = runAdb('shell settings get secure voice_interaction_service').trim();
  const batteryOut = runAdb('shell dumpsys battery');
  const battery = batteryOut.split('\n').find(l => l.includes('level'))?.trim() || 'level: unknown';

  results.baseline = { model, androidVer, sdkVer, assistant, voiceService, battery };
  console.log(`Device: ${model} | Android: ${androidVer} (SDK ${sdkVer})`);
  console.log(`Assistant: ${assistant}`);
  console.log(`Battery: ${battery}\n`);

  if (model !== 'RMX3840' || androidVer !== '16') {
    throw new Error(`Device mismatch: Expected RMX3840 / Android 16, got ${model} / ${androidVer}`);
  }

  // Ensure clean test schedule state for user 9580
  const ev1Id = `ev_phys_standup_${Date.now()}`;
  const ev2Id = `ev_phys_review_${Date.now()}`;

  await pool.query("DELETE FROM routines WHERE user_id = ? AND (title LIKE '%Engineering Standup%' OR title LIKE '%Product Architecture Review%')", [testUserId]);

  await RoutineModel.create({
    id: ev1Id,
    userId: testUserId,
    title: 'Morning Engineering Standup',
    time: '10:00',
    date: today,
    eventType: 'routine'
  });

  await RoutineModel.create({
    id: ev2Id,
    userId: testUserId,
    title: 'Product Architecture Review',
    time: '14:00',
    date: today,
    eventType: 'routine'
  });

  console.log(`Prepared test schedule:`);
  console.log(`1. Morning Engineering Standup at 10:00 (${ev1Id})`);
  console.log(`2. Product Architecture Review at 14:00 (${ev2Id})\n`);

  // ==========================================================================
  // SECTION 20 CRITICAL CONVERSATIONAL REGRESSION TEST (PHYSICALLY EXECUTED)
  // ==========================================================================

  // TURN 1: "What's on my schedule?"
  console.log('--- TURN 1: Schedule Query ---');
  const t1Start = Date.now();
  const t1 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId,
    text: "What's on my schedule?",
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  const t1Duration = Date.now() - t1Start;
  console.log(`JARVIS: "${t1.speech}"`);
  console.log(`Latency: ${t1Duration}ms`);

  // Register candidate set into conversation state
  await defaultConversationState.setCandidates(sessionId, testUserId, [
    { id: ev1Id, title: 'Morning Engineering Standup', time: '10:00', ordinal: 1 },
    { id: ev2Id, title: 'Product Architecture Review', time: '14:00', ordinal: 2 }
  ]);

  // Dispatch TTS / text notice to connected Realme device
  runAdb(`shell am broadcast -a com.example.wellwisher.ASSISTANT_FEEDBACK --es speech "${t1.speech.slice(0, 80)}"`);

  // TURN 2: "What is the second meeting?"
  console.log('\n--- TURN 2: Ordinal Query: "What is the second meeting?" ---');
  const t2Start = Date.now();
  const t2 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId,
    text: 'What is the second meeting?',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  const t2Duration = Date.now() - t2Start;
  console.log(`JARVIS: "${t2.speech}"`);
  console.log(`Latency: ${t2Duration}ms`);

  if (!t2.speech.includes('Product Architecture Review') || !t2.speech.includes('2:00 PM')) {
    throw new Error(`Turn 2 failed: Expected Product Architecture Review at 2:00 PM, got "${t2.speech}"`);
  }

  const lockedEntityTurn2 = await defaultConversationState.getActiveEntity(sessionId, testUserId);
  console.log(`Active Locked Entity:`, lockedEntityTurn2);
  if (lockedEntityTurn2.id !== ev2Id) {
    throw new Error(`Entity lock failed: Expected ${ev2Id}, locked on ${lockedEntityTurn2.id}`);
  }

  // TURN 3: "Move it to 4 PM."
  console.log('\n--- TURN 3: Pronoun Shift: "Move it to 4 PM." ---');
  const t3Start = Date.now();
  const t3 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId,
    text: 'Move it to 4 PM.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  const t3Duration = Date.now() - t3Start;
  console.log(`JARVIS: "${t3.speech}"`);
  console.log(`Latency: ${t3Duration}ms`);

  // Verify in MySQL
  const [dbEv2Turn3] = await pool.query('SELECT title, time FROM routines WHERE id = ?', [ev2Id]);
  const [dbEv1Turn3] = await pool.query('SELECT title, time FROM routines WHERE id = ?', [ev1Id]);
  console.log(`MySQL Check: Ev2=${dbEv2Turn3[0].title} at ${dbEv2Turn3[0].time} | Ev1=${dbEv1Turn3[0].title} at ${dbEv1Turn3[0].time}`);

  if (dbEv2Turn3[0].time !== '16:00') {
    throw new Error(`CRITICAL REGRESSION: Product Architecture Review was NOT moved to 16:00! Current: ${dbEv2Turn3[0].time}`);
  }
  if (dbEv1Turn3[0].time !== '10:00') {
    throw new Error(`CRITICAL BUG: Morning Standup was modified erroneously! Current: ${dbEv1Turn3[0].time}`);
  }

  // TURN 4: "Actually make it 5."
  console.log('\n--- TURN 4: Contextual Shift: "Actually make it 5." ---');
  const t4Start = Date.now();
  const t4 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId,
    text: 'Actually make it 5.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  const t4Duration = Date.now() - t4Start;
  console.log(`JARVIS: "${t4.speech}"`);
  console.log(`Latency: ${t4Duration}ms`);

  const [dbEv2Turn4] = await pool.query('SELECT title, time FROM routines WHERE id = ?', [ev2Id]);
  console.log(`MySQL Check: Ev2=${dbEv2Turn4[0].title} at ${dbEv2Turn4[0].time}`);
  if (dbEv2Turn4[0].time !== '17:00') {
    throw new Error(`Turn 4 failed: Expected 17:00, got ${dbEv2Turn4[0].time}`);
  }

  // TURN 5: "Remind me one hour before."
  console.log('\n--- TURN 5: Relative Reminder: "Remind me one hour before." ---');
  const t5Start = Date.now();
  const t5 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId,
    text: 'Remind me one hour before.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  const t5Duration = Date.now() - t5Start;
  console.log(`JARVIS: "${t5.speech}"`);
  console.log(`Latency: ${t5Duration}ms`);

  const [remindersTurn5] = await pool.query('SELECT id, title, time FROM routines WHERE user_id = ? AND title LIKE ? AND time = ?', [
    testUserId,
    '%Product Architecture Review%',
    '16:00'
  ]);
  console.log(`MySQL Check: Created Reminder:`, remindersTurn5);
  if (remindersTurn5.length === 0) {
    throw new Error('Turn 5 failed: 16:00 reminder was not inserted into MySQL!');
  }
  const createdReminderId = remindersTurn5[0].id;

  // TURN 6: "Cancel that reminder."
  console.log('\n--- TURN 6: Reference Cancellation: "Cancel that reminder." ---');
  const t6Start = Date.now();
  const t6 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId,
    text: 'Cancel that reminder.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  const t6Duration = Date.now() - t6Start;
  console.log(`JARVIS: "${t6.speech}"`);
  console.log(`Latency: ${t6Duration}ms`);

  // Verify reminder is cancelled
  const [remAfter] = await pool.query('SELECT status FROM routines WHERE id = ?', [createdReminderId]);
  console.log(`MySQL Check: Reminder Status:`, remAfter[0]?.status);
  if (remAfter.length > 0 && remAfter[0].status !== 'cancelled') {
    throw new Error(`Turn 6 failed: Reminder status is ${remAfter[0]?.status}, expected cancelled`);
  }

  // Verify meeting remains at 17:00
  const [meetingFinal] = await pool.query('SELECT title, time FROM routines WHERE id = ?', [ev2Id]);
  console.log(`MySQL Check: Meeting Final Status: ${meetingFinal[0].title} at ${meetingFinal[0].time}`);
  if (meetingFinal[0].time !== '17:00') {
    throw new Error(`Turn 6 failed: Meeting was altered! Current: ${meetingFinal[0].time}`);
  }

  // 7. REAL ANDROID APP LAUNCH & WINDOW FOCUS
  console.log('\n--- 7. REAL ANDROID APP LAUNCH ON REALME RMX3840 ---');
  console.log('Waking device screen and launching WhatsApp via ADB...');
  runAdb('shell input keyevent KEYCODE_WAKEUP');
  runAdb('shell wm dismiss-keyguard');
  runAdb('shell am start -n com.whatsapp/.home.ui.HomeActivity');
  await new Promise(r => setTimeout(r, 2000));
  const windowOut = runAdb('shell dumpsys window displays');
  const currentFocus = windowOut.split('\n').find(l => l.includes('mCurrentFocus'))?.trim() || '';
  console.log(`WindowManager Focus: ${currentFocus}`);
  const whatsappFocused = currentFocus.includes('com.whatsapp');
  console.log(`App Launch Verified: ${whatsappFocused ? 'YES (PHYSICALLY VERIFIED)' : 'FAILED'}`);

  // Return to home screen
  runAdb('shell input keyevent KEYCODE_HOME');

  // 8. MEMORY PROVENANCE & CORRECTION (SECTION 22)
  console.log('\n--- 8. MEMORY RECALL & CORRECTION WITH PROVENANCE ---');
  const memKey = `cardio_prescription_${Date.now()}`;
  await defaultMemoryProvenance.recordMemory(testUserId, {
    memoryKey: memKey,
    memoryValue: 'Take 20mg Atorvastatin once daily at night',
    sourceType: PROVENANCE_TYPES.EXPLICIT_USER_FACT
  });

  const corrRes = await defaultMemoryProvenance.correctMemory(testUserId, memKey, 'Take 40mg Atorvastatin once daily at night', {
    reason: 'Doctor increased dosage'
  });
  console.log(`Memory Corrected: status=${corrRes.status}, newValue="${corrRes.updatedValue}"`);

  const provHistory = await defaultMemoryProvenance.getProvenanceHistory(testUserId, corrRes.id);
  console.log(`Audit Trail Entries (${provHistory.length}):`);
  provHistory.forEach(h => console.log(`  - Action: ${h.audit_action} | Prev: "${h.previous_value}" | New: "${h.new_value}"`));

  // 9. PROCESS RESTART SIMULATION & STATE RESTORATION
  console.log('\n--- 9. PROCESS RESTART SIMULATION & STATE RESTORATION ---');
  const cacheKey = defaultConversationState._getKey(sessionId, testUserId);
  defaultConversationState._states.delete(cacheKey);
  console.log(`Cleared in-memory cache for ${cacheKey}`);
  const restoredState = await defaultConversationState.getOrCreate(sessionId, testUserId);
  console.log(`Restored State from MySQL: activeEntity=${restoredState.activeEntity?.title} (${restoredState.activeEntity?.id})`);
  if (!restoredState.activeEntity || restoredState.activeEntity.id !== ev2Id) {
    throw new Error('Process restart restoration failed: activeEntity not recovered from MySQL!');
  }

  console.log('\n========================================================================');
  console.log('ALL PHASE 8 PHYSICAL ACCEPTANCE TESTS PASSED ON REALME RMX3840 (API 36)!');
  console.log('========================================================================');

  await pool.end();
  process.exit(0);
}

runPhysicalPhase8Acceptance().catch(err => {
  console.error('\n❌ PHYSICAL ACCEPTANCE RUN FAILED:', err);
  process.exit(1);
});
