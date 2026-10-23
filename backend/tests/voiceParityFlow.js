const http = require('http');

function postVoice(text, sessionId) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      text,
      inputMode: 'VOICE',
      sessionId: sessionId || 'voice_parity_session',
      deviceId: 'realme_device_1',
      timestamp: Date.now().toString(),
      nonce: 'nonce_' + Math.random().toString(36).substring(2)
    });

    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: '/api/jarvis/voice/command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev_token',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getSchedule() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: '/api/schedule?date=2026-09-07',
      method: 'GET',
      headers: { 'Authorization': 'Bearer dev_token' }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const sessionId = 'voice_test_' + Date.now();
  
  console.log('1. Testing Voice Creation: "Hey Jarvis, Schedule a meeting with Arun at 5 PM."');
  const createRes = await postVoice('Hey Jarvis, Schedule a meeting with Arun at 5 PM.', sessionId);
  console.log('Create speech:', createRes.speech);
  let sched = await getSchedule();
  console.log('DB items after creation:', sched.data.length, sched.data.map(i => ({ title: i.title, time: i.time })));
  
  console.log('\n2. Testing Voice Follow-up Reschedule: "Actually make that 6 PM."');
  const updateRes = await postVoice('Actually make that 6 PM.', sessionId);
  console.log('Update speech:', updateRes.speech);
  sched = await getSchedule();
  console.log('DB items after update:', sched.data.length, sched.data.map(i => ({ title: i.title, time: i.time })));

  console.log('\n3. Testing Voice Follow-up Cancellation: "Cancel that."');
  const cancelRes = await postVoice('Cancel that.', sessionId);
  console.log('Cancel speech:', cancelRes.speech);
  sched = await getSchedule();
  console.log('DB items after cancellation:', sched.data.length);
})();
