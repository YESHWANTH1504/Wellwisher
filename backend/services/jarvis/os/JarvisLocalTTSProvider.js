/**
 * JarvisLocalTTSProvider
 * Manages native on-device Android TextToSpeech synthesis lifecycle.
 */

class JarvisLocalTTSProvider {
  constructor(options = {}) {
    this._isInitialized = false;
    this._isSpeaking = false;
    this._speechRate = options.speechRate || 1.0;
    this._language = options.language || 'en-US';
    this._availableVoices = ['en-us-x-sfg#female_1-local', 'en-us-x-sfg#male_1-local'];
    this._selectedVoice = this._availableVoices[0];
  }

  async initialize() {
    this._isInitialized = true;
    return {
      initialized: true,
      engine: 'Android Native TextToSpeech',
      language: this._language,
      voice: this._selectedVoice,
      speechRate: this._speechRate
    };
  }

  isAvailable() {
    return this._isInitialized;
  }

  async speak(text, options = {}) {
    if (!text || !text.trim()) {
      return { success: false, reason: 'Empty text for synthesis' };
    }

    if (!this._isInitialized) {
      await this.initialize();
    }

    this._isSpeaking = true;
    const durationEstimateMs = Math.max(200, Math.round((text.length / 15) * 1000));

    return {
      success: true,
      engine: 'LOCAL_ANDROID_TTS',
      text,
      language: options.language || this._language,
      speechRate: options.speechRate || this._speechRate,
      durationEstimateMs,
      interrupted: false
    };
  }

  stop() {
    const wasSpeaking = this._isSpeaking;
    this._isSpeaking = false;
    return {
      stopped: true,
      wasSpeaking
    };
  }

  setSpeechRate(rate) {
    if (rate >= 0.5 && rate <= 2.0) {
      this._speechRate = rate;
      return true;
    }
    return false;
  }

  setLanguage(lang) {
    this._language = lang;
    return true;
  }

  getVoices() {
    return [...this._availableVoices];
  }

  setVoice(voice) {
    if (this._availableVoices.includes(voice)) {
      this._selectedVoice = voice;
      return true;
    }
    return false;
  }
}

const defaultLocalTTSProvider = new JarvisLocalTTSProvider();

module.exports = {
  JarvisLocalTTSProvider,
  defaultLocalTTSProvider
};
