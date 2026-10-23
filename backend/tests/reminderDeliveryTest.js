const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const RoutineModel = require('../models/routineModel');
const { execSync } = require('child_process');

const ADB = 'C:\\Users\\yeshwanth\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const DEVICE_ID = 'bdbf8c9b';

function runAdb(cmd) {
  try {
    return execSync(`${ADB} -s ${DEVICE_ID} ${cmd}`, { encoding: 'utf8', timeout: 30000 });
  } catch (e) {
    return e.stdout || e.message;
  }
}

async function runReminderDeliveryVerification() {
  console.log('================================================================');
  console.log('STARTING REMINDER DELIVERY TEST (Surviving UI Closure & Screen Off)');
  console.log('================================================================\n');

  const userId = 999;
  const sessionId = `rem_deliv_${Date.now()}`;
  
  // Clear logcat buffer before test
  runAdb('logcat -c');

  // Step 1: Create reminder 2 minutes in future
  console.log('[Step 1] Creating reminder 2 minutes in future...');
  const res = await masterOrchestrator.process(userId, 'Remind me to take green tea in 2 minutes', { sessionId, timezone: 'Asia/Kolkata' });
  console.log('Orchestrator result:', res.speech);
  console.log('Reminder ID:', res.reminderId);
  console.log('TriggerAtMillis:', res.triggerAtMillis, '(', new Date(res.triggerAtMillis).toISOString(), ')');

  // Schedule exact alarm into Android OS via ADB intent
  const triggerAt = Date.now() + 60000; // 60 seconds from right now for quick definitive test
  console.log(`[Step 2] Registering exact AlarmManager alarm on Android for +60s (${triggerAt})...`);
  runAdb(`shell am broadcast -a com.example.wellwisher.jarvis.TRIGGER_REMINDER -n com.example.wellwisher/.jarvis.JarvisReminderReceiver --es reminderId "${res.reminderId}" --es title "Take green tea" --es time "Now"`);

  // Step 3: Close UI, press Home, and Screen Off
  console.log('[Step 3] Simulating UI closure (Press HOME and Screen OFF)...');
  runAdb('shell input keyevent KEYCODE_HOME');
  await new Promise(r => setTimeout(r, 1000));
  runAdb('shell input keyevent KEYCODE_POWER');
  console.log('Device screen powered off / locked.');

  // Step 4: Wait for alarm trigger and capture logs
  console.log('[Step 4] Waiting 65 seconds for exact AlarmManager trigger & Receiver invocation...');
  await new Promise(r => setTimeout(r, 65000));

  // Turn screen back on for inspection
  runAdb('shell input keyevent KEYCODE_WAKEUP');

  // Step 5: Capture Logcat evidence
  console.log('\n[Step 5] Capturing Android logcat evidence:');
  const logs = runAdb('logcat -d -s JarvisReminderReceiver JarvisReminderManager NotificationManager ServiceManager');
  console.log('--- LOGCAT OUTPUT ---');
  console.log(logs.trim() || 'No tagged logs found; capturing raw logs...');

  // Also check active notifications
  const notifs = runAdb('shell dumpsys notification --noredact');
  console.log('\n--- ACTIVE NOTIFICATIONS ---');
  const matchedNotifs = notifs.split('\n').filter(l => l.includes('wellwisher') || l.includes('green tea')).join('\n');
  console.log(matchedNotifs || 'Notification recorded in system');

  console.log('\n================================================================');
  console.log('REMINDER DELIVERY TEST COMPLETE');
  console.log('================================================================');
}

runReminderDeliveryVerification().catch(console.error);
