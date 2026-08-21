const VisionProvider = require('./visionProvider');

class LocalOCRProvider extends VisionProvider {
  constructor(options = {}) {
    super();
    this.defaultConfidence = options.defaultConfidence != null ? options.defaultConfidence : 0.95;
  }

  /**
   * Extract text from buffer or mock content
   */
  async extractText(fileBuffer, mimeType = 'application/pdf', options = {}) {
    let rawContent = '';
    if (Buffer.isBuffer(fileBuffer)) {
      rawContent = fileBuffer.toString('utf8');
    } else if (typeof fileBuffer === 'string') {
      rawContent = fileBuffer;
    }

    // Check if buffer contains forced mock OCR text in options or raw
    const text = options.mockOcrText || rawContent || 'Medical Report';
    const isLowConfidence = options.forceLowConfidence || text.includes('[LOW_CONFIDENCE]') || text.includes('unclear_scan');
    const confidence = isLowConfidence ? 0.45 : (options.confidence || this.defaultConfidence);

    // Split into simulated pages if page delimiters are found, or return single page
    const pageChunks = text.split(/--- PAGE \d+ ---|\f/);
    const pages = pageChunks.filter(c => c.trim().length > 0).map((chunk, idx) => ({
      pageNumber: idx + 1,
      text: chunk.trim(),
      confidence: isLowConfidence ? 0.45 : confidence
    }));

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        text: text.trim(),
        confidence
      });
    }

    return {
      text: text.trim(),
      pages,
      confidence,
      provider: 'LocalOCRProvider',
      metadata: {
        pageCount: pages.length,
        mimeType,
        isLowConfidence
      }
    };
  }

  /**
   * Visual analysis stub for LocalOCRProvider
   */
  async analyzeVisuals(fileBuffer, mimeType, prompt = '') {
    const extracted = await this.extractText(fileBuffer, mimeType);
    return {
      success: true,
      text: extracted.text,
      confidence: extracted.confidence
    };
  }
}

module.exports = LocalOCRProvider;
