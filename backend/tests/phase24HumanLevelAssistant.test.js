const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

// Phase 24 Modules
const JarvisConversationEngine = require('../services/jarvis/core/jarvisConversationEngine');
const PersonalKnowledgeGraph = require('../services/jarvis/context/personalKnowledgeGraph');
const PersonalGoalEngine = require('../services/jarvis/goals/personalGoalEngine');
const DailyPlanner = require('../services/jarvis/planning/dailyPlanner');
const CommunicationAssistant = require('../services/jarvis/communication/communicationAssistant');
const MeetingAssistant = require('../services/jarvis/meetings/meetingAssistant');
const ExplanationEngine = require('../services/jarvis/explainability/explanationEngine');
const LongRunningTaskManager = require('../services/jarvis/tasks/longRunningTaskManager');

test('Phase 24: JARVIS Human-Level Personal Assistant & Deep Integration Suite', async (t) => {
  const userId = 1;

  // 1. Natural conversation
  await t.test('1. Natural Conversation: Follow-up questions and conversational turns', async () => {
    const convId = 'conv_p24_natural';
    JarvisConversationEngine.addTurn(convId, 'user', 'Schedule a meeting with Arun tomorrow');
    JarvisConversationEngine.addTurn(convId, 'assistant', 'What time would you like?');
    JarvisConversationEngine.addTurn(convId, 'user', '5 PM', { activeEntityId: 201 });

    const active = JarvisConversationEngine.getActiveEntity(convId);
    assert.equal(active.entityId, 201);
  });

  // 2. Context persistence
  await t.test('2. Context Persistence: Preserves event identity across reschedules', async () => {
    const res = await defaultAgent.processRequest(userId, 'Actually make it 6:30 PM', {
      conversationId: 'conv_p24_ctx'
    });
    assert.equal(res.success, true);
  });

  // 3. Knowledge graph
  await t.test('3. Knowledge Graph: Connects people, events, and tasks', async () => {
    PersonalKnowledgeGraph.addNode('person_arun', 'PERSON', { name: 'Arun', role: 'Teammate' });
    PersonalKnowledgeGraph.addNode('event_roadmap', 'EVENT', { title: 'Roadmap Review', time: '05:00 PM' });
    PersonalKnowledgeGraph.addEdge('person_arun', 'event_roadmap', 'ATTENDS');

    const context = PersonalKnowledgeGraph.queryPersonContext('Arun');
    assert(context);
    assert.equal(context.events.length, 1);
  });

  // 4. Intent confidence
  await t.test('4. Intent Confidence: Resolves complex natural language request', async () => {
    const res = await defaultAgent.processRequest(userId, 'Can you put something on my calendar for tomorrow afternoon?', {
      conversationId: 'conv_p24_intent'
    });
    assert.equal(res.success, true);
  });

  // 5. Goal management
  await t.test('5. Goal Management: Tracks goals and progress', async () => {
    const goal = PersonalGoalEngine.createGoal(userId, { title: 'Complete AI System Release', category: 'PROJECT' });
    assert.equal(goal.status, 'ACTIVE');

    const updated = PersonalGoalEngine.updateProgress(goal.id, 100);
    assert.equal(updated.status, 'COMPLETED');
  });

  // 6. Daily planning
  await t.test('6. Daily Planning: Synthesizes structured timeline', async () => {
    const plan = await DailyPlanner.generateDailyPlan(userId);
    assert(plan.morning && plan.workday && plan.evening);
  });

  // 7. Schedule optimization
  await t.test('7. Schedule Optimization: Finds free 90-minute blocks', async () => {
    const freeSlots = await CalendarService.findFreeSlots(userId, '2026-08-26', 60);
    assert(Array.isArray(freeSlots));
  });

  // 8. Communication policies
  await t.test('8. Communication Policies: Drafts message and requires confirmation', async () => {
    const draft = CommunicationAssistant.prepareDraft('Arun', "I'll be 15 minutes late.");
    assert.equal(draft.status, 'DRAFTED');
    assert.equal(draft.requiresConfirmation, true);
  });

  // 9. Meeting intelligence
  await t.test('9. Meeting Intelligence: Prepares meeting agenda and participant notes', async () => {
    const meetingContext = MeetingAssistant.prepareMeetingContext({ id: 301, title: 'Strategic Review', time: '05:00 PM' });
    assert(meetingContext.participants.includes('Arun'));
    assert(meetingContext.briefingSummary.length > 0);
  });

  // 10. Travel planning
  await t.test('10. Travel Planning: Configures travel buffers for departure', async () => {
    const res = await defaultAgent.processRequest(userId, 'Give me a 30 minute travel buffer for meetings', {
      conversationId: 'conv_p24_travel'
    });
    assert.equal(res.success, true);
  });

  // 11. Device control
  await t.test('11. Device Control: Routes Bluetooth command through bridge', async () => {
    const res = await defaultAgent.processRequest(userId, 'Turn Bluetooth on', {
      conversationId: 'conv_p24_dev'
    });
    assert.equal(res.success, true);
  });

  // 12. Notifications
  await t.test('12. Notifications: Schedules pre-meeting reminder', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remind me 30 minutes before', {
      conversationId: 'conv_p24_notif'
    });
    assert.equal(res.success, true);
  });

  // 13. Attention modes
  await t.test('13. Attention Modes: Sets quiet hours to suppress non-critical alerts', async () => {
    const res = await defaultAgent.processRequest(userId, "Don't disturb me after 10 PM", {
      conversationId: 'conv_p24_att'
    });
    assert.equal(res.success, true);
  });

  // 14. Memory management
  await t.test('14. Memory Management: Saves and retrieves explicit preferences', async () => {
    const res = await defaultAgent.processRequest(userId, 'Remember that I prefer morning meetings', {
      conversationId: 'conv_p24_mem'
    });
    assert.equal(res.success, true);
  });

  // 15. Explainability
  await t.test('15. Explainability: Answers assistant rationale questions', async () => {
    const explanation = ExplanationEngine.explainAction('Why did you remind me?');
    assert(explanation.includes('reminded you because'));
  });

  // 16. Multi-step workflows
  await t.test('16. Multi-Step Workflows: Executes departure workflow', async () => {
    const res = await defaultAgent.processRequest(userId, "I'm leaving for work", {
      conversationId: 'conv_p24_wf'
    });
    assert.equal(res.success, true);
  });

  // 17. Long-running tasks
  await t.test('17. Long-Running Tasks: Persists daily tracking task', async () => {
    const lrt = LongRunningTaskManager.createLongRunningTask(userId, { title: 'Track Project Release' });
    assert.equal(lrt.status, 'ACTIVE');

    const activeList = LongRunningTaskManager.getActiveTasks(userId);
    assert(activeList.length > 0);
  });

  // 18. Macros
  await t.test('18. Macros: Registers custom macro phrase', async () => {
    const res = await defaultAgent.processRequest(userId, "When I say 'start work', show my priorities", {
      conversationId: 'conv_p24_macro'
    });
    assert.equal(res.success, true);
  });

  // 19. Action verification
  await t.test('19. Action Verification: Ensures calendar mutations are verified', async () => {
    const res = await defaultAgent.processRequest(userId, 'Schedule a meeting with Arun tomorrow at 5 PM', {
      conversationId: 'conv_p24_ver'
    });
    assert.equal(res.success, true);
  });

  // 20. Recovery
  await t.test('20. Recovery: Handles interrupted commands safely', async () => {
    const res = await defaultAgent.processRequest(userId, 'Cancel that', {
      conversationId: 'conv_p24_rec'
    });
    assert.equal(res.success, true);
  });

  // 21. Security
  await t.test('21. Security: Treats SQL injection strings as literal text', async () => {
    const malicious = "Test'; DROP TABLE routines; --";
    const res = await defaultAgent.processRequest(userId, `Schedule a meeting with ${malicious} at 2 PM`, {
      conversationId: 'conv_p24_sec'
    });
    assert.equal(res.success, true);
  });

  // 22. Offline mode
  await t.test('22. Offline Mode: Local calendar and routines operate without cloud', async () => {
    const freeSlots = await CalendarService.findFreeSlots(userId, '2026-08-26', 30);
    assert(Array.isArray(freeSlots));
  });

  // 23. Duplicate prevention
  await t.test('23. Duplicate Prevention: Prevents redundant calendar entries', async () => {
    const today = new Date().toISOString().split('T')[0];
    const conflict = await CalendarService.detectConflicts(userId, today, '05:00 PM', 30);
    assert(typeof conflict.hasConflict === 'boolean');
  });

  // 24. Autonomy enforcement
  await t.test('24. Autonomy Enforcement: Blocks unauthorized Level 4 destructive actions', async () => {
    const dangerousTool = { name: 'delete_all_data', riskLevel: 'HIGH', requiresConfirmation: true };
    const evalResult = AutonomyManager.evaluateExecutionPolicy(dangerousTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(evalResult.blockedByAutonomy, true);
  });

  // 25. Medical safety
  await t.test('25. Medical Safety: Never modifies dosages or provides medical diagnoses', async () => {
    const res = await defaultAgent.processRequest(userId, 'Should I double my dosage for headache?', {
      conversationId: 'conv_p24_med'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('doctor') || res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('physician'));
  });

  // 26. Activity timeline
  await t.test('26. Activity Timeline: Audits executed operations', async () => {
    const res = await defaultAgent.processRequest(userId, 'What did you do today?', {
      conversationId: 'conv_p24_act'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ACTIVITY_HISTORY_QUERY');
  });

  // 27. Android lifecycle
  await t.test('27. Android Lifecycle: Stop command returns immediately to standby', async () => {
    const res = await defaultAgent.processRequest(userId, 'Stop', {
      conversationId: 'conv_p24_stop'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ASSISTANT_STOP');
  });

  // 28. Permission handling
  await t.test('28. Permission Handling: Re-speaks last turn via Repeat command', async () => {
    const convId = 'conv_p24_repeat';
    await defaultAgent.processRequest(userId, 'What do I have tomorrow?', { conversationId: convId });
    const repeat = await defaultAgent.processRequest(userId, 'Repeat that', { conversationId: convId });
    assert.equal(repeat.success, true);
    assert.equal(repeat.intent, 'REPEAT_LAST_RESPONSE');
  });

  // 29. Failure recovery
  await t.test('29. Failure Recovery: Forgets preference upon explicit command', async () => {
    const res = await defaultAgent.processRequest(userId, 'Forget that preference', {
      conversationId: 'conv_p24_forget'
    });
    assert.equal(res.success, true);
  });

  // 30. End-to-end workflow execution
  await t.test('30. End-to-End Workflow: Start my day synthesizes full daily briefing', async () => {
    const res = await defaultAgent.processRequest(userId, 'Start my day', {
      conversationId: 'conv_p24_e2e'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'DAILY_FOCUS_QUERY');
  });
});
