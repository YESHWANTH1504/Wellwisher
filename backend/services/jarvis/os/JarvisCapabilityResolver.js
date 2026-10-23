const { defaultCapabilityRegistry, CAPABILITY_AVAILABILITY } = require('./JarvisCapabilityRegistry');
const { defaultIntentFabric } = require('./JarvisIntentFabric');
const { defaultAppRegistry } = require('../apps/JarvisAndroidAppRegistry');
const { CAPABILITY_STATUS } = require('../apps/JarvisAppCapabilityContract');

/**
 * JarvisCapabilityResolver
 * Phase 9: Authoritative Capability Resolution Engine.
 * Resolves high-level intents and target entities into concrete executable capabilities across:
 * Intent, Context, WorldModel, InstalledApps, Permissions, PrivacyPolicy, and SafetyPolicy.
 */
class JarvisCapabilityResolver {
  constructor(options = {}) {
    this.capabilities = options.capabilities || defaultCapabilityRegistry;
    this.intents = options.intents || defaultIntentFabric;
    this.appRegistry = options.appRegistry || defaultAppRegistry;
  }

  /**
   * Resolve an intent and request into a concrete capability resolution
   */
  async resolve(intentName, parameters = {}, context = {}) {
    const intent = this.intents.getIntent(intentName);
    const rawUtterance = (context.rawRequest || '').toLowerCase().trim();

    // 1. Direct App Capability Resolution (e.g. "Open WhatsApp", "Open settings")
    if (intentName === 'system.open_application' || parameters.packageName || parameters.appName) {
      return this._resolveAppLaunch(parameters, context, intent);
    }

    // 2. Navigation Capabilities (e.g. "Navigate to X", "Open Maps")
    if (intentName === 'navigation.get_directions' || intentName === 'navigation.search') {
      return this._resolveNavigation(parameters, context, intent);
    }

    // 3. System Settings Capabilities (e.g. "Open Wi-Fi settings")
    if (intentName === 'system.open_settings' || parameters.settingType) {
      return this._resolveSettings(parameters, context, intent);
    }

    // 4. Communication Capabilities (e.g. "Send message", "Make call")
    if (intentName === 'communication.send_sms' || intentName === 'communication.make_call' || intentName === 'communication.send_message' || /^(?:call|message|text|send\s+a?\s*message)/i.test(rawUtterance)) {
      return this._resolveCommunication(intentName, parameters, context, intent);
    }

    // 4b. Media Capabilities (e.g. "Play music", "Pause", "Next song", "Previous song")
    if (intentName?.startsWith('media.') || /^(?:play(?:\s+music)?|pause|next(?:\s+song)?|previous(?:\s+song)?)/i.test(rawUtterance)) {
      return this._resolveMedia(parameters, context, intent);
    }

    // 4c. Share Capabilities (e.g. "Share this photo", "Share this document")
    if (intentName === 'system.share_content' || /^share\s+/i.test(rawUtterance)) {
      return this._resolveShare(parameters, context, intent);
    }

    // 5. General Intent Registry Fallback
    const capabilityName = intent ? intent.executionCapability : intentName;
    const capability = this.capabilities.getCapability(capabilityName);

    if (!capability) {
      return {
        resolved: false,
        intentName,
        availability: CAPABILITY_AVAILABILITY.UNSUPPORTED,
        error: `Capability "${capabilityName}" not supported on this platform.`
      };
    }

    // Check permissions
    const granted = context.permissions || [];
    const evalResult = this.capabilities.evaluateAvailability(capability.name, granted, context.deviceState);

    return {
      resolved: evalResult.availability === CAPABILITY_AVAILABILITY.AVAILABLE,
      intentName,
      capability,
      intent,
      availability: evalResult.availability,
      requiredPermission: evalResult.requiredPermission,
      requiresConfirmation: capability.confirmation || intent?.confirmationPolicy === 'ALWAYS_REQUIRED',
      riskLevel: capability.risk || intent?.riskLevel || 0,
      reason: evalResult.reason
    };
  }

