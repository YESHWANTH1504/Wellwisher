/**
 * HealthVisualSafetyGuard
 * Enforces strict clinical safety guardrails on visual and document intelligence.
 * Distinguishes factual observation from medical interpretation/diagnosis.
 * Prevents dosage recommendation from visual appearance alone.
 */

class HealthVisualSafetyGuard {
  static MEDICAL_DISCLAIMER = 'Important Note: This observation is generated for informational purposes and is not a medical diagnosis or treatment advice. Consult a healthcare professional for clinical decisions.';
  static PHARMACIST_DISCLAIMER = 'Important Note: Visual identification only; not medical or prescription advice. Consult your prescribing physician or licensed pharmacist before taking any medication.';

  static FORBIDDEN_ASSERTIONS = [
    /\byou\s+(definitely|certainly)\s+have\s+[a-zA-Z]+/i,
    /\bi\s+diagnose\s+you\s+with\b/i,
    /\btake\s+[0-9]+\s*(mg|tablets|pills)\b[^\.\n]*/i,
    /\bincrease\s+your\s+dosage\s+to\b/i,
    /\bstop\s+taking\s+your\s+medication\b/i
  ];

  /**
   * Check if user query or image relates to medical/clinical content
   */
  static isClinicalContent(text = '', metadata = {}) {
    const combined = `${text} ${JSON.stringify(metadata)}`.toLowerCase();
    const clinicalTerms = [
      'prescription', 'rx', 'tablet', 'capsule', 'medicine', 'medication',
      'blood report', 'cbc', 'lipid', 'hba1c', 'lab report', 'doctor',
      'hemoglobin', 'platelet', 'glucose', 'creatinine', 'thyroid'
    ];
    return clinicalTerms.some(term => combined.includes(term));
  }

  static isMedicationQuery(text = '') {
    const lower = (text || '').toLowerCase();
    return lower.includes('medicine') || lower.includes('medication') || lower.includes('pill') || lower.includes('tablet') || lower.includes('prescription') || lower.includes('rx');
  }

  /**
   * Sanitize AI visual response: Strips forbidden diagnostic assertions and appends disclaimer
   */
  static sanitizeVisualClinicalResponse(aiText = '', isMedical = false, options = {}) {
    if (!aiText) return aiText;
    let safe = aiText;

    // Check and disarm forbidden assertions
    for (const pattern of HealthVisualSafetyGuard.FORBIDDEN_ASSERTIONS) {
      if (pattern.test(safe)) {
        safe = safe.replace(pattern, 'an examination by a licensed medical provider is required to determine');
      }
    }

    if (isMedical && !safe.includes('Important Note:')) {
      const disc = options.isMedication
        ? HealthVisualSafetyGuard.PHARMACIST_DISCLAIMER
        : HealthVisualSafetyGuard.MEDICAL_DISCLAIMER;
      safe = `${safe}\n\n${disc}`;
    }

    return safe;
  }

  /**
   * Safe medicine packaging recognition response
   */
  static formatMedicineObservation(visibleName, confidence = 0.9, details = {}) {
    if (!visibleName || confidence < 0.6) {
      return {
        identified: false,
        speech: "I can't reliably identify the medicine from this image. Please check the label directly or consult your pharmacist.",
        message: "Unable to reliably identify medication from image packaging (confidence below threshold).",
        disclaimer: HealthVisualSafetyGuard.MEDICAL_DISCLAIMER
      };
    }

    return {
      identified: true,
      medicineName: visibleName,
      confidence,
      details,
      speech: `The packaging appears to be labeled as "${visibleName}". Always check the printed label instructions and consult your doctor or pharmacist before taking any medication.`,
      message: `Identified label: "${visibleName}" (Confidence: ${(confidence * 100).toFixed(0)}%). Visual identification only; not medical advice.`,
      disclaimer: HealthVisualSafetyGuard.MEDICAL_DISCLAIMER
    };
  }
}

module.exports = HealthVisualSafetyGuard;
