const crypto = require('node:crypto');

const ACTIVATION_SOURCES = Object.freeze({
  WAKE_WORD: 'WAKE_WORD',
  MIC_BUTTON: 'MIC_BUTTON',
  TEXT_INPUT: 'TEXT_INPUT',
  VOICE_INTERACTION: 'VOICE_INTERACTION',
  CAMERA: 'CAMERA',
  SCREEN: 'SCREEN',
  MULTIMODAL: 'MULTIMODAL'
});

const INPUT_TYPES = Object.freeze({
  VOICE: 'VOICE',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  MULTIMODAL: 'MULTIMODAL'
});

/**
 * Standardized CanonicalRequest representation for JARVIS AI invocations.
 * Every user-initiated request must be instantiated or validated through this model.
 * Rejects unauthenticated, unsolicited, empty, or corrupted activation events.
 */
class CanonicalRequest {
  constructor({
    requestId,
    sessionId,
    userId,
    activationSource,
    inputType,
    userInitiated = true,
    rawTranscript = '',
    cleanedCommand = '',
    timestamp = Date.now(),
    context = {}
  } = {}) {
    this.requestId = requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.sessionId = sessionId || `session_${userId || 'default'}`;
    this.userId = userId;
    this.authenticated = Boolean(userId);
    this.timezone = context.timezone || 'UTC';
    this.locale = context.locale || 'en-US';
    this.channel = context.channel || (activationSource === ACTIVATION_SOURCES.TEXT_INPUT ? 'text' : 'voice');
    this.activationSource = activationSource;
    this.inputType = inputType || (activationSource === ACTIVATION_SOURCES.TEXT_INPUT ? INPUT_TYPES.TEXT : INPUT_TYPES.VOICE);
    this.userInitiated = Boolean(userInitiated);
    this.rawTranscript = (rawTranscript || '').trim();
    this.cleanedCommand = (cleanedCommand || this.cleanTranscript(this.rawTranscript)).trim();
    this.timestamp = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10) || Date.now();
    this.context = context || {};
  }

  /**
   * Normalizes and cleans raw transcript by stripping extraneous wake phrases
   */
  cleanTranscript(raw) {
    if (!raw) return '';
    return raw
      .replace(/^(?:hey|hi|hello|ok|okay)?\s*jarvis[,.\s]*/i, '')
      .trim();
  }

  /**
   * Strictly validates request integrity.
   * Returns { valid: boolean, error?: string }
   */
  static validate(req) {
    if (!req) {
      return { valid: false, error: 'CanonicalRequest payload is null or undefined' };
    }

    if (!req.userId) {
      return { valid: false, error: 'CanonicalRequest missing authenticated userId' };
    }

    if (!req.activationSource || !Object.values(ACTIVATION_SOURCES).includes(req.activationSource)) {
      return {
        valid: false,
        error: `Invalid activationSource. Must be one of: ${Object.values(ACTIVATION_SOURCES).join(', ')}`
      };
    }

    if (!req.userInitiated) {
      return { valid: false, error: 'Unsolicited system events cannot initiate conversational AI requests' };
    }

    const commandText = req.cleanedCommand || req.rawTranscript;
    if (!commandText || commandText.trim().length === 0) {
      return { valid: false, error: 'CanonicalRequest command text is empty' };
    }

    return { valid: true };
  }
}

module.exports = {
  CanonicalRequest,
  ACTIVATION_SOURCES,
  INPUT_TYPES
};
