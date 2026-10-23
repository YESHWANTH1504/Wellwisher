const http = require('http');
const jwt = require('jsonwebtoken');

const secret = 'wellwisher_secure_jwt_secret_dev_32_chars_minimum_key!';
const token = jwt.sign({ id: 1, email: 'user1@wellwisher.com' }, secret, { expiresIn: '1h' });

function sendMessage(query, extra = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message: query,
      sessionId: 'visual_mem_test_session',
      ...extra
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api/jarvis/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runVisualMemoryTests() {
  const fs = require('fs');
  const path = require('path');
  const realImg = fs.readFileSync(path.resolve('../PHASE_6_PHYSICAL_EVIDENCE/07_camera_shutter_taken.png')).toString('base64');

  console.log('--- 1. EXPLICIT VISUAL MEMORY SAVE ---');
  const saveRes = await sendMessage('Remember this photo as my work desk.', {
    multimodalInput: {
      type: 'CAMERA_IMAGE',
      source: 'CAMERA',
      mimeType: 'image/jpeg',
      data: realImg
    }
  });
  console.log('Save response:', saveRes.message);

  console.log('\n--- 2. VISUAL MEMORY RECALL ---');
  const recallRes = await sendMessage('What did I ask you to remember about my work desk?');
  console.log('Recall response:', recallRes.message);

  console.log('\n--- 3. VISUAL MEMORY FORGET ---');
  const forgetRes = await sendMessage('Forget what you remember about my work desk.');
  console.log('Forget response:', forgetRes.message);

  console.log('\n--- 4. POST-DELETION VERIFICATION ---');
  const verifyRes = await sendMessage('What did I ask you to remember about my work desk?');
  console.log('Post-forget response:', verifyRes.message);
}

runVisualMemoryTests().catch(console.error);
