const test = require('node:test');
const assert = require('node:assert/strict');

const VoiceGateway = require('../services/jarvis/autonomous/voiceGateway');
const TaskScheduler = require('../services/jarvis/autonomous/taskScheduler');
const ProactiveNotifier = require('../services/jarvis/autonomous/proactiveNotifier');
const AiAutonomousRepository = require('../repositories/ai/aiAutonomousRepository');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const EventAutomationEngine = require('../services/jarvis/proactive/eventAutomationEngine');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 16: JARVIS Autonomous Companion OS & Background Execution Suite', async (t) => {
  const userId = 'user_p16_companion_001';
  const deviceId = 'android_pixel_p16_01';

  // 1. Device Registration & Live Companion Status
  await t.test('1. Registers Android background device session with wake-word active', async () => {
    const dev = await AiAutonomousRepository.registerDevice({
      userId,
      deviceId,
      deviceName: 'Pixel 8 Pro - Foreground Service',
      platform: 'ANDROID',
      wakeWordEnabled: true,
      backgroundActive: true,
      batteryOptimizationIgnored: true
    });

    assert(dev);
    assert.equal(dev.device_id, deviceId);
    assert.equal(dev.platform, 'ANDROID');
    assert.equal(dev.wake_word_enabled, 1);
  });

  // 2. Headless Voice Gateway Command Execution ("Hey JARVIS")
  await t.test('2. Headless Voice Gateway: Processes "Schedule a meeting with Arun at 5 today" and speaks result', async () => {
    const result = await VoiceGateway.processVoiceCommand({
      userId,
      transcript: 'Schedule a meeting with Arun at 5 PM',
      deviceId
    });

    assert.equal(result.success, true);
    assert(result.spokenResponse.length > 0);
    assert.equal(result.intent, 'SCHEDULE_REQUEST');
    assert(result.executionSteps.length >= 1);
  });

  // 3. Autonomous Task Creation & Execution
  await t.test('3. TaskScheduler: Schedules one-time reminder and processes due task', async () => {
    const pastDue = new Date(Date.now() - 60000).toISOString();
    const task = await TaskScheduler.scheduleOneTimeTask({
      userId,
      title: 'Review weekly health trends',
      scheduleTime: pastDue
    });

    assert(task);
    assert.equal(task.title, 'Review weekly health trends');
    assert.equal(task.status, 'PENDING');

    const executed = await TaskScheduler.processDueTasks(new Date().toISOString());
    assert(executed.length >= 1);
    const completed = executed.find(e => e.taskId === task.id);
    assert(completed);
    assert.equal(completed.status, 'COMPLETED');
  });

  // 4. Proactive Actionable Notifications
  await t.test('4. ProactiveNotifier: Dispatches pre-appointment actionable notification', async () => {
    const notif = await ProactiveNotifier.notifyPreAppointment({
      userId,
      appointmentTitle: 'Cardiology Consultation',
      appointmentTime: '10:30 AM',
      appointmentId: 'apt_cardio_101'
    });

    assert(notif);
    assert.equal(notif.notificationType, 'PRE_APPOINTMENT');
    assert.equal(notif.actionButtons.length, 3);
    assert.equal(notif.actionButtons[0].actionId, 'prepare_briefing');
  });

  // 5. Execution Run Telemetry Persistence
  await t.test('5. Records autonomous execution runs with duration and steps', async () => {
    const runs = await AiAutonomousRepository.listRecentRuns(userId, 5);
    assert(runs.length >= 1);
    assert.equal(runs[0].trigger_source, 'WAKE_WORD_VOICE');
    assert.equal(runs[0].status, 'SUCCESS');
  });

  // 6. Calendar Integration & Conflict Detection
  await t.test('6. CalendarService: Detects conflicts and reschedules events cleanly', async () => {
    const today = new Date().toISOString().split('T')[0];
    const eventId = `rot_cal_test_${Date.now()}`;
    await RoutineModel.create({
      id: eventId,
      userId,
      title: 'Team Standup',
      time: '05:00 PM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });

    const conflict = await CalendarService.detectConflicts(userId, today, '05:15 PM');
    assert.equal(conflict.hasConflict, true);
    assert.equal(conflict.conflictCount >= 1, true);

    const moveRes = await CalendarService.moveEvent(userId, {
      eventId,
      targetTime: '06:00 PM',
      targetDate: today
    });

    assert.equal(moveRes.success, true);
    assert.equal(moveRes.updatedEvent.time, '06:00 PM');
  });

  // 7. Daily Brain State & Attention Prioritization
  await t.test('7. DailyBrainState: Synthesizes daily state and prioritizes urgent items', async () => {
    const state = await DailyBrainState.getDailyState(userId, 'UTC');
    assert(state);
    assert(state.summary);
    assert(Array.isArray(state.attentionFeed));

    const focusSummary = await DailyBrainState.getDailyFocusSummary(userId, 'UTC');
    assert(focusSummary.focusSpeech.length > 0);
  });

  // 8. Event-Driven Automation Engine
  await t.test('8. EventAutomationEngine: Evaluates timeline automations & creates persistent reminders', async () => {
    const autoRes = await EventAutomationEngine.evaluateAutomations(userId, 'UTC');
    assert(autoRes);
    assert(typeof autoRes.evaluatedCount === 'number');

    const reminder = await EventAutomationEngine.createPersistentReminder(userId, {
      title: 'Call Mom',
      time: '07:00 PM'
    });
    assert(reminder.taskId);
    assert.equal(reminder.title, 'Call Mom');
  });

  // 9. 5-Tier Autonomy Level Policy Enforcement
  await t.test('9. AutonomyManager: Enforces Level 0 to Level 4 execution boundaries', async () => {
    const lowRiskTool = { name: 'get_today_schedule', riskLevel: 'LOW', requiresConfirmation: false };
    const medRiskTool = { name: 'create_schedule', riskLevel: 'MEDIUM', requiresConfirmation: false };
    const highRiskTool = { name: 'delete_schedule', riskLevel: 'HIGH', requiresConfirmation: true };

    // Level 0 (Inform): Read-only
    const l0Low = AutonomyManager.evaluateExecutionPolicy(lowRiskTool, AUTONOMY_LEVELS.LEVEL_0_INFORM);
    const l0Med = AutonomyManager.evaluateExecutionPolicy(medRiskTool, AUTONOMY_LEVELS.LEVEL_0_INFORM);
    assert.equal(l0Low.canExecute, true);
    assert.equal(l0Med.canExecute, false);

    // Level 2 (Auto Execute): Low/Med execute, High confirms
    const l2Med = AutonomyManager.evaluateExecutionPolicy(medRiskTool, AUTONOMY_LEVELS.LEVEL_2_AUTO_EXECUTE);
    const l2High = AutonomyManager.evaluateExecutionPolicy(highRiskTool, AUTONOMY_LEVELS.LEVEL_2_AUTO_EXECUTE);
    assert.equal(l2Med.canExecute, true);
    assert.equal(l2High.requiresConfirmation, true);

    // Level 4 (Restricted): Blocked
    const l4Med = AutonomyManager.evaluateExecutionPolicy(medRiskTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(l4Med.blockedByAutonomy, true);
  });

  // 10. Semantic Preference Memory Storage & Recall
  await t.test('10. Semantic Memory: Stores workout preference and verifies persistence', async () => {
    const mem = await AiMemoryRepository.createMemory(userId, {
      memoryType: 'USER_PREFERENCE',
      memoryKey: 'preferred_workout_time',
      memoryValue: 'Prefers morning workouts at 7:00 AM',
      source: 'USER_EXPLICIT',
      importance: 5
    });

    assert(mem);
    assert.equal(mem.memoryKey || mem.memory_key, 'preferred_workout_time');

    const search = await AiMemoryRepository.searchMemories(userId, 'workout');
    assert(search.length >= 1);
    assert(search.some(m => m.memory_value.includes('7:00 AM')));
  });
});

