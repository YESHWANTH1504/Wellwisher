const LocalOCRProvider = require('./localOCRProvider');
const GoogleVisionProvider = require('./googleVisionProvider');

class VisionProviderFactory {
  static getProvider(providerName = process.env.VISION_OCR_PROVIDER, options = {}) {
    const selected = (providerName || '').toLowerCase().trim();

    if (selected === 'google' || selected === 'gemini' || selected === 'cloud') {
      return new GoogleVisionProvider(options);
    }

    // Default to Local OCR Provider
    return new LocalOCRProvider(options);
  }
}

module.exports = VisionProviderFactory;
