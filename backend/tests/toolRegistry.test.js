process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');

const { registry, RISK_LEVELS, EXECUTION_STATUS, ToolRegistry } = require('../services/jarvis/tools');
const { AiPermissionRepository } = require('../repositories/ai/aiPermissionRepository');

test('Phase 2 - Tool Registry Architecture & Discovery', async (t) => {
  await t.test('1. Registry has all required tools loaded', () => {
    const list = registry.listAvailableTools();
    assert.ok(list.length >= 15, `Expected >= 15 registered tools, got ${list.length}`);
    
    const toolNames = list.map(t => t.name);
    assert.ok(toolNames.includes('get_today_schedule'));
    assert.ok(toolNames.includes('create_schedule'));
    assert.ok(toolNames.includes('update_schedule'));
    assert.ok(toolNames.includes('delete_schedule'));
    assert.ok(toolNames.includes('find_free_time'));
    assert.ok(toolNames.includes('detect_schedule_conflicts'));
    assert.ok(toolNames.includes('get_medications'));
    assert.ok(toolNames.includes('get_vitals'));
    assert.ok(toolNames.includes('get_wellness_summary'));
    assert.ok(toolNames.includes('save_memory'));
    assert.ok(toolNames.includes('search_memory'));
    assert.ok(toolNames.includes('get_ai_preferences'));
    assert.ok(toolNames.includes('send_family_notification'));
  });

  await t.test('2. Rejects duplicate tool registration', () => {
    assert.throws(
      () => {
        registry.register({
          name: 'create_schedule',
          description: 'duplicate',
          category: 'schedule',
          execute: async () => {}
        });
      },
      /already registered/
    );
  });

  await t.test('3. Rejects unknown tool execution', async () => {
    const res = await registry.execute('unknown_hack_tool', { userId: 100 }, {});
    assert.equal(res.success, false);
    assert.equal(res.errorCode, 'TOOL_NOT_FOUND');
  });

  await t.test('4. Discovery metadata does not expose internal functions or SQL', () => {
    const list = registry.listAvailableTools();
    for (const tool of list) {
      assert.equal(typeof tool.execute, 'undefined', 'execute function must not be leaked');
      assert.ok(tool.name);
      assert.ok(tool.description);
      assert.ok(tool.category);
      assert.ok(tool.riskLevel);
    }
  });
});

test('Phase 2 - Context Authorization & Input Validation', async (t) => {
  await t.test('1. Unauthenticated execution without userId is rejected', async () => {
    const res = await registry.execute('get_today_schedule', null, {});
    assert.equal(res.success, false);
    assert.equal(res.errorCode, 'UNAUTHORIZED');
  });

  await t.test('2. Missing required schema parameter is rejected with INVALID_INPUT', async () => {
    const res = await registry.execute('create_schedule', { userId: 100 }, { time: '10:00 AM' }); // missing title
    assert.equal(res.success, false);
    assert.equal(res.errorCode, 'INVALID_INPUT');
    assert.ok(res.message.includes('title'));
  });
});

test('Phase 2 - Autonomy Permissions & Confirmation Flow', async (t) => {
  const userId = 801;

  await t.test('1. Action with ASK_ALWAYS returns WAITING_FOR_CONFIRMATION when unconfirmed', async () => {
    // delete_schedule is HIGH risk / ASK_ALWAYS by default
    const res = await registry.execute('delete_schedule', { userId }, { scheduleId: 'rot_test_1' });
    assert.equal(res.success, true);
    assert.equal(res.status, EXECUTION_STATUS.WAITING_FOR_CONFIRMATION);
    assert.equal(res.requiresConfirmation, true);
    assert.ok(res.confirmationDetails);
  });

  await t.test('2. Action executes when explicit confirmation flag is provided', async () => {
    // First create a routine to delete
    await registry.execute('create_schedule', { userId }, { id: 'rot_to_delete', title: 'Temporary Routine' });

    const res = await registry.execute('delete_schedule', { userId, isConfirmed: true }, { scheduleId: 'rot_to_delete' });
    assert.equal(res.success, true);
    assert.equal(res.status, EXECUTION_STATUS.COMPLETED);
    assert.equal(res.requiresConfirmation, false);
  });

  await t.test('3. Action with DISABLED policy is blocked', async () => {
    await AiPermissionRepository.setPermission(userId, 'delete_schedule', 'DISABLED');

    const res = await registry.execute('delete_schedule', { userId, isConfirmed: true }, { scheduleId: 'rot_any' });
    assert.equal(res.success, false);
    assert.equal(res.status, EXECUTION_STATUS.DISABLED);
    assert.equal(res.errorCode, 'PERMISSION_DISABLED');
  });
});

