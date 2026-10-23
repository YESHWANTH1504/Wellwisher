const EventEmitter = require('node:events');

/**
 * LiveKitAudioSession
 * Manages streaming audio frames, voice activity detection (VAD), silence detection,
 * turn detection, and barge-in / interruption triggering over LiveKit transport.
 */
class LiveKitAudioSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessionId = options.sessionId || `audio_${Date.now()}`;
    this.userId = options.userId || null;
    this.sampleRate = options.sampleRate || 16000;
    this.silenceThresholdMs = options.silenceThresholdMs || 1200; // 1.2s silence ends turn
    this.vadEnergyThreshold = options.vadEnergyThreshold || 0.015; // RMS threshold

    this.isSpeaking = false;
    this.lastSpeechTimestamp = 0;
    this.speechStartTime = 0;
    this.silenceTimer = null;
    this.activeAudioBuffer = [];
    this.isAgentSpeaking = false;
  }

  /**
   * Process an incoming audio packet / frame (PCM chunk)
   */
  processAudioFrame(pcmBuffer) {
    if (!pcmBuffer || pcmBuffer.length === 0) return;

    const rms = this._calculateRms(pcmBuffer);
    const now = Date.now();

    if (rms > this.vadEnergyThreshold) {
      // Voice activity detected
      this.lastSpeechTimestamp = now;

      // Handle Barge-in if Agent is currently speaking
      if (this.isAgentSpeaking) {
        this.emit('barge_in', {
          timestamp: now,
          energy: rms,
          message: 'User interrupted agent speech'
        });
      }

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = now;
        this.emit('speech_start', { timestamp: now, energy: rms });
      }

      // Reset silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    } else if (this.isSpeaking) {
      // In speech mode but currently below threshold -> check silence duration
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this._handleSpeechEnd();
        }, this.silenceThresholdMs);
      }
    }
  }

  /**
   * Internal turn end handler
   */
  _handleSpeechEnd() {
    if (!this.isSpeaking) return;

    this.isSpeaking = false;
    const duration = Date.now() - this.speechStartTime;
    this.emit('speech_end', {
      timestamp: Date.now(),
      durationMs: duration
    });
    this.silenceTimer = null;
  }

  /**
   * Mark that the Agent has started speaking (for barge-in detection)
   */
  setAgentSpeaking(isSpeaking) {
    this.isAgentSpeaking = Boolean(isSpeaking);
  }

  /**
   * Calculate Root Mean Square energy of PCM buffer
   */
  _calculateRms(buffer) {
    let sum = 0;
    const numSamples = Math.floor(buffer.length / 2);
    if (numSamples === 0) return 0;

    for (let i = 0; i < buffer.length - 1; i += 2) {
      const sample = buffer.readInt16LE(i) / 32768.0;
      sum += sample * sample;
    }
    return Math.sqrt(sum / numSamples);
  }

  /**
   * Reset session state
   */
  reset() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isSpeaking = false;
    this.isAgentSpeaking = false;
    this.activeAudioBuffer = [];
  }
}

module.exports = {
  LiveKitAudioSession
};
