const HealthTrendEngine = require('../services/jarvis/health/healthTrendEngine');
const HealthTrendAlertEngine = require('../services/jarvis/health/healthTrendAlertEngine');
const MedicationIntelligenceEngine = require('../services/jarvis/health/medicationIntelligenceEngine');
const DoctorVisitPreparationEngine = require('../services/jarvis/health/doctorVisitPreparationEngine');
const { AiHealthIntelligenceRepository } = require('../repositories/ai/aiHealthIntelligenceRepository');
const { AiDocumentRepository } = require('../repositories/ai/aiDocumentRepository');

class HealthIntelligenceController {
  /**
   * GET /api/ai/health/trends
   */
  static async getTrends(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      let trends = await AiHealthIntelligenceRepository.getTrends(userId);
      if (trends.length === 0) {
        trends = await HealthTrendEngine.computeUserTrends(userId);
      }

      return res.json({
        success: true,
        data: trends,
        disclaimer: 'Biomarker trends display historical numerical deltas and do not constitute a diagnosis.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve trends: ' + err.message });
    }
  }

  /**
   * GET /api/ai/health/alerts
   */
  static async getAlerts(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      let alerts = await AiHealthIntelligenceRepository.getActiveAlerts(userId);
      if (alerts.length === 0) {
        alerts = await HealthTrendAlertEngine.evaluateHealthAlerts(userId);
      }

      return res.json({
        success: true,
        data: alerts,
        disclaimer: 'Alerts are informational observations to assist with clinician review.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to retrieve alerts: ' + err.message });
    }
  }

  /**
   * POST /api/ai/health/alerts/:id/dismiss
   */
  static async dismissAlert(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const success = await AiHealthIntelligenceRepository.dismissAlert(id, userId);
      return res.json({ success, message: success ? 'Alert dismissed.' : 'Alert not found.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to dismiss alert: ' + err.message });
    }
  }

  /**
   * GET /api/ai/health/medication-conflicts
   */
  static async getMedicationConflicts(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const reconciliation = await MedicationIntelligenceEngine.reconcileMedications(userId);
      return res.json({ success: true, data: reconciliation });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Medication reconciliation error: ' + err.message });
    }
  }

  /**
   * GET /api/ai/health/overview
   */
  static async getOverview(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const trends = await HealthTrendEngine.computeUserTrends(userId);
      const alerts = await HealthTrendAlertEngine.evaluateHealthAlerts(userId);
      const medReconciliation = await MedicationIntelligenceEngine.reconcileMedications(userId);
      const docs = await AiDocumentRepository.listDocuments(userId);

      return res.json({
        success: true,
        data: {
          trendsCount: trends.length,
          activeAlertsCount: alerts.length,
          potentialConcernsCount: medReconciliation.potentialConcerns.length,
          documentsCount: docs.length,
          recentTrends: trends.slice(0, 5),
          activeAlerts: alerts.slice(0, 5),
          medicationConcerns: medReconciliation.potentialConcerns.slice(0, 5),
          doctorQuestions: medReconciliation.doctorQuestions.slice(0, 5)
        },
        disclaimer: 'This overview organizes your verified health records for discussion with your qualified healthcare provider.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Overview generation error: ' + err.message });
    }
  }

  /**
   * POST /api/ai/health/doctor-briefing
   */
  static async generateDoctorBriefing(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const briefing = await DoctorVisitPreparationEngine.generateBriefing(userId);
      return res.json({ success: true, data: briefing });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Doctor briefing error: ' + err.message });
    }
  }

  /**
   * GET /api/ai/health/doctor-briefing/:id
   */
  static async getDoctorBriefingById(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const briefing = await AiHealthIntelligenceRepository.getDoctorBriefingById(id, userId);
      if (!briefing) return res.status(404).json({ success: false, message: 'Briefing not found.' });

      return res.json({ success: true, data: briefing });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error retrieving briefing: ' + err.message });
    }
  }

  /**
   * GET /api/ai/health/doctor-briefings
   */
  static async getDoctorBriefings(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const briefings = await AiHealthIntelligenceRepository.getDoctorBriefings(userId);
      return res.json({ success: true, data: briefings });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Error retrieving briefings: ' + err.message });
    }
  }

  /**
   * POST /api/ai/health/export
   * Requires explicit confirmation token if not already user-authorized
   */
  static async exportHealthData(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      const trends = await AiHealthIntelligenceRepository.getTrends(userId);
      const alerts = await AiHealthIntelligenceRepository.getAllAlerts(userId);
      const briefings = await AiHealthIntelligenceRepository.getDoctorBriefings(userId);
      const docs = await AiDocumentRepository.listDocuments(userId);

      const archive = {
        exportedAt: new Date().toISOString(),
        userId,
        biomarkerTrends: trends,
        healthAlerts: alerts,
        doctorBriefings: briefings,
        uploadedDocumentsCount: docs.length,
        disclaimer: 'This archive contains your personal health information. Maintain appropriate security when storing or transferring this data.'
      };

      return res.json({ success: true, data: archive });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Export error: ' + err.message });
    }
  }

  /**
   * POST /api/ai/health/clear
   */
  static async clearHealthIntelligenceData(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      await AiHealthIntelligenceRepository.clearHealthIntelligenceData(userId);
      return res.json({ success: true, message: 'All health trends, alerts, and doctor briefings cleared.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Clear error: ' + err.message });
    }
  }
}

module.exports = HealthIntelligenceController;
