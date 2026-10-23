/**
 * JarvisPrivacyRouter
 * Classifies data sensitivity and routes computation to local or cloud models
 * based on privacy policies, sensitive content indicators, and network state.
 */

const PRIVACY_LEVELS = Object.freeze({
  LOCAL_ONLY: 'LOCAL_ONLY',
  LOCAL_PREFERRED: 'LOCAL_PREFERRED',
  CLOUD_ALLOWED: 'CLOUD_ALLOWED',
  CLOUD_REQUIRED: 'CLOUD_REQUIRED',
  USER_CONFIRMATION_REQUIRED: 'USER_CONFIRMATION_REQUIRED'
});

const SENSITIVITY_DOMAINS = Object.freeze({
  HEALTH_CRITICAL: 'HEALTH_CRITICAL',
  FINANCIAL: 'FINANCIAL',
  COMMUNICATION_PRIVATE: 'COMMUNICATION_PRIVATE',
  CAMERA_RAW: 'CAMERA_RAW',
  SCREEN_PRIVATE: 'SCREEN_PRIVATE',
  AUTHENTICATION_CREDENTIALS: 'AUTHENTICATION_CREDENTIALS',
  GENERAL_PUBLIC: 'GENERAL_PUBLIC'
});

class JarvisPrivacyRouter {
  /**
   * Classify request privacy classification and compute route
   * @param {Object} contextPackage
   * @param {string} requestText
   * @param {Object} options
   * @returns {{ level: string, reason: string, allowedCloud: boolean, requiresConfirmation: boolean }}
   */
  static evaluatePrivacy(contextPackage = {}, requestText = '', options = {}) {
    const raw = (requestText || '').toLowerCase();

    // 1. Password / Credential protection: strictly LOCAL_ONLY or blocked
    if (
      raw.includes('password') ||
      raw.includes('pin code') ||
      raw.includes('secret key') ||
      raw.includes('credit card') ||
      raw.includes('cvv')
    ) {
      return {
        level: PRIVACY_LEVELS.LOCAL_ONLY,
        domain: SENSITIVITY_DOMAINS.AUTHENTICATION_CREDENTIALS,
        allowedCloud: false,
        requiresConfirmation: true,
        reason: 'Credentials and financial tokens must never be transmitted to cloud providers.'
      };
    }

    // 2. Sensitive Health Records / Medical Documents
    const isHealthDoc = options.multimodalInput?.type === 'PDF' && (
      raw.includes('blood test') ||
      raw.includes('prescription') ||
      raw.includes('diagnosis') ||
      raw.includes('clinical')
    );
    if (isHealthDoc && options.enforceLocalHealthPrivacy) {
      return {
        level: PRIVACY_LEVELS.LOCAL_PREFERRED,
        domain: SENSITIVITY_DOMAINS.HEALTH_CRITICAL,
        allowedCloud: false,
        requiresConfirmation: false,
        reason: 'Clinical diagnostic content preferred for local on-device extraction.'
      };
    }

    // 3. Screen content containing private apps (banking, messaging)
    const currentPkg = options.screenContext?.currentApplication || '';
    if (
      currentPkg.includes('banking') ||
      currentPkg.includes('bank') ||
      currentPkg.includes('finance') ||
      currentPkg.includes('paytm') ||
      currentPkg.includes('gpay') ||
      currentPkg.includes('paisa') ||
      currentPkg.includes('auth')
    ) {
      return {
        level: PRIVACY_LEVELS.LOCAL_ONLY,
        domain: SENSITIVITY_DOMAINS.SCREEN_PRIVATE,
        allowedCloud: false,
        requiresConfirmation: true,
        reason: 'Active screen contains sensitive financial application; cloud vision prohibited.'
      };
    }

    // 4. Heavy reasoning / complex summarization tasks require cloud capabilities
    if (
      raw.includes('summarize this document') ||
      raw.includes('explain quantum computing') ||
      raw.includes('tell me a story') ||
      raw.length > 500
    ) {
      return {
        level: PRIVACY_LEVELS.CLOUD_REQUIRED,
        domain: SENSITIVITY_DOMAINS.GENERAL_PUBLIC,
        allowedCloud: true,
        requiresConfirmation: false,
        reason: 'Complex semantic synthesis or long-context reasoning requires cloud model fabric.'
      };
    }

    // 5. Default everyday companion tasks (weather, alarms, apps, reminders)
    return {
      level: PRIVACY_LEVELS.CLOUD_ALLOWED,
      domain: SENSITIVITY_DOMAINS.GENERAL_PUBLIC,
      allowedCloud: true,
      requiresConfirmation: false,
      reason: 'Standard request permitted through secure zero-retention cloud gateway.'
    };
  }
}

module.exports = {
  JarvisPrivacyRouter,
  PRIVACY_LEVELS,
  SENSITIVITY_DOMAINS
};
