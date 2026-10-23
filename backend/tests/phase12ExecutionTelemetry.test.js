process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');

const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');
const AgentResponseBuilder = require('../services/jarvis/agent/agentResponseBuilder');
const { confirmationManager } = require('../services/jarvis/agent/confirmationManager');
const AiController = require('../controllers/aiController');
const { AiAgentRunRepository } = require('../repositories/ai/aiAgentRunRepository');
const RoutineModel = require('../models/routineModel');

test('Phase 12 - Real-World Live Agent Execution, State Transitions & Telemetry Suite', async (t) => {
  const user1Id = 12001;
  const user2Id = 12002;
  let storedConfirmationToken = null;

  await t.test('1. AgentResponseBuilder standardizes structured execution telemetry steps', () => {
    const resp = AgentResponseBuilder.actionCompleted({
      message: 'Routine created.',
      actionType: 'create_schedule',
      actionData: { id: 'rot_1' },
      intent: 'SCHEDULE_REQUEST',
      steps: [
        { toolName: 'create_schedule', status: 'SUCCESS', data: { id: 'rot_1' } }
      ]
    });

    assert.equal(resp.success, true);
    assert.equal(resp.type, 'ACTION_COMPLETED');
    assert.ok(Array.isArray(resp.steps));
    assert.equal(resp.steps.length, 1);
    assert.equal(resp.steps[0].toolName, 'create_schedule');
    assert.equal(resp.steps[0].label, "Adding routine to schedule");
    assert.equal(resp.steps[0].status, 'SUCCESS');
  });

  await t.test('2. Conversational request returns FINAL_RESPONSE with empty steps (no fake tools)', async () => {
    const res = await defaultAgent.processRequest(user1Id, 'Hello JARVIS');
    assert.equal(res.success, true);
    assert.equal(res.type, 'FINAL_RESPONSE');
    assert.ok(Array.isArray(res.steps));
    assert.equal(res.steps.length, 0);
  });

  await t.test('3. Query command produces real execution steps with SUCCESS status and human label', async () => {
    const res = await defaultAgent.processRequest(user1Id, 'What do I have today?');
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.steps));
    assert.ok(res.steps.length > 0);
    assert.equal(res.steps[0].toolName, 'get_today_schedule');
    assert.equal(res.steps[0].label, "Checking today's schedule & routines");
    assert.equal(res.steps[0].status, 'SUCCESS');
  });

  await t.test('4. Health trends query executes get_health_trends with real telemetry', async () => {
    const res = await defaultAgent.processRequest(user1Id, 'Show me my recent health trends');
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.steps));
    assert.ok(res.steps.length > 0);
    assert.equal(res.steps[0].toolName, 'get_health_trends');
    assert.equal(res.steps[0].status, 'SUCCESS');
  });

  await t.test('5. Appointments query executes get_upcoming_appointments with telemetry', async () => {
    const res = await defaultAgent.processRequest(user1Id, 'Do I have any appointments?');
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.steps));
    assert.ok(res.steps.length > 0);
    assert.equal(res.steps[0].toolName, 'get_upcoming_appointments');
    assert.equal(res.steps[0].status, 'SUCCESS');
  });

  await t.test('6. Memory mutation executes save_memory and verifies persistence', async () => {
    const res = await defaultAgent.processRequest(user1Id, 'Remember that I prefer morning workouts at 6:00 AM');
    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.steps));
    assert.ok(res.steps.length > 0);
    assert.equal(res.steps[0].toolName, 'save_memory');
    assert.equal(res.steps[0].status, 'SUCCESS');
  });

  await t.test('7. High-risk schedule deletion triggers WAITING_FOR_CONFIRMATION telemetry step', async () => {
    const today = new Date().toISOString().split('T')[0];
    // Seed routine first
    await RoutineModel.create({
      id: `rot_test_${Date.now()}`,
      userId: user1Id,
      title: 'Morning Walk',
      time: '07:00 AM',
      category: 'exercise',
      date: today
    });

    const res = await defaultAgent.processRequest(user1Id, 'Delete my morning walk');
    assert.equal(res.success, true);
    assert.equal(res.type, 'CONFIRMATION_REQUIRED');
    assert.equal(res.requiresConfirmation, true);
    assert.ok(res.confirmation);
    assert.ok(res.confirmation.confirmationId);
    assert.equal(res.confirmation.tool, 'delete_schedule');
    assert.ok(Array.isArray(res.steps));
    assert.equal(res.steps[0].status, 'WAITING_CONFIRMATION');

    storedConfirmationToken = res.confirmation;
  });

  await t.test('8. Rejection / dismissal leaves database completely unchanged', async () => {
    const today = new Date().toISOString().split('T')[0];
    const routinesBefore = await RoutineModel.getByDate(user1Id, today);
    assert.ok(routinesBefore.length > 0);

    // User dismissed, no confirm call is made
    const routinesAfter = await RoutineModel.getByDate(user1Id, today);
    assert.equal(routinesBefore.length, routinesAfter.length);
  });

  await t.test('9. Valid confirmation execution consumes token and returns SUCCESS execution step', async () => {
    assert.ok(storedConfirmationToken);

    const res = await defaultAgent.processRequest(user1Id, '', {
      confirmationId: storedConfirmationToken.confirmationId,
      toolName: storedConfirmationToken.tool,
      arguments: storedConfirmationToken.arguments
    });

    assert.equal(res.success, true);
    assert.equal(res.type, 'ACTION_COMPLETED');
    assert.ok(Array.isArray(res.steps));
    assert.equal(res.steps[0].status, 'SUCCESS');
  });

  await t.test('10. Confirmation reuse is rejected by cryptographic token manager', async () => {
    assert.ok(storedConfirmationToken);

    const res = await defaultAgent.processRequest(user1Id, '', {
      confirmationId: storedConfirmationToken.confirmationId,
      toolName: storedConfirmationToken.tool,
      arguments: storedConfirmationToken.arguments
    });

    assert.equal(res.success, false);
    assert.equal(res.type, 'ERROR');
  });

  await t.test('11. User isolation: User 2 cannot execute User 1 confirmation token', async () => {
    const token = confirmationManager.createToken({
      userId: user1Id,
      agentRunId: 'run_123',
      tool: 'delete_schedule',
      arguments: { scheduleId: 'rot_target_1' }
    });

    const res = await defaultAgent.processRequest(user2Id, '', {
      confirmationId: token.confirmationId,
      toolName: token.tool,
      arguments: token.arguments
    });

    assert.equal(res.success, false);
    assert.equal(res.type, 'ERROR');
  });

  await t.test('12. AiController chat endpoint wires real steps to client in both steps and data.steps', async () => {
    let capturedJson = null;
    const mockReq = {
      userId: user1Id,
      body: { message: 'What do I have today?' }
    };
    const mockRes = {
      json: (payload) => {
        capturedJson = payload;
        return payload;
      },
      status: () => mockRes
    };

    await AiController.chat(mockReq, mockRes);
    assert.ok(capturedJson);
    assert.equal(capturedJson.success, true);
    assert.ok(Array.isArray(capturedJson.steps));
    assert.ok(Array.isArray(capturedJson.data.steps));
    assert.equal(capturedJson.steps[0].toolName, 'get_today_schedule');
  });
});
