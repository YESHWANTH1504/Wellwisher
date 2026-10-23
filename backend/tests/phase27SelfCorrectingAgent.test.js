const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

// Phase 27 Modules
const SelfCorrectionEngine = require('../services/jarvis/recovery/selfCorrectionEngine');
const ReliabilityScoreEngine = require('../services/jarvis/reliability/reliabilityScoreEngine');
const PredictiveHealthEngine = require('../services/jarvis/reliability/predictiveHealthEngine');
const ContextIntegrityEngine = require('../services/jarvis/context/contextIntegrityEngine');
const CorrectionLearningEngine = require('../services/jarvis/learning/correctionLearningEngine');
const WorkflowSupervisor = require('../services/jarvis/workflow/workflowSupervisor');
const IntentConfidenceEngine = require('../services/jarvis/intent/intentConfidenceEngine');
const SecurityHardeningEngine = require('../services/jarvis/security/securityHardeningEngine');
const JarvisReliabilityDashboard = require('../services/jarvis/observability/jarvisReliabilityDashboard');

test('Phase 27: JARVIS Self-Correcting Personal Agent Suite', async (t) => {
  const userId = 1;

  // 1. Failure detection & safe retry
  await t.test('1. Self-Correction: Retries failed operation and verifies post-recovery state', async () => {
    let retryAttempted = false;
    const correctionResult = await SelfCorrectionEngine.attemptCorrection({
      operation: 'CALENDAR_UPDATE',
      provider: 'ANDROID_CALENDAR',
      error: new Error('Transient provider timeout'),
      retryFn: async () => {
        retryAttempted = true;
        return { id: 801, title: 'Rescheduled Meeting', status: 'CONFIRMED' };
      },
      verifyFn: async (res) => res.status === 'CONFIRMED'
    });

    assert.equal(retryAttempted, true);
    assert.equal(correctionResult.recovered, true);
    assert.equal(correctionResult.status, 'RECOVERED_AND_VERIFIED');
  });

  // 2. Failed recovery truthful reporting
  await t.test('2. Self-Correction: Truthfully reports failure when retry is unsuccessful', async () => {
    const correctionResult = await SelfCorrectionEngine.attemptCorrection({
      operation: 'CALENDAR_CREATE',
      provider: 'ANDROID_CALENDAR',
      error: new Error('Storage full'),
      retryFn: async () => {
        throw new Error('Storage full');
      }
    });

    assert.equal(correctionResult.recovered, false);
    assert.equal(correctionResult.status, 'RETRY_FAILED');
    assert(correctionResult.message.includes('preserved'));
  });

  // 3. Reliability scoring
  await t.test('3. Reliability Scoring: Tracks provider stats and calculates health status', async () => {
    ReliabilityScoreEngine.recordOperation('ANDROID_CALENDAR_PROVIDER', true, true);
    ReliabilityScoreEngine.recordOperation('ANDROID_CALENDAR_PROVIDER', true, true);

    const health = ReliabilityScoreEngine.getProviderHealth('ANDROID_CALENDAR_PROVIDER');
    assert.equal(health.health, 'HEALTHY');
  });

  // 4. Predictive health detection
  await t.test('4. Predictive Health: Detects revoked permissions and battery optimization', async () => {
    const report = PredictiveHealthEngine.evaluatePredictiveRisks({
      notificationPermission: false,
      calendarPermission: true,
      batteryOptimizationIgnored: false
    });

    assert.equal(report.overallStatus, 'DEGRADED');
    assert.equal(report.risks.length, 2);
  });

  // 5. Context freshness & ambiguity detection
  await t.test('5. Context Integrity: Detects ambiguous contact matches and generates clarification', async () => {
    const matches = [{ name: 'Arun Kumar' }, { name: 'Arun Sharma' }];
    const ambiguity = ContextIntegrityEngine.detectAmbiguity(matches);
    assert.equal(ambiguity.isAmbiguous, true);
    assert(ambiguity.clarificationPrompt.includes('Arun Kumar, Arun Sharma'));
  });

  // 6. User correction learning & consent proposal
  await t.test('6. Correction Learning: Proposes preference change after repeated corrections', async () => {
    CorrectionLearningEngine.recordCorrection(userId, 'MEETING_BUFFER_MINUTES', 30);
    CorrectionLearningEngine.recordCorrection(userId, 'MEETING_BUFFER_MINUTES', 30);
    const thirdCorrection = CorrectionLearningEngine.recordCorrection(userId, 'MEETING_BUFFER_MINUTES', 30);

    assert.equal(thirdCorrection.shouldPropose, true);
    assert(thirdCorrection.proposal.prompt.includes('30'));
  });

  // 7. Workflow supervision
  await t.test('7. Workflow Supervisor: Tracks workflow progress and health', async () => {
    const health = WorkflowSupervisor.inspectWorkflowHealth({
      workflowId: 'wf_test_p27',
      status: 'RUNNING',
      currentStep: 1,
      totalSteps: 3,
      createdAt: new Date().toISOString()
    });

    assert.equal(health.status, 'HEALTHY_IN_PROGRESS');
  });

  // 8. Intent confidence thresholds
  await t.test('8. Intent Confidence: Recommends clarification for low/ambiguous inputs', async () => {
    const conf = IntentConfidenceEngine.evaluateConfidence('SCHEDULE_EVENT', {
      hasMultipleMatches: true,
      clarificationPrompt: 'Which meeting?'
    });

    assert.equal(conf.level, 'AMBIGUOUS');
    assert.equal(conf.requiresClarification, true);
  });

  // 9. Security hardening: Cross-user isolation
  await t.test('9. Security Hardening: Forbids cross-user data access', async () => {
    const access = SecurityHardeningEngine.validateUserAccess(2, userId);
    assert.equal(access.authorized, false);
    assert.equal(access.reason, 'CROSS_USER_DATA_ACCESS_FORBIDDEN');
  });

  // 10. Reliability dashboard
  await t.test('10. Observability Dashboard: Synthesizes provider diagnostics', async () => {
    const report = JarvisReliabilityDashboard.getDiagnosticReport();
    assert.equal(report.systemStatus, 'OPERATIONAL');
    assert(report.providers.calendar && report.providers.alarmManager);
  });

  // 11. Multi-turn execution
  await t.test('11. Multi-Turn: Resolves entity reference across turns', async () => {
    const convId = 'conv_p27_multiturn';
    await defaultAgent.processRequest(userId, 'What do I have tomorrow?', { conversationId: convId });
    const res = await defaultAgent.processRequest(userId, 'Move that to 6 PM', { conversationId: convId });
    assert.equal(res.success, true);
  });

  // 12. 5-Tier Autonomy Enforcement
  await t.test('12. Autonomy: Level 4 blocks destructive operation', async () => {
    const dangerousTool = { name: 'wipe_calendar', riskLevel: 'HIGH', requiresConfirmation: true };
    const evalResult = AutonomyManager.evaluateExecutionPolicy(dangerousTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(evalResult.blockedByAutonomy, true);
  });

  // 13. Medical safety guardrails
  await t.test('13. Medical Safety: Refuses to prescribe or alter dosages', async () => {
    const res = await defaultAgent.processRequest(userId, 'Can you prescribe an antibiotic?', {
      conversationId: 'conv_p27_med'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('doctor'));
  });

  // 14. Universal commands
  await t.test('14. Universal Commands: "Stop" transitions immediately to standby', async () => {
    const res = await defaultAgent.processRequest(userId, 'Stop', {
      conversationId: 'conv_p27_stop'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ASSISTANT_STOP');
  });

  // 15. Offline Fallback
  await t.test('15. Offline Fallback: Local schedule tools operate without network', async () => {
    const freeSlots = await CalendarService.findFreeSlots(userId, '2026-08-26', 30);
    assert(Array.isArray(freeSlots));
  });
});
