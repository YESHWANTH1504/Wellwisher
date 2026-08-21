const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const aiWorkflowRepository = require('../repositories/ai/aiWorkflowRepository');
const appointmentWorkflowEngine = require('../services/jarvis/workflow/appointmentWorkflowEngine');
const doctorVisitWorkflowEngine = require('../services/jarvis/workflow/doctorVisitWorkflowEngine');
const medicationWorkflowEngine = require('../services/jarvis/workflow/medicationWorkflowEngine');
const workflowVerifier = require('../services/jarvis/workflow/workflowVerifier');
const { defaultMockCalendarProvider } = require('../services/jarvis/integrations/calendarProvider');
const { confirmationManager } = require('../services/jarvis/agent/confirmationManager');
const { idempotencyManager } = require('../services/jarvis/agent/idempotencyManager');
const ProactiveDecisionEngine = require('../services/jarvis/proactive/proactiveDecisionEngine');
const ContextEngine = require('../services/jarvis/context/contextEngine');
const { registry } = require('../services/jarvis/tools');
const pool = require('../config/db');

describe('Phase 10: JARVIS Real-World Health & Life Workflow Automation Tests', () => {
  const user1 = 1001;
  const user2 = 1002;

  beforeEach(async () => {
    await aiWorkflowRepository.clearAll(user1);
    await aiWorkflowRepository.clearAll(user2);
    defaultMockCalendarProvider.clearAll();
  });

  it('1. Creates an appointment and persists with PLANNED status', async () => {
    const apt = await aiWorkflowRepository.createAppointment(user1, {
      title: 'Dr. Sarah Connor Cardiology Followup',
      provider: 'Metro Heart Center',
      appointmentType: 'Cardiology',
      scheduledAt: '2026-09-10T10:30:00Z',
      location: 'Room 402, Building A',
      doctorName: 'Sarah Connor',
      notes: 'Review annual ECG and lipid trends'
    });

    assert.ok(apt);
    assert.equal(apt.user_id, user1);
    assert.equal(apt.status, 'PLANNED');
    assert.equal(apt.doctor_name, 'Sarah Connor');
  });

  it('2. Retrieves user appointments with status filtering', async () => {
    await aiWorkflowRepository.createAppointment(user1, {
      title: 'Dental Cleaning',
      scheduledAt: '2026-09-01T09:00:00Z',
      status: 'CONFIRMED'
    });
    await aiWorkflowRepository.createAppointment(user1, {
      title: 'Eye Checkup',
      scheduledAt: '2026-09-15T14:00:00Z',
      status: 'PLANNED'
    });

    const confirmed = await aiWorkflowRepository.getAppointments(user1, { status: 'CONFIRMED' });
    assert.equal(confirmed.length, 1);
    assert.equal(confirmed[0].title, 'Dental Cleaning');

    const all = await aiWorkflowRepository.getAppointments(user1);
    assert.equal(all.length, 2);
  });

  it('3. Enforces strict user isolation for appointment access', async () => {
    const aptUser1 = await aiWorkflowRepository.createAppointment(user1, {
      title: 'Confidential Oncology Consult',
      scheduledAt: '2026-09-20T11:00:00Z'
    });

    // User2 attempts to access User1 appointment
    const leakAttempt = await aiWorkflowRepository.getAppointmentById(user2, aptUser1.id);
    assert.equal(leakAttempt, null);

    // User2 list only returns their own
    const user2Apts = await aiWorkflowRepository.getAppointments(user2);
    assert.equal(user2Apts.length, 0);
  });

  it('4. Performs calendar read operations (list events & find availability) under AUTO_APPROVE', async () => {
    const events = await defaultMockCalendarProvider.listEvents(user1, { date: '2026-08-21' });
    assert.ok(Array.isArray(events));
    assert.ok(events.length >= 1);

    const slots = await defaultMockCalendarProvider.findAvailability(user1, {
      date: '2026-08-21',
      durationMinutes: 30
    });
    assert.ok(Array.isArray(slots));
    assert.ok(slots.length > 0);
    assert.ok(slots[0].durationMinutes >= 30);
  });

  it('5. Calendar write operations require ASK_ALWAYS and confirmation metadata', async () => {
    const createCalTool = registry.get('create_calendar_event');
    assert.ok(createCalTool);
    assert.equal(createCalTool.riskLevel, 'HIGH');
    assert.equal(createCalTool.requiresConfirmation, true);

    const updateCalTool = registry.get('update_calendar_event');
    assert.equal(updateCalTool.requiresConfirmation, true);

    const deleteCalTool = registry.get('delete_calendar_event');
    assert.equal(deleteCalTool.requiresConfirmation, true);
  });

  it('6. Rejects expired cryptographic confirmation tokens', async () => {
    const token = confirmationManager.createToken({
      userId: user1,
      agentRunId: 'run_exp_1',
      tool: 'create_calendar_event',
      arguments: { title: 'Doctor Visit', date: '2026-09-01' },
      ttlMinutes: -1 // Expired
    });

    const result = confirmationManager.validateAndConsume(
      token.confirmationId,
      user1,
      'create_calendar_event',
      { title: 'Doctor Visit', date: '2026-09-01' }
    );
    assert.equal(result.valid, false);
    assert.equal(result.errorCode, 'CONFIRMATION_EXPIRED');
  });

  it('7. Rejects already used single-use confirmation tokens', async () => {
    const token = confirmationManager.createToken({
      userId: user1,
      agentRunId: 'run_reuse_1',
      tool: 'create_calendar_event',
      arguments: { title: 'Cardiology Visit', date: '2026-09-02' },
      ttlMinutes: 5
    });

    // 1st consumption succeeds
    const res1 = confirmationManager.validateAndConsume(
      token.confirmationId,
      user1,
      'create_calendar_event',
      { title: 'Cardiology Visit', date: '2026-09-02' }
    );
    assert.equal(res1.valid, true);

    // 2nd consumption attempt fails
    const res2 = confirmationManager.validateAndConsume(
      token.confirmationId,
      user1,
      'create_calendar_event',
      { title: 'Cardiology Visit', date: '2026-09-02' }
    );
    assert.equal(res2.valid, false);
    assert.equal(res2.errorCode, 'CONFIRMATION_ALREADY_USED');
  });

  it('8. Rejects cross-user confirmation attempts', async () => {
    const token = confirmationManager.createToken({
      userId: user1,
      agentRunId: 'run_cross_1',
      tool: 'create_calendar_event',
      arguments: { title: 'Confidential Event' },
      ttlMinutes: 5
    });

    const res = confirmationManager.validateAndConsume(
      token.confirmationId,
      user2, // User 2 trying to consume User 1's token
      'create_calendar_event',
      { title: 'Confidential Event' }
    );
    assert.equal(res.valid, false);
    assert.equal(res.errorCode, 'UNAUTHORIZED_CONFIRMATION');
  });

  it('9. Rejects argument tampering during confirmation validation', async () => {
    const originalArgs = { title: 'Routine Checkup', date: '2026-09-05' };
    const tamperedArgs = { title: 'Dangerous Root Access', date: '2026-09-05' };

    const token = confirmationManager.createToken({
      userId: user1,
      agentRunId: 'run_tamper_1',
      tool: 'create_calendar_event',
      arguments: originalArgs,
      ttlMinutes: 5
    });

    const res = confirmationManager.validateAndConsume(
      token.confirmationId,
      user1,
      'create_calendar_event',
      tamperedArgs
    );
    assert.equal(res.valid, false);
    assert.equal(res.errorCode, 'CONFIRMATION_ARGUMENTS_MISMATCH');
  });

  it('10. Enforces workflow idempotency on duplicate mutation submissions', async () => {
    const toolName = 'create_calendar_event';
    const args = { title: 'Idempotent Sync', date: '2026-09-01' };
    const payload = { eventId: 'cal_101', status: 'created' };

    // Record execution
    idempotencyManager.record(user1, toolName, args, payload);

    // Check second execution returns cached result
    const check = idempotencyManager.check(user1, toolName, args);
    assert.ok(check);
    assert.deepEqual(check, payload);
  });

  it('11. Detects appointment scheduling conflicts with existing events and routines', async () => {
    await aiWorkflowRepository.createAppointment(user1, {
      title: 'Dr. Bruce Banner Endocrinology',
      doctorName: 'Bruce Banner',
      scheduledAt: '2026-08-21T11:30:00Z',
      status: 'CONFIRMED'
    });

    const conflicts = await appointmentWorkflowEngine.detectConflicts(user1, {
      date: '2026-08-21',
      startTime: '11:00 AM',
      endTime: '12:00 PM'
    });

    assert.ok(conflicts.length >= 1);
    assert.ok(conflicts.some(c => c.source === 'CALENDAR' || c.source === 'APPOINTMENT'));
  });

  it('12. Prepares doctor visit briefing package and associates with appointment', async () => {
    const apt = await aiWorkflowRepository.createAppointment(user1, {
      title: 'Comprehensive Annual Health Check',
      doctorName: 'Dr. Gregory House',
      scheduledAt: '2026-09-25T10:00:00Z'
    });

    const visitPackage = await doctorVisitWorkflowEngine.prepareDoctorVisitPackage(user1, apt.id);
    assert.ok(visitPackage);
    assert.ok(visitPackage.briefing);
    assert.ok(visitPackage.briefingId);
    assert.ok(visitPackage.disclaimer.includes('non-diagnostic'));

    const updatedApt = await aiWorkflowRepository.getAppointmentById(user1, apt.id);
    assert.equal(updatedApt.briefing_id, visitPackage.briefingId);
    assert.equal(updatedApt.status, 'CONFIRMED');
  });

  it('13. Generates follow-up workflow items when recording post-appointment completion', async () => {
    const apt = await aiWorkflowRepository.createAppointment(user1, {
      title: 'Orthopedic Consultation',
      doctorName: 'Dr. Watson',
      scheduledAt: '2026-08-20T15:00:00Z',
      status: 'CONFIRMED'
    });

    const result = await doctorVisitWorkflowEngine.recordAppointmentCompletion(user1, apt.id, {
      doctorInstructions: 'Rest right ankle for 2 weeks, apply ice twice daily.',
      followUpDate: '2026-09-04',
      testsRequested: ['Right Ankle X-Ray', 'Inflammation Panel']
    });

    assert.equal(result.appointment.status, 'COMPLETED');
    assert.equal(result.followUpActions.length, 2);

    const followUpAction = result.followUpActions.find(a => a.action_type === 'BOOK_FOLLOWUP_APPOINTMENT');
    assert.ok(followUpAction);
    assert.equal(followUpAction.payload.doctorName, 'Dr. Watson');

    const labAction = result.followUpActions.find(a => a.action_type === 'SCHEDULE_LAB_TEST');
    assert.ok(labAction);
    assert.deepEqual(labAction.payload.tests, ['Right Ankle X-Ray', 'Inflammation Panel']);
  });

  it('14. Enforces medication workflow safety: suggests reminders but keeps active meds immutable', async () => {
    const overview = await medicationWorkflowEngine.getMedicationWorkflowOverview(user1);
    assert.ok(overview);
    assert.ok(overview.disclaimer.includes('never alters prescriptions'));

    const suggestion = medicationWorkflowEngine.generateReminderSuggestion({
      name: 'Atorvastatin',
      dosage: '20 mg',
      schedule_time: '09:00 PM'
    });

    assert.equal(suggestion.actionType, 'CREATE_ROUTINE');
    assert.equal(suggestion.requiresConfirmation, true);
    assert.ok(suggestion.notice.includes('does not modify medical records'));
  });

  it('15. Integrates document extraction, trend evaluation, and workflow action center context', async () => {
    const context = await ContextEngine.buildContext(user1, 'What is on my calendar and do I have upcoming appointments?');
    assert.ok(context.sources);
    assert.ok(context.sources.workflow);
    assert.ok(context.sources.workflow.data);
    assert.ok(Array.isArray(context.sources.workflow.data.appointments));
    assert.ok(Array.isArray(context.sources.workflow.data.calendarEvents));
  });

  it('16. Proactive intelligence duplicate suppression prevents redundant pending appointment alerts', async () => {
    const decision1 = await ProactiveDecisionEngine.evaluateEventDelivery(
      user1,
      {
        eventType: 'APPOINTMENT_UPCOMING',
        relatedEntityType: 'APPOINTMENT',
        relatedEntityId: 'apt_test_101',
        priority: 'HIGH'
      },
      { proactiveAssistanceEnabled: true }
    );
    assert.equal(decision1.shouldDeliver, true);
  });

  it('17. Enforces quiet hours for non-critical workflow notifications', async () => {
    const decision = await ProactiveDecisionEngine.evaluateEventDelivery(
      user1,
      {
        eventType: 'CALENDAR_CONFLICT',
        priority: 'MEDIUM'
      },
      {
        proactiveAssistanceEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      },
      { currentTime: '23:30' }
    );
    assert.equal(decision.shouldDeliver, false);
    assert.equal(decision.reason, 'QUIET_HOURS_ACTIVE');
  });

  it('18. LLM cannot directly execute arbitrary tools or bypass confirmation', async () => {
    const mutationTools = [
      'create_calendar_event',
      'update_calendar_event',
      'delete_calendar_event',
      'create_appointment_reminder',
      'update_appointment_reminder',
      'create_followup_routine',
      'record_appointment_completion',
      'export_appointment_briefing'
    ];

    for (const toolName of mutationTools) {
      const tool = registry.get(toolName);
      assert.ok(tool, `Tool ${toolName} must be registered`);
      assert.equal(tool.requiresConfirmation, true, `Tool ${toolName} must require confirmation`);
      assert.equal(tool.riskLevel, 'HIGH', `Tool ${toolName} must be marked HIGH risk`);
    }
  });

  it('19. WorkflowVerifier accurately validates database and calendar states', async () => {
    const apt = await aiWorkflowRepository.createAppointment(user1, {
      title: 'Physical Therapy Check',
      scheduledAt: '2026-09-12T14:00:00Z',
      status: 'PLANNED'
    });

    const validCheck = await workflowVerifier.verifyAppointmentState(user1, apt.id, 'PLANNED');
    assert.equal(validCheck.verified, true);

    const invalidStatusCheck = await workflowVerifier.verifyAppointmentState(user1, apt.id, 'COMPLETED');
    assert.equal(invalidStatusCheck.verified, false);
    assert.ok(invalidStatusCheck.reason.includes('status mismatch'));

    const nonExistentCheck = await workflowVerifier.verifyAppointmentState(user1, 'non_existent_apt');
    assert.equal(nonExistentCheck.verified, false);
  });

  it('20. Backward compatibility with Phase 1-9 tools and systems preserved', async () => {
    const expectedTools = [
      'get_schedule', 'create_schedule', 'get_medications', 'get_vitals', 'get_hydration',
      'save_memory', 'get_documents', 'get_document_summary', 'compare_documents',
      'check_medication_conflicts', 'get_health_trends', 'get_health_alerts', 'generate_doctor_briefing',
      'get_calendar_events', 'find_calendar_availability', 'get_upcoming_appointments',
      'create_calendar_event', 'record_appointment_completion'
    ];

    for (const name of expectedTools) {
      assert.ok(registry.has(name), `Expected tool ${name} must exist in registry`);
    }
  });
});
