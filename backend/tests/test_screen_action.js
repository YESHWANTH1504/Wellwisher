const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const JarvisScreenContext = require('../services/jarvis/os/JarvisScreenContext');
const db = require('../config/db');

async function testScreenToAction() {
  const userId = 9580;
  const sessionId = 'test_screen_action_' + Date.now();

  const inviteScreen = new JarvisScreenContext({
    currentApplication: 'com.google.android.gm',
    screenTitle: 'Invitation: Project Milestone Review',
    visibleText: [
      'Event: Project Milestone Review',
      'Date: 2026-10-15',
      'Time: 15:00',
      'Location: Conference Room B'
    ],
    timestamps: { capturedAt: new Date().toISOString() },
    confidence: 0.98
  });

  console.log('=== TEST SCREEN -> ACTION: ADD DATE SHOWN HERE TO CALENDAR ===');
  const req = new JarvisRequest({
    userId,
    sessionId,
    text: 'Add the event and date shown here to my calendar.',
    modality: 'VOICE',
    screenContext: inviteScreen,
    userName: 'Yeshwanth'
  });

  const res = await defaultOSCore.execute(req);
  console.log('Execution Speech:', res.speech);
  console.log('Telemetry:', res.telemetry);

  // Verify in MySQL
  const [rows] = await db.query(
    'SELECT id, title, time, date, status FROM routines WHERE user_id = ? AND (title LIKE ? OR title LIKE ?) ORDER BY created_at DESC LIMIT 1',
    [userId, '%Project Milestone%', '%Milestone Review%']
  );

  console.log('Created MySQL Routine:', rows[0]);
  const verified = rows && rows[0] && rows[0].status === 'scheduled';
  console.log('SCREEN -> ACTION VERIFIED:', verified);
}

testScreenToAction().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
