const pool = require('../../config/db');

const VALID_DOCUMENT_TYPES = [
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
];

const VALID_PROCESSING_STATUSES = [
  'UPLOADED',
  'PROCESSING',
  'EXTRACTED',
  'REVIEW_REQUIRED',
  'CONFIRMED',
  'PROCESSED',
  'FAILED',
  'DELETED',
  'EXPIRED'
];

class AiDocumentRepository {
  /**
   * Create a new document record
   */
  static async createDocument(userId, data = {}) {
    if (!userId) throw new Error('userId is required to create document');
    const id = data.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const documentType = VALID_DOCUMENT_TYPES.includes(data.documentType) ? data.documentType : 'UNKNOWN';
    const status = VALID_PROCESSING_STATUSES.includes(data.status) ? data.status : 'UPLOADED';
    const metadata = JSON.stringify(data.metadata || {});

    const sql = `
      INSERT INTO ai_documents
        (id, user_id, document_type, original_filename, mime_type, file_size, storage_reference, processing_status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      id,
      userId,
      documentType,
      data.originalFilename || 'document',
      data.mimeType || 'application/octet-stream',
      data.fileSize || 0,
      data.storageReference || id,
      status,
      metadata
    ]);

    return this.getDocumentById(id, userId);
  }

  /**
   * Fetch single document by ID with user isolation
   */
  static async getDocumentById(id, userId, includeDeleted = false) {
    if (!id || !userId) return null;
    const sql = includeDeleted
      ? `SELECT * FROM ai_documents WHERE id = ? AND user_id = ?`
      : `SELECT * FROM ai_documents WHERE id = ? AND user_id = ? AND processing_status != 'DELETED'`;

    const [rows] = await pool.query(sql, [id, userId]);
    if (!rows || rows.length === 0) return null;
    return this._normalizeDocument(rows[0]);
  }

  /**
   * List documents for user with optional filtering
   */
  static async listDocuments(userId, options = {}) {
    if (!userId) return [];
    let sql = `SELECT * FROM ai_documents WHERE user_id = ? AND processing_status != 'DELETED'`;
    const params = [userId];

    if (options.documentType && VALID_DOCUMENT_TYPES.includes(options.documentType)) {
      sql = `SELECT * FROM ai_documents WHERE user_id = ? AND document_type = ? AND processing_status != 'DELETED'`;
      params.push(options.documentType);
    }

    const [rows] = await pool.query(sql, params);
    return (rows || []).map(r => this._normalizeDocument(r));
  }

  /**
   * Search documents by query string
   */
  static async searchDocuments(userId, query = '') {
    if (!userId) return [];
    const cleanQuery = `%${(query || '').trim()}%`;
    const sql = `SELECT * FROM ai_documents WHERE user_id = ? AND (original_filename LIKE ? OR document_type LIKE ?) AND processing_status != 'DELETED'`;
    const [rows] = await pool.query(sql, [userId, cleanQuery, cleanQuery]);
    return (rows || []).map(r => this._normalizeDocument(r));
  }

  /**
   * Update document status, type, and processing metadata
   */
  static async updateDocumentStatus(id, userId, updateData = {}) {
    if (!id || !userId) return false;
    const status = updateData.status || 'PROCESSED';
    const docType = updateData.documentType || 'UNKNOWN';
    const processedAt = updateData.processedAt || new Date().toISOString();
    const metadata = JSON.stringify(updateData.metadata || {});

    const sql = `
      UPDATE ai_documents
      SET processing_status = ?, document_type = ?, processed_at = ?, metadata = ?
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.query(sql, [status, docType, processedAt, metadata, id, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete single document and cascade delete dependent records
   */
  static async deleteDocument(id, userId) {
    if (!id || !userId) return false;

    // Cascade delete dependent entities
    await pool.query(`DELETE FROM ai_document_summaries WHERE document_id = ? AND user_id = ?`, [id, userId]);
    await pool.query(`DELETE FROM ai_document_extractions WHERE document_id = ? AND user_id = ?`, [id, userId]);
    await pool.query(`DELETE FROM ai_document_pages WHERE document_id = ? AND user_id = ?`, [id, userId]);

    // Delete or mark document
    const [res] = await pool.query(`DELETE FROM ai_documents WHERE id = ? AND user_id = ?`, [id, userId]);
    return res.affectedRows > 0;
  }

  /**
   * Clear all documents and dependent records for user
   */
  static async clearAllDocuments(userId) {
    if (!userId) return 0;
    await pool.query(`DELETE FROM ai_document_summaries WHERE user_id = ?`, [userId]);
    await pool.query(`DELETE FROM ai_document_extractions WHERE user_id = ?`, [userId]);
    await pool.query(`DELETE FROM ai_document_pages WHERE user_id = ?`, [userId]);
    const [res] = await pool.query(`DELETE FROM ai_documents WHERE user_id = ?`, [userId]);
    return res.affectedRows || 0;
  }

  /**
   * Save OCR page records
   */
  static async saveDocumentPages(userId, documentId, pages = []) {
    if (!userId || !documentId || !Array.isArray(pages)) return [];
    const saved = [];

    for (const p of pages) {
      const pageId = p.id || `doc_p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const pageNum = p.pageNumber || 1;
      const text = p.ocrText || p.text || '';
      const conf = p.confidenceScore != null ? p.confidenceScore : 1.0;
      const meta = JSON.stringify(p.metadata || {});

      await pool.query(
        `INSERT INTO ai_document_pages (id, document_id, user_id, page_number, ocr_text, confidence_score, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pageId, documentId, userId, pageNum, text, conf, meta]
      );

      saved.push({
        id: pageId,
        documentId,
        userId,
        pageNumber: pageNum,
        ocrText: text,
        confidenceScore: conf
      });
    }

    return saved;
  }

  /**
   * Get OCR pages for document
   */
  static async getDocumentPages(documentId, userId) {
    if (!documentId || !userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM ai_document_pages WHERE document_id = ? AND user_id = ?`,
      [documentId, userId]
    );
    return (rows || []).map(r => ({
      id: r.id,
      documentId: r.document_id,
      userId: r.user_id,
      pageNumber: r.page_number,
      ocrText: r.ocr_text,
      confidenceScore: Number(r.confidence_score || 0),
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {}
    }));
  }

  /**
   * Save structured extractions
   */
  static async saveExtractions(userId, documentId, extractions = []) {
    if (!userId || !documentId || !Array.isArray(extractions)) return [];
    const saved = [];

    for (const e of extractions) {
      const id = e.id || `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fieldName = e.fieldName || e.testName || 'Unknown Metric';
      const fieldValue = String(e.fieldValue !== undefined ? e.fieldValue : e.value || '');
      const normValue = e.normalizedValue || fieldValue;
      const unit = e.unit || null;
      const refRange = e.referenceRange || null;
      const flag = e.flag || 'NORMAL';
      const category = e.category || 'General';
      const conf = e.confidenceScore != null ? e.confidenceScore : (e.confidence || 0.90);
      const pageNum = e.pageNumber || e.sourcePage || 1;
      const srcText = e.sourceText || null;
      const status = e.extractionStatus || 'EXTRACTED';
      const observedAt = e.observedAt || new Date().toISOString();
      const meta = JSON.stringify(e.metadata || {});

      await pool.query(
        `INSERT INTO ai_document_extractions
          (id, document_id, user_id, field_name, field_value, normalized_value, unit, reference_range, flag, category, confidence_score, page_number, source_text, extraction_status, observed_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, documentId, userId, fieldName, fieldValue, normValue, unit, refRange, flag, category, conf, pageNum, srcText, status, observedAt, meta]
      );

      saved.push({
        id,
        documentId,
        userId,
        fieldName,
        fieldValue,
        normalizedValue: normValue,
        unit,
        referenceRange: refRange,
        flag,
        category,
        confidenceScore: conf,
        pageNumber: pageNum,
        sourceText: srcText,
        extractionStatus: status,
        observedAt
      });
    }

    return saved;
  }

  /**
   * Get extractions for a specific document
   */
  static async getDocumentExtractions(documentId, userId) {
    if (!documentId || !userId) return [];
    const [rows] = await pool.query(
      `SELECT * FROM ai_document_extractions WHERE document_id = ? AND user_id = ?`,
      [documentId, userId]
    );
    return (rows || []).map(r => this._normalizeExtraction(r));
  }

  /**
   * Get all extractions for user (e.g. historical values across reports)
   */
  static async getUserExtractions(userId, options = {}) {
    if (!userId) return [];
    let sql = `SELECT * FROM ai_document_extractions WHERE user_id = ?`;
    const params = [userId];

    if (options.fieldName) {
      sql = `SELECT * FROM ai_document_extractions WHERE user_id = ? AND field_name = ?`;
      params.push(options.fieldName);
    }

    const [rows] = await pool.query(sql, params);
    return (rows || []).map(r => this._normalizeExtraction(r));
  }

  /**
   * Update extraction status (e.g. CONFIRMED, REJECTED)
   */
  static async updateExtractionStatus(id, userId, status = 'CONFIRMED') {
    if (!id || !userId) return false;
    const [res] = await pool.query(
      `UPDATE ai_document_extractions SET extraction_status = ? WHERE id = ? AND user_id = ?`,
      [status, id, userId]
    );
    return res.affectedRows > 0;
  }

  /**
   * Save or update structured summary
   */
  static async saveDocumentSummary(userId, documentId, summaryData = {}) {
    if (!userId || !documentId) return null;
    const id = summaryData.id || `sum_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const summaryText = summaryData.summary || 'Summary unavailable.';
    const keyFindings = JSON.stringify(summaryData.keyFindings || []);
    const outOfRange = JSON.stringify(summaryData.outOfRangeValues || []);
    const uncertain = JSON.stringify(summaryData.uncertainValues || []);
    const questions = JSON.stringify(summaryData.questionsForDoctor || []);
    const warnings = JSON.stringify(summaryData.warnings || []);
    const conf = summaryData.confidence != null ? summaryData.confidence : 0.90;
    const disclaimer = summaryData.disclaimer || 'This is an informational summary and not a medical diagnosis.';

    await pool.query(
      `INSERT INTO ai_document_summaries
        (id, document_id, user_id, summary, key_findings, out_of_range_values, uncertain_values, questions_for_doctor, warnings, confidence, disclaimer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, documentId, userId, summaryText, keyFindings, outOfRange, uncertain, questions, warnings, conf, disclaimer]
    );

    return this.getDocumentSummary(documentId, userId);
  }

  /**
   * Get document summary
   */
  static async getDocumentSummary(documentId, userId) {
    if (!documentId || !userId) return null;
    const [rows] = await pool.query(
      `SELECT * FROM ai_document_summaries WHERE document_id = ? AND user_id = ?`,
      [documentId, userId]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    const doc = await this.getDocumentById(documentId, userId);
    return {
      id: r.id,
      documentId: r.document_id,
      userId: r.user_id,
      documentType: doc?.documentType || 'UNKNOWN',
      summary: r.summary,
      keyFindings: typeof r.key_findings === 'string' ? JSON.parse(r.key_findings) : r.key_findings || [],
      outOfRangeValues: typeof r.out_of_range_values === 'string' ? JSON.parse(r.out_of_range_values) : r.out_of_range_values || [],
      uncertainValues: typeof r.uncertain_values === 'string' ? JSON.parse(r.uncertain_values) : r.uncertain_values || [],
      questionsForDoctor: typeof r.questions_for_doctor === 'string' ? JSON.parse(r.questions_for_doctor) : r.questions_for_doctor || [],
      warnings: typeof r.warnings === 'string' ? JSON.parse(r.warnings) : r.warnings || [],
      confidence: Number(r.confidence || 0.90),
      disclaimer: r.disclaimer,
      generatedAt: r.generated_at
    };
  }

  static _normalizeDocument(row) {
    return {
      id: row.id,
      userId: row.user_id,
      documentType: row.document_type,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      storageReference: row.storage_reference,
      processingStatus: row.processing_status,
      uploadedAt: row.uploaded_at,
      processedAt: row.processed_at,
      expiresAt: row.expires_at,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static _normalizeExtraction(row) {
    return {
      id: row.id,
      documentId: row.document_id,
      userId: row.user_id,
      fieldName: row.field_name,
      fieldValue: row.field_value,
      normalizedValue: row.normalized_value,
      unit: row.unit,
      referenceRange: row.reference_range,
      flag: row.flag,
      category: row.category,
      confidenceScore: Number(row.confidence_score || 0),
      pageNumber: row.page_number,
      sourceText: row.source_text,
      extractionStatus: row.extraction_status,
      observedAt: row.observed_at,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = {
  AiDocumentRepository,
  VALID_DOCUMENT_TYPES,
  VALID_PROCESSING_STATUSES
};