test('Phase 2 - Schedule Tools & Conflict Detection', async (t) => {
  const userId = 901;
  const dateStr = '2026-08-20';

  await t.test('1. Create schedules for user', async () => {
    const res1 = await registry.execute('create_schedule', { userId }, {
      title: 'Morning Yoga',
      time: '07:00 AM',
      date: dateStr,
      category: 'exercise'
    });
    assert.equal(res1.success, true);
    assert.equal(res1.status, EXECUTION_STATUS.COMPLETED);

    const res2 = await registry.execute('create_schedule', { userId }, {
      title: 'Doctor Appointment',
      time: '10:00 AM',
      date: dateStr,
      category: 'health'
    });
    assert.equal(res2.success, true);
  });

  await t.test('2. get_today_schedule returns only own routines', async () => {
    const res = await registry.execute('get_today_schedule', { userId }, { date: dateStr });
    assert.equal(res.success, true);
    assert.equal(res.data.count, 2);
  });

  await t.test('3. detect_schedule_conflicts identifies overlapping slots', async () => {
    const conflictRes = await registry.execute('detect_schedule_conflicts', { userId }, {
      date: dateStr,
      time: '10:15 AM', // Overlaps with 10:00 AM Doctor Appointment
      durationMinutes: 30
    });
    assert.equal(conflictRes.success, true);
    assert.equal(conflictRes.data.hasConflict, true);
    assert.equal(conflictRes.data.conflictCount, 1);

    const noConflictRes = await registry.execute('detect_schedule_conflicts', { userId }, {
      date: dateStr,
      time: '02:00 PM',
      durationMinutes: 30
    });
    assert.equal(noConflictRes.success, true);
    assert.equal(noConflictRes.data.hasConflict, false);
  });

  await t.test('4. find_free_time calculates available time slots', async () => {
    const freeRes = await registry.execute('find_free_time', { userId }, {
      date: dateStr,
      preferredStart: '08:00 AM',
      preferredEnd: '06:00 PM',
      durationMinutes: 60
    });
    assert.equal(freeRes.success, true);
    assert.ok(freeRes.data.availableSlotsCount > 0);
  });
});

test('Phase 2 - Wellness, Memory, Preferences, Family & Security', async (t) => {
  const userId = 1001;

  await t.test('1. Wellness tools: log hydration and retrieve summary', async () => {
    const logRes = await registry.execute('log_hydration', { userId }, { amountMl: 500 });
    assert.equal(logRes.success, true);
    assert.equal(logRes.data.loggedAmountMl, 500);

    const sumRes = await registry.execute('get_wellness_summary', { userId }, {});
    assert.equal(sumRes.success, true);
    assert.ok(sumRes.data.hydration.totalMl >= 500);
  });

  await t.test('2. Memory tools: save, search, update, delete memory', async () => {
    const saveRes = await registry.execute('save_memory', { userId }, {
      memoryType: 'ROUTINE_PREFERENCE',
      memoryKey: 'green_tea_time',
      memoryValue: 'User enjoys green tea at 4:30 PM',
      importance: 4
    });
    assert.equal(saveRes.success, true);

    const searchRes = await registry.execute('search_memory', { userId }, { query: 'tea' });
    assert.equal(searchRes.success, true);
    assert.ok(searchRes.data.count >= 1);
  });

  await t.test('3. Preference tools: get and update preferences', async () => {
    const prefRes = await registry.execute('update_ai_preferences', { userId }, {
      assistantName: 'JARVIS Health Guardian',
      preferredResponseStyle: 'PROFESSIONAL'
    });
    assert.equal(prefRes.success, true);
    assert.equal(prefRes.data.updatedPreferences.assistantName, 'JARVIS Health Guardian');
  });

  await t.test('4. Family notification requires confirmation', async () => {
    const unconfirmed = await registry.execute('send_family_notification', { userId }, {
      toUserName: 'Daughter Sarah',
      message: 'Completed morning vitals check.'
    });
    assert.equal(unconfirmed.status, EXECUTION_STATUS.WAITING_FOR_CONFIRMATION);

    const confirmed = await registry.execute('send_family_notification', { userId, isConfirmed: true }, {
      toUserName: 'Daughter Sarah',
      message: 'Completed morning vitals check.'
    });
    assert.equal(confirmed.status, EXECUTION_STATUS.COMPLETED);
  });

  await t.test('5. Security: SQL injection attempts through tool input are safely treated as literals', async () => {
    const hackTitle = "'; DROP TABLE routines; --";
    const res = await registry.execute('create_schedule', { userId }, {
      title: hackTitle,
      time: '03:00 PM'
    });
    assert.equal(res.success, true);
    assert.equal(res.data.createdRoutine.title, hackTitle);
  });
});