  /**
   * Resolve app launch requests
   */
  _resolveAppLaunch(parameters, context, intent) {
    const raw = context.rawRequest || parameters.appName || parameters.packageName || '';
    const resolvedApp = this.appRegistry.resolveApp(raw, context);

    if (!resolvedApp.resolved) {
      return {
        resolved: false,
        intentName: 'system.open_application',
        availability: CAPABILITY_AVAILABILITY.UNSUPPORTED,
        reason: `Could not identify an installed application matching "${raw}".`,
        speech: `I couldn't find an app matching "${raw}" on this device.`
      };
    }

    if (!resolvedApp.isInstalled) {
      return {
        resolved: false,
        intentName: 'system.open_application',
        availability: CAPABILITY_AVAILABILITY.UNSUPPORTED,
        targetApp: resolvedApp.appName,
        packageName: resolvedApp.packageName,
        reason: `Application "${resolvedApp.appName}" is not installed on this device.`,
        speech: `${resolvedApp.appName} isn't installed on this device.`
      };
    }

    return {
      resolved: true,
      intentName: 'system.open_application',
      selectedCapability: 'open_application',
      targetPackage: resolvedApp.packageName,
      targetAppName: resolvedApp.appName,
      parameters: {
        packageName: resolvedApp.packageName,
        appName: resolvedApp.appName
      },
      confidence: resolvedApp.confidence,
      requiresPermission: false,
      requiresConfirmation: false,
      riskLevel: 1,
      verificationStrategy: 'FOREGROUND_PACKAGE_CHECK'
    };
  }

  /**
   * Resolve navigation requests
   */
  _resolveNavigation(parameters, context, intent) {
    const dest = parameters.destination || parameters.query || context.rawRequest.replace(/^(?:navigate to|take me to|directions to)\s+/i, '').trim();
    const mapsApp = this.appRegistry.getApplication('com.google.android.apps.maps');

    return {
      resolved: true,
      intentName: intent?.name || 'navigation.get_directions',
      selectedCapability: 'navigate_to_location',
      targetPackage: 'com.google.android.apps.maps',
      targetAppName: 'Google Maps',
      parameters: {
        destination: dest,
        mode: parameters.mode || 'directions'
      },
      confidence: 0.95,
      requiresPermission: false,
      requiresConfirmation: false,
      riskLevel: 1,
      verificationStrategy: 'FOREGROUND_PACKAGE_CHECK'
    };
  }

  /**
   * Resolve system settings
   */
  _resolveSettings(parameters, context, intent) {
    const raw = (context.rawRequest || parameters.settingType || '').toLowerCase();
    let type = 'main';
    if (raw.includes('wifi') || raw.includes('wi-fi')) type = 'wifi';
    else if (raw.includes('bluetooth')) type = 'bluetooth';
    else if (raw.includes('battery')) type = 'battery';
    else if (raw.includes('display') || raw.includes('brightness')) type = 'display';
    else if (/\b(?:apps|applications|app\s+settings)\b/i.test(raw)) type = 'apps';
    else if (raw.includes('sound') || raw.includes('volume')) type = 'sound';
    else if (raw.includes('notification')) type = 'notifications';

    return {
      resolved: true,
      intentName: 'system.open_settings',
      selectedCapability: 'open_system_settings',
      parameters: { settingType: type },
      confidence: 0.98,
      requiresPermission: false,
      requiresConfirmation: false,
      riskLevel: 1,
      verificationStrategy: 'SETTINGS_ACTIVITY_CHECK'
    };
  }

