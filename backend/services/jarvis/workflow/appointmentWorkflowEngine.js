const aiWorkflowRepository = require('../../../repositories/ai/aiWorkflowRepository');
const { defaultMockCalendarProvider } = require('../integrations/calendarProvider');
const doctorVisitPreparationEngine = require('../health/doctorVisitPreparationEngine');
const RoutineModel = require('../../../models/routineModel');

class AppointmentWorkflowEngine {
  constructor({
    workflowRepo = aiWorkflowRepository,
    calendarProvider = defaultMockCalendarProvider
  } = {}) {
    this.workflowRepo = workflowRepo;
    this.calendarProvider = calendarProvider;
  }

  /**
   * Prepares appointment checklist combining appointment info, reminders, and briefing links.
   */
  async getAppointmentChecklist(userId, appointmentId) {
    const apt = await this.workflowRepo.getAppointmentById(userId, appointmentId);
    if (!apt) return null;

    const checklist = [
      { id: 'item_id_card', task: 'Carry official photo ID and insurance card', completed: false },
      { id: 'item_meds_list', task: 'Bring active medication list or physical medication boxes', completed: false },
      { id: 'item_doc_briefing', task: 'Review 1-page health summary & prepared questions for doctor', completed: !!apt.briefing_id },
      { id: 'item_fasting_check', task: 'Confirm if 8-12 hour fasting is required for morning blood tests', completed: false },
      { id: 'item_arrival', task: 'Arrive 15 minutes prior to scheduled appointment time', completed: false }
    ];

    return {
      appointment: apt,
      checklist,
      hasBriefing: !!apt.briefing_id,
      briefingId: apt.briefing_id
    };
  }

  /**
   * Links or generates a structured health briefing for the appointment.
   */
  async prepareAppointmentBriefing(userId, appointmentId) {
    const apt = await this.workflowRepo.getAppointmentById(userId, appointmentId);
    if (!apt) throw new Error('Appointment not found');

    const briefing = await doctorVisitPreparationEngine.generateDoctorBriefing(userId);
    await this.workflowRepo.updateAppointment(userId, appointmentId, {
      briefingId: briefing.id,
      status: apt.status === 'PLANNED' ? 'CONFIRMED' : apt.status
    });

    return {
      appointmentId,
      briefing,
      status: 'CONFIRMED'
    };
  }

  /**
   * Detects scheduling conflicts between an appointment time and existing routines or calendar events.
   */
  async detectConflicts(userId, { date, startTime, endTime, scheduledAt, excludeAppointmentId } = {}) {
    const conflicts = [];
    const targetDate = date || (scheduledAt ? scheduledAt.split('T')[0] : '2026-08-21');

    // 1. Check Calendar Provider Overlaps
    if (startTime && endTime) {
      const calConflicts = await this.calendarProvider.detectConflicts(userId, {
        date: targetDate,
        startTime,
        endTime
      });
      for (const cc of calConflicts) {
        conflicts.push({
          source: 'CALENDAR',
          reason: cc.conflictReason,
          details: cc.existingEvent
        });
      }
    }

    // 2. Check Existing Appointments Overlap
    const appointments = await this.workflowRepo.getAppointments(userId);
    for (const a of appointments) {
      if (excludeAppointmentId && a.id === excludeAppointmentId) continue;
      if (a.status === 'CANCELLED' || a.status === 'COMPLETED') continue;

      if (a.scheduled_at && a.scheduled_at.startsWith(targetDate)) {
        conflicts.push({
          source: 'APPOINTMENT',
          reason: `Existing appointment "${a.title}" with Dr. ${a.doctor_name || 'Clinician'} already scheduled for ${a.scheduled_at}`,
          details: a
        });
      }
    }

    return conflicts;
  }

  /**
   * Suggests available time windows for an appointment.
   */
  async suggestTimeWindows(userId, { date, durationMinutes = 30 } = {}) {
    return this.calendarProvider.findAvailability(userId, { date, durationMinutes });
  }

  /**
   * Generates post-appointment follow-up suggestions based on recorded doctor instructions.
   */
  async generatePostAppointmentSuggestions(userId, appointmentId) {
    const apt = await this.workflowRepo.getAppointmentById(userId, appointmentId);
    if (!apt) return [];

    const suggestions = [];

    if (apt.follow_up_date) {
      suggestions.push({
        type: 'SCHEDULE_FOLLOW_UP',
        title: `Book Follow-up Appointment with Dr. ${apt.doctor_name || 'Clinician'}`,
        suggestedDate: apt.follow_up_date,
        description: `Doctor requested a follow-up consultation on or around ${apt.follow_up_date}.`
      });
    }

    if (apt.tests_requested && Array.isArray(apt.tests_requested) && apt.tests_requested.length > 0) {
      suggestions.push({
        type: 'LAB_TEST_PREPARATION',
        title: `Complete Requested Diagnostic Tests (${apt.tests_requested.join(', ')})`,
        description: `Clinician ordered: ${apt.tests_requested.join(', ')}. Schedule diagnostic lab visit prior to next consultation.`
      });
    }

    if (apt.doctor_instructions) {
      suggestions.push({
        type: 'DOCTOR_INSTRUCTION_REMINDER',
        title: 'Review Clinician Care Instructions',
        description: `Recorded instructions: "${apt.doctor_instructions}"`
      });
    }

    return suggestions;
  }
}

module.exports = new AppointmentWorkflowEngine();
