const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const { AIProvider, PROVIDER_CAPABILITIES, PROVIDER_STATUS } = require('./AIProvider');

class ElevenLabsProvider extends AIProvider {
  constructor(config = {}) {
    super('elevenlabs', config);
    const rawKey = config.apiKey || (process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.trim() : '');
    this.apiKey = rawKey.replace(/^"|"$/g, '').trim();
    this.voiceId = config.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    this.modelId = config.modelId || 'eleven_turbo_v2';
  }

  getCapabilities() {
    return new Set([
      PROVIDER_CAPABILITIES.TTS
    ]);
  }

  async _performHealthCheck() {
    if (!this.apiKey || this.apiKey.includes('your_elevenlabs_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return false;
    }
    return true;
  }

  async synthesize(text, voiceOptions = {}) {
    if (!this.apiKey || this.apiKey.includes('your_elevenlabs_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return null;
    }
    const voice = voiceOptions.voiceId || this.voiceId;
    const startTime = Date.now();
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: {
            stability: voiceOptions.stability || 0.5,
            similarity_boost: voiceOptions.similarity_boost || 0.75
          }
        })
      });
      if (!response.ok) {
        if (response.status === 429) {
          this.status = PROVIDER_STATUS.RATE_LIMITED;
        } else if (response.status === 401) {
          this.status = PROVIDER_STATUS.MISCONFIGURED;
        }
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      this.status = PROVIDER_STATUS.AVAILABLE;
      this.lastDiagnostics = {
        provider: 'elevenlabs',
        durationMs: Date.now() - startTime,
        bytes: arrayBuffer.byteLength,
        success: true
      };
      return Buffer.from(arrayBuffer);
    } catch (_) {
      this.status = PROVIDER_STATUS.TEMPORARILY_FAILED;
      return null;
    }
  }

  /**
   * Incremental streaming TTS audio output (Phase 3)
   * Streams audio chunks incrementally via HTTP chunked response body.
   */
  async synthesizeStream(text, voiceOptions = {}, onChunk = null) {
    if (!this.apiKey || this.apiKey.includes('your_elevenlabs_api_key')) {
      this.status = PROVIDER_STATUS.MISCONFIGURED;
      return null;
    }
    const voice = voiceOptions.voiceId || this.voiceId;
    const startTime = Date.now();
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: this.modelId,
          voice_settings: {
            stability: voiceOptions.stability || 0.5,
            similarity_boost: voiceOptions.similarity_boost || 0.75
          }
        })
      });
      if (!response.ok) {
        if (response.status === 429) {
          this.status = PROVIDER_STATUS.RATE_LIMITED;
        } else if (response.status === 401) {
          this.status = PROVIDER_STATUS.MISCONFIGURED;
        }
        return null;
      }

      this.status = PROVIDER_STATUS.AVAILABLE;
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          const buf = Buffer.from(value);
          chunks.push(buf);
          if (typeof onChunk === 'function') {
            onChunk(buf);
          }
        }
      }

      const totalBuffer = Buffer.concat(chunks);
      this.lastDiagnostics = {
        provider: 'elevenlabs',
        durationMs: Date.now() - startTime,
        bytes: totalBuffer.length,
        streaming: true,
        success: true
      };
      return totalBuffer;
    } catch (_) {
      this.status = PROVIDER_STATUS.TEMPORARILY_FAILED;
      return null;
    }
  }
}

module.exports = ElevenLabsProvider;
