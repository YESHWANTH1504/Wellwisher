const pool = require('../../../config/db');
const HealthTrendEngine = require('./healthTrendEngine');
const MedicationIntelligenceEngine = require('./medicationIntelligenceEngine');
const { AiHealthIntelligenceRepository } = require('../../../repositories/ai/aiHealthIntelligenceRepository');
const { AiDocumentRepository } = require('../../../repositories/ai/aiDocumentRepository');

class DoctorVisitPreparationEngine {
  /**
   * Generate a structured, grounded 1-page health briefing for doctor visits.
   * Strictly non-diagnostic and non-prescriptive.
   */
  static async generateBriefing(userId) {
    if (!userId) throw new Error('userId is required to generate doctor briefing.');

    // 1. Fetch User Profile Info
    const [userRows] = await pool.query(
      `SELECT id, name, email FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = userRows && userRows.length > 0 ? userRows[0] : { id: userId, name: 'Patient' };

    // 2. Compute Health Trends & Observations
    const trends = await HealthTrendEngine.computeUserTrends(userId);

    // 3. Reconcile Medications
    const medReconciliation = await MedicationIntelligenceEngine.reconcileMedications(userId);

    // 4. Fetch Out-of-Range Items across verified documents
    const docs = await AiDocumentRepository.listDocuments(userId);
    const outOfRangeItems = [];
    const sourceDocumentIds = [];

    for (const doc of docs) {
      sourceDocumentIds.push(doc.id);
      const summary = await AiDocumentRepository.getDocumentSummary(doc.id, userId);
      if (summary && summary.outOfRangeValues && summary.outOfRangeValues.length > 0) {
        for (const item of summary.outOfRangeValues) {
          outOfRangeItems.push({
            documentId: doc.id,
            documentFilename: doc.originalFilename,
            fieldName: item.fieldName,
            value: item.value,
            flag: item.flag || 'OUT_OF_RANGE',
            referenceRange: item.referenceRange || null
          });
        }
      }
    }

    // 5. Gather Recent Measurements
    const recentMeasurements = trends.map(t => ({
      metricName: t.metricName,
      latestValue: t.latestValue,
      unit: t.unit,
      date: t.latestDate,
      referenceRange: t.printedReferenceRange,
      trendDirection: t.trendDirection
    }));

    // 6. Trend Summaries (where we have previous and latest values)
    const trendSummaries = trends
      .filter(t => t.trendDirection !== 'INSUFFICIENT_DATA')
      .map(t => ({
        metricName: t.metricName,
        previousValue: t.previousValue,
        latestValue: t.latestValue,
        unit: t.unit,
        change: t.changeValue,
        changePercent: t.changePercent,
        trendDirection: t.trendDirection,
        dates: `${t.previousDate || 'Prev'} -> ${t.latestDate || 'Recent'}`
      }));

    // 7. Discussion Points for Clinician
    const discussionPoints = [];
    for (const concern of medReconciliation.potentialConcerns) {
      discussionPoints.push({
        type: 'MEDICATION_DISCUSSION_POINT',
        classification: concern.classification,
        summary: concern.reason,
        question: concern.suggestedQuestion
      });
    }

    for (const trend of trends) {
      if (trend.changePercent !== null && Math.abs(trend.changePercent) >= 20.0) {
        discussionPoints.push({
          type: 'BIOMARKER_TREND_DISCUSSION_POINT',
          classification: 'REVIEW_RECOMMENDED',
          summary: `${trend.metricName} shifted by ${trend.changePercent}% (${trend.previousValue} to ${trend.latestValue} ${trend.unit}).`,
          question: `Does the ${Math.abs(trend.changePercent)}% change in my ${trend.metricName} warrant follow-up?`
        });
      }
    }

    // 8. Questions for the Doctor
    const doctorQuestions = [
      ...medReconciliation.doctorQuestions,
      ...outOfRangeItems.map(item => `What is the significance of the ${item.fieldName} reading (${item.value}) shown on my ${item.documentFilename}?`),
      ...trends.filter(t => t.changePercent !== null && Math.abs(t.changePercent) >= 20.0).map(t => `My ${t.metricName} moved from ${t.previousValue} to ${t.latestValue} ${t.unit}. Are there specific steps I should take?`)
    ];

    const uniqueDoctorQuestions = Array.from(new Set(doctorQuestions)).slice(0, 8);

    const briefingData = {
      patientInfo: {
        userId: user.id,
        name: user.name || 'Patient',
        reportDate: new Date().toISOString().split('T')[0]
      },
      recentMeasurements,
      trendSummaries,
      outOfRangeResults: outOfRangeItems,
      currentMedications: medReconciliation.activeMedications,
      discussionPoints,
      questionsForDoctor: uniqueDoctorQuestions,
      sourceDocuments: docs.map(d => ({ id: d.id, filename: d.originalFilename, type: d.documentType, date: d.uploadedAt })),
      disclaimer: 'This briefing is generated strictly from your WellWisher records for personal organization during medical consultations. It does not constitute a diagnosis, treatment recommendation, or prescription.'
    };

    const savedRecord = await AiHealthIntelligenceRepository.saveDoctorBriefing(
      userId,
      briefingData,
      sourceDocumentIds,
      'READY'
    );

    return savedRecord;
  }

  static async generateDoctorBriefing(userId) {
    return this.generateBriefing(userId);
  }
}

module.exports = DoctorVisitPreparationEngine;
