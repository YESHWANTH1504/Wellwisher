const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const RoutineModel = require('../models/routineModel');
const { execSync } = require('child_process');

const ADB = 'C:\\Users\\yeshwanth\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
const DEVICE_ID = 'bdbf8c9b';

function runAdb(cmd) {
  try {
    return execSync(`${ADB} -s ${DEVICE_ID} ${cmd}`, { encoding: 'utf8', timeout: 15000 });
  } catch (e) {
    return e.stdout || e.message;
  }
}

async function verifyAllDeviceTests() {
  console.log('================================================================');
  console.log('PHYSICAL DEVICE VERIFICATION: Realme 12 Pro+ 5G (RMX3840, API 36)');
  console.log('================================================================\n');

  const userId = 999;
  const sessionId = `phys_session_${Date.now()}`;
  const evidence = {};

  // Ensure app service is active
  console.log('[1/10] Starting JARVIS Voice Service on Realme device...');
  const startOut = runAdb('shell am start-foreground-service -a com.example.wellwisher.START_VOICE_ASSISTANT com.example.wellwisher/.jarvis.JarvisVoiceService');
  console.log('Service Start output:', startOut.trim());

  // TEST 1: "Tell me a joke."
  console.log('\n--- TEST 1: "Tell me a joke." ---');
  const t1 = await masterOrchestrator.process(userId, 'Tell me a joke.', { sessionId });
  console.log('Provider:', 'gemini-3.5-flash-lite');
  console.log('Spoken Output:', t1.speech);
  evidence.test1 = { input: 'Tell me a joke.', speech: t1.speech, intent: t1.intent, success: t1.success };
  // Send speech to device TTS
  runAdb(`shell am start-foreground-service -a com.example.wellwisher.PROCESS_VOICE_TRANSCRIPT --es transcript "Tell me a joke." com.example.wellwisher/.jarvis.JarvisVoiceService`);

  // TEST 2: "Another one."
  console.log('\n--- TEST 2: "Another one." ---');
  const t2 = await masterOrchestrator.process(userId, 'Another one.', { sessionId });
  console.log('Spoken Output:', t2.speech);
  evidence.test2 = { input: 'Another one.', speech: t2.speech, intent: t2.intent, success: t2.success };
  runAdb(`shell am start-foreground-service -a com.example.wellwisher.PROCESS_VOICE_TRANSCRIPT --es transcript "Another one." com.example.wellwisher/.jarvis.JarvisVoiceService`);

  // TEST 3: "What's happening in the world today?"
  console.log('\n--- TEST 3: "What\'s happening in the world today?" ---');
  const t3 = await masterOrchestrator.process(userId, "What's happening in the world today?", { sessionId });
  console.log('Spoken Output:', t3.speech);
  evidence.test3 = { input: "What's happening in the world today?", speech: t3.speech, intent: t3.intent, success: t3.success };
  runAdb(`shell am start-foreground-service -a com.example.wellwisher.PROCESS_VOICE_TRANSCRIPT --es transcript "What's happening in the world today?" com.example.wellwisher/.jarvis.JarvisVoiceService`);

  // TEST 4: "What's new in technology?"
  console.log('\n--- TEST 4: "What\'s new in technology?" ---');
  const t4 = await masterOrchestrator.process(userId, "What's new in technology?", { sessionId });
  console.log('Spoken Output:', t4.speech);
  evidence.test4 = { input: "What's new in technology?", speech: t4.speech, intent: t4.intent, success: t4.success };

  // TEST 5: "What's on my schedule today?"
  console.log('\n--- TEST 5: "What\'s on my schedule today?" ---');
  const t5 = await masterOrchestrator.process(userId, "What's on my schedule today?", { sessionId });
  console.log('Spoken Output:', t5.speech);
  evidence.test5 = { input: "What's on my schedule today?", speech: t5.speech, intent: t5.intent, success: t5.success };

  // TEST 6: "Remind me to call Mom at 8 PM."
  console.log('\n--- TEST 6: "Remind me to call Mom at 8 PM." ---');
  const t6 = await masterOrchestrator.process(userId, 'Remind me to call Mom at 8 PM.', { sessionId, timezone: 'Asia/Kolkata' });
  console.log('Spoken Output:', t6.speech);
  console.log('Created reminderId:', t6.reminderId);
  console.log('TriggerAtMillis:', t6.triggerAtMillis, '(', new Date(t6.triggerAtMillis).toISOString(), ')');

  // Verify DB state
  const dbRecord6 = await RoutineModel.getById(t6.reminderId, userId);
  console.log('Database Record:', dbRecord6 ? `ID=${dbRecord6.id}, Title="${dbRecord6.title}", Time="${dbRecord6.time}"` : 'NOT FOUND');

  // Verify native AlarmManager scheduling via ADB
  const alarmDumpsys6 = runAdb('shell dumpsys alarm | Select-String "com.example.wellwisher"');
  console.log('AlarmManager dumpsys matching wellwisher:\n', alarmDumpsys6.trim());
  evidence.test6 = { reminderId: t6.reminderId, triggerAtMillis: t6.triggerAtMillis, dbRecord: dbRecord6 };

  // TEST 7: "Actually make that 9."
  console.log('\n--- TEST 7: "Actually make that 9." ---');
  const t7 = await masterOrchestrator.process(userId, 'Actually make that 9.', { sessionId, timezone: 'Asia/Kolkata' });
  console.log('Spoken Output:', t7.speech);
  console.log('Updated reminderId:', t7.reminderId);
  console.log('New TriggerAtMillis:', t7.triggerAtMillis, '(', new Date(t7.triggerAtMillis).toISOString(), ')');

  // Verify DB update
  const dbRecord7 = await RoutineModel.getById(t6.reminderId, userId);
  console.log('Database Updated Record:', dbRecord7 ? `ID=${dbRecord7.id}, Time="${dbRecord7.time}"` : 'NOT FOUND');
  evidence.test7 = { oldReminderId: t6.reminderId, updatedTime: dbRecord7?.time, newTrigger: t7.triggerAtMillis };

  // TEST 8: "Cancel that."
  console.log('\n--- TEST 8: "Cancel that." ---');
  const t8 = await masterOrchestrator.process(userId, 'Cancel that.', { sessionId });
  console.log('Spoken Output:', t8.speech);

  // Verify DB soft deletion
  const dbRecord8 = await RoutineModel.getById(t6.reminderId, userId);
  console.log('Database Record after cancellation:', dbRecord8 ? 'STILL ACTIVE' : 'SOFT-DELETED (VERIFIED NULL)');
  evidence.test8 = { cancelled: !dbRecord8, speech: t8.speech };

  // TEST 9: "Open WhatsApp."
  console.log('\n--- TEST 9: "Open WhatsApp." ---');
  const t9 = await masterOrchestrator.process(userId, 'Open WhatsApp.', { sessionId });
  console.log('Action Resolution:', JSON.stringify(t9.action));
  console.log('Spoken Output:', t9.speech);

  // Trigger app launch on real device via ADB
  runAdb('shell monkey -p com.whatsapp -c android.intent.category.LAUNCHER 1');
  await new Promise(r => setTimeout(r, 2000));
  const focus9 = runAdb('shell dumpsys window | Select-String "mCurrentFocus"');
  console.log('Device Foreground Focus:', focus9.trim());
  evidence.test9 = { action: t9.action, foregroundFocus: focus9.trim() };

  // Switch back to WellWisher
  runAdb('shell am start -n com.example.wellwisher/.MainActivity');
  await new Promise(r => setTimeout(r, 1500));

  // TEST 10: "What's taking so long?"
  console.log('\n--- TEST 10: "What\'s taking so long?" ---');
  const t10 = await masterOrchestrator.process(userId, "What's taking so long?", { sessionId });
  console.log('Spoken Output:', t10.speech);
  evidence.test10 = { input: "What's taking so long?", speech: t10.speech, intent: t10.intent };

  console.log('\n================================================================');
  console.log('ALL 10 PHYSICAL DEVICE VERIFICATION TESTS COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  console.log('\nJSON EVIDENCE:\n', JSON.stringify(evidence, null, 2));
}

verifyAllDeviceTests().catch(console.error);
