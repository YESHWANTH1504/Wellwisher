/**
 * Abstract Base Class for Vision and OCR Providers
 */
class VisionProvider {
  /**
   * Process a document buffer and extract text, pages, confidence, and metadata
   * @param {Buffer} fileBuffer 
   * @param {string} mimeType 
   * @param {object} options 
   * @returns {Promise<{ text: string, pages: Array<{ pageNumber: number, text: string, confidence: number }>, confidence: number, raw: any }>}
   */
  async extractText(fileBuffer, mimeType, options = {}) {
    throw new Error('extractText() must be implemented by concrete VisionProvider subclass');
  }

  /**
   * Optional multi-modal structured analysis
   * @param {Buffer} fileBuffer
   * @param {string} mimeType
   * @param {string} prompt
   * @returns {Promise<any>}
   */
  async analyzeVisuals(fileBuffer, mimeType, prompt = '') {
    throw new Error('analyzeVisuals() must be implemented by concrete VisionProvider subclass');
  }
}

module.exports = VisionProvider;
