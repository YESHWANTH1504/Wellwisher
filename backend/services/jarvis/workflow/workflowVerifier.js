const aiWorkflowRepository = require('../../../repositories/ai/aiWorkflowRepository');
const RoutineModel = require('../../../models/routineModel');
const { defaultMockCalendarProvider } = require('../integrations/calendarProvider');
const pool = require('../../../config/db');

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
   * Verifies that a routine exists in the routines repository and matches expected attributes.
   */
  async verifyRoutineState(userId, routineId, { expectedTime = null, expectedTitle = null } = {}) {
    if (!routineId || !userId) {
      return { verified: false, reason: 'Invalid routineId or userId provided for verification' };
    }
    const found = await RoutineModel.getById(routineId, userId);
    if (!found) {
      return { verified: false, reason: `Routine ${routineId} not found in schedule database for user ${userId}` };
    }
    if (expectedTime && found.time !== expectedTime) {
      return {
        verified: false,
        reason: `Routine time mismatch: expected ${expectedTime}, found ${found.time}`
      };
    }
    if (expectedTitle && found.title !== expectedTitle) {
      return {
        verified: false,
        reason: `Routine title mismatch: expected ${expectedTitle}, found ${found.title}`
      };
    }
    return { verified: true, routine: found };
  }

  /**
   * Verifies that a routine or calendar event has been genuinely deleted or cancelled.
   */
  async verifyRoutineDeleted(userId, routineId) {
    if (!routineId || !userId) {
      return { verified: false, reason: 'Invalid routineId or userId provided for deletion verification' };
    }
    const found = await RoutineModel.getById(routineId, userId);
    if (found) {
      return {
        verified: false,
        reason: `Routine ${routineId} still exists in database; deletion verification failed.`
      };
    }
    return { verified: true, routineId, state: 'DELETED' };
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

  /**
   * Verifies an application launch from native execution results.
   */
  verifyApplicationLaunch(nativeResult, expectedPackage = null) {
    if (!nativeResult) {
      return { verified: false, reason: 'No native result received from Android bridge' };
    }
    if (nativeResult.error === 'APPLICATION_NOT_INSTALLED') {
      return {
        verified: false,
        reason: `Application ${nativeResult.appName || expectedPackage} is not installed on this device.`
      };
    }
    if (nativeResult.error) {
      return { verified: false, reason: `Launch failed with error: ${nativeResult.error}` };
    }
    // Genuine verification requires native verified flag or explicit package launch confirmation
    if (nativeResult.verified === true || nativeResult.executed === true) {
      return {
        verified: true,
        action: 'OPEN_APPLICATION',
        packageName: nativeResult.packageName,
        status: nativeResult.status || 'VERIFIED'
      };
    }
    return { verified: false, reason: 'Android operating system did not confirm foreground application transition.' };
  }

  /**
   * Unified step verification dispatcher.
   */
  async verifyStep(userId, step, executionResult) {
    if (!step) return { verified: false, reason: 'Empty step definition' };
    const tool = (step.tool || '').toLowerCase();

    // 1. Routine / Calendar creation
    if (tool === 'create_reminder' || tool === 'create_calendar_event' || tool === 'create_schedule') {
      const routineId = executionResult?.routineId || executionResult?.eventId || executionResult?.id || step.arguments?.id;
      if (!routineId) {
        return { verified: false, reason: 'No entity ID returned from routine creation tool' };
      }
      return await this.verifyRoutineState(userId, routineId, {
        expectedTime: step.arguments?.time,
        expectedTitle: step.arguments?.title
      });
    }

    // 2. Routine / Calendar update
    if (tool === 'update_reminder' || tool === 'reschedule_appointment' || tool === 'modify_routine') {
      const routineId = executionResult?.routineId || executionResult?.eventId || executionResult?.id || step.arguments?.id;
      const expectedTime = step.arguments?.time || step.arguments?.newTime;
      return await this.verifyRoutineState(userId, routineId, { expectedTime });
    }

    // 3. Routine / Calendar cancellation or deletion
    if (tool === 'cancel_reminder' || tool === 'delete_calendar_event') {
      const routineId = executionResult?.routineId || executionResult?.eventId || executionResult?.id || step.arguments?.id || step.arguments?.eventId;
      return await this.verifyRoutineDeleted(userId, routineId);
    }

    // 4. Application launch
    if (tool === 'open_application') {
      return this.verifyApplicationLaunch(executionResult, step.arguments?.packageName);
    }

    // 5. Read-only tools
    if (tool.startsWith('get_') || tool.startsWith('calendar_get') || tool.startsWith('analyze_') || tool.startsWith('extract_')) {
      return { verified: true, state: 'READ_ONLY_VERIFIED' };
    }

    // 6. Generic verification
    if (executionResult && executionResult.verified === true) {
      return { verified: true, state: 'EXECUTED_AND_VERIFIED' };
    }

    return {
      verified: executionResult?.success === true,
      reason: executionResult?.message || 'Default execution verification'
    };
  }
}

module.exports = new WorkflowVerifier();
