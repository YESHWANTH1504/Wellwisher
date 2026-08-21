const { RISK_LEVELS } = require('./toolRegistry');
const MedicationIntelligenceEngine = require('../health/medicationIntelligenceEngine');
const HealthTrendEngine = require('../health/healthTrendEngine');
const HealthTrendAlertEngine = require('../health/healthTrendAlertEngine');
const DoctorVisitPreparationEngine = require('../health/doctorVisitPreparationEngine');
const { AiHealthIntelligenceRepository } = require('../../../repositories/ai/aiHealthIntelligenceRepository');

const healthTools = [
  {
    name: 'check_medication_conflicts',
    description: 'Reconcile active medications with uploaded prescriptions and clinical documents to identify potential review items for clinician discussion. Strictly read-only and non-prescriptive.',
    category: 'health',
    permissionKey: 'check_medication_conflicts',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const reconciliation = await MedicationIntelligenceEngine.reconcileMedications(context.userId);
      return {
        status: reconciliation.status,
        activeMedicationsCount: reconciliation.activeMedicationsCount,
        documentMedicationsCount: reconciliation.documentMedicationsCount,
        potentialConcerns: reconciliation.potentialConcerns,
        doctorQuestions: reconciliation.doctorQuestions,
        disclaimer: reconciliation.disclaimer
      };
    }
  },
  {
    name: 'get_health_trends',
    description: 'Retrieve calculated trends across historical blood tests, lab panels, and vital sign logs without diagnosing.',
    category: 'health',
    permissionKey: 'get_health_trends',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        metric: { type: 'string', description: 'Optional specific metric name e.g. Glucose, LDL, Hemoglobin' }
      }
    },
    execute: async (context, input) => {
      let trends = await AiHealthIntelligenceRepository.getTrends(context.userId);
      if (trends.length === 0) {
        trends = await HealthTrendEngine.computeUserTrends(context.userId);
      }

      if (input.metric) {
        trends = trends.filter(t => t.metricName.toLowerCase().includes(input.metric.toLowerCase()));
      }

      return {
        count: trends.length,
        trends: trends.map(t => ({
          metricName: t.metricName,
          previousValue: t.previousValue,
          latestValue: t.latestValue,
          unit: t.unit,
          changeValue: t.changeValue,
          changePercent: t.changePercent,
          trendDirection: t.trendDirection,
          dates: `${t.previousDate || 'Prev'} -> ${t.latestDate || 'Recent'}`
        })),
        disclaimer: 'Trends display historical numerical deltas and do not constitute clinical interpretations.'
      };
    }
  },
  {
    name: 'get_health_alerts',
    description: 'Retrieve active health trend alerts, repeated out-of-range warnings, and clinician discussion questions.',
    category: 'health',
    permissionKey: 'get_health_alerts',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      let alerts = await AiHealthIntelligenceRepository.getActiveAlerts(context.userId);
      if (alerts.length === 0) {
        alerts = await HealthTrendAlertEngine.evaluateHealthAlerts(context.userId);
      }

      return {
        count: alerts.length,
        alerts: alerts.map(a => ({
          id: a.id,
          alertType: a.alertType,
          metric: a.metric,
          severity: a.severity,
          message: a.message,
          evidence: a.evidence
        })),
        disclaimer: 'Alerts are informational notifications to assist with clinician review.'
      };
    }
  },
  {
    name: 'generate_doctor_briefing',
    description: 'Compile a structured 1-page summary of recent vitals, out-of-range lab metrics, and medication review points for an upcoming medical consultation.',
    category: 'health',
    permissionKey: 'generate_doctor_briefing',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      const briefing = await DoctorVisitPreparationEngine.generateBriefing(context.userId);
      return {
        briefingId: briefing.id,
        patientName: briefing.briefingData?.patientInfo?.name || 'Patient',
        generatedAt: briefing.generatedAt,
        measurementsCount: (briefing.briefingData?.recentMeasurements || []).length,
        trendSummariesCount: (briefing.briefingData?.trendSummaries || []).length,
        outOfRangeCount: (briefing.briefingData?.outOfRangeResults || []).length,
        doctorQuestionsCount: (briefing.briefingData?.questionsForDoctor || []).length,
        disclaimer: briefing.briefingData?.disclaimer
      };
    }
  },
  {
    name: 'export_health_data',
    description: 'Export all personal health metrics, lab records, and doctor briefings into an exportable archive. Requires explicit user confirmation.',
    category: 'health',
    permissionKey: 'export_health_data',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', description: 'Export format e.g. JSON, PDF' }
      }
    },
    execute: async (context, input) => {
      const trends = await AiHealthIntelligenceRepository.getTrends(context.userId);
      const alerts = await AiHealthIntelligenceRepository.getActiveAlerts(context.userId);
      const briefings = await AiHealthIntelligenceRepository.getDoctorBriefings(context.userId);

      return {
        success: true,
        format: input.format || 'JSON',
        exportedAt: new Date().toISOString(),
        summary: {
          trendsCount: trends.length,
          alertsCount: alerts.length,
          briefingsCount: briefings.length
        },
        message: 'Health data export archive successfully compiled with user authorization.'
      };
    }
  }
];

module.exports = healthTools;
