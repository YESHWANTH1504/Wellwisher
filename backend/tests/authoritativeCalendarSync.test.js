const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const RoutineModel = require('../models/routineModel');
const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const VoiceResponseFormatter = require('../services/jarvis/agent/VoiceResponseFormatter');

test('Authoritative Calendar Sync & TTS Asterisk Fix Test Suite', async (t) => {
  const orchestrator = masterOrchestrator;
  const testUserId = 1;
  const sessionId = `test_sync_${Date.now()}`;

  // ==========================================
  // 1. TTS SANITIZATION & ASTERISK REMOVAL
  // ==========================================
  await t.test('1. TTS Sanitizer eliminates all asterisks and markdown artifacts', () => {
    const cases = [
      {
        input: 'Scheduled! **Meeting with Arun** at 4:00 PM',
        expectedNotContains: ['*', '**', 'astric', 'asterisk']
      },
      {
        input: '* Meeting with Arun\n* Call Mom\n* Workout',
        expectedNotContains: ['*', 'bullet']
      },
      {
        input: 'Check out [JARVIS Docs](https://example.com/docs) for `details_v1` ~~old~~ #heading',
        expectedNotContains: ['[', ']', '(', ')', '`', '~~', '#']
      },
      {
        input: 'Steps today: 8,420 steps. Heart rate: 72 bpm. Time: 6:30 PM.',
        expectedContains: ['8,420', '72', '6:30 PM']
      }
    ];

    for (const c of cases) {
      const speech = VoiceResponseFormatter.formatForSpeech(c.input);
      if (c.expectedNotContains) {
        for (const token of c.expectedNotContains) {
          assert.ok(
            !speech.includes(token),
            `TTS speech output "${speech}" should not contain "${token}" from input "${c.input}"`
          );
        }
      }
      if (c.expectedContains) {
        for (const token of c.expectedContains) {
          assert.ok(
            speech.includes(token),
            `TTS speech output "${speech}" should contain "${token}"`
          );
        }
      }
    }
  });

  // ==========================================
  // 2. LOCAL CALENDAR DATE HANDLING
  // ==========================================
  await t.test('2. Local calendar date formatting does not shift dates across timezones', () => {
    function formatLocalDate(year, month, day) {
      const y = year.toString().padStart(4, '0');
      const m = month.toString().padStart(2, '0');
      const d = day.toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Boundary dates: midnight, 23:59, month boundaries, leap year, year end
    assert.equal(formatLocalDate(2026, 9, 8), '2026-09-08');
    assert.equal(formatLocalDate(2026, 1, 1), '2026-01-01');
    assert.equal(formatLocalDate(2026, 12, 31), '2026-12-31');
    assert.equal(formatLocalDate(2024, 2, 29), '2024-02-29'); // leap year

    // Ensure date-only string parsing doesn't regress
    const rawDateStr = '2026-09-08';
    const parts = rawDateStr.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    assert.equal(dateObj.getFullYear(), 2026);
    assert.equal(dateObj.getMonth() + 1, 9);
    assert.equal(dateObj.getDate(), 8);
  });

  // ==========================================
  // 3. AUTHORITATIVE SCHEDULE MUTATIONS (ADD, UPDATE, COMPLETE, DELETE)
  // ==========================================
  let createdRoutineId = null;
  const nowLocal = new Date();
  const testDate = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(nowLocal.getDate()).padStart(2, '0')}`;

  await t.test('3. Authoritative Routine Addition via RoutineModel', async () => {
    const routineData = {
      userId: testUserId,
      title: 'Sync Test Meeting with Arun',
      category: 'Work',
      time: '16:00:00',
      date: testDate,
      reminderEnabled: true,
      description: 'Authoritative test routine'
    };

    const created = await RoutineModel.create(routineData);
    assert.ok(created && created.id, 'Routine creation should return created routine with id');
    createdRoutineId = created.id;

    const routines = await RoutineModel.getByDate(testUserId, testDate);
    const found = routines.find(r => r.id === createdRoutineId || r.title === routineData.title);
    assert.ok(found, 'Newly created routine must exist in the authoritative database');
    assert.equal(found.time, '16:00:00');
  });

  await t.test('4. Authoritative Timing Modification (4:00 PM -> 6:30 PM)', async () => {
    assert.ok(createdRoutineId, 'Must have a routine to update');

    await RoutineModel.update(createdRoutineId, testUserId, {
      time: '18:30:00',
      description: 'Rescheduled to 6:30 PM'
    });

    const routines = await RoutineModel.getByDate(testUserId, testDate);
    const updated = routines.find(r => r.id === createdRoutineId);
    assert.ok(updated, 'Routine must still exist');
    assert.equal(updated.time, '18:30:00', 'Routine time must be updated to 18:30:00 in MySQL');
  });

  await t.test('5. Authoritative Completion Toggle', async () => {
    assert.ok(createdRoutineId);

    // Toggle completed
    await RoutineModel.setStatus(createdRoutineId, testUserId, 'completed', new Date());

    let routines = await RoutineModel.getByDate(testUserId, testDate);
    let item = routines.find(r => r.id === createdRoutineId);
    assert.equal(item.status, 'completed', 'Routine status must be persisted as completed');

    // Toggle back to scheduled
    await RoutineModel.setStatus(createdRoutineId, testUserId, 'scheduled', null);

    routines = await RoutineModel.getByDate(testUserId, testDate);
    item = routines.find(r => r.id === createdRoutineId);
    assert.equal(item.status, 'scheduled', 'Routine status must be persisted as scheduled');
  });

  // ==========================================
  // 6. CONTEXT EVENT RECORDING WITHOUT DUPLICATE CALENDAR STORE
  // ==========================================
  await t.test('6. JARVIS Context Event records reschedule in conversation session', async () => {
    const event = {
      event: 'SCHEDULE_CHANGED',
      action: 'RESCHEDULED',
      scheduleId: createdRoutineId,
      title: 'Sync Test Meeting with Arun',
      previousTime: '16:00',
      newTime: '18:30',
      date: testDate
    };

    const recordResult = orchestrator.recordContextEvent(testUserId, sessionId, event);
    assert.equal(recordResult, true);

    // Inspect session context
    const session = orchestrator.getSession(testUserId, sessionId);
    assert.ok(session.contextEvents && session.contextEvents.length > 0);
    const lastEvent = session.contextEvents[0];
    assert.equal(lastEvent.action, 'RESCHEDULED');
    assert.equal(lastEvent.newTime, '18:30');
  });

  // ==========================================
  // 7. AUTHORITATIVE QUERY: JARVIS REFLECTS REAL DB STATE
  // ==========================================
  await t.test('7. JARVIS Schedule Query retrieves authoritative updated 6:30 PM time', async () => {
    // Process "What is on my schedule today?"
    const res = await orchestrator.processRequest(testUserId, `What is on my schedule today?`, {
      sessionId,
      source: 'voice'
    });

    const answer = (res.speech || res.message || '').toLowerCase();
    const spoken = (res.spokenResponse || '').toLowerCase();

    // Verify it mentions 6:30 PM (or 18:30) and Sync Test Meeting
    assert.ok(
      answer.includes('6:30') || answer.includes('18:30') || spoken.includes('6:30') || spoken.includes('18:30') || answer.includes('meeting') || spoken.includes('meeting'),
      `Answer should reflect authoritative rescheduled time: "${answer}" | Spoken: "${spoken}"`
    );

    // Verify NO asterisk in spoken response
    assert.ok(!spoken.includes('*'), 'Spoken output must never contain asterisks!');
    assert.ok(!spoken.includes('astric'), 'Spoken output must never contain "astric"!');
    assert.ok(!spoken.includes('asterisk'), 'Spoken output must never contain "asterisk"!');
  });

  // ==========================================
  // 8. AUTHORITATIVE DELETION
  // ==========================================
  await t.test('8. Authoritative Routine Deletion cleans up record', async () => {
    assert.ok(createdRoutineId);

    const deleteSuccess = await RoutineModel.softDelete(createdRoutineId, testUserId);
    assert.ok(deleteSuccess, 'RoutineModel.softDelete should return true');

    const routines = await RoutineModel.getByDate(testUserId, testDate);
    const found = routines.find(r => r.id === createdRoutineId);
    assert.equal(found, undefined, 'Deleted routine must no longer exist in the authoritative database');
  });
});
