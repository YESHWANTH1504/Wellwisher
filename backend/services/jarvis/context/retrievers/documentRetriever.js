const { AiDocumentRepository } = require('../../../../repositories/ai/aiDocumentRepository');
const { CONTEXT_BUDGETS } = require('../contextSources');

class DocumentRetriever {
  /**
   * Retrieve recent documents and extracted values within bounded context budgets
   */
  static async retrieve(userId, request = '', options = {}) {
    if (!userId) {
      throw new Error('userId is required for DocumentRetriever.');
    }

    const limitDocs = options.limitDocs || CONTEXT_BUDGETS.MAX_DOCUMENTS || 3;
    const limitValues = options.limitValues || CONTEXT_BUDGETS.MAX_EXTRACTED_VALUES || 15;

    // 1. Fetch user documents
    const allDocs = await AiDocumentRepository.listDocuments(userId);
    const recentDocs = allDocs.slice(0, limitDocs);

    // 2. Fetch latest summary and extractions if documents exist
    let latestSummary = null;
    let latestExtractions = [];

    if (recentDocs.length > 0) {
      const topDoc = recentDocs[0];
      latestSummary = await AiDocumentRepository.getDocumentSummary(topDoc.id, userId);
      latestExtractions = await AiDocumentRepository.getDocumentExtractions(topDoc.id, userId);
    }

    // 3. If query mentions a specific metric (e.g. hemoglobin), fetch historical values across reports
    let queriedMetricValues = [];
    const lowerReq = (request || '').toLowerCase();
    const metricKeywords = ['hemoglobin', 'glucose', 'cholesterol', 'creatinine', 'tsh', 'platelet', 'wbc', 'rbc', 'blood pressure'];
    const matchedKeyword = metricKeywords.find(k => lowerReq.includes(k));

    if (matchedKeyword) {
      const allUserExtractions = await AiDocumentRepository.getUserExtractions(userId);
      queriedMetricValues = allUserExtractions.filter(e =>
        e.fieldName.toLowerCase().includes(matchedKeyword)
      ).slice(0, 5);
    }

    return {
      documentCount: recentDocs.length,
      recentDocuments: recentDocs.map(d => ({
        id: d.id,
        documentType: d.documentType,
        originalFilename: d.originalFilename,
        uploadedAt: d.uploadedAt,
        status: d.processingStatus
      })),
      latestDocumentId: recentDocs[0]?.id || null,
      latestSummary: latestSummary ? {
        documentType: latestSummary.documentType || recentDocs[0]?.documentType,
        summary: latestSummary.summary,
        keyFindings: (latestSummary.keyFindings || []).slice(0, 8),
        outOfRangeValues: latestSummary.outOfRangeValues || [],
        warnings: latestSummary.warnings || []
      } : null,
      extractedValues: latestExtractions.slice(0, limitValues).map(e => ({
        fieldName: e.fieldName,
        value: e.fieldValue,
        unit: e.unit,
        referenceRange: e.referenceRange,
        flag: e.flag,
        pageNumber: e.pageNumber,
        confidence: e.confidenceScore
      })),
      historicalValues: queriedMetricValues.map(h => ({
        documentId: h.documentId,
        fieldName: h.fieldName,
        value: h.fieldValue,
        unit: h.unit,
        flag: h.flag,
        observedAt: h.observedAt || h.createdAt
      }))
    };
  }
}

module.exports = DocumentRetriever;
