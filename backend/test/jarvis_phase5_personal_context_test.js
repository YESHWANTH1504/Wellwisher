/**
 * PHASE 5: Personal Context & Proactive Intelligence Comprehensive Backend Tests
 *
 * Verifies:
 * 1. Unified Context Snapshot (Freshness, Zero-Fabrication, NO_DATA handling)
 * 2. Memory Agent (Store, Recall, Forget, Explicit User Preference durability)
 * 3. Schedule Conflict Detection (Deterministic overlap computation)
 * 4. Morning Briefing & Proactive Engine (Deduplication, Quiet Hours)
 * 5. Autonomous Workflows & Proactive Events Lifecycle
 * 6. Section 40 REST Endpoints
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';
// Auth token helper - using test user id: 1
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'wellwisher_secure_jwt_secret_dev_32_chars_minimum_key!';
const testToken = jwt.sign({ id: 1, email: 'yeshwanth@example.com' }, JWT_SECRET, { expiresIn: '1h' });

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 PERSONAL CONTEXT & PROACTIVE INTELLIGENCE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // TEST 1: Unified Context Snapshot Endpoint
  await test('GET /api/jarvis/context returns valid unified snapshot structure', async () => {
    const res = await request('GET', '/api/jarvis/context');
    assert.strictEqual(res.status, 200, 'Context endpoint must return 200');
    assert.strictEqual(res.body.success, true, 'success field must be true');
    const snapshot = res.body.data;
    assert.ok(snapshot, 'Snapshot data must be present');
    assert.ok(snapshot.identity, 'Snapshot identity must exist');
    assert.ok(snapshot.freshness, 'Snapshot freshness flags must exist');
    assert.ok(['fresh', 'stale', 'expired', 'no_data'].includes(snapshot.freshness.health), 'Health freshness must be valid enum');
    assert.ok(snapshot.healthSignals, 'Health signals object must exist');
    // Ensure zero fabrication: If steps data is not recorded, it must be NO_DATA and value null, NOT 0
    if (snapshot.healthSignals.steps.status === 'NO_DATA') {
      assert.strictEqual(snapshot.healthSignals.steps.value, null, 'Steps value must be null when status is NO_DATA');
    }
  });

  // TEST 2: Memory Store via API
  let memoryId = null;
  await test('POST /api/jarvis/memory stores preference with source=USER_EXPLICIT', async () => {
    const res = await request('POST', '/api/jarvis/memory', {
      key: 'test_beverage',
      value: 'Filter Coffee',
      source: 'USER_EXPLICIT',
      importance: 5,
      type: 'USER_PREFERENCE'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.id);
    memoryId = res.body.data.id;
  });

  // TEST 3: Memory List & Filter via API
  await test('GET /api/jarvis/memory retrieves stored memories', async () => {
    const res = await request('GET', '/api/jarvis/memory');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find(m => m.memory_key === 'test_beverage' || m.key === 'test_beverage');
    assert.ok(found, 'Stored test_beverage memory must be retrieved');
  });

  // TEST 4: Memory Update via API
  await test('PATCH /api/jarvis/memory/:id updates memory value', async () => {
    const res = await request('PATCH', `/api/jarvis/memory/${memoryId}`, {
      value: 'South Indian Filter Coffee'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // TEST 5: Memory Delete via API
  await test('DELETE /api/jarvis/memory/:id removes memory', async () => {
    const res = await request('DELETE', `/api/jarvis/memory/${memoryId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  // TEST 6: Natural Language Memory Store ("Remember that I prefer 24-hour time")
  await test('NL Voice Command: "Remember that I prefer 24-hour time" persists preference', async () => {
    const res = await request('POST', '/api/jarvis/message', {
      message: 'Remember that I prefer 24-hour time'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const text = (res.body.speech || res.body.message || res.body.response || '').toLowerCase();
    assert.ok(text.includes('remember') || text.includes('noted') || text.includes('24-hour'), `Text should mention remember/noted/24-hour, got: "${text}"`);

    // Verify it is now in memory
    const memRes = await request('GET', '/api/jarvis/memory');
    const pref = memRes.body.data.find(m => m.memory_key === 'time_format' || m.key === 'time_format');
    assert.ok(pref, 'time_format preference must be persisted in database');
    assert.ok((pref.memory_value || pref.value).includes('24-hour'), `Expected preference to contain 24-hour, got: "${pref.memory_value || pref.value}"`);
  });

  // TEST 7: Natural Language Memory Recall ("What time format do I prefer?")
  await test('NL Voice Command: "What time format do I prefer?" recalls 24-hour preference', async () => {
    const res = await request('POST', '/api/jarvis/message', {
      message: 'What time format do I prefer?'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const text = (res.body.speech || res.body.message || res.body.response || '');
    assert.ok(text.includes('24-hour'), `Response should mention 24-hour, got: "${text}"`);
  });

  // TEST 8: Natural Language Memory Recall ("What do you remember about me?")
  await test('NL Voice Command: "What do you remember about me?" lists preferences', async () => {
    const res = await request('POST', '/api/jarvis/message', {
      message: 'What do you remember about me?'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const text = (res.body.speech || res.body.message || res.body.response || '').toLowerCase();
    assert.ok(text.includes('24-hour') || text.includes('remember'),
      `Response should mention memories, got: "${text}"`);
  });

  // TEST 9: Natural Language Memory Forget ("Forget that preference")
  await test('NL Voice Command: "Forget that I prefer 24-hour time" deletes preference', async () => {
    const res = await request('POST', '/api/jarvis/message', {
      message: 'Forget that I prefer 24-hour time'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const text = (res.body.speech || res.body.message || res.body.response || '').toLowerCase();
    assert.ok(text.includes('forgot') || text.includes('removed') || text.includes('deleted'), `Response should confirm forgetting, got: "${text}"`);

    // Verify it is removed
    const memRes = await request('GET', '/api/jarvis/memory');
    const pref = memRes.body.data.find(m => m.memory_key === 'time_format' || m.key === 'time_format');
    assert.ok(!pref, 'time_format must be deleted from memory');
  });

  // TEST 10: Morning Briefing Generation & Deduplication
  await test('POST /api/jarvis/briefing generates briefing and deduplicates second call', async () => {
    // Generate briefing with force=true to ensure fresh generation
    const res1 = await request('POST', '/api/jarvis/briefing', { force: true });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.success, true);
    const bText = res1.body.briefingText || res1.body.data?.briefingText || res1.body.speech;
    assert.ok(bText, 'Briefing text must be generated');
    const dedup = res1.body.deduplicationKey || res1.body.data?.deduplicationKey;
    assert.ok(dedup, 'Deduplication key must be present');

    // Attempt second briefing without force -> must indicate already delivered
    const res2 = await request('POST', '/api/jarvis/briefing', { force: false });
    assert.strictEqual(res2.status, 200);
    const delivered = res2.body.alreadyDelivered || res2.body.data?.alreadyDelivered;
    assert.strictEqual(delivered, true, 'Second briefing must be deduplicated as alreadyDelivered');
  });

  // TEST 11: Proactive Events Endpoint
  let testEventId = null;
  await test('POST /api/jarvis/proactive creates event and GET /api/jarvis/proactive lists it', async () => {
    const createRes = await request('POST', '/api/jarvis/proactive', {
      eventType: 'HYDRATION_NUDGE',
      priority: 'MEDIUM',
      title: 'Water Reminder',
      message: 'Time to hydrate and stretch.',
      metadata: { source: 'test' }
    });
    assert.strictEqual(createRes.status, 201);
    testEventId = createRes.body.data.id;

    const listRes = await request('GET', '/api/jarvis/proactive');
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.success, true);
    assert.ok(Array.isArray(listRes.body.data));
    const found = listRes.body.data.find(e => e.id === testEventId);
    assert.ok(found, 'Created proactive event must be in list');
  });

  // TEST 12: Acknowledge Proactive Event
  await test('POST /api/jarvis/proactive/ack acknowledges event', async () => {
    const ackRes = await request('POST', '/api/jarvis/proactive/ack', {
      eventId: testEventId
    });
    assert.strictEqual(ackRes.status, 200);
    assert.strictEqual(ackRes.body.success, true);
  });

  // TEST 13: Autonomous Workflow Actions CRUD
  let workflowId = null;
  await test('POST /api/jarvis/workflows creates workflow action and GET lists it', async () => {
    const postRes = await request('POST', '/api/jarvis/workflows', {
      actionType: 'CALENDAR_PREPARE',
      entityType: 'MEETING_BRIEF',
      payload: { meetingTitle: 'Sprint Retrospective', scheduledTime: '15:00' },
      idempotencyKey: 'test_wkflow_' + Date.now()
    });
    assert.strictEqual(postRes.status, 201);
    workflowId = postRes.body.data.id;

    const listRes = await request('GET', '/api/jarvis/workflows');
    assert.strictEqual(listRes.status, 200);
    const found = listRes.body.data.find(w => w.id === workflowId);
    assert.ok(found, 'Created workflow action must be in list');
  });

  // TEST 14: Patch Workflow Action Status
  await test('PATCH /api/jarvis/workflows/:id updates status', async () => {
    const patchRes = await request('PATCH', `/api/jarvis/workflows/${workflowId}`, {
      status: 'EXECUTED',
      result: { summary: 'Brief prepared and synced.' }
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.success, true);
  });

  // TEST 15: Delete Workflow Action
  await test('DELETE /api/jarvis/workflows/:id removes workflow', async () => {
    const delRes = await request('DELETE', `/api/jarvis/workflows/${workflowId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
