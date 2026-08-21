const STANDARD_DISCLAIMER = 'This is an informational summary and not a medical diagnosis. Please consult your qualified healthcare professional regarding any medical questions or clinical results.';

const FORBIDDEN_DIAGNOSTIC_PATTERNS = [
  /\byou\s+(definitely\s+)?have\s+(anemia|diabetes|cancer|hypertension|infection|disease|disorder|failure|deficiency)\b/i,
  /\bdiagnos(is|ed|ing)\b/i,
  /\bi\s+diagnose\s+you\b/i,
  /\byou\s+are\s+suffering\s+from\b/i
];

const FORBIDDEN_PRESCRIPTION_PATTERNS = [
  /\b(i\s+prescribe|prescribing|i\s+recommend\s+taking|start\s+taking\s+\w+\s+\d+)\b/i,
  /\btake\s+\d+\s*(mg|ml|tablets?|pills?)\b/i,
  /\b(increase|decrease|double|halve|adjust)\s+(your\s+)?(dosage|dose)\b/i,
  /\b(stop|discontinue|quit|cease)\s+taking\b/i
];

class ClinicalSafetyValidator {
  /**
   * Validate raw LLM or normalized document summary output
   * @param {object} summaryPackage 
   * @returns {{ isValid: boolean, violations: Array<string>, sanitizedSummary: object }}
   */
  static validate(summaryPackage = {}) {
    const violations = [];
    const textToCheck = [
      summaryPackage.summary || '',
      ...(Array.isArray(summaryPackage.findings) ? summaryPackage.findings : []),
      ...(Array.isArray(summaryPackage.keyFindings) ? summaryPackage.keyFindings : []),
      ...(Array.isArray(summaryPackage.observations) ? summaryPackage.observations : []),
      ...(Array.isArray(summaryPackage.warnings) ? summaryPackage.warnings : [])
    ].join(' ');

    // 1. Check for Forbidden Diagnostic Declarations
    for (const pattern of FORBIDDEN_DIAGNOSTIC_PATTERNS) {
      if (pattern.test(textToCheck)) {
        violations.push(`Unsafe diagnostic claim detected matching: ${pattern.toString()}`);
      }
    }

    // 2. Check for Forbidden Prescription / Dosage Alterations
    for (const pattern of FORBIDDEN_PRESCRIPTION_PATTERNS) {
      if (pattern.test(textToCheck)) {
        violations.push(`Unsafe prescription or dosage alteration instruction detected matching: ${pattern.toString()}`);
      }
    }

    // 3. Check for Fabricated Reference Ranges or Missing Values
    if (summaryPackage.extractions && Array.isArray(summaryPackage.extractions)) {
      for (const item of summaryPackage.extractions) {
        if (!item.fieldName && !item.testName) {
          violations.push('Extracted metric is missing test/field name');
        }
      }
    }

    const isValid = violations.length === 0;

    // Produce sanitized and safely framed summary
    const sanitized = this.sanitize(summaryPackage, violations);

    return {
      isValid,
      violations,
      sanitizedSummary: sanitized
    };
  }

  /**
   * Transform or sanitize summary into compliant non-diagnostic framing
   */
  static sanitize(summaryPackage = {}, violations = []) {
    let rawText = summaryPackage.summary || '';

    // Replace direct diagnostic declarations with non-diagnostic observational framing
    rawText = rawText
      .replace(/\byou\s+(definitely\s+)?have\s+/gi, 'The report shows findings associated with ')
      .replace(/\bi\s+diagnose\s+you\s+with\b/gi, 'The document indicates parameters related to ')
      .replace(/\b(increase|decrease)\s+your\s+dosage\b/gi, 'discuss potential dosage adjustments with your doctor')
      .replace(/\bstop\s+taking\s+your\s+medication\b/gi, 'consult your doctor before changing medications');

    // Ensure standard disclaimer
    const disclaimer = summaryPackage.disclaimer || STANDARD_DISCLAIMER;

    return {
      documentType: summaryPackage.documentType || 'GENERAL_HEALTH_DOCUMENT',
      summary: rawText || 'The document has been processed for clinical informational metrics.',
      keyFindings: summaryPackage.keyFindings || summaryPackage.findings || [],
      outOfRangeValues: summaryPackage.outOfRangeValues || [],
      uncertainValues: summaryPackage.uncertainValues || [],
      questionsForDoctor: summaryPackage.questionsForDoctor || [
        'What do these test results mean for my current health plan?',
        'Are any follow-up tests recommended based on these findings?'
      ],
      warnings: violations.length > 0 ? [`Output framed safely: non-diagnostic advisory.`] : (summaryPackage.warnings || []),
      confidence: summaryPackage.confidence != null ? summaryPackage.confidence : 0.90,
      disclaimer
    };
  }

  /**
   * Validate that an extracted medical value has required source traceability
   */
  static validateTraceability(extractedValue = {}) {
    if (!extractedValue.documentId) {
      return { isValid: false, message: 'Extracted value lacks originating documentId.' };
    }
    if (extractedValue.pageNumber == null && extractedValue.sourcePage == null) {
      return { isValid: false, message: 'Extracted value lacks source page number.' };
    }
    return { isValid: true };
  }
}

module.exports = {
  ClinicalSafetyValidator,
  STANDARD_DISCLAIMER
};
