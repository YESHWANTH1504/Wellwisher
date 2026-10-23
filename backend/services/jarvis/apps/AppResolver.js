/**
 * AppResolver
 * Resolves natural language user utterances into concrete Android application packages
 * and device execution intents.
 */
class AppResolver {
  static KNOWN_APPLICATIONS = {
    whatsapp: {
      canonicalName: 'WhatsApp',
      packageName: 'com.whatsapp',
      aliases: ['whatsapp', 'whats app', 'wa', 'watsapp']
    },
    youtube: {
      canonicalName: 'YouTube',
      packageName: 'com.google.android.youtube',
      aliases: ['youtube', 'you tube', 'yt', 'videos']
    },
    maps: {
      canonicalName: 'Google Maps',
      packageName: 'com.google.android.apps.maps',
      aliases: ['maps', 'google maps', 'google map', 'navigation', 'directions']
    },
    chrome: {
      canonicalName: 'Chrome',
      packageName: 'com.android.chrome',
      aliases: ['chrome', 'google chrome', 'browser', 'internet', 'web browser']
    },
    gmail: {
      canonicalName: 'Gmail',
      packageName: 'com.google.android.gm',
      aliases: ['gmail', 'email', 'google mail', 'mail']
    },
    camera: {
      canonicalName: 'Camera',
      packageName: 'com.android.camera',
      aliases: ['camera', 'cam', 'take photo', 'take pictures']
    },
    settings: {
      canonicalName: 'Settings',
      packageName: 'com.android.settings',
      aliases: ['settings', 'system settings', 'phone settings', 'device settings']
    },
    phone: {
      canonicalName: 'Phone',
      packageName: 'com.android.dialer',
      aliases: ['phone', 'dialer', 'telephone', 'phone dialer']
    },
    messages: {
      canonicalName: 'Messages',
      packageName: 'com.google.android.apps.messaging',
      aliases: ['messages', 'message', 'messaging', 'sms', 'texting', 'texts']
    },
    spotify: {
      canonicalName: 'Spotify',
      packageName: 'com.spotify.music',
      aliases: ['spotify', 'music app', 'music player', 'spotify music']
    },
    photos: {
      canonicalName: 'Google Photos',
      packageName: 'com.google.android.apps.photos',
      aliases: ['photos', 'google photos', 'gallery', 'photo gallery']
    },
    clock: {
      canonicalName: 'Clock',
      packageName: 'com.google.android.deskclock',
      aliases: ['clock', 'alarms', 'alarm app', 'stopwatch', 'timer']
    },
    calculator: {
      canonicalName: 'Calculator',
      packageName: 'com.google.android.calculator',
      aliases: ['calculator', 'calc']
    }
  };

  /**
   * Resolve an utterance into structured app launch parameters
   */
  static resolve(rawUtterance) {
    if (!rawUtterance || typeof rawUtterance !== 'string') {
      return { isAppRequest: false, confidence: 0 };
    }

    const trimmed = rawUtterance.trim();
    const lower = trimmed.toLowerCase();

    const appActionPrefixes = [
      /^(?:please\s+)?(?:can\s+you\s+)?(?:go\s+to|take\s+me\s+to|open|launch|start|bring\s+up|switch\s+to|show\s+me|i\s+want\s+to\s+use)\s+(?:my\s+|the\s+)?/i,
      /^(?:run|access)\s+(?:my\s+|the\s+)?/i
    ];

    let candidateName = '';
    let hasExplicitActionPrefix = false;

    for (const prefix of appActionPrefixes) {
      if (prefix.test(lower)) {
        hasExplicitActionPrefix = true;
        candidateName = lower.replace(prefix, '').replace(/\s+(?:app|application)$/i, '').trim();
        break;
      }
    }

    if (!hasExplicitActionPrefix) {
      candidateName = lower.replace(/\s+(?:app|application)$/i, '').trim();
    }

    const cleanCandidate = candidateName.replace(/[^a-z0-9]/g, '');

    for (const [key, appInfo] of Object.entries(this.KNOWN_APPLICATIONS)) {
      if (
        cleanCandidate === key ||
        appInfo.aliases.some(alias => cleanCandidate === alias.replace(/[^a-z0-9]/g, ''))
      ) {
        return {
          isAppRequest: hasExplicitActionPrefix || cleanCandidate.length > 2,
          appName: appInfo.canonicalName,
          packageName: appInfo.packageName,
          confidence: hasExplicitActionPrefix ? 0.95 : 0.80
        };
      }
    }

    if (hasExplicitActionPrefix && candidateName.length > 1) {
      const sanitized = candidateName.replace(/[^a-z0-9._]/g, '');
      return {
        isAppRequest: true,
        appName: candidateName,
        packageName: sanitized.includes('.') ? sanitized : `com.${sanitized}`,
        confidence: 0.65
      };
    }

    return { isAppRequest: false, confidence: 0 };
  }
}

module.exports = AppResolver;
