const CLINICAL_METRIC_PATTERNS = [
  // CBC
  { name: 'Hemoglobin', regex: /\b(hemoglobin|hgb|hb)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'g/dL', category: 'CBC' },
  { name: 'WBC Count', regex: /\b(wbc|white blood cell count|total leucocyte count|tlc)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?|\d+,\d+)\s*([a-zA-Z0-9\/^µu]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: '/mcL', category: 'CBC' },
  { name: 'RBC Count', regex: /\b(rbc|red blood cell count)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z0-9\/^µu]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'million/mcL', category: 'CBC' },
  { name: 'Platelets', regex: /\b(platelet count|platelets|plt)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?|\d+,\d+)\s*([a-zA-Z0-9\/^µu]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'x10^3/mcL', category: 'CBC' },
  { name: 'Hematocrit', regex: /\b(hematocrit|hct|packed cell volume|pcv)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(%|[a-zA-Z\/]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: '%', category: 'CBC' },

  // Glucose & Glycemic
  { name: 'Fasting Blood Glucose', regex: /\b(fasting (?:blood )?glucose|fasting blood sugar|fbs)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Glucose' },
  { name: 'Random Blood Glucose', regex: /\b(random (?:blood )?glucose|random blood sugar|rbs)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Glucose' },
  { name: 'HbA1c', regex: /\b(hba1c|glycated hemoglobin|glycohemoglobin)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(%|[a-zA-Z\/]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: '%', category: 'Glucose' },

  // Lipid Panel
  { name: 'Total Cholesterol', regex: /\b(total cholesterol|cholesterol, total|cholesterol)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Lipid' },
  { name: 'HDL Cholesterol', regex: /\b(hdl cholesterol|hdl)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Lipid' },
  { name: 'LDL Cholesterol', regex: /\b(ldl cholesterol|ldl)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Lipid' },
  { name: 'Triglycerides', regex: /\b(triglycerides|tg)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Lipid' },

  // Kidney & Liver
  { name: 'Creatinine', regex: /\b(serum creatinine|creatinine)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Kidney' },
  { name: 'Blood Urea Nitrogen', regex: /\b(blood urea nitrogen|bun|urea)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Kidney' },
  { name: 'eGFR', regex: /\b(egfr|estimated gfr)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z0-9\/^µu]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mL/min/1.73m2', category: 'Kidney' },
  { name: 'ALT (SGPT)', regex: /\b(alt|sgpt|alanine aminotransferase)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%uU]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'U/L', category: 'Liver' },
  { name: 'AST (SGOT)', regex: /\b(ast|sgot|aspartate aminotransferase)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%uU]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'U/L', category: 'Liver' },
  { name: 'Total Bilirubin', regex: /\b(total bilirubin|bilirubin, total)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z\/%]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'mg/dL', category: 'Liver' },

  // Thyroid
  { name: 'TSH', regex: /\b(tsh|thyroid stimulating hormone)\b\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z0-9\/^µu]+)?(?:\s*(?:ref|range|normal)?[:=\-]?\s*([0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?))?/i, defaultUnit: 'uIU/mL', category: 'Thyroid' },

  // Vitals
  { name: 'Blood Pressure', regex: /\b(blood pressure|bp)\b\s*[:=\-]?\s*([0-9]{2,3}\s*\/\s*[0-9]{2,3})\s*(mmHg)?/i, defaultUnit: 'mmHg', category: 'Vitals' },
  { name: 'Heart Rate', regex: /\b(heart rate|pulse|pulse rate|hr)\b\s*[:=\-]?\s*([0-9]{2,3})\s*(bpm|beats\/min)?/i, defaultUnit: 'bpm', category: 'Vitals' },
  { name: 'Oxygen Saturation (SpO2)', regex: /\b(spo2|oxygen saturation|o2 sat)\b\s*[:=\-]?\s*([0-9]{2,3})\s*(%|percent)?/i, defaultUnit: '%', category: 'Vitals' }
];

const PRESCRIPTION_PATTERNS = [
  /\b(?:rx|tab|cap|tablet|capsule|syrup|inj|injection|medication)\s*[:\-]?\s*([A-Za-z0-9\s\-]+?)\s+(\d+\s*(?:mg|mcg|g|ml))\s*(?:,\s*|\s+)?(once daily|twice daily|thrice daily|bid|tid|qid|qd|hs|prn|[0-9]+-[0-9]+-[0-9]+)?/gi
];

class ClinicalReportNormalizer {
  /**
   * Classify document type based on OCR text and file hints
   */
  static classifyDocument(text = '', filename = '') {
    const combined = `${filename} ${text}`.toLowerCase();

    if (/\b(cbc|complete blood count|hemoglobin|hematology|wbc count|platelet|blood test|serum|lipid profile|liver function|lft|kft|renal function|tsh|blood report)\b/i.test(combined)) {
      return { documentType: 'BLOOD_REPORT', confidence: 0.96 };
    }

    if (/\b(laboratory report|lab test|culture|pathology|biochemistry|urinalysis|specimen)\b/i.test(combined)) {
      return { documentType: 'LAB_REPORT', confidence: 0.94 };
    }

    if (/\b(rx\b|prescription|dispense|doctor'?s prescription|take 1 tablet|refill|dr\.\s+[a-z]+|clinic rx)\b/i.test(combined)) {
      return { documentType: 'PRESCRIPTION', confidence: 0.95 };
    }

    if (/\b(medication label|dosage instructions|warning: keep out of reach|take with food|exp date|lot number|mg capsule|mg tablet)\b/i.test(combined)) {
      return { documentType: 'MEDICATION_LABEL', confidence: 0.92 };
    }

    if (/\b(vitals report|vital signs|blood pressure log|pulse log|temperature chart)\b/i.test(combined)) {
      return { documentType: 'VITALS_REPORT', confidence: 0.92 };
    }

    if (/\b(doctor'?s note|clinical note|soap note|chief complaint|assessment and plan)\b/i.test(combined)) {
      return { documentType: 'DOCTOR_NOTE', confidence: 0.88 };
    }

    if (/\b(discharge summary|admission date|discharge date|hospital course)\b/i.test(combined)) {
      return { documentType: 'DISCHARGE_SUMMARY', confidence: 0.91 };
    }

    if (/\b(health certificate|fitness certificate|medical fitness|immunization record)\b/i.test(combined)) {
      return { documentType: 'HEALTH_CERTIFICATE', confidence: 0.88 };
    }

    if (/\b(health|medical|doctor|hospital|clinic|patient)\b/i.test(combined)) {
      return { documentType: 'GENERAL_HEALTH_DOCUMENT', confidence: 0.70 };
    }

    return { documentType: 'UNKNOWN', confidence: 0.40 };
  }

  /**
   * Extract and normalize structured clinical values from OCR pages
   */
  static extractStructuredValues(pages = [], documentId = null, baseConfidence = 0.95) {
    const extractions = [];
    const seenMetrics = new Set();

    for (const page of pages) {
      const pageNum = page.pageNumber || 1;
      const pageText = page.text || page.ocrText || '';
      const pageConf = page.confidence != null ? page.confidence : baseConfidence;

      // Extract document date if printed
      const dateMatch = /\bdate\s*[:=\-]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4}|[a-zA-Z]+\s+[0-9]{1,2},?\s+[0-9]{4})\b/i.exec(pageText);
      let pageDate = null;
      if (dateMatch) {
        try {
          pageDate = new Date(dateMatch[1]).toISOString();
        } catch {
          pageDate = null;
        }
      }

      // 1. Match Standard Clinical Metrics (Lab / Blood / Vitals)
      for (const pattern of CLINICAL_METRIC_PATTERNS) {
        const match = pattern.regex.exec(pageText);
        if (match && !seenMetrics.has(pattern.name)) {
          const rawVal = (match[2] || '').trim().replace(/,/g, '');
          const unit = (match[3] || pattern.defaultUnit || '').trim();
          const refRange = (match[4] || '').trim() || null;

          // Determine flag based strictly on printed reference range
          const flag = this.calculateFlag(rawVal, refRange);
          const isLowConf = pageConf < 0.60 || pageText.includes('[LOW_CONFIDENCE]');

          extractions.push({
            id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            documentId: documentId || 'doc_current',
            fieldName: pattern.name,
            fieldValue: rawVal,
            normalizedValue: rawVal,
            unit,
            referenceRange: refRange,
            flag,
            category: pattern.category,
            confidenceScore: isLowConf ? 0.45 : Math.min(pageConf, 0.96),
            pageNumber: pageNum,
            sourceText: match[0].trim(),
            extractionStatus: isLowConf ? 'REVIEW_REQUIRED' : 'EXTRACTED',
            observedAt: pageDate
          });

          seenMetrics.add(pattern.name);
        }
      }

      // 2. Extract Medications from Prescriptions
      for (const rxPattern of PRESCRIPTION_PATTERNS) {
        rxPattern.lastIndex = 0;
        let rxMatch;
        while ((rxMatch = rxPattern.exec(pageText)) !== null) {
          const medName = (rxMatch[1] || '').trim();
          const dosage = (rxMatch[2] || '').trim();
          const freq = (rxMatch[3] || 'as directed').trim();

          if (medName && !seenMetrics.has(`MED_${medName}`)) {
            extractions.push({
              id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              documentId: documentId || 'doc_current',
              fieldName: `Prescribed: ${medName}`,
              fieldValue: `${dosage}, ${freq}`,
              normalizedValue: `${medName} ${dosage}`,
              unit: dosage,
              referenceRange: null,
              flag: 'NORMAL',
              category: 'Prescription Medication',
              confidenceScore: Math.min(pageConf, 0.94),
              pageNumber: pageNum,
              sourceText: rxMatch[0].trim(),
              extractionStatus: 'REVIEW_REQUIRED', // Prescriptions always require explicit confirmation
              observedAt: pageDate
            });
            seenMetrics.add(`MED_${medName}`);
          }
        }
      }
    }

    return extractions;
  }

  /**
   * Compare numerical value against printed reference range
   */
  static calculateFlag(valueStr, referenceRangeStr) {
    if (!valueStr || !referenceRangeStr) return 'NORMAL';
    const num = parseFloat(valueStr);
    if (isNaN(num)) return 'NORMAL';

    const rangeMatch = /([0-9]+(?:\.[0-9]+)?)\s*[-–]\s*([0-9]+(?:\.[0-9]+)?)/.exec(referenceRangeStr);
    if (!rangeMatch) return 'NORMAL';

    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);

    if (num < min) {
      return (min - num) > (min * 0.3) ? 'CRITICAL_LOW' : 'LOW';
    }
    if (num > max) {
      return (num - max) > (max * 0.3) ? 'CRITICAL_HIGH' : 'HIGH';
    }

    return 'NORMAL';
  }
}

module.exports = ClinicalReportNormalizer;
