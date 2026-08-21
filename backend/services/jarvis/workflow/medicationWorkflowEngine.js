const medicationIntelligenceEngine = require('../health/medicationIntelligenceEngine');
const RoutineModel = require('../../../models/routineModel');
const pool = require('../../../config/db');

class MedicationWorkflowEngine {
  constructor({
    medIntelligence = medicationIntelligenceEngine
  } = {}) {
    this.medIntelligence = medIntelligence;
  }

  /**
   * Reconciles active medication list with schedule routines to detect coverage and gaps.
   */
  async getMedicationWorkflowOverview(userId) {
    const [activeRows] = await pool.query('SELECT * FROM medications WHERE user_id = ?', [userId]);
    const activeMeds = activeRows || [];
    const today = new Date().toISOString().split('T')[0];
    const routines = await RoutineModel.getByDate(userId, today);
    const medRoutines = routines.filter(r => r.category === 'medication' || r.title.toLowerCase().includes('pill') || r.title.toLowerCase().includes('tablet') || r.title.toLowerCase().includes('medicine'));

    const coverage = [];
    const missingRoutines = [];

    for (const med of activeMeds) {
      const matchingRoutine = medRoutines.find(r => 
        r.title.toLowerCase().includes(med.name.toLowerCase()) || 
        (r.description && r.description.toLowerCase().includes(med.name.toLowerCase()))
      );

      if (matchingRoutine) {
        coverage.push({
          medication: med,
          routine: matchingRoutine,
          hasReminder: matchingRoutine.reminder_enabled === 1 || matchingRoutine.reminder_enabled === true
        });
      } else {
        missingRoutines.push({
          medication: med,
          suggestedTitle: `Take ${med.name} (${med.dosage || ''})`,
          suggestedTime: med.schedule_time || '08:00 AM',
          reason: `Active medication "${med.name}" does not have an active daily schedule reminder configured.`
        });
      }
    }

    const reconciliation = await this.medIntelligence.reconcileMedications(userId);

    return {
      activeMedicationsCount: activeMeds.length,
      coveredMedicationsCount: coverage.length,
      missingRoutines,
      coverage,
      reconciliationConcerns: reconciliation.potentialConcerns,
      doctorQuestions: reconciliation.doctorQuestions,
      disclaimer: 'Informational medication review only. JARVIS never alters prescriptions or dosages without user confirmation and clinician oversight.'
    };
  }

  /**
   * Suggests reminder routine creation for an unlinked active medication.
   * STRICT: Returns suggested payload for user confirmation, never executes autonomously.
   */
  generateReminderSuggestion(medication) {
    return {
      actionType: 'CREATE_ROUTINE',
      title: `Take ${medication.name} (${medication.dosage || 'Prescribed dose'})`,
      description: `Daily medication reminder for ${medication.name}. Instructions: ${medication.instructions || 'As directed by physician.'}`,
      time: medication.schedule_time || '08:00 AM',
      category: 'medication',
      reminderEnabled: true,
      requiresConfirmation: true,
      notice: 'This action will create a daily reminder in your schedule. It does not modify medical records or prescriptions.'
    };
  }
}

module.exports = new MedicationWorkflowEngine();
