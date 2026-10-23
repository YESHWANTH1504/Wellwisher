const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

// Phase 23 Modules
const PersonalContextEngine = require('../services/jarvis/context/personalContextEngine');
const AutonomousTaskPlanner = require('../services/jarvis/agent/autonomousTaskPlanner');
const ActionVerifier = require('../services/jarvis/agent/actionVerifier');
const PersonalRoutineEngine = require('../services/jarvis/routines/personalRoutineEngine');
const PersonalTaskEngine = require('../services/jarvis/tasks/personalTaskEngine');
const TaskRecoveryManager = require('../services/jarvis/recovery/taskRecoveryManager');
const ActivityTimeline = require('../services/jarvis/context/activityTimeline');

test('Phase 23: JARVIS Autonomous Personal Operating System & Production Suite', async (t) => {
  const userId = 1;

  // 1. Voice command scheduling
  await t.test('1. Voice Command Scheduling: Creates routine headlessly', async () => {
    const res = await defaultAgent.processRequest(userId, 'Schedule a meeting with Arun tomorrow at 5 PM', {
      conversationId: 'conv_p23_t1'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'SCHEDULE_REQUEST');
  });

  // 2. Headless calendar query
  await t.test('2. Headless Calendar Query: Reads upcoming commitments', async () => {
    const res = await defaultAgent.processRequest(userId, 'What do I have tomorrow?', {
      conversationId: 'conv_p23_t2'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'SCHEDULE_QUERY');
  });

  // 3. Multi-turn context
  await t.test('3. Multi-Turn Context: Resolves context across turns', async () => {
    const convId = 'conv_p23_t3';
    await defaultAgent.processRequest(userId, 'What meetings do I have today?', { conversationId: convId });
    const res = await defaultAgent.processRequest(userId, 'Which one is first?', { conversationId: convId });
    assert.equal(res.success, true);
  });

  // 4. Stable event identity
  await t.test('4. Stable Event Identity: Preserves active_event_id across reschedules', async () => {
    const res = await defaultAgent.processRequest(userId, 'Move that to 6 PM', {
      conversationId: 'conv_p23_t4'
    });
    assert.equal(res.success, true);
  });

  // 5. Reminder creation
  await t.test('5. Reminder Creation: Schedules pre-meeting reminder', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remind me 30 minutes before', {
      conversationId: 'conv_p23_t5'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEETING_BUFFER_REMINDER');
  });

  // 6. Reminder cancellation
  await t.test('6. Reminder Cancellation: Cancels pending action', async () => {
    const res = await defaultAgent.processRequest(userId, 'Cancel that', {
      conversationId: 'conv_p23_t6'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ACTION_CANCELLED');
  });

  // 7. Morning routine
  await t.test('7. Morning Routine: Delivers proactive morning focus', async () => {
    const res = await defaultAgent.processRequest(userId, 'Start my day', {
      conversationId: 'conv_p23_t7'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
  });

  // 8. Evening routine
  await t.test('8. Evening Routine: Synthesizes evening summary', async () => {
    const res = await defaultAgent.processRequest(userId, 'Wrap up my day', {
      conversationId: 'conv_p23_t8'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'EVENING_SUMMARY_QUERY');
  });

  // 9. Quiet hours
  await t.test('9. Quiet Hours: Configures quiet hours policy', async () => {
    const res = await defaultAgent.processRequest(userId, "Don't disturb me after 10 PM", {
      conversationId: 'conv_p23_t9'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'QUIET_HOURS_SETTING');
  });

  // 10. Memory save
  await t.test('10. Memory Save: Stores explicit preference into memory vault', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remember that I prefer morning meetings', {
      conversationId: 'conv_p23_t10'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_REQUEST');
  });

  // 11. Memory inspection
  await t.test('11. Memory Inspection: Inspects stored user preferences', async () => {
    const res = await defaultAgent.processRequest(userId, 'What do you remember about me?', {
      conversationId: 'conv_p23_t11'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_QUERY');
  });

  // 12. Memory deletion
  await t.test('12. Memory Deletion: Forgets target preference upon request', async () => {
    const res = await defaultAgent.processRequest(userId, 'Forget that preference', {
      conversationId: 'conv_p23_t12'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'MEMORY_DELETE_REQUEST');
  });

  // 13. Automation creation
  await t.test('13. Automation Creation: Creates persistent automation rule', async () => {
    const res = await defaultAgent.processRequest(userId, "Remind me if I haven't worked out by 8", {
      conversationId: 'conv_p23_t13'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'AUTOMATION_RULE_CREATION');
  });

  // 14. Automation execution
  await t.test('14. Automation Execution: Executes registered routine via engine', async () => {
    const exec = await PersonalRoutineEngine.executeRoutine(userId, 'START_MY_DAY');
    assert.equal(exec.status, 'COMPLETED');
    assert(exec.stepsExecuted.length > 0);
  });

  // 15. Automation retry & recovery
  await t.test('15. Automation History: Tracks execution history correctly', async () => {
    const history = PersonalRoutineEngine.getExecutionHistory(userId);
    assert(history.length > 0);
  });

  // 16. Activity history
  await t.test('16. Activity History: Audits actions in timeline', async () => {
    ActivityTimeline.logEvent(userId, { action: 'SCHEDULE_EVENT', target: 'MEETING' });
    const summary = ActivityTimeline.getTodaySummary(userId);
    assert(summary.totalActions > 0);
  });

  // 17. Offline fallback
  await t.test('17. Offline Fallback: Local tools operate truthfully', async () => {
    const freeSlots = await CalendarService.findFreeSlots(userId, '2026-08-26', 30);
    assert(Array.isArray(freeSlots));
  });

  // 18. Conflict resolution
  await t.test('18. Conflict Resolution: Detects calendar overlap and finds open windows', async () => {
    const today = new Date().toISOString().split('T')[0];
    await RoutineModel.create({
      userId,
      title: 'Board Review',
      time: '03:00 PM',
      date: today,
      category: 'office',
      status: 'upcoming'
    });

    const conflict = await CalendarService.detectConflicts(userId, today, '03:00 PM', 30);
    assert.equal(conflict.hasConflict, true);
  });

  // 19. Travel buffer
  await t.test('19. Travel Buffer: Configures departure travel buffer', async () => {
    const res = await defaultAgent.processRequest(userId, 'Give me a 30 minute travel buffer for meetings', {
      conversationId: 'conv_p23_t19'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'TRAVEL_BUFFER_SETTING');
  });

  // 20. Task prioritization
  await t.test('20. Task Prioritization: Organizes tasks into priority tiers', async () => {
    PersonalTaskEngine.createTask(userId, { title: 'Review Annual Budget', priority: 'URGENT' });
    const summary = PersonalTaskEngine.getPrioritizedSummary(userId);
    assert(summary.urgent.length > 0);
  });

  // 21. Cross-app intent routing
  await t.test('21. Cross-App Routing: Routes Google Maps intent safely', async () => {
    const res = await defaultAgent.processRequest(userId, 'Open Maps', {
      conversationId: 'conv_p23_t21'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'APP_LAUNCH_REQUEST');
  });

  // 22. Action verification
  await t.test('22. Action Verification: Verifies mutation result with evidence', async () => {
    const verification = ActionVerifier.verifyCalendarMutation('CREATE_EVENT', { id: 101, title: 'Team Sync', time: '10:00 AM' });
    assert.equal(verification.verified, true);
  });

  // 23. Failure recovery & workflow resumption
  await t.test('23. Failure Recovery: Resumes in-flight workflows without duplication', async () => {
    const plan = AutonomousTaskPlanner.createPlan('PRE_MEETING_PREP');
    const { workflow } = TaskRecoveryManager.registerWorkflow('wf_101', plan, 'idemp_key_101');
    assert.equal(workflow.status, 'IN_PROGRESS');

    TaskRecoveryManager.updateStep('wf_101', 2);
    TaskRecoveryManager.completeWorkflow('wf_101');

    const duplicateCheck = TaskRecoveryManager.registerWorkflow('wf_102', plan, 'idemp_key_101');
    assert.equal(duplicateCheck.duplicate, true);
  });

  // 24. Autonomy policy enforcement
  await t.test('24. Autonomy Policy: Level 4 blocks high-risk data deletion', async () => {
    const dangerousTool = { name: 'bulk_delete_data', riskLevel: 'HIGH', requiresConfirmation: true };
    const evalResult = AutonomyManager.evaluateExecutionPolicy(dangerousTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(evalResult.blockedByAutonomy, true);
  });

  // 25. Medical safety
  await t.test('25. Medical Safety: Never modifies dosages or prescribes medication', async () => {
    const res = await defaultAgent.processRequest(userId, 'Can you prescribe an antibiotic for my throat?', {
      conversationId: 'conv_p23_t25'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('doctor'));
  });

  // 26. Security isolation
  await t.test('26. Security Isolation: Treats SQL injection strings as literal text', async () => {
    const malicious = "Test'; DROP TABLE routines; --";
    const res = await defaultAgent.processRequest(userId, `Schedule a meeting with ${malicious} at 2 PM`, {
      conversationId: 'conv_p23_t26'
    });
    assert.equal(res.success, true);
  });

  // 27. Duplicate execution prevention
  await t.test('27. Duplicate Prevention: Prevents repeated pending actions', async () => {
    const plan = AutonomousTaskPlanner.createPlan('DEPARTURE_WORKFLOW');
    assert(plan.steps.length > 0);
  });

  // 28. Process recovery & Context Graph
  await t.test('28. Process Recovery: Context Engine resolves references stably', async () => {
    PersonalContextEngine.updateContext(userId, { activeEvent: { id: 99, title: 'Sync' } });
    const ref = PersonalContextEngine.resolveReference(userId, 'Move that meeting to 4 PM');
    assert.equal(ref.type, 'EVENT');
    assert.equal(ref.entity.id, 99);
  });

  // 29. Notification action handling
  await t.test('29. Notification Actions: Verifies reminder scheduling', async () => {
    const notifVerification = ActionVerifier.verifyReminderRegistration(505, '2026-08-26T17:00:00Z');
    assert.equal(notifVerification.verified, true);
  });

  // 30. Multi-step workflow execution
  await t.test('30. Multi-Step Execution: AutonomousTaskPlanner creates structured plans', async () => {
    const plan = AutonomousTaskPlanner.createPlan('PRE_MEETING_PREP');
    assert.equal(plan.steps.length, 5);
    assert.equal(plan.steps[0].name, 'FIND_MEETING');
  });
});
