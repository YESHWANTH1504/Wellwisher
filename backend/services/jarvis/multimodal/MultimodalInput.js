/**
 * MultimodalInput
 * Unified input object for all Phase 6 multimodal interactions.
 * Supported input types:
 * - CAMERA_IMAGE
 * - GALLERY_IMAGE
 * - SCREENSHOT
 * - DOCUMENT_IMAGE
 * - PDF
 * - CAMERA_FRAME
 * - SCREEN_CONTEXT
 */

const INPUT_TYPES = Object.freeze({
  CAMERA_IMAGE: 'CAMERA_IMAGE',
  GALLERY_IMAGE: 'GALLERY_IMAGE',
  SCREENSHOT: 'SCREENSHOT',
  DOCUMENT_IMAGE: 'DOCUMENT_IMAGE',
  PDF: 'PDF',
  CAMERA_FRAME: 'CAMERA_FRAME',
  SCREEN_CONTEXT: 'SCREEN_CONTEXT'
});

const PRIVACY_CLASSIFICATION = Object.freeze({
  PUBLIC: 'PUBLIC',
  PRIVATE_PERSONAL: 'PRIVATE_PERSONAL',
  SENSITIVE_HEALTH: 'SENSITIVE_HEALTH',
  SENSITIVE_CREDENTIAL: 'SENSITIVE_CREDENTIAL',
  CONFIDENTIAL_DOCUMENT: 'CONFIDENTIAL_DOCUMENT'
});

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB max

class MultimodalInput {
  constructor(params = {}) {
    this.type = params.type || INPUT_TYPES.CAMERA_IMAGE;
    this.source = params.source || 'CAMERA';
    this.mimeType = params.mimeType || 'image/jpeg';
    this.bytes = params.bytes || null; // Buffer
    const rawData = params.data || params.base64;
    this.base64 = rawData || (Buffer.isBuffer(params.bytes) ? params.bytes.toString('base64') : null);
    this.timestamp = params.timestamp || Date.now();
    this.userId = params.userId || null;
    this.sessionId = params.sessionId || null;
    this.metadata = params.metadata || {};
    this.privacyClassification = params.privacyClassification || PRIVACY_CLASSIFICATION.PRIVATE_PERSONAL;
    this.prompt = params.prompt || '';
    this.extractedText = params.extractedText || null;
    this.observations = params.observations || [];
  }

  /**
   * Validate size and MIME limits
   */
  validate() {
    if (!this.bytes && !this.base64) {
      throw new Error('MultimodalInput must contain raw bytes or base64 data.');
    }

    const dataLength = this.bytes ? this.bytes.length : Math.ceil(this.base64.length * 0.75);
    if (dataLength > MAX_IMAGE_BYTES) {
      throw new Error(`Multimodal payload size (${dataLength} bytes) exceeds maximum allowed limit of ${MAX_IMAGE_BYTES} bytes.`);
    }

    const allowedMime = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
      'image/heic'
    ];

    if (!allowedMime.includes(this.mimeType.toLowerCase())) {
      throw new Error(`Unsupported multimodal MIME type: ${this.mimeType}`);
    }

    return { valid: true, sizeBytes: dataLength, mimeType: this.mimeType };
  }

  /**
   * Return clean base64 representation
   */
  getBase64() {
    if (this.base64) return this.base64;
    if (this.bytes && Buffer.isBuffer(this.bytes)) {
      this.base64 = this.bytes.toString('base64');
      return this.base64;
    }
    return '';
  }

  /**
   * Sanitize for logging (strip raw binary/base64 to avoid leaking private photos in logs)
   */
  toSafeLog() {
    return {
      type: this.type,
      source: this.source,
      mimeType: this.mimeType,
      dataSizeBytes: this.bytes ? this.bytes.length : (this.base64 ? this.base64.length : 0),
      timestamp: this.timestamp,
      userId: this.userId,
      sessionId: this.sessionId,
      privacyClassification: this.privacyClassification
    };
  }

  toLogObject() {
    return this.toSafeLog();
  }
}

module.exports = {
  MultimodalInput,
  INPUT_TYPES,
  MULTIMODAL_INPUT_TYPES: INPUT_TYPES,
  PRIVACY_CLASSIFICATION,
  MAX_IMAGE_BYTES
};
