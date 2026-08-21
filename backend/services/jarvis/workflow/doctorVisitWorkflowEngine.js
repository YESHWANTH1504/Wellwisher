const aiWorkflowRepository = require('../../../repositories/ai/aiWorkflowRepository');
const doctorVisitPreparationEngine = require('../health/doctorVisitPreparationEngine');
const healthTrendEngine = require('../health/healthTrendEngine');
const healthTrendAlertEngine = require('../health/healthTrendAlertEngine');
const medicationIntelligenceEngine = require('../health/medicationIntelligenceEngine');

class DoctorVisitWorkflowEngine {
  constructor({
    workflowRepo = aiWorkflowRepository,
    doctorBriefingEngine = doctorVisitPreparationEngine,
    trendEngine = healthTrendEngine,
    alertEngine = healthTrendAlertEngine,
    medEngine = medicationIntelligenceEngine
  } = {}) {
    this.workflowRepo = workflowRepo;
    this.doctorBriefingEngine = doctorBriefingEngine;
    this.trendEngine = trendEngine;
    this.alertEngine = alertEngine;
    this.medEngine = medEngine;
  }

  /**
   * Prepares a comprehensive 1-page clinical appointment preparation package.
   */
  async prepareDoctorVisitPackage(userId, appointmentId) {
    const apt = await this.workflowRepo.getAppointmentById(userId, appointmentId);
    if (!apt) throw new Error('Appointment not found');

    const briefing = await this.doctorBriefingEngine.generateDoctorBriefing(userId);
    const trends = await this.trendEngine.getComputedTrends(userId);
    const alerts = await this.alertEngine.evaluateHealthTrendAlerts(userId);
    const medRecon = await this.medEngine.reconcileMedications(userId);

    // Associate briefing with appointment
    await this.workflowRepo.updateAppointment(userId, appointmentId, {
      briefingId: briefing.id,
      status: apt.status === 'PLANNED' ? 'CONFIRMED' : apt.status
    });

    return {
      appointment: apt,
      briefing: briefing.briefingData,
      briefingId: briefing.id,
      trendsSummary: trends.slice(0, 5),
      activeAlerts: alerts.filter(a => a.status === 'ACTIVE'),
      medicationDiscussionPoints: medRecon.potentialConcerns,
      questionsForDoctor: briefing.briefingData.questionsForDoctor || [],
      disclaimer: 'This doctor visit briefing is non-diagnostic and prepared solely from user records for consultation organization.'
    };
  }

  /**
   * Records post-appointment completion and generates follow-up workflow items.
   * NOTE: Doctor instructions are recorded as user-provided data and never autonomously interpreted.
   */
  async recordAppointmentCompletion(userId, appointmentId, {
    doctorInstructions = '',
    followUpDate = null,
    testsRequested = []
  } = {}) {
    const updatedApt = await this.workflowRepo.completeAppointment(userId, appointmentId, {
      doctorInstructions,
      followUpDate,
      testsRequested
    });

    const followUpActions = [];

    if (followUpDate) {
      const followUpAction = await this.workflowRepo.createWorkflowAction(userId, {
        actionType: 'BOOK_FOLLOWUP_APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: appointmentId,
        status: 'PENDING',
        requiresConfirmation: true,
        payload: {
          title: `Follow-up with Dr. ${updatedApt.doctor_name || 'Clinician'}`,
          scheduledAt: `${followUpDate}T10:00:00Z`,
          doctorName: updatedApt.doctor_name,
          notes: `Follow-up requested on ${followUpDate}. Instructions: ${doctorInstructions}`
        }
      });
      followUpActions.push(followUpAction);
    }

    if (testsRequested && testsRequested.length > 0) {
      const labAction = await this.workflowRepo.createWorkflowAction(userId, {
        actionType: 'SCHEDULE_LAB_TEST',
        entityType: 'DIAGNOSTIC_TESTS',
        entityId: appointmentId,
        status: 'PENDING',
        requiresConfirmation: true,
        payload: {
          tests: testsRequested,
          notes: `Requested by Dr. ${updatedApt.doctor_name || 'Clinician'}`
        }
      });
      followUpActions.push(labAction);
    }

    return {
      appointment: updatedApt,
      followUpActions,
      message: 'Appointment marked completed. Post-appointment follow-up actions have been recorded.'
    };
  }
}

module.exports = new DoctorVisitWorkflowEngine();
