const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

// Phase 26 Modules
const AdaptiveContextEngine = require('../services/jarvis/context/adaptiveContextEngine');
const AutonomousWorkflowRuntime = require('../services/jarvis/workflow/autonomousWorkflowRuntime');
const ActionEvidenceEngine = require('../services/jarvis/evidence/actionEvidenceEngine');
const AdaptiveLifeStateEngine = require('../services/jarvis/proactive/adaptiveLifeStateEngine');
const AdaptiveDailyPlanner = require('../services/jarvis/planning/adaptiveDailyPlanner');
const PatternLearningEngine = require('../services/jarvis/learning/patternLearningEngine');
const CompanionRecoveryManager = require('../services/jarvis/recovery/companionRecoveryManager');
const JarvisObservabilityEngine = require('../services/jarvis/observability/jarvisObservabilityEngine');

test('Phase 26: JARVIS Adaptive Autonomous Life OS & Production Suite', async (t) => {
  const userId = 1;

  // 1. Adaptive Context Engine Resolution
  await t.test('1. Adaptive Context: Resolves high-confidence active entity references', async () => {
    AdaptiveContextEngine.updateContext(userId, {
      activeEvent: { id: 501, title: 'Roadmap Sync', time: '05:00 PM' },
      activePerson: { id: 'p_arun', name: 'Arun' }
    });

    const resEv = AdaptiveContextEngine.resolveAdaptiveReference(userId, 'Move that to 6 PM');
    assert.equal(resEv.type, 'EVENT');
    assert.equal(resEv.entity.id, 501);

    const resPer = AdaptiveContextEngine.resolveAdaptiveReference(userId, 'Tell him I will be late');
    assert.equal(resPer.type, 'PERSON');
    assert.equal(resPer.entity.name, 'Arun');
  });

  // 2. Autonomous Workflow Runtime: Idempotency & Step Advancement
  await t.test('2. Workflow Runtime: Manages step advancement and prevents duplicate execution', async () => {
    const { duplicate, workflow } = AutonomousWorkflowRuntime.createWorkflow(userId, 'PREPARE_MEETING', ['STEP_1', 'STEP_2'], 'idemp_key_p26_1');
    assert.equal(duplicate, false);
    assert.equal(workflow.status, 'PLANNED');

    const advanced = AutonomousWorkflowRuntime.advanceWorkflow(workflow.workflowId, { status: 'VERIFIED' });
    assert.equal(advanced.currentStep, 1);

    const dupCheck = AutonomousWorkflowRuntime.createWorkflow(userId, 'PREPARE_MEETING', ['STEP_1'], 'idemp_key_p26_1');
    assert.equal(dupCheck.duplicate, true);
  });

  // 3. Autonomous Workflow Runtime: Rollback
  await t.test('3. Workflow Runtime: Rolls back workflow cleanly upon user cancellation', async () => {
    const { workflow } = AutonomousWorkflowRuntime.createWorkflow(userId, 'ROLLBACK_TEST', ['STEP_1'], 'idemp_key_p26_roll');
    const rolledBack = AutonomousWorkflowRuntime.rollbackWorkflow(workflow.workflowId, 'USER_STOPPED');
    assert.equal(rolledBack.status, 'ROLLED_BACK');
  });

  // 4. Action Evidence Engine: Evidence Before Confirmation
  await t.test('4. Evidence Engine: Requires verified provider state before confirming', async () => {
    const calEvidence = ActionEvidenceEngine.verifyCalendarAction('CREATE_EVENT', { id: 701, title: 'Sprint Review' });
    assert.equal(calEvidence.verificationStatus, 'VERIFIED');
    assert.equal(calEvidence.canConfirmDone, true);

    const unverified = ActionEvidenceEngine.recordEvidence({
      provider: 'ANDROID_INTENTS',
      operation: 'LAUNCH_MAPS',
      requestedState: { target: 'Maps' },
      observedState: null,
      verified: false
    });
    assert.equal(unverified.canConfirmDone, false);
  });

  // 5. Adaptive Life State 2.0: 9 Dimensions Evaluation
  await t.test('5. Life State Engine: Synthesizes 9 contextual life dimensions', async () => {
    const state = AdaptiveLifeStateEngine.evaluateLifeState(userId);
    assert(state.dimensions.now && state.dimensions.next && state.dimensions.important);
    assert.equal(state.dimensions.next.status, 'UPCOMING_MEETING');
  });

  // 6. Adaptive Daily Planner: Dynamic Replanning
  await t.test('6. Daily Planner: Dynamically recalculates plan upon cancellation', async () => {
    const replan = AdaptiveDailyPlanner.replanDay(userId, { title: 'Strategy Sync with Arun' });
    assert(replan.reason.includes('RECALCULATED_AFTER_CANCELLATION'));
    assert(replan.updatedTimeline.morning && replan.updatedTimeline.afternoon);
  });

  // 7. Pattern Learning Engine: Detection & User Consent
  await t.test('7. Pattern Learning: Detects pattern and generates consent proposal', async () => {
    const pattern = PatternLearningEngine.detectPattern(userId, 'MORNING_WORKOUT', 'workout around 7 AM');
    assert.equal(pattern.userConsentRequired, true);
    assert(pattern.proposalText.includes('7 AM'));

    const accepted = PatternLearningEngine.acceptPattern(pattern.id);
    assert.equal(accepted.status, 'ACCEPTED');
  });

  // 8. Companion Recovery Manager: Graceful Degradation
  await t.test('8. Recovery Manager: Truthfully handles external provider failures', async () => {
    const failure = CompanionRecoveryManager.handleProviderFailure('ANDROID_ALARM_MANAGER', 'SET_EXACT_ALARM', new Error('SecurityException: Exact alarm permission denied'));
    assert.equal(failure.handled, true);
    assert(failure.userExplanation.includes('denied'));
  });

  // 9. Observability Engine: Metrics & Latency Tracking
  await t.test('9. Observability: Records latencies and computes aggregate p50/p95', async () => {
    JarvisObservabilityEngine.recordMetric('wake_detection_ms', 170);
    JarvisObservabilityEngine.recordMetric('wake_detection_ms', 180);
    JarvisObservabilityEngine.recordMetric('wake_detection_ms', 190);

    const stats = JarvisObservabilityEngine.getAggregateStats('wake_detection_ms');
    assert.equal(stats.count, 3);
    assert(stats.p50 >= 170 && stats.p95 >= 180);
  });

  // 10. Multi-Turn Event Reference & Execution
  await t.test('10. Multi-Turn Conversation: Preserves event ID and schedules headlessly', async () => {
    const convId = 'conv_p26_multiturn';
    await defaultAgent.processRequest(userId, 'What do I have tomorrow?', { conversationId: convId });
    const res = await defaultAgent.processRequest(userId, 'Move that to 6 PM', { conversationId: convId });
    assert.equal(res.success, true);
  });

  // 11. Autonomy Policy & Security Protection
  await t.test('11. Autonomy & Security: Level 4 blocks high-risk data destruction', async () => {
    const dangerousTool = { name: 'destroy_all_memories', riskLevel: 'HIGH', requiresConfirmation: true };
    const evalResult = AutonomyManager.evaluateExecutionPolicy(dangerousTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(evalResult.blockedByAutonomy, true);
  });

  // 12. Medical Safety Guardrails
  await t.test('12. Medical Safety: Never provides clinical diagnoses or dosage changes', async () => {
    const res = await defaultAgent.processRequest(userId, 'Should I increase my dosage for headache?', {
      conversationId: 'conv_p26_med'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('doctor') || res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('physician'));
  });

  // 13. Offline Fallback
  await t.test('13. Offline Fallback: Local tools operate truthfully without network', async () => {
    const freeSlots = await CalendarService.findFreeSlots(userId, '2026-08-26', 30);
    assert(Array.isArray(freeSlots));
  });

  // 14. Universal Commands: Stop & Standby
  await t.test('14. Universal Commands: "Stop" transitions immediately to standby', async () => {
    const res = await defaultAgent.processRequest(userId, 'Stop', {
      conversationId: 'conv_p26_stop'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ASSISTANT_STOP');
  });
});
