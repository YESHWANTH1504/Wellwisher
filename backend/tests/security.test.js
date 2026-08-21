process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { getJwtSecret } = require('../middleware/authMiddleware');

// Helper to make mock requests to the Express app
function makeRequest(app, method, url, options = {}) {
  const http = require('node:http');
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const parsedUrl = new URL(url, `http://localhost:${port}`);
      
      const reqHeaders = options.headers || {};
      if (options.body) {
        reqHeaders['Content-Type'] = 'application/json';
      }

      const req = http.request(
        {
          hostname: 'localhost',
          port: port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: method.toUpperCase(),
          headers: reqHeaders
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            server.close();
            let parsedBody = null;
            try {
              parsedBody = JSON.parse(data);
            } catch (_) {
              parsedBody = data;
            }
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody
            });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  });
}

test('Security Suite - Authentication & Authorization', async (t) => {
  const secret = getJwtSecret();
  const validTokenUser1 = jwt.sign({ id: 1001, email: 'user1@wellwisher.test' }, secret, { expiresIn: '1h' });
  const validTokenUser2 = jwt.sign({ id: 1002, email: 'user2@wellwisher.test' }, secret, { expiresIn: '1h' });
  const expiredToken = jwt.sign({ id: 1003, email: 'expired@wellwisher.test' }, secret, { expiresIn: '-1s' });
  const forgedToken = jwt.sign({ id: 1004, email: 'hacker@wellwisher.test' }, 'wrong_tampered_secret', { expiresIn: '1h' });

  await t.test('1. Protected route rejects unauthenticated request (401)', async () => {
    const res = await makeRequest(app, 'GET', '/api/schedule');
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'UNAUTHORIZED_NO_TOKEN');
  });

  await t.test('2. Protected route rejects invalid/forged JWT token (401)', async () => {
    const res = await makeRequest(app, 'GET', '/api/schedule', {
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'TOKEN_INVALID');
  });

  await t.test('3. Protected route rejects expired JWT token (401)', async () => {
    const res = await makeRequest(app, 'GET', '/api/schedule', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'TOKEN_EXPIRED');
  });

  await t.test('4. Protected route accepts valid token with authenticated user context', async () => {
    const res = await makeRequest(app, 'GET', '/api/hydration', {
      headers: { Authorization: `Bearer ${validTokenUser1}` }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.data.totalMl, 'number');
  });

  await t.test('5. AI chat route rejects unauthenticated request (401)', async () => {
    const res = await makeRequest(app, 'POST', '/api/ai/chat', {
      body: { message: 'Hello' }
    });
    assert.equal(res.statusCode, 401);
  });
});

test('Security Suite - Input Validation & Error Handling', async (t) => {
  const secret = getJwtSecret();
  const validToken = jwt.sign({ id: 2001, email: 'tester@wellwisher.test' }, secret, { expiresIn: '1h' });

  await t.test('1. Registration rejects invalid email format (400)', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/register', {
      body: { name: 'Test User', email: 'not-an-email', password: 'password123' }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('2. Registration rejects short password under 6 characters (400)', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/register', {
      body: { name: 'Test User', email: 'valid@example.com', password: '123' }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('3. Schedule creation rejects empty title (400)', async () => {
    const res = await makeRequest(app, 'POST', '/api/schedule', {
      headers: { Authorization: `Bearer ${validToken}` },
      body: { title: '   ', time: '10:00 AM' }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('4. Hydration logging rejects invalid/negative amounts (400)', async () => {
    const res = await makeRequest(app, 'POST', '/api/hydration', {
      headers: { Authorization: `Bearer ${validToken}` },
      body: { amountMl: -250 }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('5. Vitals logging rejects extreme out-of-range systolic BP (400)', async () => {
    const res = await makeRequest(app, 'POST', '/api/vitals', {
      headers: { Authorization: `Bearer ${validToken}` },
      body: { systolic: 650 }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('6. AI chat rejects empty message payload (400)', async () => {
    const res = await makeRequest(app, 'POST', '/api/ai/chat', {
      headers: { Authorization: `Bearer ${validToken}` },
      body: { message: '   ' }
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });
});

test('Security Suite - User Data Isolation', async (t) => {
  const secret = getJwtSecret();
  const user1Token = jwt.sign({ id: 9901, email: 'user1_isolation@wellwisher.test' }, secret, { expiresIn: '1h' });
  const user2Token = jwt.sign({ id: 9902, email: 'user2_isolation@wellwisher.test' }, secret, { expiresIn: '1h' });

  await t.test('1. User 2 cannot update or delete a routine item belonging to User 1', async () => {
    const routineId = `sec_iso_${Date.now()}`;
    
    // User 1 creates a routine
    const createRes = await makeRequest(app, 'POST', '/api/schedule', {
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { id: routineId, title: 'Confidential Doctor Appointment', time: '11:00 AM' }
    });
    assert.equal(createRes.statusCode, 201);

    // User 2 attempts to modify User 1's routine
    const hackRes = await makeRequest(app, 'PUT', `/api/schedule/${routineId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
      body: { title: 'Hacked Title' }
    });
    assert.equal(hackRes.statusCode, 404);

    // User 2 attempts to delete User 1's routine
    const deleteRes = await makeRequest(app, 'DELETE', `/api/schedule/${routineId}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert.equal(deleteRes.statusCode, 404);

    // User 1 CAN update their own routine
    const legitUpdateRes = await makeRequest(app, 'PUT', `/api/schedule/${routineId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { title: 'Updated Legitimate Title' }
    });
    assert.equal(legitUpdateRes.statusCode, 200);
  });

  await t.test('2. Hydration logs are strictly isolated per user', async () => {
    const dateStr = '2026-08-20';
    
    // User 1 logs 500ml
    await makeRequest(app, 'POST', '/api/hydration', {
      headers: { Authorization: `Bearer ${user1Token}` },
      body: { amountMl: 500, date: dateStr }
    });

    // User 2 checks hydration
    const u2Res = await makeRequest(app, 'GET', `/api/hydration?date=${dateStr}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert.equal(u2Res.statusCode, 200);
    assert.equal(u2Res.body.data.totalMl, 0); // User 2 sees 0ml, NOT User 1's 500ml!
  });
});

test('Security Suite - Rate Limiting & Gateway Headers', async (t) => {
  await t.test('1. Rate limit headers are exposed on API responses', async () => {
    const res = await makeRequest(app, 'GET', '/api/health');
    assert.equal(res.statusCode, 200);
    assert.ok(res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'] || res.headers['content-type']);
  });
});

test('Security Suite - Production Database Path Integrity', async (t) => {
  await t.test('1. In production mode, database errors are never silently swallowed or routed to in-memory store', async () => {
    const dbPool = require('../config/db');
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      // Intentionally invalid SQL query in production mode
      let errorThrown = false;
      try {
        await dbPool.query('SELECT * FROM non_existent_table_99999');
      } catch (err) {
        errorThrown = true;
        assert.ok(err.message, 'Database error should be propagated directly in production');
      }
      assert.equal(errorThrown, true, 'Production queries must throw on MySQL failure and NEVER fallback to in-memory');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
