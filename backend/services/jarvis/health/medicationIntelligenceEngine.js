const pool = require('../../../config/db');
const { AiDocumentRepository } = require('../../../repositories/ai/aiDocumentRepository');

class MedicationIntelligenceEngine {
  /**
   * Reconcile active medications, document extractions, and prescriptions to find review points.
   * Strictly non-diagnostic and non-prescriptive.
   */
  static async reconcileMedications(userId) {
    if (!userId) throw new Error('userId is required for medication reconciliation.');

    // 1. Fetch Active Medications from medications table
    const [activeRows] = await pool.query(
      `SELECT id, name, dosage, schedule_time, remaining_pills FROM medications WHERE user_id = ? ORDER BY name ASC`,
      [userId]
    );
    const activeMeds = (activeRows || []).map(r => ({
      id: r.id,
      name: r.name,
      dosage: r.dosage,
      scheduleTime: r.schedule_time,
      remainingPills: r.remaining_pills,
      source: 'ACTIVE_MEDICATION_LIST'
    }));

    // 2. Fetch Extracted Prescriptions and Medication Labels from ai_documents
    const docs = await AiDocumentRepository.listDocuments(userId);
    const prescriptionDocs = docs.filter(d => ['PRESCRIPTION', 'MEDICATION_LABEL', 'DISCHARGE_SUMMARY'].includes(d.documentType));

    const documentMeds = [];
    for (const doc of prescriptionDocs) {
      const extractions = await AiDocumentRepository.getDocumentExtractions(doc.id, userId);
      for (const ext of extractions) {
        const cat = (ext.category || '').toLowerCase();
        const fName = (ext.fieldName || '').toLowerCase();
        if (cat.includes('prescription') || cat.includes('medication') || fName.includes('rx') || fName.includes('prescribed') || fName.includes('medication')) {
          documentMeds.push({
            id: ext.id,
            documentId: doc.id,
            documentFilename: doc.originalFilename,
            fieldName: ext.fieldName,
            name: ext.fieldName.replace(/^(Prescribed:\s*|Rx:\s*|Medication:\s*)/i, '').trim(),
            dosage: ext.fieldValue,
            unit: ext.unit,
            sourcePage: ext.pageNumber,
            extractionStatus: ext.extractionStatus,
            observedAt: ext.observedAt || doc.uploadedAt,
            source: 'CLINICAL_DOCUMENT'
          });
        }
      }
    }

    // 3. Identify Reconciliation Items
    const potentialConcerns = [];
    const doctorQuestions = [];

    // A. Check for Duplicates or Dose Discrepancies between Active Meds and Document Meds
    for (const docMed of documentMeds) {
      const match = activeMeds.find(a => this.isSameMedication(a.name, docMed.name));
      if (match) {
        // Compare dosages
        if (docMed.dosage && match.dosage && this.cleanDosage(docMed.dosage) !== this.cleanDosage(match.dosage)) {
          potentialConcerns.push({
            type: 'DOSAGE_DISCREPANCY',
            classification: 'REQUIRES_CLINICIAN_REVIEW',
            medicationA: `${match.name} (${match.dosage}) [Active List]`,
            medicationB: `${docMed.name} (${docMed.dosage}) [${docMed.documentFilename}, Page ${docMed.sourcePage}]`,
            reason: `The dosage in your uploaded document (${docMed.dosage}) differs from your active schedule (${match.dosage}).`,
            confidence: 0.92,
            sourceDocuments: [docMed.documentId],
            suggestedQuestion: `My records show ${match.name} as ${match.dosage}, but my document lists ${docMed.dosage}. Which dosage should I follow?`
          });
          doctorQuestions.push(`Verify correct dosage for ${match.name} (${match.dosage} vs ${docMed.dosage} on report).`);
        }
      } else {
        // Newly appearing medication in document not on active list
        potentialConcerns.push({
          type: 'UNRECORDED_MEDICATION',
          classification: 'REVIEW_RECOMMENDED',
          medicationA: `${docMed.name} (${docMed.dosage || 'Prescribed'})`,
          medicationB: null,
          reason: `Medication "${docMed.name}" is listed on your clinical document (${docMed.documentFilename}) but is not in your active WellWisher schedule.`,
          confidence: 0.88,
          sourceDocuments: [docMed.documentId],
          suggestedQuestion: `Should "${docMed.name}" from my recent document be added to my regular routine?`
        });
        doctorQuestions.push(`Discuss whether ${docMed.name} should be part of the active daily schedule.`);
      }
    }

    // B. Check for Potential Duplicates within the active list itself
    for (let i = 0; i < activeMeds.length; i++) {
      for (let j = i + 1; j < activeMeds.length; j++) {
        if (this.isSameMedication(activeMeds[i].name, activeMeds[j].name)) {
          potentialConcerns.push({
            type: 'POTENTIAL_DUPLICATE',
            classification: 'POTENTIAL_CONCERN',
            medicationA: activeMeds[i].name,
            medicationB: activeMeds[j].name,
            reason: `Possible duplicate or similar active medications (${activeMeds[i].name} and ${activeMeds[j].name}) exist in your active schedule.`,
            confidence: 0.90,
            sourceDocuments: [],
            suggestedQuestion: `I have both ${activeMeds[i].name} and ${activeMeds[j].name} on my schedule. Are both intended concurrently?`
          });
          doctorQuestions.push(`Clarify concurrent use of ${activeMeds[i].name} and ${activeMeds[j].name}.`);
        }
      }
    }

    // C. Remove duplicate questions
    const uniqueQuestions = Array.from(new Set(doctorQuestions));

    let overallStatus = 'INFORMATIONAL';
    if (potentialConcerns.some(c => c.classification === 'REQUIRES_CLINICIAN_REVIEW')) {
      overallStatus = 'REQUIRES_CLINICIAN_REVIEW';
    } else if (potentialConcerns.some(c => c.classification === 'POTENTIAL_CONCERN')) {
      overallStatus = 'POTENTIAL_CONCERN';
    } else if (potentialConcerns.some(c => c.classification === 'REVIEW_RECOMMENDED')) {
      overallStatus = 'REVIEW_RECOMMENDED';
    }

    return {
      status: overallStatus,
      activeMedicationsCount: activeMeds.length,
      documentMedicationsCount: documentMeds.length,
      activeMedications: activeMeds,
      documentMedications: documentMeds,
      potentialConcerns,
      doctorQuestions: uniqueQuestions,
      disclaimer: 'This medication reconciliation is for informational organization only and is not clinical prescribing advice. Do not start, stop, or change any medication dosage without consulting your doctor.'
    };
  }

  static isSameMedication(nameA, nameB) {
    if (!nameA || !nameB) return false;
    const a = nameA.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = nameB.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (a === b) return true;
    if (a.length > 4 && b.length > 4 && (a.includes(b) || b.includes(a))) return true;
    return false;
  }

  static cleanDosage(str) {
    return (str || '').toLowerCase().replace(/\s+/g, '');
  }
}

module.exports = MedicationIntelligenceEngine;
