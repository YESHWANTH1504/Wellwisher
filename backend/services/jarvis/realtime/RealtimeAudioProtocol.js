/**
 * RealtimeAudioProtocol
 * Authoritative audio format specifications, buffer utilities, and VAD math for JARVIS Realtime Voice.
 * 
 * Standard Format:
 * - Encoding: Linear PCM 16-bit Little Endian (audio/pcm)
 * - Sample Rate: 16,000 Hz (16 kHz)
 * - Channels: 1 (Mono)
 * - Bit Depth: 16 bits (2 bytes per sample)
 * - Frame Duration: 20ms to 50ms (320 to 800 samples = 640 to 1600 bytes)
 */

const AUDIO_FORMAT_CONFIG = Object.freeze({
  ENCODING: 'LINEAR16',
  SAMPLE_RATE_HZ: 16000,
  CHANNELS: 1,
  BITS_PER_SAMPLE: 16,
  BYTES_PER_SAMPLE: 2,
  FRAME_DURATION_MS: 20, // 20ms audio frame
  FRAME_SIZE_BYTES: 640,  // (16000 * 1 * 2 * 0.020) = 640 bytes per frame
  DEFAULT_VAD_THRESHOLD: 500, // Amplitude RMS threshold for speech energy detection
  DEFAULT_SILENCE_TIMEOUT_MS: 1200, // 1.2s silence terminates user speech turn
  MAX_TURN_DURATION_MS: 15000 // 15s max single utterance safety cut-off
});

class RealtimeAudioProtocol {
  static get CONFIG() {
    return AUDIO_FORMAT_CONFIG;
  }

  static get SAMPLE_RATE() {
    return AUDIO_FORMAT_CONFIG.SAMPLE_RATE_HZ;
  }

  static get CHANNELS() {
    return AUDIO_FORMAT_CONFIG.CHANNELS;
  }

  static get BITS_PER_SAMPLE() {
    return AUDIO_FORMAT_CONFIG.BITS_PER_SAMPLE;
  }

  static get BYTES_PER_SAMPLE() {
    return AUDIO_FORMAT_CONFIG.BYTES_PER_SAMPLE;
  }

  static get FRAME_SIZE_BYTES() {
    return AUDIO_FORMAT_CONFIG.FRAME_SIZE_BYTES;
  }

  /**
   * Calculate Root Mean Square (RMS) energy of 16-bit PCM audio frame
   * @param {Buffer} pcmBuffer
   * @returns {number} RMS amplitude (0 to 32767 scale)
   */
  static calculateRmsEnergy(pcmBuffer) {
    if (!Buffer.isBuffer(pcmBuffer) || pcmBuffer.length < 2) {
      return 0.0;
    }

    let sumSquares = 0;
    const sampleCount = Math.floor(pcmBuffer.length / 2);
    if (sampleCount === 0) return 0.0;

    for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
      const sample = pcmBuffer.readInt16LE(i);
      sumSquares += sample * sample;
    }

    return Math.sqrt(sumSquares / sampleCount);
  }

  /**
   * Check if audio frame contains human voice activity exceeding threshold
   * @param {Buffer} pcmBuffer
   * @param {number} threshold
   * @returns {boolean}
   */
  static isSpeech(pcmBuffer, threshold = AUDIO_FORMAT_CONFIG.DEFAULT_VAD_THRESHOLD) {
    return this.calculateRmsEnergy(pcmBuffer) > threshold;
  }

  /**
   * Validate audio frame size and alignment
   */
  static isValidPcmFrame(buffer) {
    return Buffer.isBuffer(buffer) && buffer.length > 0 && buffer.length % 2 === 0;
  }

  /**
   * Package raw PCM buffer into valid WAV container with complete headers
   */
  static createWavContainer(pcmData, sampleRate = AUDIO_FORMAT_CONFIG.SAMPLE_RATE_HZ, channels = AUDIO_FORMAT_CONFIG.CHANNELS) {
    const pcmLen = Buffer.isBuffer(pcmData) ? pcmData.length : 0;
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;

    header.write('RIFF', 0);
    header.writeUInt32LE(pcmLen + 36, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(16, 34); // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(pcmLen, 40);

    return Buffer.isBuffer(pcmData) ? Buffer.concat([header, pcmData]) : header;
  }

  /**
   * Create WAV header for a raw PCM buffer if client requires playback packaging
   */
  static createWavHeader(pcmByteLength, sampleRate = AUDIO_FORMAT_CONFIG.SAMPLE_RATE_HZ, channels = AUDIO_FORMAT_CONFIG.CHANNELS) {
    return this.createWavContainer(Buffer.alloc(0), sampleRate, channels);
  }
}

module.exports = RealtimeAudioProtocol;
module.exports.RealtimeAudioProtocol = RealtimeAudioProtocol;
module.exports.AUDIO_FORMAT_CONFIG = AUDIO_FORMAT_CONFIG;
