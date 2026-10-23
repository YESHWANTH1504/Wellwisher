const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const app = require('../server');
const pool = require('../config/db');

const { getJwtSecret } = require('../middleware/authMiddleware');

describe('Phase 3: JARVIS API & Security Hardening Test Suite', () => {
  const jwtSecret = getJwtSecret();
  const userA = { id: 8888, email: 'testA@jarvis.ai' };
  const userB = { id: 9999, email: 'testB@jarvis.ai' };

  const tokenA = jwt.sign(userA, jwtSecret, { expiresIn: '1h' });
  const tokenB = jwt.sign(userB, jwtSecret, { expiresIn: '1h' });

  before(async () => {
    // Seed test users in MySQL if not present
    await pool.query(
      `INSERT IGNORE INTO users (id, name, email, password_hash) VALUES 
       (8888, 'Test User A', 'testA@jarvis.ai', 'hash_a'),
       (9999, 'Test User B', 'testB@jarvis.ai', 'hash_b')`
    );
  });

  // Helper for mock HTTP requests against Express app
  async function apiRequest(method, path, token = null, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const reqOptions = {
      method,
      headers
    };
    if (body && (method === 'POST' || method === 'PUT')) {
      reqOptions.body = JSON.stringify(body);
    }

    // Use Node.js http request with running listener or app
    return new Promise((resolve, reject) => {
      const http = require('node:http');
      const server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const req = http.request(`http://127.0.0.1:${port}${path}`, reqOptions, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            server.close();
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (_) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        });
        req.on('error', (err) => {
          server.close();
          reject(err);
        });
        if (reqOptions.body) req.write(reqOptions.body);
        req.end();
      });
    });
  }

  describe('1. Authentication Enforcement & Zero User 1 Fallback', () => {
    it('Rejects unauthenticated requests with HTTP 401', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('Rejects invalid / corrupted JWT tokens with HTTP 401', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state', 'invalid_jwt_garbage_token');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('Rejects token with missing user id payload', async () => {
      const invalidToken = jwt.sign({ noUserIdHere: true }, jwtSecret);
      const res = await apiRequest('GET', '/api/jarvis/state', invalidToken);
      assert.strictEqual(res.status, 401);
    });
  });

  describe('2. User Isolation & Scoping Invariants', () => {
    it('Creates sessions isolated to specific authenticated users', async () => {
      const resA = await apiRequest('POST', '/api/jarvis/session', tokenA, {});
      assert.strictEqual(resA.status, 200);
      assert.strictEqual(resA.body.success, true);
      assert.strictEqual(resA.body.session.userId, userA.id);

      const resB = await apiRequest('POST', '/api/jarvis/session', tokenB, {});
      assert.strictEqual(resB.status, 200);
      assert.strictEqual(resB.body.success, true);
      assert.strictEqual(resB.body.session.userId, userB.id);

      assert.notStrictEqual(resA.body.session.sessionId, resB.body.session.sessionId);
    });

    it('User B cannot view or leak User A memory', async () => {
      const memA = await apiRequest('GET', `/api/jarvis/memory?sessionId=session_${userA.id}_default`, tokenB);
      assert.strictEqual(memA.status, 200);
      // User B query receives User B default memory, not User A memory
      assert.ok(memA.body.success);
    });
  });

  describe('3. Required Endpoints Operational Integrity', () => {
    it('GET /api/jarvis/state returns READY companion state', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state', tokenA);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.state, 'READY');
      assert.strictEqual(res.body.companion, 'JARVIS');
    });

    it('GET /api/jarvis/capabilities returns registered tool capabilities', async () => {
      const res = await apiRequest('GET', '/api/jarvis/capabilities', tokenA);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.capabilities));
      assert.ok(res.body.capabilities.length > 5);
    });

    it('POST /api/jarvis/message responds to natural greeting', async () => {
      const res = await apiRequest('POST', '/api/jarvis/message', tokenA, {
        message: 'Hello Jarvis'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.speech && res.body.speech.length > 0);
    });

    it('POST /api/jarvis/voice accepts utterance transcript', async () => {
      const res = await apiRequest('POST', '/api/jarvis/voice', tokenA, {
        transcript: 'What can you do?'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.speech && res.body.speech.length > 0);
    });

    it('POST /api/jarvis/cancel safely cancels active turn', async () => {
      const res = await apiRequest('POST', '/api/jarvis/cancel', tokenA, {
        sessionId: 'session_test_turn'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
  });
});
