const { STANDARD_DISCLAIMER } = require('./clinicalSafetyValidator');

class DocumentSummaryEngine {
  /**
   * Generate grounded, structured informational summary from extracted values and document metadata
   * @param {string} documentType 
   * @param {Array<object>} extractions 
   * @param {object} metadata 
   * @returns {object}
   */
  static generateSummary(documentType = 'UNKNOWN', extractions = [], metadata = {}) {
    const keyFindings = [];
    const outOfRangeValues = [];
    const uncertainValues = [];
    const warnings = [];

    let totalConfidence = 0;

    for (const item of extractions) {
      const conf = Number(item.confidenceScore != null ? item.confidenceScore : 0.90);
      totalConfidence += conf;

      const formattedFinding = `${item.fieldName}: ${item.fieldValue} ${item.unit || ''}`.trim() +
        (item.referenceRange ? ` (Printed Reference Range: ${item.referenceRange})` : '');

      keyFindings.push(formattedFinding);

      if (['LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'ABNORMAL'].includes(item.flag)) {
        outOfRangeValues.push({
          fieldName: item.fieldName,
          value: `${item.fieldValue} ${item.unit || ''}`.trim(),
          referenceRange: item.referenceRange || 'Not specified on document',
          flag: item.flag,
          sourcePage: item.pageNumber || 1
        });
      }

      if (conf < 0.60 || item.extractionStatus === 'REVIEW_REQUIRED') {
        uncertainValues.push({
          fieldName: item.fieldName,
          value: item.fieldValue,
          confidence: conf,
          note: 'Requires manual visual verification against original document.'
        });
      }
    }

    const averageConfidence = extractions.length > 0
      ? Number((totalConfidence / extractions.length).toFixed(2))
      : 0.90;

    if (uncertainValues.length > 0) {
      warnings.push(`${uncertainValues.length} value(s) have low OCR confidence or require confirmation.`);
    }

    // Build grounded, non-diagnostic natural summary
    let summaryText = '';
    const metricCount = extractions.length;

    if (metricCount === 0) {
      summaryText = `This document has been cataloged as ${documentType.replace(/_/g, ' ')}. No standard numerical clinical test ranges were detected in the visible text.`;
    } else {
      summaryText = `The uploaded ${documentType.replace(/_/g, ' ')} contains ${metricCount} extracted health metric(s). `;
      if (outOfRangeValues.length > 0) {
        const outList = outOfRangeValues.map(o => `${o.fieldName} (${o.value}, ${o.flag.toLowerCase()})`).join(', ');
        summaryText += `The following value(s) fall outside the reference ranges printed on the report: ${outList}. `;
      } else {
        summaryText += `All extracted metrics with printed ranges appear within their stated reference intervals. `;
      }
      summaryText += `You may review the full parameters below or discuss them with your healthcare professional.`;
    }

    const questionsForDoctor = [
      'What are the overall implications of these test parameters for my daily wellness routine?',
      'Are there any specific lifestyle, hydration, or dietary recommendations based on these values?',
      'When should I schedule my next follow-up or routine check-up?'
    ];

    if (outOfRangeValues.length > 0) {
      questionsForDoctor.unshift(`What factors might contribute to the ${outOfRangeValues[0].fieldName} reading of ${outOfRangeValues[0].value}?`);
    }

    return {
      documentType,
      summary: summaryText,
      keyFindings,
      outOfRangeValues,
      uncertainValues,
      questionsForDoctor,
      warnings,
      confidence: averageConfidence,
      disclaimer: STANDARD_DISCLAIMER
    };
  }

  /**
   * Compare two documents based strictly on matching test names
   */
  static compareReports(latestDoc, previousDoc, latestExtractions = [], previousExtractions = []) {
    const comparisons = [];
    const prevMap = new Map();

    for (const p of previousExtractions) {
      prevMap.set(p.fieldName.toLowerCase(), p);
    }

    for (const lat of latestExtractions) {
      const prev = prevMap.get(lat.fieldName.toLowerCase());
      if (prev) {
        const latNum = parseFloat(lat.fieldValue);
        const prevNum = parseFloat(prev.fieldValue);
        let changeText = 'Recorded in both reports';

        if (!isNaN(latNum) && !isNaN(prevNum)) {
          const delta = latNum - prevNum;
          const sign = delta > 0 ? '+' : '';
          changeText = `${sign}${delta.toFixed(2)} ${lat.unit || ''}`.trim();
        }

        comparisons.push({
          fieldName: lat.fieldName,
          unit: lat.unit || prev.unit || '',
          latest: {
            documentId: latestDoc?.id,
            date: latestDoc?.uploadedAt || latestDoc?.createdAt,
            value: lat.fieldValue,
            flag: lat.flag,
            referenceRange: lat.referenceRange
          },
          previous: {
            documentId: previousDoc?.id,
            date: previousDoc?.uploadedAt || previousDoc?.createdAt,
            value: prev.fieldValue,
            flag: prev.flag,
            referenceRange: prev.referenceRange
          },
          change: changeText
        });
      }
    }

    return {
      success: true,
      latestDocumentId: latestDoc?.id,
      previousDocumentId: previousDoc?.id,
      comparisonCount: comparisons.length,
      comparisons,
      disclaimer: 'This comparison displays historical numerical differences between reports and is not a medical evaluation.'
    };
  }
}

module.exports = DocumentSummaryEngine;
