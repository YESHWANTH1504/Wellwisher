const VisionProvider = require('./visionProvider');
const LocalOCRProvider = require('./localOCRProvider');
const { GoogleGenAI } = require('@google/genai');

class GoogleVisionProvider extends VisionProvider {
  constructor(options = {}) {
    super();
    this.apiKey = options.apiKey || (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');
    this.modelName = options.modelName || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    this.localFallback = new LocalOCRProvider(options);
    this.aiClient = null;

    if (this.apiKey && !this.apiKey.includes('your_gemini_api_key')) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('GoogleVisionProvider: Gemini SDK init warning:', err.message);
      }
    }
  }

  /**
   * Extract text and structured metadata using Gemini Multi-Modal Vision
   */
  async extractText(fileBuffer, mimeType = 'application/pdf', options = {}) {
    if (!this.aiClient || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      // Fallback to local deterministic OCR extractor
      return this.localFallback.extractText(fileBuffer, mimeType, options);
    }

    try {
      const base64Data = fileBuffer.toString('base64');
      const response = await this.aiClient.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: 'Extract the full OCR text from this document accurately. Preserve table structures, test names, values, units, reference ranges, dates, and prescription details. Do not add diagnostic commentary.'
              }
            ]
          }
        ]
      });

      const extractedText = response.text || '';
      return {
        text: extractedText.trim(),
        pages: [
          {
            pageNumber: 1,
            text: extractedText.trim(),
            confidence: 0.95
          }
        ],
        confidence: 0.95,
        provider: 'GoogleVisionProvider',
        metadata: {
          mimeType,
          model: this.modelName
        }
      };
    } catch (err) {
      console.warn('GoogleVisionProvider extraction failed, using fallback:', err.message);
      return this.localFallback.extractText(fileBuffer, mimeType, options);
    }
  }

  async analyzeVisuals(fileBuffer, mimeType, prompt = '') {
    if (!this.aiClient) {
      return this.localFallback.analyzeVisuals(fileBuffer, mimeType, prompt);
    }
    return this.extractText(fileBuffer, mimeType);
  }
}

module.exports = GoogleVisionProvider;
