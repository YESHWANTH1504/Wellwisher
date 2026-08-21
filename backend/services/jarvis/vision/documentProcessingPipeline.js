const VisionProviderFactory = require('./visionProviderFactory');
const ClinicalReportNormalizer = require('./clinicalReportNormalizer');
const DocumentSummaryEngine = require('./documentSummaryEngine');
const { ClinicalSafetyValidator } = require('./clinicalSafetyValidator');
const { AiDocumentRepository } = require('../../../repositories/ai/aiDocumentRepository');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

class DocumentProcessingPipeline {
  /**
   * Validate uploaded file metadata and binary signature
   */
  static validateFileSecurity(fileBuffer, mimeType, originalFilename = '') {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file payload: Expected binary buffer.');
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`);
    }

    const cleanMime = (mimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(cleanMime)) {
      throw new Error(`Unsupported MIME type: "${mimeType}". Allowed formats: PDF, PNG, JPG, JPEG, WEBP.`);
    }

    const extMatch = /\.(pdf|png|jpg|jpeg|webp)$/i.test(originalFilename);
    if (!extMatch && originalFilename) {
      throw new Error(`Invalid file extension for "${originalFilename}".`);
    }

    // Reject executable and script signatures
    const headerHex = fileBuffer.slice(0, 8).toString('hex');
    if (
      headerHex.startsWith('4d5a') || // DOS/PE EXE
      headerHex.startsWith('7f454c46') || // ELF
      headerHex.startsWith('cafebabe') || // Java / Mach-O
      headerHex.startsWith('3c21444f') // HTML/Script injection
    ) {
      throw new Error('Security Error: Uploaded file contains forbidden binary or executable signature.');
    }

    return true;
  }

  /**
   * Execute full end-to-end document understanding pipeline
   */
  static async processDocument(userId, fileBuffer, mimeType, originalFilename = '', options = {}) {
    if (!userId) throw new Error('userId is required for document processing.');

    const startTime = Date.now();

    // 1. File Security Verification
    this.validateFileSecurity(fileBuffer, mimeType, originalFilename);

    // 2. OCR / Multi-Modal Vision Extraction
    const provider = VisionProviderFactory.getProvider(options.provider, options);
    const ocrResult = await provider.extractText(fileBuffer, mimeType, options);

    // 3. Document Type Classification
    const classification = ClinicalReportNormalizer.classifyDocument(ocrResult.text, originalFilename);
    const documentType = classification.documentType;

    // 4. Structured Clinical Metric Extraction
    const rawExtractions = ClinicalReportNormalizer.extractStructuredValues(
      ocrResult.pages,
      options.documentId || null,
      ocrResult.confidence
    );

    // 5. Generate Grounded Summary
    const initialSummary = DocumentSummaryEngine.generateSummary(documentType, rawExtractions, {
      originalFilename,
      pageCount: ocrResult.pages?.length || 1
    });

    // 6. Clinical Safety & Medical Claim Validation
    const safetyResult = ClinicalSafetyValidator.validate(initialSummary);
    const safeSummary = safetyResult.sanitizedSummary;

    // 7. Persist Document, Pages, Extractions & Summary if requested (Default: true)
    let documentRecord = null;
    let savedPages = [];
    let savedExtractions = [];
    let savedSummary = null;

    if (options.persist !== false) {
      // Create or update Document record
      if (options.documentId) {
        documentRecord = await AiDocumentRepository.getDocumentById(options.documentId, userId);
        if (documentRecord) {
          await AiDocumentRepository.updateDocumentStatus(options.documentId, userId, {
            status: safetyResult.isValid ? 'PROCESSED' : 'REVIEW_REQUIRED',
            documentType,
            processedAt: new Date().toISOString(),
            metadata: {
              processingTimeMs: Date.now() - startTime,
              extractionCount: rawExtractions.length,
              safetyChecked: true
            }
          });
        }
      }

      if (!documentRecord) {
        documentRecord = await AiDocumentRepository.createDocument(userId, {
          id: options.documentId,
          documentType,
          originalFilename: originalFilename || 'uploaded_document',
          mimeType,
          fileSize: fileBuffer.length,
          status: safetyResult.isValid ? 'PROCESSED' : 'REVIEW_REQUIRED',
          metadata: {
            processingTimeMs: Date.now() - startTime,
            extractionCount: rawExtractions.length,
            safetyChecked: true
          }
        });
      }

      const docId = documentRecord.id;

      // Save OCR Pages
      savedPages = await AiDocumentRepository.saveDocumentPages(userId, docId, ocrResult.pages);

      // Save Extractions with updated documentId
      const preparedExtractions = rawExtractions.map(e => ({
        ...e,
        documentId: docId
      }));
      savedExtractions = await AiDocumentRepository.saveExtractions(userId, docId, preparedExtractions);

      // Save Summary
      savedSummary = await AiDocumentRepository.saveDocumentSummary(userId, docId, safeSummary);
    }

    return {
      success: true,
      documentId: documentRecord ? documentRecord.id : (options.documentId || 'temp_doc'),
      documentType,
      classificationConfidence: classification.confidence,
      ocrConfidence: ocrResult.confidence,
      processingTimeMs: Date.now() - startTime,
      pages: savedPages.length > 0 ? savedPages : ocrResult.pages,
      extractions: savedExtractions.length > 0 ? savedExtractions : rawExtractions,
      summary: savedSummary || safeSummary,
      safety: {
        isValid: safetyResult.isValid,
        warnings: safeSummary.warnings
      }
    };
  }
}

module.exports = DocumentProcessingPipeline;
