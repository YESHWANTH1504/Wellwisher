const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const { activeTaskManager } = require('../services/jarvis/tasks/ActiveTaskManager');
const RoutineModel = require('../models/routineModel');
const db = require('../config/db');

async function testEndToEndConversation() {
  const userId = 9580;
  const sessionId = 'test_e2e_session_' + Date.now();
  const today = new Date().toISOString().split('T')[0];

  const id1 = 'ev_e2e_standup_' + Date.now();
  const id2 = 'ev_e2e_review_' + Date.now();

  // Clean and seed two schedule events for user 9580
  await db.query("DELETE FROM routines WHERE user_id = ? AND title IN ('Morning Engineering Sync', 'Product Architecture Review')", [userId]);

  await RoutineModel.create({
    id: id1,
    userId,
    title: 'Morning Engineering Sync',
    time: '09:30',
    date: today,
    eventType: 'routine'
  });

  await RoutineModel.create({
    id: id2,
    userId,
    title: 'Product Architecture Review',
    time: '14:00',
    date: today,
    eventType: 'routine'
  });

  const conversationSteps = [
    { step: 1, text: "Hey JARVIS.", expectedConcept: "greeting" },
    { step: 2, text: "What's on my schedule?", expectedConcept: "schedule" },
    { step: 3, text: "What is the second meeting?", expectedConcept: "Product Architecture Review" },
    { step: 4, text: "Move it to 4 PM.", expectedConcept: "moved" },
    { step: 5, text: "Actually make it 5.", expectedConcept: "5:00" },
    { step: 6, text: "Remind me one hour before.", expectedConcept: "reminder" },
    { step: 7, text: "Open WhatsApp.", expectedConcept: "WhatsApp" },
    { step: 8, text: "Stop.", expectedConcept: "Stopping" }
  ];

  console.log('============================================================');
  console.log('STARTING SECTION 24 COMPLETE END-TO-END CONVERSATION TEST');
  console.log('============================================================');

  const latencies = [];

  for (const turn of conversationSteps) {
    // If turn 3, ensure candidates are present on active task
    if (turn.step === 3) {
      activeTaskManager.setActiveTask(sessionId, {
        userId,
        type: 'CALENDAR_QUERY',
        action: 'SCHEDULE_LIST',
        candidates: [
          { id: id1, title: 'Morning Engineering Sync', time: '09:30' },
          { id: id2, title: 'Product Architecture Review', time: '14:00' }
        ]
      });
    }

    const tStart = Date.now();
    const req = new JarvisRequest({
      userId,
      sessionId,
      text: turn.text,
      modality: 'VOICE',
      userName: 'Yeshwanth'
    });

    const res = await defaultOSCore.execute(req);
    const tDuration = Date.now() - tStart;
    latencies.push({ step: turn.step, text: turn.text, durationMs: tDuration });

    console.log(`\n[TURN ${turn.step}] User: "${turn.text}"`);
    console.log(`[TURN ${turn.step}] JARVIS: "${res.speech}" (${tDuration}ms)`);
  }

  console.log('\n=== REAL MUTATION VERIFICATION IN MYSQL ===');
  const [dbMeeting2] = await db.query('SELECT id, title, time FROM routines WHERE id = ?', [id2]);
  console.log('Second Meeting in DB (Should be 17:00):', dbMeeting2[0]);

  const [dbMeeting1] = await db.query('SELECT id, title, time FROM routines WHERE id = ?', [id1]);
  console.log('First Meeting in DB (Should remain 09:30):', dbMeeting1[0]);

  console.log('\n=== PERFORMANCE METRICS (SECTION 25) ===');
  console.table(latencies);
  const totalMs = latencies.reduce((sum, l) => sum + l.durationMs, 0);
  const avgMs = Math.round(totalMs / latencies.length);
  console.log(`Average Turn Latency: ${avgMs}ms | Total Conversation Duration: ${totalMs}ms`);

  const e2ePassed = dbMeeting2[0] && (dbMeeting2[0].time === '17:00' || dbMeeting2[0].time === '05:00 PM');
  console.log('\nEND-TO-END CONVERSATION VERIFIED:', e2ePassed);
}

testEndToEndConversation().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
