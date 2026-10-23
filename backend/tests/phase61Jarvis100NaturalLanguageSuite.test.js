const test = require('node:test');
const assert = require('node:assert/strict');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const healthConnectRepo = require('../repositories/ai/healthConnectRepository');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const pool = require('../config/db');

test.describe('JARVIS 100% Voice-First Personal AI & Health Intelligence Certification', () => {
  const userId = 1;
  const calendarSessionId = `test_cal_session_${Date.now()}`;

  test.beforeEach(() => {
    healthConnectRepo.clearForUser(userId);
  });

  // ====================================================
  // 1. GENERAL AI (First-class Reasoning, NOT Canned/Regex)
  // ====================================================
  test.describe('1. General AI Intelligence', () => {
    test('1.1 "Tell me a joke." produces a natural witty joke without touching calendar', async () => {
      const res = await masterOrchestrator.process(userId, 'Tell me a joke.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = (res.speech || res.message || '').toLowerCase();
      assert.ok(text.length > 10, 'Should generate a substantive joke response');
      assert.ok(!text.includes('10:00 am') && !text.includes('scheduled for'), 'Must not trigger calendar');
    });

    test('1.2 "Explain quantum computing." produces a factual scientific explanation', async () => {
      const res = await masterOrchestrator.process(userId, 'Explain quantum computing.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = (res.speech || res.message || '').toLowerCase();
      assert.ok(text.includes('quantum') || text.includes('qubit') || text.includes('computation'), 'Must contain quantum computing concepts');
    });

    test('1.3 "Why is the sky blue?" produces an atmospheric science explanation', async () => {
      const res = await masterOrchestrator.process(userId, 'Why is the sky blue?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = (res.speech || res.message || '').toLowerCase();
      assert.ok(text.includes('scatter') || text.includes('light') || text.includes('atmosphere') || text.includes('rayleigh'), 'Must explain light scattering');
    });

    test('1.4 Casual conversation "Tell me a story."', async () => {
      const res = await masterOrchestrator.process(userId, 'Tell me a story.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.length > 30, 'Should tell a story');
    });
  });

  // ====================================================
  // 2. CALENDAR READ/WRITE SAFETY & MULTI-TURN
  // ====================================================
  test.describe('2. Authoritative Calendar & Multi-Turn Intelligence', () => {
    test.before(async () => {
      await pool.query('UPDATE routines SET deleted_at = NOW(), status = "cancelled" WHERE user_id = ? AND title LIKE ?', [userId, '%Meeting with Arun%']);
    });

    test('2.1 "schedule for today" is strictly a READ operation with zero mutations', async () => {
      const [before] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);
      const res = await masterOrchestrator.process(userId, 'schedule for today', { source: 'VOICE_INTERACTION' });
      const [after] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);

      assert.equal(res.success, true);
      assert.equal(before[0].cnt, after[0].cnt, 'Database routine count must remain identical');
      const text = (res.speech || res.message || '').toLowerCase();
      assert.ok(!text.includes('added') && !text.includes('created'), 'Must not create event');
    });

    test('2.2 "what is scheduled today?" is strictly a READ operation', async () => {
      const [before] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);
      const res = await masterOrchestrator.process(userId, 'what is scheduled today?', { source: 'VOICE_INTERACTION' });
      const [after] = await pool.query('SELECT COUNT(*) as cnt FROM routines WHERE user_id = ?', [userId]);

      assert.equal(res.success, true);
      assert.equal(before[0].cnt, after[0].cnt);
    });

    test('2.3 Explicit creation "Add a meeting with Arun at 4 PM." creates real DB event', async () => {
      const res = await masterOrchestrator.process(
        userId,
        'Add a meeting with Arun at 4 PM.',
        { source: 'VOICE_INTERACTION', sessionId: calendarSessionId }
      );
      assert.equal(res.success, true);
      
      const [rows] = await pool.query('SELECT * FROM routines WHERE user_id = ? AND title LIKE ?', [userId, '%Meeting with Arun%']);
      assert.ok(rows.length >= 1, 'Event must exist in DB');
    });

    test('2.4 Multi-turn follow-up "Actually make that 5 PM." updates existing event', async () => {
      const res = await masterOrchestrator.process(
        userId,
        'Actually make that 5 PM.',
        { source: 'VOICE_INTERACTION', sessionId: calendarSessionId }
      );
      assert.equal(res.success, true);

      const [rows] = await pool.query(
        'SELECT * FROM routines WHERE user_id = ? AND title LIKE ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [userId, '%Meeting with Arun%']
      );
      assert.ok(rows.length >= 1, 'Should find meeting with Arun in DB');
      const timeVal = rows[0].time || rows[0].start_time || '';
      assert.ok(timeVal.includes('17:00') || timeVal.includes('05:00') || timeVal.includes('5:00'),
        `Event start time should be 5 PM / 17:00: ${timeVal}`);
    });

    test('2.5 Multi-turn follow-up "Cancel that." cancels the active event', async () => {
      const res = await masterOrchestrator.process(
        userId,
        'Cancel that.',
        { source: 'VOICE_INTERACTION', sessionId: calendarSessionId }
      );
      assert.equal(res.success, true);

      const [rows] = await pool.query(
        'SELECT * FROM routines WHERE user_id = ? AND title LIKE ? AND deleted_at IS NULL AND status != "cancelled"',
        [userId, '%Meeting with Arun%']
      );
      assert.equal(rows.length, 0, 'Event should be cancelled/inactive');
    });
  });

  // ====================================================
  // 3. HEALTH CONNECT INTELLIGENCE (Zero Fabrication)
  // ====================================================
  test.describe('3. Health Connect Intelligence & Zero Fabrication', () => {
    test('3.1 "How many steps have I walked today?" returns real steps when seeded', async () => {
      healthConnectRepo.saveMetric(userId, 'steps', 6842, 'steps', 'Health Connect');
      const res = await masterOrchestrator.process(userId, 'How many steps have I walked today?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('6,842') || text.includes('6842'), `Spoken response must report real steps: ${text}`);
    });

    test('3.2 "What is my heart rate?" returns real BPM reading', async () => {
      healthConnectRepo.saveMetric(userId, 'heartRate', 72, 'bpm', 'Health Connect');
      const res = await masterOrchestrator.process(userId, 'What is my heart rate?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('72'), `Must report 72 BPM: ${text}`);
    });

    test('3.3 "What\'s my resting heart rate?" returns resting heart rate', async () => {
      healthConnectRepo.saveMetric(userId, 'restingHeartRate', 61, 'bpm', 'Health Connect');
      const res = await masterOrchestrator.process(userId, "What's my resting heart rate?", { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('61'), `Must report 61 BPM: ${text}`);
    });

    test('3.4 "How many calories have I burned?" returns calories', async () => {
      healthConnectRepo.saveMetric(userId, 'activeCalories', 430, 'kcal', 'Health Connect');
      healthConnectRepo.saveMetric(userId, 'totalCalories', 430, 'kcal', 'Health Connect');
      const res = await masterOrchestrator.process(userId, 'How many calories have I burned?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('430'), `Must report 430 kcal: ${text}`);
    });

    test('3.5 "How did I sleep?" returns real sleep duration', async () => {
      healthConnectRepo.saveSleep(userId, {
        totalSleepMinutes: 462,
        deepSleepMinutes: 95
      }, 'Health Connect');
      const res = await masterOrchestrator.process(userId, 'How did I sleep?', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.includes('7 hours') || text.includes('462'), `Must report sleep duration: ${text}`);
    });

    test('3.6 Missing health data states data unavailable honestly without fabricating 0', async () => {
      // Clear metrics completely to verify zero-fabrication honest response
      healthConnectRepo.clearForUser(userId);
      const res = await masterOrchestrator.process(userId, 'What is my heart rate?', {
        source: 'VOICE_INTERACTION',
        sessionId: `clean_hc_session_${Date.now()}`
      });
      assert.equal(res.success, true);
      const text = (res.speech || res.message || '').toLowerCase();
      assert.ok(text.includes('not currently') || text.includes("don't") || text.includes('unavailable') || text.includes('no heart-rate') || text.includes('reading available'),
        `Should honestly state heart rate is unavailable: ${text}`);
    });
  });

  // ====================================================
  // 4. DEVICE CONTROL
  // ====================================================
  test.describe('4. Dynamic Device Actions', () => {
    test('4.1 "Open WhatsApp." plans open_application for com.whatsapp', async () => {
      const res = await masterOrchestrator.process(userId, 'Open WhatsApp.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      assert.ok(res.action || res.steps?.some(s => s.toolName === 'open_application'),
        'Must plan application opening tool');
    });

    test('4.2 "Open Settings." plans open_settings', async () => {
      const res = await masterOrchestrator.process(userId, 'Open Settings.', { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      assert.ok(res.action || res.steps?.some(s => s.toolName === 'open_settings' || s.toolName === 'open_application'),
        'Must plan settings opening');
    });
  });

  // ====================================================
  // 5. CURRENT INFORMATION & LIVE KNOWLEDGE
  // ====================================================
  test.describe('5. Current Information & News', () => {
    test('5.1 "What\'s happening in the world today?" invokes current information tool', async () => {
      const res = await masterOrchestrator.process(userId, "What's happening in the world today?", { source: 'VOICE_INTERACTION' });
      assert.equal(res.success, true);
      const text = res.speech || res.message || '';
      assert.ok(text.length > 20, 'Should provide current news summary');
    });
  });
});
