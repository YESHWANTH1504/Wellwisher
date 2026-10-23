const pool = require('../config/db');
const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const { defaultConversationState } = require('../services/jarvis/os/JarvisConversationState');
const RoutineModel = require('../models/routineModel');

async function test30() {
  const testUserId = 9580;
  const today = new Date().toISOString().split('T')[0];
  const e2eSession = `test_p8_debug_e2e_${Date.now()}`;
  const id1 = `ev_p8_first_${Date.now()}`;
  const id2 = `ev_p8_second_${Date.now()}`;

  await pool.query("DELETE FROM routines WHERE user_id = ? AND (title LIKE '%Morning Standup%' OR title LIKE '%Architecture Review%')", [testUserId]);

  await RoutineModel.create({
    id: id1,
    userId: testUserId,
    title: 'Morning Standup',
    time: '09:00',
    date: today,
    eventType: 'routine'
  });

  await RoutineModel.create({
    id: id2,
    userId: testUserId,
    title: 'Architecture Review',
    time: '14:00',
    date: today,
    eventType: 'routine'
  });

  console.log('--- TURN 1 ---');
  await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId: e2eSession,
    text: "What's on my schedule?",
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));

  await defaultConversationState.setCandidates(e2eSession, testUserId, [
    { id: id1, title: 'Morning Standup', time: '09:00' },
    { id: id2, title: 'Architecture Review', time: '14:00' }
  ]);

  console.log('--- TURN 2 ---');
  const t2 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId: e2eSession,
    text: 'What is the second meeting?',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  console.log('T2:', t2.speech);

  console.log('--- TURN 3 ---');
  const t3 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId: e2eSession,
    text: 'Move it to 4 PM.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  console.log('T3:', t3.speech);

  console.log('--- TURN 4 ---');
  const t4 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId: e2eSession,
    text: 'Actually make it 5.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  console.log('T4:', t4.speech);

  console.log('--- TURN 5 ---');
  const t5 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId: e2eSession,
    text: 'Remind me one hour before.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  console.log('T5:', t5.speech);
  console.log('T5 FULL:', JSON.stringify(t5, null, 2));

  const [remRows] = await pool.query('SELECT id, title, time FROM routines WHERE user_id = ? AND title LIKE ? AND time = ?', [
    testUserId,
    '%Architecture Review%',
    '16:00'
  ]);
  console.log('REM ROWS:', remRows);

  console.log('--- TURN 6 ---');
  const t6 = await defaultOSCore.execute(new JarvisRequest({
    userId: testUserId,
    sessionId: e2eSession,
    text: 'Cancel that reminder.',
    modality: 'VOICE',
    userName: 'Yeshwanth'
  }));
  console.log('T6:', t6.speech);

  const [remAfter] = await pool.query('SELECT status FROM routines WHERE id = ?', [remRows[0]?.id]);
  console.log('REM AFTER STATUS:', remAfter[0]);
}

test30().then(() => process.exit(0)).catch(e => { console.error('T30 FAILED:', e); process.exit(1); });