  /**
   * Resolve communication with multi-candidate disambiguation
   */
  _resolveCommunication(intentName, parameters, context, intent) {
    const raw = (context.rawRequest || '').toLowerCase();
    const recipient = parameters.recipient || parameters.contactName || '';
    const message = parameters.message || parameters.text || '';
    const userPrefs = context.preferences || {};

    // Phone Call Resolution
    if (intentName === 'communication.make_call' || /^(?:please\s+)?(?:can\s+you\s+)?call\s+/i.test(raw)) {
      const contact = recipient || raw.replace(/^(?:please\s+)?(?:can\s+you\s+)?call\s+/i, '').trim();
      const phone = parameters.phoneNumber || contact;
      const granted = context.permissions || [];
      const hasPerm = granted.includes('CALL_PHONE') || granted.includes('phone_call');

      if (!hasPerm) {
        return {
          resolved: true,
          intentName: 'communication.make_call',
          selectedCapability: 'make_phone_call',
          targetPackage: 'com.android.dialer',
          targetAppName: 'Phone',
          parameters: { phoneNumber: phone, recipient: contact },
          requiresPermission: true,
          requiredPermission: 'CALL_PHONE',
          requiresConfirmation: true,
          riskLevel: 2,
          reason: 'I can make calls, but Phone permission is currently disabled.',
          speech: 'I can make calls, but Phone permission is currently disabled.'
        };
      }

      return {
        resolved: true,
        intentName: 'communication.make_call',
        selectedCapability: 'make_phone_call',
        targetPackage: 'com.android.dialer',
        targetAppName: 'Phone',
        parameters: { phoneNumber: phone, recipient: contact },
        confidence: 0.95,
        requiresPermission: false,
        requiresConfirmation: true,
        riskLevel: 2,
        verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
      };
    }

    // Preference mutations
    if (/always\s+use\s+whatsapp\s+when\s+i\s+say\s+message/i.test(raw)) {
      return {
        resolved: true,
        intentName: 'preferences.set_messaging_app',
        selectedCapability: 'set_preference',
        preferenceKey: 'preferredMessagingApp',
        preferenceValue: 'com.whatsapp',
        speech: 'I have set WhatsApp as your preferred messaging app.',
        confidence: 1.0,
        riskLevel: 0
      };
    }

    if (/forget\s+my\s+preferred\s+messaging\s+app/i.test(raw)) {
      return {
        resolved: true,
        intentName: 'preferences.clear_messaging_app',
        selectedCapability: 'clear_preference',
        preferenceKey: 'preferredMessagingApp',
        speech: 'I have cleared your preferred messaging app.',
        confidence: 1.0,
        riskLevel: 0
      };
    }

    if (/use\s+sms\s+instead/i.test(raw)) {
      return {
        resolved: true,
        intentName: 'preferences.set_messaging_app',
        selectedCapability: 'set_preference',
        preferenceKey: 'preferredMessagingApp',
        preferenceValue: 'com.google.android.apps.messaging',
        speech: 'I have updated your preferred messaging app to SMS.',
        confidence: 1.0,
        riskLevel: 0
      };
    }

    // 1. Explicit app named in request
    if (raw.includes('whatsapp')) {
      return {
        resolved: true,
        intentName: 'communication.send_whatsapp',
        selectedCapability: 'send_whatsapp_message',
        targetPackage: 'com.whatsapp',
        targetAppName: 'WhatsApp',
        parameters: { recipient, message },
        confidence: 0.98,
        requiresConfirmation: true,
        riskLevel: 2,
        verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
      };
    }

    if (raw.includes('sms') || raw.includes('text message')) {
      return {
        resolved: true,
        intentName: 'communication.send_sms',
        selectedCapability: 'send_sms',
        targetPackage: 'com.google.android.apps.messaging',
        targetAppName: 'Messages',
        parameters: { recipient, message },
        confidence: 0.98,
        requiresConfirmation: true,
        riskLevel: 2,
        verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
      };
    }

    // 2. Check user preference if configured
    if (userPrefs.preferredMessagingApp === 'com.whatsapp' || userPrefs.preferredMessagingApp === 'whatsapp') {
      return {
        resolved: true,
        intentName: 'communication.send_whatsapp',
        selectedCapability: 'send_whatsapp_message',
        targetPackage: 'com.whatsapp',
        targetAppName: 'WhatsApp',
        parameters: { recipient, message },
        confidence: 0.95,
        requiresConfirmation: true,
        riskLevel: 2,
        reason: 'User preference is configured to use WhatsApp for messaging.',
        verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
      };
    }

    if (userPrefs.preferredMessagingApp === 'com.google.android.apps.messaging' || userPrefs.preferredMessagingApp === 'sms') {
      return {
        resolved: true,
        intentName: 'communication.send_sms',
        selectedCapability: 'send_sms',
        targetPackage: 'com.google.android.apps.messaging',
        targetAppName: 'Messages',
        parameters: { recipient, message },
        confidence: 0.95,
        requiresConfirmation: true,
        riskLevel: 2,
        reason: 'User preference is configured to use SMS for messaging.',
        verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
      };
    }

    // 3. Multi-candidate Ambiguity Detection (Section 14)
    const hasWhatsApp = Boolean(this.appRegistry.getApplication('com.whatsapp'));
    const hasSms = Boolean(this.appRegistry.getApplication('com.google.android.apps.messaging'));

    if (hasWhatsApp && hasSms) {
      return {
        resolved: false,
        ambiguous: true,
        candidates: ['WhatsApp', 'Messages (SMS)'],
        clarificationQuestion: 'Which app should I use — WhatsApp or SMS?',
        speech: 'Which app should I use — WhatsApp or SMS?'
      };
    }

    // Default fallback to whichever is installed
    const target = hasWhatsApp ? 'com.whatsapp' : 'com.google.android.apps.messaging';
    return {
      resolved: true,
      intentName: hasWhatsApp ? 'communication.send_whatsapp' : 'communication.send_sms',
      selectedCapability: hasWhatsApp ? 'send_whatsapp_message' : 'send_sms',
      targetPackage: target,
      parameters: { recipient, message },
      confidence: 0.85,
      requiresConfirmation: true,
      riskLevel: 2,
      verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
    };
  }

