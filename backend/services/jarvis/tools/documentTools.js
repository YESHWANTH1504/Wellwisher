const { AiDocumentRepository } = require('../../../repositories/ai/aiDocumentRepository');
const DocumentSummaryEngine = require('../vision/documentSummaryEngine');
const { RISK_LEVELS } = require('./toolRegistry');

const documentTools = [
  {
    name: 'get_documents',
    description: 'Retrieve a list of the user’s uploaded clinical and health documents.',
    category: 'document',
    permissionKey: 'get_documents',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        documentType: {
          type: 'string',
          enum: [
            'BLOOD_REPORT',
            'LAB_REPORT',
            'PRESCRIPTION',
            'MEDICATION_LABEL',
            'VITALS_REPORT',
            'DOCTOR_NOTE',
            'DISCHARGE_SUMMARY',
            'HEALTH_CERTIFICATE',
            'GENERAL_HEALTH_DOCUMENT',
            'GENERAL_DOCUMENT',
            'UNKNOWN'
          ],
          description: 'Optional document type filter'
        }
      }
    },
    execute: async (context, input = {}) => {
      const docs = await AiDocumentRepository.listDocuments(context.userId, {
        documentType: input.documentType
      });
      return {
        count: docs.length,
        documents: docs.map(d => ({
          id: d.id,
          documentType: d.documentType,
          originalFilename: d.originalFilename,
          status: d.processingStatus,
          uploadedAt: d.uploadedAt
        }))
      };
    }
  },
  {
    name: 'get_document',
    description: 'Retrieve details and status for a specific user document.',
    category: 'document',
    permissionKey: 'get_documents',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['documentId'],
      properties: {
        documentId: { type: 'string', description: 'Document ID' }
      }
    },
    execute: async (context, input) => {
      const doc = await AiDocumentRepository.getDocumentById(input.documentId, context.userId);
      if (!doc) {
        throw new Error(`Document with ID "${input.documentId}" was not found or access is denied.`);
      }
      return { document: doc };
    }
  },
  {
    name: 'get_document_extraction',
    description: 'Retrieve normalized structured clinical values and test ranges from a document.',
    category: 'document',
    permissionKey: 'get_documents',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['documentId'],
      properties: {
        documentId: { type: 'string', description: 'Document ID' }
      }
    },
    execute: async (context, input) => {
      const extractions = await AiDocumentRepository.getDocumentExtractions(input.documentId, context.userId);
      return {
        documentId: input.documentId,
        count: extractions.length,
        extractions: extractions.map(e => ({
          id: e.id,
          fieldName: e.fieldName,
          value: e.fieldValue,
          unit: e.unit,
          referenceRange: e.referenceRange,
          flag: e.flag,
          confidenceScore: e.confidenceScore,
          pageNumber: e.pageNumber,
          sourceText: e.sourceText
        }))
      };
    }
  },
  {
    name: 'get_document_summary',
    description: 'Retrieve plain-language structured non-diagnostic summary of an uploaded report.',
    category: 'document',
    permissionKey: 'get_documents',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['documentId'],
      properties: {
        documentId: { type: 'string', description: 'Document ID' }
      }
    },
    execute: async (context, input) => {
      const summary = await AiDocumentRepository.getDocumentSummary(input.documentId, context.userId);
      if (!summary) {
        throw new Error(`Summary for document "${input.documentId}" is not yet available or not found.`);
      }
      return {
        documentId: input.documentId,
        summary: summary.summary,
        keyFindings: summary.keyFindings,
        outOfRangeValues: summary.outOfRangeValues,
        questionsForDoctor: summary.questionsForDoctor,
        warnings: summary.warnings,
        disclaimer: summary.disclaimer
      };
    }
  },
  {
    name: 'search_documents',
    description: 'Search user documents by filename or document category.',
    category: 'document',
    permissionKey: 'get_documents',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search term or keyword' }
      }
    },
    execute: async (context, input) => {
      const results = await AiDocumentRepository.searchDocuments(context.userId, input.query);
      return {
        query: input.query,
        count: results.length,
        documents: results.map(d => ({
          id: d.id,
          documentType: d.documentType,
          originalFilename: d.originalFilename,
          status: d.processingStatus,
          uploadedAt: d.uploadedAt
        }))
      };
    }
  },
  {
    name: 'compare_documents',
    description: 'Compare test values and metrics across two user laboratory or blood reports.',
    category: 'document',
    permissionKey: 'get_documents',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      required: ['latestDocumentId', 'previousDocumentId'],
      properties: {
        latestDocumentId: { type: 'string', description: 'ID of latest document' },
        previousDocumentId: { type: 'string', description: 'ID of previous document' }
      }
    },
    execute: async (context, input) => {
      const latestDoc = await AiDocumentRepository.getDocumentById(input.latestDocumentId, context.userId);
      const prevDoc = await AiDocumentRepository.getDocumentById(input.previousDocumentId, context.userId);

      if (!latestDoc || !prevDoc) {
        throw new Error('One or both documents not found or access is denied.');
      }

      const latestExt = await AiDocumentRepository.getDocumentExtractions(input.latestDocumentId, context.userId);
      const prevExt = await AiDocumentRepository.getDocumentExtractions(input.previousDocumentId, context.userId);

      return DocumentSummaryEngine.compareReports(latestDoc, prevDoc, latestExt, prevExt);
    }
  },
  {
    name: 'delete_document',
    description: 'Permanently delete an uploaded document, its OCR data, extractions, and summaries. Requires user confirmation.',
    category: 'document',
    permissionKey: 'delete_document',
    riskLevel: RISK_LEVELS.HIGH,
    requiresConfirmation: true,
    inputSchema: {
      type: 'object',
      required: ['documentId'],
      properties: {
        documentId: { type: 'string', description: 'ID of document to delete' }
      }
    },
    execute: async (context, input) => {
      const doc = await AiDocumentRepository.getDocumentById(input.documentId, context.userId);
      if (!doc) {
        throw new Error(`Document "${input.documentId}" not found or already deleted.`);
      }

      const success = await AiDocumentRepository.deleteDocument(input.documentId, context.userId);
      return {
        success,
        deletedDocumentId: input.documentId,
        deletedFilename: doc.originalFilename,
        message: `Successfully deleted document "${doc.originalFilename}".`
      };
    }
  }
];

module.exports = documentTools;
