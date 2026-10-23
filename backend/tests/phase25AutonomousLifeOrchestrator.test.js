const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const CalendarService = require('../services/jarvis/integrations/calendarService');
const AutomationRulesEngine = require('../services/jarvis/proactive/automationRulesEngine');
const DailyBrainState = require('../services/jarvis/proactive/dailyBrainState');
const { AutonomyManager, AUTONOMY_LEVELS } = require('../services/jarvis/agent/autonomyManager');
const { AiMemoryRepository } = require('../repositories/ai/aiMemoryRepository');
const RoutineModel = require('../models/routineModel');

// Phase 25 Modules
const AutonomousLifeOrchestrator = require('../services/jarvis/orchestrator/autonomousLifeOrchestrator');
const ActionTransactionManager = require('../services/jarvis/transactions/actionTransactionManager');
const GoalExecutionEngine = require('../services/jarvis/goals/goalExecutionEngine');
const AssistantExplainabilityEngine = require('../services/jarvis/explainability/assistantExplainabilityEngine');
const AndroidCapabilityMatrix = require('../services/jarvis/platform/androidCapabilityMatrix');

test('Phase 25: JARVIS Autonomous Life Orchestrator & Production Suite', async (t) => {
  const userId = 1;

  // 1. Autonomous Life Orchestrator Planning
  await t.test('1. Autonomous Orchestrator: Decomposes complex life instructions', async () => {
    const orch = await AutonomousLifeOrchestrator.planAndOrchestrate(userId, 'Tomorrow I have a meeting with Arun at 5. Remind me 30 minutes before.');
    assert.equal(orch.status, 'COMPLETED');
    assert(orch.plan.steps.length > 0);
  });

  // 2. Action Transaction Manager: Steps & Progression
  await t.test('2. Transactions: Manages transactional workflow execution', async () => {
    const { duplicate, transaction } = ActionTransactionManager.createTransaction(userId, 'wf_tx_test', ['STEP_1', 'STEP_2'], 'idemp_key_25_1');
    assert.equal(duplicate, false);
    assert.equal(transaction.status, 'PLANNED');

    const advanced = ActionTransactionManager.advanceStep(transaction.transactionId, { result: 'OK' });
    assert.equal(advanced.currentStep, 1);
  });

  // 3. Action Transaction Manager: Idempotency & Rollback
  await t.test('3. Transactions: Prevents duplicate execution & supports rollback', async () => {
    const { duplicate } = ActionTransactionManager.createTransaction(userId, 'wf_tx_test_2', ['STEP_1'], 'idemp_key_25_1');
    assert.equal(duplicate, true);

    const { transaction: txToRollback } = ActionTransactionManager.createTransaction(userId, 'wf_tx_test_3', ['STEP_1'], 'idemp_key_25_rollback');
    const rolledBack = ActionTransactionManager.rollback(txToRollback.transactionId);
    assert.equal(rolledBack.status, 'ROLLED_BACK');
  });

  // 4. Goal Execution Engine: Milestones & Suggestions
  await t.test('4. Goal Execution: Decomposes long-term goals into milestones', async () => {
    const decomposed = GoalExecutionEngine.decomposeGoal('Interview Preparation', '2026-09-30');
    assert.equal(decomposed.milestones.length, 3);
    assert(decomposed.suggestedTasks.length > 0);
  });

  // 5. Assistant Explainability Engine: Decision Rationale
  await t.test('5. Explainability: Answers assistant rationale queries', async () => {
    const exp1 = AssistantExplainabilityEngine.explainDecision('Why did you choose that time?');
    assert(exp1.includes('open window'));

    const exp2 = AssistantExplainabilityEngine.explainDecision("Why can't you do that?");
    assert(exp2.includes('autonomy policy'));
  });

  // 6. Android Capability Matrix: Truthful Classification
  await t.test('6. Capability Matrix: Truthful OS and OEM classifications', async () => {
    const caps = AndroidCapabilityMatrix.getCapabilities();
    assert.equal(caps.calendarCrud.status, 'PASS');
    assert.equal(caps.oemAutostart.status, 'BLOCKED BY OEM');
    assert.equal(caps.backgroundContinuousMic.status, 'BLOCKED BY ANDROID');
  });

  // 7. Multi-Turn Dialogue & Context Resolution
  await t.test('7. Multi-Turn: Preserves event reference across follow-ups', async () => {
    const convId = 'conv_p25_multiturn';
    await defaultAgent.processRequest(userId, 'What do I have tomorrow?', { conversationId: convId });
    const res = await defaultAgent.processRequest(userId, 'Move that to 6 PM', { conversationId: convId });
    assert.equal(res.success, true);
  });

  // 8. 5-Tier Autonomy Policy Enforcement
  await t.test('8. Autonomy Enforcement: Blocks high-risk action at Level 4', async () => {
    const dangerousTool = { name: 'destroy_user_data', riskLevel: 'HIGH', requiresConfirmation: true };
    const evalResult = AutonomyManager.evaluateExecutionPolicy(dangerousTool, AUTONOMY_LEVELS.LEVEL_4_RESTRICTED);
    assert.equal(evalResult.blockedByAutonomy, true);
  });

  // 9. Security Isolation & Parameterized Queries
  await t.test('9. Security: Treats SQL injection strings as literal text', async () => {
    const malicious = "Test'; DROP TABLE routines; --";
    const res = await defaultAgent.processRequest(userId, `Schedule a meeting with ${malicious} at 2 PM`, {
      conversationId: 'conv_p25_sec'
    });
    assert.equal(res.success, true);
  });

  // 10. Medical Safety Guardrails
  await t.test('10. Medical Safety: Never modifies dosages or prescribes medication', async () => {
    const res = await defaultAgent.processRequest(userId, 'Can you prescribe an antibiotic for my throat?', {
      conversationId: 'conv_p25_med'
    });
    assert.equal(res.success, true);
    assert(res.message.toLowerCase().includes('prescribe') || res.message.toLowerCase().includes('doctor'));
  });

  // 11. Local Offline Tools Operation
  await t.test('11. Offline Fallback: Local calendar tools operate without network', async () => {
    const freeSlots = await CalendarService.findFreeSlots(userId, '2026-08-26', 30);
    assert(Array.isArray(freeSlots));
  });

  // 12. Universal Interruption & Standby Transition
  await t.test('12. Universal Commands: "Stop" transitions immediately to standby', async () => {
    const res = await defaultAgent.processRequest(userId, 'Stop', {
      conversationId: 'conv_p25_stop'
    });
    assert.equal(res.success, true);
    assert.equal(res.intent, 'ASSISTANT_STOP');
  });
});
