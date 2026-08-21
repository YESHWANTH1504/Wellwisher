const aiWorkflowRepository = require('../../../repositories/ai/aiWorkflowRepository');
const RoutineModel = require('../../../models/routineModel');
const { defaultMockCalendarProvider } = require('../integrations/calendarProvider');

class WorkflowVerifier {
  constructor({
    workflowRepo = aiWorkflowRepository,
    calendarProvider = defaultMockCalendarProvider
  } = {}) {
    this.workflowRepo = workflowRepo;
    this.calendarProvider = calendarProvider;
  }

  /**
   * Verifies that an appointment exists in database with expected status.
   */
  async verifyAppointmentState(userId, appointmentId, expectedStatus = null) {
    const apt = await this.workflowRepo.getAppointmentById(userId, appointmentId);
    if (!apt) {
      return { verified: false, reason: `Appointment ${appointmentId} not found in database for user ${userId}` };
    }
    if (expectedStatus && apt.status !== expectedStatus) {
      return {
        verified: false,
        reason: `Appointment status mismatch: expected ${expectedStatus}, found ${apt.status}`
      };
    }
    return { verified: true, appointment: apt };
  }

  /**
   * Verifies that a calendar event exists in the calendar provider.
   */
  async verifyCalendarEventState(userId, eventId) {
    const event = await this.calendarProvider.getEvent(userId, eventId);
    if (!event) {
      return { verified: false, reason: `Calendar event ${eventId} not found in provider for user ${userId}` };
    }
    return { verified: true, event };
  }

  /**
   * Verifies that a routine exists in the routines repository.
   */
  async verifyRoutineState(userId, routineId) {
    const found = await RoutineModel.getById(routineId, userId);
    if (!found) {
      return { verified: false, reason: `Routine ${routineId} not found in schedule database for user ${userId}` };
    }
    return { verified: true, routine: found };
  }

  /**
   * Verifies that a workflow action exists and has expected status.
   */
  async verifyWorkflowActionState(userId, actionId, expectedStatus = null) {
    const action = await this.workflowRepo.getWorkflowActionById(userId, actionId);
    if (!action) {
      return { verified: false, reason: `Workflow action ${actionId} not found for user ${userId}` };
    }
    if (expectedStatus && action.status !== expectedStatus) {
      return {
        verified: false,
        reason: `Workflow action status mismatch: expected ${expectedStatus}, found ${action.status}`
      };
    }
    return { verified: true, action };
  }
}

module.exports = new WorkflowVerifier();
