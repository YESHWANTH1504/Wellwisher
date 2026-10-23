process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../server');
const pool = require('../config/db');
const { getJwtSecret } = require('../middleware/authMiddleware');
const http = require('node:http');

function makeRequest(app, method, url, options = {}) {
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

test('Auth & Voice Overhaul Verification Suite', async (t) => {
  const testEmail = `test_vamsi_${Date.now()}@wellwisher.test`;
  const testPassword = 'Password123!';
  const testName = 'Vamsi Krishna';
  let registeredUserId = null;
  let userToken = null;

  await t.test('1. Server Health Check endpoint (/api/health) is accessible without auth', async () => {
    const res = await makeRequest(app, 'GET', '/api/health');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status.toLowerCase(), 'ok');
  });

  await t.test('2. Registration with valid details succeeds and hashes password with bcrypt', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/register', {
      body: {
        name: testName,
        email: testEmail,
        password: testPassword
      }
    });

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token, 'Must return JWT token');
    assert.equal(res.body.data.user.name, testName);
    assert.equal(res.body.data.user.email, testEmail);
    assert.equal(res.body.data.user.password_hash, undefined, 'Must NEVER return password_hash to client');
    assert.equal(res.body.data.user.password, undefined, 'Must NEVER return password to client');

    registeredUserId = res.body.data.user.id;
    userToken = res.body.data.token;

    // Verify in MySQL that password is an authentic bcrypt hash
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [registeredUserId]);
    assert.ok(rows.length > 0);
    assert.ok(rows[0].password_hash.startsWith('$2b$') || rows[0].password_hash.startsWith('$2a$'), 'Must be bcrypt hashed in DB');
    assert.notEqual(rows[0].password_hash, testPassword, 'Plaintext password must NEVER be in DB');
  });

  await t.test('3. Duplicate email registration is strictly rejected (409)', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/register', {
      body: {
        name: 'Another User',
        email: testEmail,
        password: 'AnotherPassword123!'
      }
    });

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('already exists'));
  });

  await t.test('4. Login with invalid password fails with 401', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/login', {
      body: {
        email: testEmail,
        password: 'WrongPassword999!'
      }
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid'));
  });

  await t.test('5. Login with non-existent email fails with 401', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/login', {
      body: {
        email: 'nobody_exists_here_999@wellwisher.test',
        password: testPassword
      }
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid'));
  });

  await t.test('6. Login with valid credentials succeeds and returns JWT and safe user info', async () => {
    const res = await makeRequest(app, 'POST', '/api/auth/login', {
      body: {
        email: testEmail,
        password: testPassword
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.name, testName);
    assert.equal(res.body.data.user.email, testEmail);
    assert.equal(res.body.data.user.password_hash, undefined);
  });

  await t.test('7. Auth middleware rejects missing Authorization header (401)', async () => {
    const res = await makeRequest(app, 'POST', '/api/jarvis/session');
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('8. Auth middleware rejects fake / demo tokens (401)', async () => {
    const res = await makeRequest(app, 'POST', '/api/jarvis/session', {
      headers: { Authorization: 'Bearer demo_user_token' }
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('9. Authenticated request correctly binds user identity and allows JARVIS API access', async () => {
    const res = await makeRequest(app, 'POST', '/api/jarvis/session', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.session.userId, registeredUserId);
  });

  await t.test('10. Voice switch command returns structured VOICE_SWITCH intent', async () => {
    const res = await makeRequest(app, 'POST', '/api/jarvis/message', {
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        message: 'Switch to male voice'
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.intent, 'VOICE_SWITCH');
    assert.equal(res.body.gender, 'male');
    const msg = res.body.speech || res.body.message || '';
    assert.ok(msg.toLowerCase().includes('male voice'));
  });

  await t.test('11. Personalization: Assistant addresses authenticated user by real DB name', async () => {
    const res = await makeRequest(app, 'POST', '/api/jarvis/message', {
      headers: { Authorization: `Bearer ${userToken}` },
      body: {
        message: 'Hi Jarvis'
      }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    const msg = res.body.speech || res.body.message || '';
    assert.ok(
      msg.includes('Vamsi'),
      `Greeting should contain user name Vamsi. Got: ${msg}`
    );
  });

  // Cleanup test user
  if (registeredUserId) {
    await pool.query('DELETE FROM users WHERE id = ?', [registeredUserId]);
  }
});
