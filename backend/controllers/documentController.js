const { AiDocumentRepository } = require('../repositories/ai/aiDocumentRepository');
const DocumentProcessingPipeline = require('../services/jarvis/vision/documentProcessingPipeline');
const DocumentSummaryEngine = require('../services/jarvis/vision/documentSummaryEngine');

class DocumentController {
  /**
   * Upload and process a new document
   * POST /api/ai/documents/upload
   */
  static async uploadDocument(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      let fileBuffer = null;
      let mimeType = 'application/pdf';
      let originalFilename = 'uploaded_document.pdf';

      if (req.file) {
        fileBuffer = req.file.buffer;
        mimeType = req.file.mimetype;
        originalFilename = req.file.originalname;
      } else if (req.body?.fileBase64) {
        fileBuffer = Buffer.from(req.body.fileBase64, 'base64');
        mimeType = req.body.mimeType || 'application/pdf';
        originalFilename = req.body.originalFilename || 'document.pdf';
      } else if (req.body?.ocrText) {
        // Direct OCR text payload for simulated / text uploads
        fileBuffer = Buffer.from(req.body.ocrText, 'utf8');
        mimeType = req.body.mimeType || 'application/pdf';
        originalFilename = req.body.originalFilename || 'report.pdf';
      } else {
        return res.status(400).json({
          success: false,
          errorCode: 'MISSING_FILE',
          message: 'No file or document content was provided.'
        });
      }

      const result = await DocumentProcessingPipeline.processDocument(
        req.userId,
        fileBuffer,
        mimeType,
        originalFilename,
        {
          provider: req.body?.provider,
          mockOcrText: req.body?.ocrText,
          forceLowConfidence: req.body?.forceLowConfidence === true
        }
      );

      return res.status(201).json({
        success: true,
        message: 'Document uploaded and analyzed successfully.',
        data: result
      });
    } catch (err) {
      console.error('Document upload error:', err.message);
      return res.status(400).json({
        success: false,
        errorCode: 'PROCESSING_ERROR',
        message: err.message || 'Failed to upload and process document.'
      });
    }
  }

  /**
   * List all user documents
   * GET /api/ai/documents
   */
  static async listDocuments(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { documentType } = req.query;
      const docs = await AiDocumentRepository.listDocuments(req.userId, { documentType });

      return res.json({
        success: true,
        count: docs.length,
        data: docs
      });
    } catch (err) {
      console.error('List documents error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to retrieve documents.'
      });
    }
  }

  /**
   * Search user documents
   * GET /api/ai/documents/search
   */
  static async searchDocuments(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { query } = req.query;
      const results = await AiDocumentRepository.searchDocuments(req.userId, query || '');

      return res.json({
        success: true,
        query: query || '',
        count: results.length,
        data: results
      });
    } catch (err) {
      console.error('Search documents error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to search documents.'
      });
    }
  }

  /**
   * Get single document metadata
   * GET /api/ai/documents/:id
   */
  static async getDocument(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const doc = await AiDocumentRepository.getDocumentById(req.params.id, req.userId);
      if (!doc) {
        return res.status(404).json({
          success: false,
          errorCode: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found or access denied.'
        });
      }

      return res.json({
        success: true,
        data: doc
      });
    } catch (err) {
      console.error('Get document error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to retrieve document.'
      });
    }
  }

  /**
   * Get document structured summary
   * GET /api/ai/documents/:id/summary
   */
  static async getDocumentSummary(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const summary = await AiDocumentRepository.getDocumentSummary(req.params.id, req.userId);
      if (!summary) {
        return res.status(404).json({
          success: false,
          errorCode: 'SUMMARY_NOT_FOUND',
          message: 'Document summary not found or document still processing.'
        });
      }

      return res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      console.error('Get summary error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to retrieve document summary.'
      });
    }
  }

  /**
   * Get document extracted metrics and values
   * GET /api/ai/documents/:id/extraction
   */
  static async getDocumentExtraction(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const doc = await AiDocumentRepository.getDocumentById(req.params.id, req.userId);
      if (!doc) {
        return res.status(404).json({
          success: false,
          errorCode: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found or access denied.'
        });
      }

      const extractions = await AiDocumentRepository.getDocumentExtractions(req.params.id, req.userId);
      const pages = await AiDocumentRepository.getDocumentPages(req.params.id, req.userId);

      return res.json({
        success: true,
        documentId: req.params.id,
        count: extractions.length,
        data: {
          document: doc,
          extractions,
          pages
        }
      });
    } catch (err) {
      console.error('Get extraction error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to retrieve document extraction.'
      });
    }
  }

  /**
   * Reprocess existing document
   * POST /api/ai/documents/:id/process
   */
  static async processExistingDocument(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const doc = await AiDocumentRepository.getDocumentById(req.params.id, req.userId);
      if (!doc) {
        return res.status(404).json({
          success: false,
          errorCode: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found or access denied.'
        });
      }

      const pages = await AiDocumentRepository.getDocumentPages(req.params.id, req.userId);
      const combinedText = pages.map(p => p.ocrText).join('\n\n') || doc.originalFilename;

      const result = await DocumentProcessingPipeline.processDocument(
        req.userId,
        Buffer.from(combinedText, 'utf8'),
        doc.mimeType,
        doc.originalFilename,
        {
          documentId: doc.id,
          provider: req.body?.provider
        }
      );

      return res.json({
        success: true,
        message: 'Document reprocessed successfully.',
        data: result
      });
    } catch (err) {
      console.error('Process document error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to reprocess document.'
      });
    }
  }

  /**
   * Compare two documents
   * POST /api/ai/documents/compare
   */
  static async compareDocuments(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { latestDocumentId, previousDocumentId } = req.body || {};
      if (!latestDocumentId || !previousDocumentId) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_INPUT',
          message: 'latestDocumentId and previousDocumentId are required for comparison.'
        });
      }

      const latestDoc = await AiDocumentRepository.getDocumentById(latestDocumentId, req.userId);
      const prevDoc = await AiDocumentRepository.getDocumentById(previousDocumentId, req.userId);

      if (!latestDoc || !prevDoc) {
        return res.status(404).json({
          success: false,
          errorCode: 'DOCUMENT_NOT_FOUND',
          message: 'One or both documents not found or access is denied.'
        });
      }

      const latestExt = await AiDocumentRepository.getDocumentExtractions(latestDocumentId, req.userId);
      const prevExt = await AiDocumentRepository.getDocumentExtractions(previousDocumentId, req.userId);

      const comparison = DocumentSummaryEngine.compareReports(latestDoc, prevDoc, latestExt, prevExt);

      return res.json({
        success: true,
        data: comparison
      });
    } catch (err) {
      console.error('Compare documents error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to compare documents.'
      });
    }
  }

  /**
   * Confirm or update extraction status
   * POST /api/ai/documents/:id/confirm
   */
  static async confirmExtraction(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const { extractionId, status } = req.body || {};
      if (!extractionId) {
        return res.status(400).json({
          success: false,
          message: 'extractionId is required.'
        });
      }

      const updated = await AiDocumentRepository.updateExtractionStatus(
        extractionId,
        req.userId,
        status || 'CONFIRMED'
      );

      return res.json({
        success: updated,
        message: updated ? 'Extraction status updated.' : 'Failed to update extraction.'
      });
    } catch (err) {
      console.error('Confirm extraction error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to confirm extraction.'
      });
    }
  }

  /**
   * Delete single document and dependent data
   * DELETE /api/ai/documents/:id
   */
  static async deleteDocument(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const doc = await AiDocumentRepository.getDocumentById(req.params.id, req.userId);
      if (!doc) {
        return res.status(404).json({
          success: false,
          errorCode: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found or already deleted.'
        });
      }

      const deleted = await AiDocumentRepository.deleteDocument(req.params.id, req.userId);

      return res.json({
        success: deleted,
        message: deleted ? 'Document and all associated clinical records permanently deleted.' : 'Deletion failed.'
      });
    } catch (err) {
      console.error('Delete document error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to delete document.'
      });
    }
  }

  /**
   * Clear all documents for user
   * POST /api/ai/documents/clear
   */
  static async clearAllDocuments(req, res) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const count = await AiDocumentRepository.clearAllDocuments(req.userId);

      return res.json({
        success: true,
        deletedCount: count,
        message: 'All uploaded documents and extracted medical records cleared successfully.'
      });
    } catch (err) {
      console.error('Clear documents error:', err.message);
      return res.status(500).json({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to clear documents.'
      });
    }
  }
}

module.exports = DocumentController;
