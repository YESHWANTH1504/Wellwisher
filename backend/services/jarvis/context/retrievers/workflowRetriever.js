const aiWorkflowRepository = require('../../../../repositories/ai/aiWorkflowRepository');
const { defaultMockCalendarProvider } = require('../../integrations/calendarProvider');

const MAX_APPOINTMENTS = 5;
const MAX_CALENDAR_EVENTS = 10;
const MAX_WORKFLOW_ACTIONS = 5;
const MAX_FOLLOWUPS = 5;

class WorkflowRetriever {
  /**
   * Retrieve bounded appointments context.
   */
  async retrieveAppointmentsContext(userId) {
    try {
      const appointments = await aiWorkflowRepository.getAppointments(userId);
      const active = appointments.filter(a => a.status !== 'CANCELLED').slice(0, MAX_APPOINTMENTS);
      return active.map(a => ({
        id: a.id,
        title: a.title,
        doctorName: a.doctor_name,
        appointmentType: a.appointment_type,
        scheduledAt: a.scheduled_at,
        location: a.location,
        status: a.status,
        hasBriefing: !!a.briefing_id,
        followUpDate: a.follow_up_date
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Retrieve bounded calendar events context.
   */
  async retrieveCalendarContext(userId, { date } = {}) {
    try {
      const events = await defaultMockCalendarProvider.listEvents(userId, { date });
      return events.slice(0, MAX_CALENDAR_EVENTS).map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        date: e.date,
        location: e.location,
        provider: e.provider
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Retrieve bounded pending workflow actions context.
   */
  async retrieveWorkflowActionsContext(userId) {
    try {
      const pending = await aiWorkflowRepository.getPendingActions(userId);
      return pending.slice(0, MAX_WORKFLOW_ACTIONS).map(p => ({
        id: p.id,
        actionType: p.action_type,
        entityType: p.entity_type,
        requiresConfirmation: !!p.requires_confirmation,
        payload: typeof p.payload === 'string' ? JSON.parse(p.payload) : p.payload
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Retrieve bounded doctor follow-up items.
   */
  async retrieveDoctorFollowupsContext(userId) {
    try {
      const appointments = await aiWorkflowRepository.getAppointments(userId, { status: 'COMPLETED' });
      const followups = [];
      for (const apt of appointments) {
        if (apt.follow_up_date || (apt.tests_requested && apt.tests_requested.length > 0)) {
          followups.push({
            appointmentId: apt.id,
            doctorName: apt.doctor_name,
            followUpDate: apt.follow_up_date,
            testsRequested: apt.tests_requested,
            doctorInstructions: apt.doctor_instructions
          });
        }
      }
      return followups.slice(0, MAX_FOLLOWUPS);
    } catch (e) {
      return [];
    }
  }
}

module.exports = new WorkflowRetriever();
