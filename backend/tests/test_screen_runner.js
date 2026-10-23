const { defaultOSCore, JarvisRequest } = require('../services/jarvis/os/JarvisOSCore');
const JarvisScreenContext = require('../services/jarvis/os/JarvisScreenContext');

async function testScreenAwareness() {
  const userId = 9580;
  const sessionId = 'test_screen_session_' + Date.now();

  const realScreen = new JarvisScreenContext({
    currentApplication: 'com.android.settings',
    screenTitle: 'Settings Homepage',
    visibleText: [
      '1. Wi-Fi: Connected to MCCSTAFF',
      '2. Bluetooth: On',
      '3. Mobile network: Jio 5G',
      '4. Battery: 70% Charging'
    ],
    interactiveElements: [
      { id: 'btn_wifi', text: 'Wi-Fi: Connected to MCCSTAFF', index: 0 },
      { id: 'btn_bluetooth', text: 'Bluetooth: On', index: 1 }
    ],
    timestamps: { capturedAt: new Date().toISOString() },
    confidence: 0.99
  });

  console.log('=== TEST 1: WHAT IS ON MY SCREEN? ===');
  const req1 = new JarvisRequest({
    userId,
    sessionId,
    text: 'What is on my screen?',
    modality: 'VOICE',
    screenContext: realScreen,
    userName: 'Yeshwanth'
  });
  const res1 = await defaultOSCore.execute(req1);
  console.log('Screen Speech:', res1.speech);

  console.log("=== TEST 2: WHAT'S THE FIRST ITEM? ===");
  const req2 = new JarvisRequest({
    userId,
    sessionId,
    text: "What's the first item on my screen?",
    modality: 'VOICE',
    screenContext: realScreen,
    userName: 'Yeshwanth'
  });
  const res2 = await defaultOSCore.execute(req2);
  console.log('First Item Speech:', res2.speech);

  const passed = res1.speech.toLowerCase().includes('settings') || 
                 res1.speech.toLowerCase().includes('wi-fi') || 
                 res2.speech.toLowerCase().includes('wi-fi');
  console.log('SCREEN AWARENESS VERIFIED:', passed);
}

testScreenAwareness().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
