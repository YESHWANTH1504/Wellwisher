const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const http = require('node:http');
const app = require('../server');
const pool = require('../config/db');
const { getJwtSecret } = require('../middleware/authMiddleware');
const { activeTaskManager } = require('../services/jarvis/tasks/ActiveTaskManager');
const { idempotencyManager } = require('../services/jarvis/agent/idempotencyManager');
const ToolExecutionAgent = require('../services/jarvis/agent/specialized/ToolExecutionAgent');
const FollowUpResolutionAgent = require('../services/jarvis/agent/specialized/FollowUpResolutionAgent');
const AiConversationRepository = require('../repositories/ai/aiConversationRepository');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');

describe('PHASE 1: Project JARVIS Core Architecture & Security Hardening Test Suite', () => {
  const jwtSecret = getJwtSecret();
  const userA = { id: 7001, email: 'usera@jarvis.ai', name: 'User Alpha' };
  const userB = { id: 7002, email: 'userb@jarvis.ai', name: 'User Beta' };

  const tokenA = jwt.sign(userA, jwtSecret, { expiresIn: '1h' });
  const tokenB = jwt.sign(userB, jwtSecret, { expiresIn: '1h' });
  const expiredToken = jwt.sign(userA, jwtSecret, { expiresIn: '-1s' });
  const forgedToken = jwt.sign(userA, 'some_other_secret_key_that_is_32_characters_long_!', { expiresIn: '1h' });

  // HTTP Helper
  async function apiRequest(method, path, token = null, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const reqOptions = { method, headers };
    if (body && (method === 'POST' || method === 'PUT')) {
      reqOptions.body = JSON.stringify(body);
    }

    return new Promise((resolve, reject) => {
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

  before(async () => {
    // Seed test users
    await pool.query(
      `INSERT IGNORE INTO users (id, name, email, password_hash) VALUES 
       (7001, 'User Alpha', 'usera@jarvis.ai', 'hash_a'),
       (7002, 'User Beta', 'userb@jarvis.ai', 'hash_b')`
    );
  });

  after(async () => {
    await pool.end();
  });

  // =========================================================================
  // 1. AUTHENTICATION HARDENING (PHASE 1A & 1B)
  // =========================================================================
  describe('Phase 1A & 1B: Authentication & JWT Hardening', () => {
    it('1. Rejects dev_token bypass with HTTP 401', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state', 'dev_token');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('2. Rejects request with missing Authorization header with HTTP 401', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'UNAUTHORIZED_NO_TOKEN');
    });

    it('3. Rejects invalid / corrupted JWT with HTTP 401', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state', 'invalid.jwt.token');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'TOKEN_INVALID');
    });

    it('4. Rejects expired JWT with HTTP 401 and TOKEN_EXPIRED error', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state', expiredToken);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'TOKEN_EXPIRED');
    });

    it('5. Rejects token with invalid/forged signature with HTTP 401', async () => {
      const res = await apiRequest('GET', '/api/jarvis/state', forgedToken);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'TOKEN_INVALID');
    });

    it('6. Enforces strong minimum 32-character secret length', () => {
      const prevSecret = process.env.JWT_SECRET;
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'short_secret';
        assert.throws(() => getJwtSecret(), /FATAL SECURITY ERROR/);
      } finally {
        process.env.JWT_SECRET = prevSecret;
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  // =========================================================================
  // 2. REMOVE USER-ID OVERRIDE / IDOR (PHASE 1C & 1D)
  // =========================================================================
  describe('Phase 1C & 1D: Authorization & IDOR Elimination', () => {
    it('7. Body userId cannot override authenticated identity in autonomous tasks', async () => {
      // User A makes a request attempting to specify userId = User B in body
      const res = await apiRequest('POST', '/api/autonomous/tasks', tokenA, {
        title: 'Alpha Secret Task',
        userId: userB.id
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      // The task must be owned by authenticated User A, NOT User B
      assert.strictEqual(res.body.task.user_id, userA.id);
    });

    it('8. Query userId cannot override authenticated identity in autonomous tasks listing', async () => {
      // User A requests tasks with ?userId=UserB
      const res = await apiRequest('GET', `/api/autonomous/tasks?userId=${userB.id}`, tokenA);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      // Verify all returned tasks belong exclusively to User A
      for (const t of res.body.tasks) {
        assert.strictEqual(t.user_id, userA.id);
      }
    });

    it('9. Cross-user schedule access is blocked', async () => {
      // Create routine for User A
      const rotId = `rot_priv_${Date.now()}`;
      await pool.query(
        'INSERT INTO routines (id, user_id, title, date, time, status) VALUES (?, ?, ?, ?, ?, ?)',
        [rotId, userA.id, 'User A Private Medical Routine', '2026-09-28', '10:00 AM', 'scheduled']
      );

      // User B attempts to access User A's agenda
      const resB = await apiRequest('GET', '/api/jarvis/calendar/today', tokenB);
      assert.strictEqual(resB.status, 200);
      const userBEventIds = resB.body.events.map(e => e.id);
      assert.ok(!userBEventIds.includes(rotId), 'User B must NOT see User A schedule items');
    });

    it('10. Cross-user memory access is blocked', async () => {
      // Create private memory for User A
      await AiMemoryRepository.createMemory(userA.id, {
        memoryKey: 'allergies',
        memoryValue: 'Penicillin allergy',
        memoryType: 'IMPORTANT_CONTEXT'
      });

      // User B searches memories
      const userBMemories = await AiMemoryRepository.getMemoriesByUser(userB.id);
      const penicillinMem = userBMemories.find(m => m.memory_key === 'allergies');
      assert.strictEqual(penicillinMem, undefined, 'User B must NOT see User A memories');
    });

    it('11. Cross-user conversation history is blocked', async () => {
      const convAId = `conv_user_a_${Date.now()}`;
      await AiConversationRepository.createConversation(userA.id, {
        id: convAId,
        title: 'Alpha Private Conversation'
      });

      // User B attempts to retrieve User A conversation
      const convForB = await AiConversationRepository.getConversationById(convAId, userB.id);
      assert.strictEqual(convForB, null, 'User B must not be able to retrieve User A conversation');
    });

    it('12. Cross-user active-task access is isolated', () => {
      activeTaskManager.clearActiveTask('session_a', userA.id);
      activeTaskManager.clearActiveTask('session_b', userB.id);

      activeTaskManager.setActiveTask('session_a', {
        id: 'task_alpha',
        userId: userA.id,
        title: 'User A Routine'
      });

      const taskForB = activeTaskManager.getActiveTask('session_b', userB.id);
      assert.strictEqual(taskForB, null, 'User B cannot see User A active task');

      // Clean up session_a so it doesn't affect later tests
      activeTaskManager.clearActiveTask('session_a', userA.id);
    });
  });

  // =========================================================================
  // 3. DURABLE ACTIVE TASK PERSISTENCE & CONCURRENCY (PHASE 1F & 1G)
  // =========================================================================
  describe('Phase 1F & 1G: Durable Active Task State & Concurrency', () => {
    const sessionId = `test_durability_session_${Date.now()}`;

    it('13. Creates active task with structured candidates', async () => {
      const task = await activeTaskManager.setActiveTaskAsync(sessionId, {
        id: 'task_event_move_1',
        userId: userA.id,
        type: 'SCHEDULE_EVENT',
        title: 'Doctor Appointment',
        candidates: [
          { id: 'evt_101', title: 'Dentist Checkup', time: '10:00 AM' },
          { id: 'evt_102', title: 'Cardiologist Consultation', time: '02:00 PM' }
        ]
      });

      assert.ok(task);
      assert.strictEqual(task.userId, userA.id);
      assert.strictEqual(task.candidates.length, 2);
      assert.strictEqual(task.version, 1);
    });

    it('14. Persists active task into durable storage (ai_active_tasks)', async () => {
      const [rows] = await pool.query(
        'SELECT * FROM ai_active_tasks WHERE session_id = ? AND user_id = ?',
        [sessionId, userA.id]
      );
      assert.ok(rows.length > 0, 'Active task must be persisted in database');
      assert.strictEqual(rows[0].task_type, 'SCHEDULE_EVENT');
    });

    it('15 & 16. Restores active task after simulated backend restart (RAM cache cleared)', async () => {
      // Simulate backend restart by wiping in-memory sessionTasks map
      activeTaskManager.sessionTasks.clear();
      assert.strictEqual(activeTaskManager.getActiveTask(sessionId, userA.id), null);

      // Reconnect/hydrate from durable storage
      const restored = await activeTaskManager.loadActiveTask(sessionId, userA.id);
      assert.ok(restored, 'Active task must be restored from durable storage');
      assert.strictEqual(restored.id, 'task_event_move_1');
      assert.strictEqual(restored.candidates.length, 2);
      assert.strictEqual(restored.candidates[0].id, 'evt_101');
    });

    it('17. Resolves follow-up query after restart using restored candidates', () => {
      // Ensure in-memory cache has the restored task
      const active = activeTaskManager.getActiveTask(sessionId, userA.id);
      assert.ok(active);

      // Follow-up: "move the first one to 4 PM"
      const resolution = FollowUpResolutionAgent.resolve('move the first one to 4 PM', sessionId, {
        userId: userA.id
      });

      assert.strictEqual(resolution.isFollowUp, true);
      assert.ok(resolution.actionPlan);
      assert.strictEqual(resolution.actionPlan.steps[0].arguments.eventId, 'evt_101');
    });

    it('18. Expired active task is rejected and purged', () => {
      const expiredSession = `session_expired_${Date.now()}`;
      // Set task that expired 1 second ago
      activeTaskManager.setActiveTask(expiredSession, {
        id: 'task_expired',
        userId: userA.id,
        expiresAt: new Date(Date.now() - 1000).toISOString()
      });

      const retrieved = activeTaskManager.getActiveTask(expiredSession, userA.id);
      assert.strictEqual(retrieved, null, 'Expired active task must return null');
    });

    it('19 & 20. Versioning increments deterministically on consecutive updates', () => {
      const vSession = `session_ver_${Date.now()}`;
      const t1 = activeTaskManager.setActiveTask(vSession, {
        id: 'v_task',
        userId: userA.id,
        title: 'Step 1'
      });
      assert.strictEqual(t1.version, 1);

      const t2 = activeTaskManager.updateTaskStatus(vSession, 'EXECUTING');
      assert.strictEqual(t2.version, 2);

      const t3 = activeTaskManager.updateTaskStatus(vSession, 'COMPLETED');
      assert.strictEqual(t3.version, 3);
    });
  });

  // =========================================================================
  // 4. DURABLE IDEMPOTENCY (PHASE 1H)
  // =========================================================================
  describe('Phase 1H: Durable Idempotency Protection', () => {
    it('21. Duplicate mutating tool execution replays cached result without duplicate execution', async () => {
      const toolAgent = new ToolExecutionAgent();
      const toolName = 'create_schedule_event';
      const args = { title: 'Take Medication', time: '08:00 AM' };

      // First execution records mutation
      const fakeResult = { success: true, eventId: 'evt_med_1', message: 'Event created' };
      await idempotencyManager.recordAsync(userA.id, toolName, args, fakeResult, 60);

      // Replay identical call
      const replay = await toolAgent.executeToolStep(userA.id, toolName, args);
      assert.strictEqual(replay.success, true);
      assert.strictEqual(replay.isIdempotentReplay, true);
      assert.strictEqual(replay.data.eventId, 'evt_med_1');
    });

    it('22 & 23. Idempotency survives backend restart via durable checkAsync', async () => {
      const toolName = 'reminder_create';
      const args = { title: 'Drink Water 500ml', time: '11:00 AM' };
      const resultPayload = { success: true, reminderId: 'rem_dw_99', message: 'Reminder set' };

      await idempotencyManager.recordAsync(userA.id, toolName, args, resultPayload, 60);

      // Simulate backend restart by wiping in-memory cache
      idempotencyManager._cache.clear();
      assert.strictEqual(idempotencyManager.check(userA.id, toolName, args), null);

      // checkAsync retrieves persisted record from MySQL
      const recovered = await idempotencyManager.checkAsync(userA.id, toolName, args);
      assert.ok(recovered, 'Idempotency record must survive restart from durable storage');
      assert.strictEqual(recovered.reminderId, 'rem_dw_99');
    });
  });

  // =========================================================================
  // 5. JARVIS API & CANONICAL REQUEST BOUNDARY (PHASE 1E & 1P)
  // =========================================================================
  describe('Phase 1E & 1P: JARVIS Authoritative Gateway Security', () => {
    it('24. Authenticated message succeeds with verified user context', async () => {
      const res = await apiRequest('POST', '/api/jarvis/message', tokenA, {
        message: 'Hello JARVIS',
        timezone: 'America/New_York'
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.message || res.body.speech);
    });

    it('25. Unauthenticated JARVIS message is blocked with HTTP 401', async () => {
      const res = await apiRequest('POST', '/api/jarvis/message', null, {
        message: 'Hello JARVIS'
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('26. Authenticated schedule query executes within user scope', async () => {
      const res = await apiRequest('GET', '/api/jarvis/calendar/today', tokenA);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.events));
    });

    it('27. Cross-user token cannot access other user session memory', async () => {
      const sessionA = `session_${userA.id}_private_alpha`;
      // User B attempts to access User A's session memory
      const res = await apiRequest('GET', `/api/jarvis/memory?sessionId=${sessionA}`, tokenB);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.memory.session, null);
    });
  });
});