  /**
   * Resolve media control
   */
  _resolveMedia(parameters, context, intent) {
    const raw = (context.rawRequest || '').toLowerCase().trim();
    let act = 'play';
    if (raw.includes('pause')) act = 'pause';
    else if (raw.includes('next')) act = 'next';
    else if (raw.includes('prev')) act = 'previous';

    return {
      resolved: true,
      intentName: 'media.control',
      selectedCapability: 'control_media',
      parameters: { mediaAction: act },
      confidence: 0.95,
      requiresPermission: false,
      requiresConfirmation: false,
      riskLevel: 1,
      verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
    };
  }

  /**
   * Resolve content sharing
   */
  _resolveShare(parameters, context, intent) {
    const raw = (context.rawRequest || '').toLowerCase().trim();
    let targetPkg = null;
    let targetAppName = 'Android Share Sheet';
    if (raw.includes('whatsapp')) {
      targetPkg = 'com.whatsapp';
      targetAppName = 'WhatsApp';
    }

    const content = parameters.content || parameters.text || raw.replace(/^share\s+(?:this\s+)?/i, '').trim();

    return {
      resolved: true,
      intentName: 'system.share_content',
      selectedCapability: 'share_content',
      targetPackage: targetPkg,
      targetAppName,
      parameters: { content, targetPackage: targetPkg },
      confidence: 0.95,
      requiresPermission: false,
      requiresConfirmation: true,
      riskLevel: 2,
      verificationStrategy: 'INTENT_DISPATCH_CONFIRMED'
    };
  }

  /**
   * Evaluate "Can you do this?" queries deterministically (Section 5)
   */
  evaluateCapabilityQuery(queryText) {
    const raw = (queryText || '').toLowerCase().trim();

    if (raw.includes('whatsapp') && (raw.includes('send') || raw.includes('message'))) {
      const app = this.appRegistry.getApplication('com.whatsapp');
      const isInstalled = app && app.installed !== false;
      return {
        canPerform: isInstalled,
        capability: 'whatsapp.message',
        status: isInstalled ? CAPABILITY_STATUS.AVAILABLE : CAPABILITY_STATUS.UNSUPPORTED,
        speech: isInstalled
          ? 'Yes, I can send messages via WhatsApp. I will ask for your confirmation before sending.'
          : 'I cannot send WhatsApp messages because WhatsApp is not installed on this device.'
      };
    }

    if (raw.includes('maps') || raw.includes('navigate') || raw.includes('directions')) {
      return {
        canPerform: true,
        capability: 'maps.directions',
        status: CAPABILITY_STATUS.AVAILABLE,
        speech: 'Yes, I can open navigation and show directions using Google Maps.'
      };
    }

    if (raw.includes('call') || raw.includes('phone')) {
      return {
        canPerform: true,
        capability: 'phone.call',
        status: CAPABILITY_STATUS.REQUIRES_PERMISSION,
        speech: 'I can make phone calls, though it requires phone permission and your explicit confirmation.'
      };
    }

    if (raw.includes('music') || raw.includes('media') || raw.includes('play')) {
      return {
        canPerform: true,
        capability: 'media.play',
        status: CAPABILITY_STATUS.AVAILABLE,
        speech: 'Yes, I can control media playback including play, pause, and skip.'
      };
    }

    if (raw.includes('settings')) {
      return {
        canPerform: true,
        capability: 'settings.open',
        status: CAPABILITY_STATUS.AVAILABLE,
        speech: 'Yes, I can open Android system settings such as Wi-Fi, Bluetooth, battery, and display.'
      };
    }

    return {
      canPerform: false,
      status: CAPABILITY_STATUS.UNKNOWN,
      speech: "I'm not sure if that action is supported on this device. Would you like me to check available capabilities?"
    };
  }
}

const defaultCapabilityResolver = new JarvisCapabilityResolver();

module.exports = {
  JarvisCapabilityResolver,
  defaultCapabilityResolver
};
