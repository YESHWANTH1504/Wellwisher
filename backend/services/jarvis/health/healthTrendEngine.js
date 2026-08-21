const pool = require('../../../config/db');
const { AiDocumentRepository } = require('../../../repositories/ai/aiDocumentRepository');
const { AiHealthIntelligenceRepository } = require('../../../repositories/ai/aiHealthIntelligenceRepository');

const CORE_HEALTH_METRICS = [
  { key: 'GLUCOSE', name: 'Blood Glucose', patterns: [/fasting.*glucose/i, /blood\s*glucose/i, /\bfbs\b/i, /\brbs\b/i, /\bglucose\b/i] },
  { key: 'HBA1C', name: 'HbA1c', patterns: [/hba1c/i, /glycated\s*hemoglobin/i, /a1c/i] },
  { key: 'TOTAL_CHOLESTEROL', name: 'Total Cholesterol', patterns: [/total\s*cholesterol/i, /\bcholesterol\s*total\b/i] },
  { key: 'LDL', name: 'LDL Cholesterol', patterns: [/ldl\s*cholesterol/i, /\bldl\b/i] },
  { key: 'HDL', name: 'HDL Cholesterol', patterns: [/hdl\s*cholesterol/i, /\bhdl\b/i] },
  { key: 'TRIGLYCERIDES', name: 'Triglycerides', patterns: [/triglycerides/i, /\btg\b/i] },
  { key: 'HEMOGLOBIN', name: 'Hemoglobin', patterns: [/hemoglobin/i, /\bhgb\b/i, /\bhb\b/i] },
  { key: 'WBC', name: 'WBC Count', patterns: [/wbc\s*count/i, /white\s*blood\s*cells?/i, /\bwbc\b/i] },
  { key: 'PLATELETS', name: 'Platelets', patterns: [/platelets?/i, /platelet\s*count/i, /\bplt\b/i] },
  { key: 'CREATININE', name: 'Serum Creatinine', patterns: [/serum\s*creatinine/i, /creatinine/i] },
  { key: 'BLOOD_PRESSURE', name: 'Blood Pressure', patterns: [/blood\s*pressure/i, /\bbp\b/i] },
  { key: 'HEART_RATE', name: 'Heart Rate', patterns: [/heart\s*rate/i, /pulse/i, /\bbpm\b/i] },
  { key: 'SPO2', name: 'Oxygen Saturation', patterns: [/oxygen\s*sat/i, /\bspo2\b/i, /o2\s*saturation/i] },
  { key: 'WEIGHT', name: 'Weight', patterns: [/body\s*weight/i, /\bweight\b/i] }
];

class HealthTrendEngine {
  /**
   * Analyze all historical verified observations across documents and vitals logs.
   * Generates and updates trend records in the repository.
   */
  static async computeUserTrends(userId) {
    if (!userId) throw new Error('userId is required to compute health trends.');

    // 1. Gather all observations from documents
    const docExtractions = await this.getObservationsFromDocuments(userId);

    // 2. Gather vitals from database vitals table if present
    const vitalsObservations = await this.getObservationsFromVitals(userId);

    // 3. Combine and group observations by standard metric
    const allObservations = [...docExtractions, ...vitalsObservations];

    const computedTrends = [];

    for (const metricDef of CORE_HEALTH_METRICS) {
      const matchingObs = allObservations
        .filter(obs => this.matchesMetric(obs.rawName, metricDef))
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest to newest

      if (matchingObs.length === 0) continue;

      const latestObs = matchingObs[matchingObs.length - 1];
      const sourceDocs = Array.from(new Set(matchingObs.map(o => o.documentId).filter(Boolean)));

      if (matchingObs.length < 2) {
        // Insufficient data for trend calculation
        const singleTrend = {
          metricName: metricDef.name,
          previousValue: null,
          latestValue: latestObs.value,
          unit: latestObs.unit || '',
          previousDate: null,
          latestDate: latestObs.date,
          changeValue: null,
          changePercent: null,
          trendDirection: 'INSUFFICIENT_DATA',
          confidence: latestObs.confidence || 0.90,
          sourceDocumentIds: sourceDocs,
          printedReferenceRange: latestObs.referenceRange || null,
          observationsCount: 1,
          history: matchingObs
        };
        await AiHealthIntelligenceRepository.saveTrend(userId, singleTrend);
        computedTrends.push(singleTrend);
        continue;
      }

      // We have at least 2 points
      const prevObs = matchingObs[matchingObs.length - 2];
      const deltaInfo = this.calculateDelta(prevObs.value, latestObs.value, latestObs.unit);

      const trend = {
        metricName: metricDef.name,
        previousValue: prevObs.value,
        latestValue: latestObs.value,
        unit: latestObs.unit || prevObs.unit || '',
        previousDate: prevObs.date,
        latestDate: latestObs.date,
        changeValue: deltaInfo.changeValue,
        changePercent: deltaInfo.changePercent,
        trendDirection: deltaInfo.trendDirection,
        confidence: Math.min(prevObs.confidence || 0.90, latestObs.confidence || 0.90),
        sourceDocumentIds: sourceDocs,
        printedReferenceRange: latestObs.referenceRange || prevObs.referenceRange || null,
        observationsCount: matchingObs.length,
        history: matchingObs
      };

      await AiHealthIntelligenceRepository.saveTrend(userId, trend);
      computedTrends.push(trend);
    }

    return computedTrends;
  }

