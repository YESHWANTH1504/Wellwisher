process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');

const { AiDocumentRepository } = require('../repositories/ai/aiDocumentRepository');
const DocumentProcessingPipeline = require('../services/jarvis/vision/documentProcessingPipeline');
const ClinicalReportNormalizer = require('../services/jarvis/vision/clinicalReportNormalizer');
const DocumentSummaryEngine = require('../services/jarvis/vision/documentSummaryEngine');
const { ClinicalSafetyValidator } = require('../services/jarvis/vision/clinicalSafetyValidator');
const ContextEngine = require('../services/jarvis/context/contextEngine');
const { ToolRegistry, registry } = require('../services/jarvis/tools');
const { defaultAgent } = require('../services/jarvis/agent/jarvisAgent');

test('Phase 8 - JARVIS Multi-Modal Vision, OCR & Clinical Document Suite', async (t) => {
  const user1Id = 8001;
  const user2Id = 8002;

  let user1DocId = null;
  let user1Doc2Id = null;

  // Sample blood report OCR text
  const sampleBloodReportOcr = `
    CITY GENERAL HOSPITAL - LABORATORY SERVICES
    PATIENT: John Doe    DATE: 2026-08-15
    ==================================================
    COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL
    --------------------------------------------------
    TEST NAME            VALUE    UNIT      REF RANGE
    --------------------------------------------------
    Hemoglobin           13.8     g/dL      13.0 - 17.0
    WBC Count            7500     /mcL      4000 - 11000
    Platelets            250000   /mcL      150000 - 450000
    Fasting Blood Glucose 118      mg/dL     70 - 100
    Serum Creatinine     0.95     mg/dL     0.70 - 1.30
    Total Cholesterol    215      mg/dL     125 - 200
    Blood Pressure       128/82   mmHg
    ==================================================
  `;

  // Sample previous blood report for comparison
  const samplePreviousReportOcr = `
    CITY GENERAL HOSPITAL - LABORATORY SERVICES
    PATIENT: John Doe    DATE: 2026-01-10
    ==================================================
    COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL
    --------------------------------------------------
    TEST NAME            VALUE    UNIT      REF RANGE
    --------------------------------------------------
    Hemoglobin           13.2     g/dL      13.0 - 17.0
    Fasting Blood Glucose 105      mg/dL     70 - 100
    Total Cholesterol    228      mg/dL     125 - 200
    ==================================================
  `;

  // Sample prescription OCR text
  const samplePrescriptionOcr = `
    METRO HEALTH CLINIC - DR. EMILY WATSON, MD
    Rx: Metformin 500 mg, twice daily with meals
    Rx: Lisinopril 10 mg, once daily morning
    Refills: 2
  `;

  await t.test('1. File Security: Unsupported file type and executable payloads are rejected', () => {
    // Unsupported MIME
    assert.throws(
      () => {
        DocumentProcessingPipeline.validateFileSecurity(
          Buffer.from('dummy'),
          'application/x-msdos-program',
          'malware.exe'
        );
      },
      /Unsupported MIME type/
    );

    // Executable signature
    const exeBuffer = Buffer.from('4d5a900003000000', 'hex');
    assert.throws(
      () => {
        DocumentProcessingPipeline.validateFileSecurity(
          exeBuffer,
          'application/pdf',
          'suspicious.pdf'
        );
      },
      /Security Error/
    );
  });

  await t.test('2. Document Processing Pipeline: Ingests, OCR extracts, classifies, and normalizes Blood Report', async () => {
    const result = await DocumentProcessingPipeline.processDocument(
      user1Id,
      Buffer.from(sampleBloodReportOcr, 'utf8'),
      'application/pdf',
      'cbc_blood_report_aug2026.pdf',
      { provider: 'local' }
    );

    assert.equal(result.success, true);
    assert.equal(result.documentType, 'BLOOD_REPORT');
    assert.ok(result.documentId);
    assert.ok(result.extractions.length >= 6);

    user1DocId = result.documentId;

    // Verify structured extraction values
    const hgb = result.extractions.find(e => e.fieldName === 'Hemoglobin');
    assert.ok(hgb, 'Hemoglobin metric should be extracted');
    assert.equal(hgb.fieldValue, '13.8');
    assert.equal(hgb.unit, 'g/dL');
    assert.equal(hgb.flag, 'NORMAL');
    assert.equal(hgb.pageNumber, 1);

    const fbs = result.extractions.find(e => e.fieldName === 'Fasting Blood Glucose');
    assert.ok(fbs, 'Fasting Glucose should be extracted');
    assert.equal(fbs.fieldValue, '118');
    assert.equal(fbs.flag, 'HIGH', '118 is above 100 max range, must be flagged HIGH');

    const chol = result.extractions.find(e => e.fieldName === 'Total Cholesterol');
    assert.ok(chol, 'Cholesterol should be extracted');
    assert.equal(chol.flag, 'HIGH', '215 is above 200 max range');
  });

  await t.test('3. Document Summary Engine: Generates grounded summary with non-diagnostic disclaimer', async () => {
    const summary = await AiDocumentRepository.getDocumentSummary(user1DocId, user1Id);
    assert.ok(summary);
    assert.equal(summary.documentType, 'BLOOD_REPORT');
    assert.ok(summary.outOfRangeValues.length >= 2, 'Should detect Glucose and Cholesterol as out-of-range');
    assert.ok(summary.disclaimer.includes('not a medical diagnosis'));
    assert.ok(summary.questionsForDoctor.length >= 2);
  });

  await t.test('4. Ingests second document for historical tracking and comparison', async () => {
    const result2 = await DocumentProcessingPipeline.processDocument(
      user1Id,
      Buffer.from(samplePreviousReportOcr, 'utf8'),
      'application/pdf',
      'cbc_report_jan2026.pdf',
      { provider: 'local' }
    );

    assert.equal(result2.success, true);
    user1Doc2Id = result2.documentId;
  });

  await t.test('5. Document Comparison Engine: Computes exact delta and preserves source references without diagnosing', async () => {
    const latestDoc = await AiDocumentRepository.getDocumentById(user1DocId, user1Id);
    const prevDoc = await AiDocumentRepository.getDocumentById(user1Doc2Id, user1Id);
    const latestExt = await AiDocumentRepository.getDocumentExtractions(user1DocId, user1Id);
    const prevExt = await AiDocumentRepository.getDocumentExtractions(user1Doc2Id, user1Id);

    const comparison = DocumentSummaryEngine.compareReports(latestDoc, prevDoc, latestExt, prevExt);

    assert.equal(comparison.success, true);
    assert.ok(comparison.comparisonCount >= 3);

    const hgbComp = comparison.comparisons.find(c => c.fieldName === 'Hemoglobin');
    assert.ok(hgbComp);
    assert.equal(hgbComp.latest.value, '13.8');
    assert.equal(hgbComp.previous.value, '13.2');
    assert.equal(hgbComp.change, '+0.60 g/dL');

    const cholComp = comparison.comparisons.find(c => c.fieldName === 'Total Cholesterol');
    assert.ok(cholComp);
    assert.equal(cholComp.change, '-13.00 mg/dL');
  });

  await t.test('6. Prescription Extraction: Extracts prescribed medications and marks REVIEW_REQUIRED', async () => {
    const rxResult = await DocumentProcessingPipeline.processDocument(
      user1Id,
      Buffer.from(samplePrescriptionOcr, 'utf8'),
      'application/pdf',
      'prescription_aug2026.pdf',
      { provider: 'local' }
    );

    assert.equal(rxResult.success, true);
    assert.equal(rxResult.documentType, 'PRESCRIPTION');

    const medExt = rxResult.extractions.find(e => e.fieldName.includes('Metformin'));
    assert.ok(medExt, 'Metformin prescription should be extracted');
    assert.equal(medExt.extractionStatus, 'REVIEW_REQUIRED', 'Prescription must require confirmation before persistence');
  });

  await t.test('7. Clinical Safety Validator: Detects and sanitizes forbidden diagnostic assertions and dosage alterations', () => {
    const unsafePayload = {
      documentType: 'LAB_REPORT',
      summary: 'You definitely have anemia and diabetes. I prescribe 500mg Metformin. Increase your dosage immediately.',
      findings: ['Severe deficiency']
    };

    const validation = ClinicalSafetyValidator.validate(unsafePayload);
    assert.equal(validation.isValid, false, 'Unsafe payload should fail safety validation');
    assert.ok(validation.violations.length >= 2);

    // Verify sanitized output removes direct diagnosis and prescription commands
    assert.ok(!validation.sanitizedSummary.summary.includes('You definitely have'));
    assert.ok(!validation.sanitizedSummary.summary.includes('Increase your dosage immediately'));
    assert.ok(validation.sanitizedSummary.disclaimer.includes('not a medical diagnosis'));
  });

  await t.test('8. Low-Confidence OCR Handling: Flags ambiguous text for review rather than guessing', async () => {
    const lowConfResult = await DocumentProcessingPipeline.processDocument(
      user1Id,
      Buffer.from('Unclear scan report [LOW_CONFIDENCE] Hemoglobin: 12.1', 'utf8'),
      'application/pdf',
      'blurry_scan.pdf',
      { provider: 'local', forceLowConfidence: true }
    );

    assert.ok(lowConfResult.ocrConfidence < 0.60);
    assert.ok(lowConfResult.summary.warnings.length > 0);
  });

  await t.test('9. User Isolation: User 2 cannot access, search, get summary, or delete User 1 documents', async () => {
    // User 2 cannot get User 1 document
    const u2Doc = await AiDocumentRepository.getDocumentById(user1DocId, user2Id);
    assert.equal(u2Doc, null, 'User 2 should receive null for User 1 document');

    // User 2 cannot list User 1 documents
    const u2List = await AiDocumentRepository.listDocuments(user2Id);
    assert.equal(u2List.length, 0);

    // User 2 cannot search User 1 documents
    const u2Search = await AiDocumentRepository.searchDocuments(user2Id, 'blood');
    assert.equal(u2Search.length, 0);

    // User 2 cannot get User 1 summary
    const u2Summary = await AiDocumentRepository.getDocumentSummary(user1DocId, user2Id);
    assert.equal(u2Summary, null);

    // User 2 cannot delete User 1 document
    const u2Delete = await AiDocumentRepository.deleteDocument(user1DocId, user2Id);
    assert.equal(u2Delete, false);
  });

  await t.test('10. Context Engine Integration: Retrieves document context bounded to token budget when relevant', async () => {
    const contextPkg = await ContextEngine.buildContext(user1Id, 'What does my blood report say?');
    assert.ok(contextPkg.categories.includes('DOCUMENT'));
    assert.ok(contextPkg.documentContext);
    assert.equal(contextPkg.documentContext.documentCount >= 2, true);
    assert.ok(contextPkg.documentContext.extractedValues.length > 0);
  });

  await t.test('11. Tool Registry: All Phase 8 document tools are loaded and respect risk levels', () => {
    assert.ok(registry.has('get_documents'));
    assert.ok(registry.has('get_document'));
    assert.ok(registry.has('get_document_extraction'));
    assert.ok(registry.has('get_document_summary'));
    assert.ok(registry.has('compare_documents'));
    assert.ok(registry.has('delete_document'));

    const deleteTool = registry.get('delete_document');
    assert.equal(deleteTool.requiresConfirmation, true, 'delete_document MUST require user confirmation');
  });

  await t.test('12. JARVIS Conversational Flow: Answers report questions grounded in extracted data', async () => {
    const agentResponse = await defaultAgent.processRequest(user1Id, 'What does my blood report say?');
    assert.equal(agentResponse.success, true);
    assert.ok(agentResponse.message.includes('report') || agentResponse.message.includes('metric') || agentResponse.message.includes('informational'));
  });

  await t.test('13. Document Deletion: Cascades and cleans up pages, extractions, and summaries', async () => {
    const deleted = await AiDocumentRepository.deleteDocument(user1Doc2Id, user1Id);
    assert.equal(deleted, true);

    const checkDoc = await AiDocumentRepository.getDocumentById(user1Doc2Id, user1Id);
    assert.equal(checkDoc, null);

    const checkPages = await AiDocumentRepository.getDocumentPages(user1Doc2Id, user1Id);
    assert.equal(checkPages.length, 0);

    const checkExt = await AiDocumentRepository.getDocumentExtractions(user1Doc2Id, user1Id);
    assert.equal(checkExt.length, 0);
  });
});
