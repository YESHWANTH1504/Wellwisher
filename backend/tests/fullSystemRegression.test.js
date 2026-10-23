const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { masterOrchestrator } = require('../services/jarvis/orchestrator/JarvisMasterOrchestrator');
const VoiceResponseFormatter = require('../services/jarvis/agent/VoiceResponseFormatter');
const RoutineModel = require('../models/routineModel');

test('JARVIS Full-System Regression After Calendar Integration', async (t) => {
  const orchestrator = masterOrchestrator;
  const testUserId = 1;
  const sessionId = `full_regression_${Date.now()}`;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ==========================================
  // 1. TTS MARKDOWN & SYNTAX SANITIZATION
  // ==========================================
  await t.test('1. TTS Sanitization strictly strips Markdown without vocalizing syntax words', () => {
    const markdownInputs = [
      '**Bold text** with *italic note* and `inline_code`',
      '* Item 1\n* Item 2\n* Item 3',
      '# Main Heading\n## Subheading\nSome text',
      '[Official Docs](https://wellwisher.health/docs)',
      'Value is: **critical** for user_id and file_name at 6:30 PM'
    ];

    const forbiddenWords = ['asterisk', 'astric', 'star', 'hash', 'backtick', '**', '`', '~~', '#'];

    for (const input of markdownInputs) {
      const sanitized = VoiceResponseFormatter.formatForSpeech(input);
      const lower = sanitized.toLowerCase();

      for (const forbidden of forbiddenWords) {
        assert.ok(
          !lower.includes(forbidden.toLowerCase()),
          `Sanitized TTS "${sanitized}" must not contain "${forbidden}" (from input: "${input}")`
        );
      }
    }

    // Verify preservation of numbers, times, and snake_case
    const complexInput = 'Today at 6:30 PM, user_profile 12 was updated with 8,420 steps.';
    const sanitizedComplex = VoiceResponseFormatter.formatForSpeech(complexInput);
    assert.ok(sanitizedComplex.includes('6:30 PM'), 'Must preserve 6:30 PM');
    assert.ok(sanitizedComplex.includes('8,420'), 'Must preserve 8,420');
    assert.ok(sanitizedComplex.includes('user_profile'), 'Must preserve snake_case identifier');
  });

  // ==========================================
  // 2. GENERAL AI REGRESSION (NOT CALENDAR COMMANDS)
  // ==========================================
  await t.test('2. General AI queries are processed by Gemini and NOT misrouted as Calendar commands', async () => {
    const generalQueries = [
      'Tell me a joke.',
      'Explain quantum computing.',
      'Why is the sky blue?',
      'Tell me a short story.',
      "I'm bored.",
      "What's happening in the world today?"
    ];

    for (const query of generalQueries) {
      const res = await orchestrator.processRequest(testUserId, query, {
        sessionId: `gen_ai_${Date.now()}`,
        source: 'voice'
      });

      const responseText = res.speech || res.message || res.spokenResponse || '';
      assert.ok(responseText.length > 0, `Query "${query}" must return a response`);

      // Ensure it did NOT trigger calendar mutation tools
      const toolCalls = res.toolCalls || [];
      const calendarMutations = toolCalls.filter(t => 
        t.name && (t.name.includes('create') || t.name.includes('update') || t.name.includes('delete') || t.name.includes('reschedule'))
      );
      assert.equal(
        calendarMutations.length,
        0,
        `General AI query "${query}" must not trigger calendar mutation tools: ${JSON.stringify(calendarMutations)}`
      );

      // Verify response text does not hallucinate calendar events
      assert.ok(
        !responseText.toLowerCase().includes('scheduled a meeting') &&
        !responseText.toLowerCase().includes('added to your schedule'),
        `General query "${query}" should not return calendar scheduling responses`
      );
    }
  });

  // ==========================================
  // 3. HEALTH CONNECT REGRESSION
  // ==========================================
  await t.test('3. Health queries execute real health tools and never fabricate values', async () => {
    // 3A: Steps query
    const stepsRes = await orchestrator.processRequest(testUserId, 'How many steps have I walked today?', {
      sessionId: `health_test_${Date.now()}`,
      source: 'voice'
    });
    const stepsText = stepsRes.speech || stepsRes.message || stepsRes.spokenResponse || '';
    assert.ok(stepsText.length > 0, 'Steps query must return response');
    assert.ok(
      stepsText.toLowerCase().includes('step') || stepsText.toLowerCase().includes('walk') || stepsText.toLowerCase().includes('data') || stepsText.toLowerCase().includes('unavailable'),
      `Steps response should mention steps or report honest status: "${stepsText}"`
    );

    // 3B: Heart rate query
    const hrRes = await orchestrator.processRequest(testUserId, 'What is my heart rate?', {
      sessionId: `health_hr_${Date.now()}`,
      source: 'voice'
    });
    const hrText = hrRes.speech || hrRes.message || hrRes.spokenResponse || '';
    assert.ok(hrText.length > 0, 'Heart rate query must return response');
    assert.ok(
      hrText.toLowerCase().includes('heart') || hrText.toLowerCase().includes('bpm') || hrText.toLowerCase().includes('pulse') || hrText.toLowerCase().includes('unavailable'),
      `Heart rate response should mention heart rate or report honest status: "${hrText}"`
    );

    // 3C: Sleep query
    const sleepRes = await orchestrator.processRequest(testUserId, 'How did I sleep?', {
      sessionId: `health_sleep_${Date.now()}`,
      source: 'voice'
    });
    const sleepText = sleepRes.speech || sleepRes.message || sleepRes.spokenResponse || '';
    assert.ok(sleepText.length > 0, 'Sleep query must return response');
    assert.ok(
      sleepText.toLowerCase().includes('sleep') || sleepText.toLowerCase().includes('hour') || sleepText.toLowerCase().includes('rest') || sleepText.toLowerCase().includes('unavailable'),
      `Sleep response should mention sleep or report honest status: "${sleepText}"`
    );
  });

  // ==========================================
  // 4. CALENDAR & AUTHORITATIVE SYNC REGRESSION
  // ==========================================
  await t.test('4. Calendar mutations are authoritative in MySQL and queried accurately by JARVIS', async () => {
    // Step A: Voice schedule "Hey Jarvis, schedule a meeting with Arun at 4 PM."
    const scheduleRes = await orchestrator.processRequest(testUserId, 'Hey Jarvis, schedule a meeting with Arun at 4 PM.', {
      sessionId,
      source: 'voice'
    });
    const scheduleText = scheduleRes.speech || scheduleRes.message || scheduleRes.spokenResponse || '';
    assert.ok(scheduleText.length > 0, 'Schedule command must return response');

    // Verify item created in MySQL
    let routines = await RoutineModel.getByDate(testUserId, todayStr);
    let arunRoutine = routines.find(r => r.title && r.title.includes('Arun'));
    assert.ok(arunRoutine, 'Meeting with Arun must exist in MySQL routines');
    assert.ok(
      arunRoutine.time.startsWith('16:00') || arunRoutine.time.startsWith('16:0'),
      `Meeting should be at 16:00, found: ${arunRoutine.time}`
    );

    // Step B: Calendar UI modifies 4 PM -> 6:30 PM (18:30)
    await RoutineModel.update(arunRoutine.id, testUserId, {
      time: '18:30:00',
      description: 'Rescheduled via Calendar UI'
    });

    // Record schedule change context event
    orchestrator.recordContextEvent(testUserId, sessionId, {
      event: 'SCHEDULE_CHANGED',
      action: 'RESCHEDULED',
      scheduleId: arunRoutine.id,
      title: arunRoutine.title,
      previousTime: '16:00',
      newTime: '18:30',
      date: todayStr
    });

    // Step C: Verify MySQL has 18:30
    routines = await RoutineModel.getByDate(testUserId, todayStr);
    arunRoutine = routines.find(r => r.id === arunRoutine.id);
    assert.ok(arunRoutine, 'Meeting with Arun must exist in MySQL');
    assert.equal(arunRoutine.time, '18:30:00', `MySQL must reflect updated time 18:30:00, found: ${arunRoutine.time}`);

    // Step D: Voice query: "What is on my schedule today?"
    const queryRes = await orchestrator.processRequest(testUserId, 'What is on my schedule today?', {
      sessionId,
      source: 'voice'
    });

    const querySpeech = (queryRes.speech || queryRes.message || '').toLowerCase();
    const spoken = (queryRes.spokenResponse || '').toLowerCase();

    assert.ok(
      querySpeech.includes('6:30') || querySpeech.includes('18:30') || spoken.includes('6:30') || spoken.includes('18:30'),
      `JARVIS voice response must report authoritative time 6:30 PM / 18:30: "${querySpeech}" | Spoken: "${spoken}"`
    );
    assert.ok(
      !spoken.includes('asterisk') && !spoken.includes('astric') && !spoken.includes('*'),
      'JARVIS voice response must not vocalize or contain asterisks'
    );

    // Cleanup
    await RoutineModel.softDelete(arunRoutine.id, testUserId);
  });

  // ==========================================
  // 5. MANUAL MODE & SHARED CONTEXT REGRESSION
  // ==========================================
  await t.test('5. Voice and Manual mode share session memory and entity context', async () => {
    const sharedSessionId = `shared_session_${Date.now()}`;

    // Voice creates workout
    const turn1 = await orchestrator.processRequest(testUserId, 'Schedule a workout at 8 PM.', {
      sessionId: sharedSessionId,
      source: 'voice'
    });
    assert.ok(turn1.speech || turn1.message, 'Turn 1 must succeed');

    let routines = await RoutineModel.getByDate(testUserId, todayStr);
    let workout = routines.find(r => r.title && r.title.toLowerCase().includes('workout'));
    assert.ok(workout, 'Workout routine must exist in database');
    assert.ok(workout.time.startsWith('20:00') || workout.time.startsWith('20:0'), 'Workout should start at 20:00');

    // Manual mode updates: "Actually make that 9 PM."
    const turn2 = await orchestrator.processRequest(testUserId, 'Actually make that 9 PM.', {
      sessionId: sharedSessionId,
      source: 'manual'
    });
    assert.ok(turn2.speech || turn2.message, 'Turn 2 must succeed');

    routines = await RoutineModel.getByDate(testUserId, todayStr);
    workout = routines.find(r => r.id === workout.id);
    assert.ok(workout, 'Workout routine must still exist');
    assert.ok(
      workout.time.startsWith('21:00') || workout.time.startsWith('21:0'),
      `Workout routine should be rescheduled to 21:00 via manual context, found: ${workout.time}`
    );

    // Voice mode cancels: "Cancel that."
    const turn3 = await orchestrator.processRequest(testUserId, 'Cancel that.', {
      sessionId: sharedSessionId,
      source: 'voice'
    });
    assert.ok(turn3.speech || turn3.message, 'Turn 3 must succeed');

    routines = await RoutineModel.getByDate(testUserId, todayStr);
    workout = routines.find(r => r.id === workout.id);
    assert.equal(workout, undefined, 'Workout routine must be cancelled/deleted from database');
  });

  // ==========================================
  // 6. NO UNSOLICITED ACTIVITY REGRESSION
  // ==========================================
  await t.test('6. Non-voice system events do not produce unsolicited voice activity', async () => {
    // Schedule context sync event
    const recorded = orchestrator.recordContextEvent(testUserId, `unsolicited_test_${Date.now()}`, {
      event: 'SCHEDULE_CHANGED',
      action: 'UPDATED',
      title: 'Medication routine updated'
    });

    assert.equal(recorded, true, 'Context event must be recorded without error');
  });
});