  /**
   * Helper to retrieve extractions from user documents
   */
  static async getObservationsFromDocuments(userId) {
    const docs = await AiDocumentRepository.listDocuments(userId);
    const observations = [];

    for (const doc of docs) {
      const extractions = await AiDocumentRepository.getDocumentExtractions(doc.id, userId);
      for (const ext of extractions) {
        if (ext.fieldValue && ext.fieldName) {
          observations.push({
            rawName: ext.fieldName,
            value: ext.fieldValue,
            unit: ext.unit || '',
            referenceRange: ext.referenceRange || null,
            flag: ext.flag || 'NORMAL',
            date: ext.observedAt || doc.uploadedAt || new Date().toISOString(),
            confidence: ext.confidenceScore || 0.90,
            documentId: doc.id,
            documentName: doc.originalFilename,
            pageNumber: ext.pageNumber
          });
        }
      }
    }
    return observations;
  }

  /**
   * Helper to retrieve vital logs from standard vitals table if available
   */
  static async getObservationsFromVitals(userId) {
    try {
      const [rows] = await pool.query(
        `SELECT id, blood_pressure, heart_rate, spo2, blood_glucose, weight, created_at FROM vitals WHERE user_id = ? ORDER BY created_at ASC`,
        [userId]
      );
      const observations = [];
      for (const r of (rows || [])) {
        const date = r.created_at || new Date().toISOString();
        if (r.blood_pressure) {
          observations.push({ rawName: 'Blood Pressure', value: r.blood_pressure, unit: 'mmHg', date, confidence: 1.0, documentId: null });
        }
        if (r.heart_rate) {
          observations.push({ rawName: 'Heart Rate', value: r.heart_rate.toString(), unit: 'bpm', date, confidence: 1.0, documentId: null });
        }
        if (r.spo2) {
          observations.push({ rawName: 'Oxygen Saturation', value: r.spo2.toString(), unit: '%', date, confidence: 1.0, documentId: null });
        }
        if (r.blood_glucose) {
          observations.push({ rawName: 'Blood Glucose', value: r.blood_glucose.toString(), unit: 'mg/dL', date, confidence: 1.0, documentId: null });
        }
        if (r.weight) {
          observations.push({ rawName: 'Weight', value: r.weight.toString(), unit: 'kg', date, confidence: 1.0, documentId: null });
        }
      }
      return observations;
    } catch {
      return [];
    }
  }

  static matchesMetric(rawName, metricDef) {
    if (!rawName) return false;
    return metricDef.patterns.some(pattern => pattern.test(rawName));
  }

  /**
   * Compute numeric or string delta
   */
  static calculateDelta(prevVal, latestVal, unit = '') {
    const numPrev = parseFloat(prevVal);
    const numLatest = parseFloat(latestVal);

    if (isNaN(numPrev) || isNaN(numLatest)) {
      if (prevVal.trim().toLowerCase() === latestVal.trim().toLowerCase()) {
        return { changeValue: 'No change', changePercent: 0, trendDirection: 'STABLE' };
      }
      return { changeValue: `${prevVal} -> ${latestVal}`, changePercent: null, trendDirection: 'STABLE' };
    }

    const diff = numLatest - numPrev;
    const absDiff = Math.abs(diff);

    let trendDirection = 'STABLE';
    if (diff > 0.05) trendDirection = 'INCREASING';
    else if (diff < -0.05) trendDirection = 'DECREASING';

    const sign = diff > 0 ? '+' : (diff < 0 ? '-' : '');
    const changeValue = `${sign}${absDiff.toFixed(2)}${unit ? ' ' + unit : ''}`;

    let changePercent = null;
    if (numPrev !== 0) {
      changePercent = parseFloat(((diff / Math.abs(numPrev)) * 100).toFixed(2));
    }

    return {
      changeValue,
      changePercent,
      trendDirection
    };
  }
}

module.exports = HealthTrendEngine;
