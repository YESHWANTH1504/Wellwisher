/**
 * JarvisAppCapabilityContract
 * Formal, typed specification for application and Android system capabilities.
 * Guarantees that actions have explicit input schemas, risk ratings, required permissions,
 * invocation mechanisms, and verification strategies.
 */

const CAPABILITY_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  REQUIRES_PERMISSION: 'REQUIRES_PERMISSION',
  REQUIRES_USER_ACTION: 'REQUIRES_USER_ACTION',
  UNSUPPORTED: 'UNSUPPORTED',
  BLOCKED: 'BLOCKED',
  UNKNOWN: 'UNKNOWN'
});

const INVOCATION_METHODS = Object.freeze({
  EXPLICIT_PACKAGE_LAUNCH: 'EXPLICIT_PACKAGE_LAUNCH',
  ANDROID_INTENT_VIEW: 'ANDROID_INTENT_VIEW',
  ANDROID_INTENT_SEND: 'ANDROID_INTENT_SEND',
  ANDROID_INTENT_SENDTO: 'ANDROID_INTENT_SENDTO',
  ANDROID_INTENT_DIAL: 'ANDROID_INTENT_DIAL',
  ANDROID_INTENT_CALL: 'ANDROID_INTENT_CALL',
  ANDROID_INTENT_IMAGE_CAPTURE: 'ANDROID_INTENT_IMAGE_CAPTURE',
  ANDROID_SETTINGS_INTENT: 'ANDROID_SETTINGS_INTENT',
  MEDIA_INTENT: 'MEDIA_INTENT',
  CONTROLLED_ACCESSIBILITY: 'CONTROLLED_ACCESSIBILITY',
  BACKEND_SERVICE: 'BACKEND_SERVICE'
});

const VERIFICATION_STRATEGIES = Object.freeze({
  FOREGROUND_PACKAGE_CHECK: 'FOREGROUND_PACKAGE_CHECK',
  WINDOW_MANAGER_FOCUS: 'WINDOW_MANAGER_FOCUS',
  SETTINGS_ACTIVITY_CHECK: 'SETTINGS_ACTIVITY_CHECK',
  INTENT_DISPATCH_CONFIRMED: 'INTENT_DISPATCH_CONFIRMED',
  DATABASE_STATE_CONFIRMED: 'DATABASE_STATE_CONFIRMED',
  ALARM_REGISTERED_CHECK: 'ALARM_REGISTERED_CHECK',
  TELEMETRY_DELTA_CHECK: 'TELEMETRY_DELTA_CHECK'
});

const ACTION_LIFECYCLE = Object.freeze({
  PROPOSED: 'PROPOSED',
  VALIDATING: 'VALIDATING',
  RESOLVING_CAPABILITY: 'RESOLVING_CAPABILITY',
  AWAITING_PERMISSION: 'AWAITING_PERMISSION',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  AUTHORIZED: 'AUTHORIZED',
  EXECUTING: 'EXECUTING',
  OBSERVING: 'OBSERVING',
  VERIFYING: 'VERIFYING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  UNKNOWN: 'UNKNOWN'
});

class JarvisAppCapabilityContract {
  constructor({
    capabilityId,
    domain,
    appPackage,
    action,
    description = '',
    requiredPermissions = [],
    invocationMethod = INVOCATION_METHODS.EXPLICIT_PACKAGE_LAUNCH,
    inputSchema = {},
    outputSchema = {},
    confirmationRequired = false,
    riskLevel = 1,
    verificationStrategy = VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK,
    privacyLevel = 'PROTECTED',
    status = CAPABILITY_STATUS.AVAILABLE
  }) {
    if (!capabilityId) throw new Error('capabilityId is required');
    if (!domain) throw new Error('domain is required');
    if (!action) throw new Error('action is required');

    this.capabilityId = capabilityId;
    this.domain = domain;
    this.appPackage = appPackage || null;
    this.action = action;
    this.description = description;
    this.requiredPermissions = Array.isArray(requiredPermissions) ? requiredPermissions : [];
    this.invocationMethod = invocationMethod;
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
    this.confirmationRequired = Boolean(confirmationRequired);
    this.riskLevel = Number(riskLevel);
    this.verificationStrategy = verificationStrategy;
    this.privacyLevel = privacyLevel;
    this.status = status;
  }
}

/**
 * Standard Catalog of Built-In App Capabilities
 */
const STANDARD_CAPABILITY_CATALOG = [
  // WhatsApp
  new JarvisAppCapabilityContract({
    capabilityId: 'whatsapp.open',
    domain: 'COMMUNICATION',
    appPackage: 'com.whatsapp',
    action: 'APP.OPEN',
    description: 'Launch WhatsApp to the foreground',
    invocationMethod: INVOCATION_METHODS.EXPLICIT_PACKAGE_LAUNCH,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'whatsapp.message',
    domain: 'COMMUNICATION',
    appPackage: 'com.whatsapp',
    action: 'COMMUNICATION.MESSAGE',
    description: 'Send a message via WhatsApp (requires user review & confirmation)',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_SENDTO,
    confirmationRequired: true,
    riskLevel: 2,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED,
    privacyLevel: 'PRIVATE_DEVICE'
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'whatsapp.contact',
    domain: 'COMMUNICATION',
    appPackage: 'com.whatsapp',
    action: 'COMMUNICATION.CONTACT',
    description: 'Open a specific contact chat in WhatsApp',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'whatsapp.call',
    domain: 'COMMUNICATION',
    appPackage: 'com.whatsapp',
    action: 'COMMUNICATION.CALL',
    description: 'Initiate a voice call in WhatsApp',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    confirmationRequired: true,
    riskLevel: 2,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),

  // Calendar
  new JarvisAppCapabilityContract({
    capabilityId: 'calendar.view',
    domain: 'CALENDAR',
    appPackage: 'com.google.android.calendar',
    action: 'CALENDAR.VIEW',
    description: 'View calendar events and schedule',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    riskLevel: 0,
    verificationStrategy: VERIFICATION_STRATEGIES.DATABASE_STATE_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'calendar.create',
    domain: 'CALENDAR',
    appPackage: 'com.google.android.calendar',
    action: 'CALENDAR.CREATE',
    description: 'Create a calendar event or schedule entry',
    invocationMethod: INVOCATION_METHODS.BACKEND_SERVICE,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.DATABASE_STATE_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'calendar.update',
    domain: 'CALENDAR',
    appPackage: 'com.google.android.calendar',
    action: 'CALENDAR.UPDATE',
    description: 'Update or reschedule a calendar event',
    invocationMethod: INVOCATION_METHODS.BACKEND_SERVICE,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.DATABASE_STATE_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'calendar.delete',
    domain: 'CALENDAR',
    appPackage: 'com.google.android.calendar',
    action: 'CALENDAR.DELETE',
    description: 'Delete or cancel a calendar event or reminder',
    invocationMethod: INVOCATION_METHODS.BACKEND_SERVICE,
    riskLevel: 2,
    confirmationRequired: true,
    verificationStrategy: VERIFICATION_STRATEGIES.DATABASE_STATE_CONFIRMED
  }),

  // Google Maps
  new JarvisAppCapabilityContract({
    capabilityId: 'maps.open',
    domain: 'NAVIGATION',
    appPackage: 'com.google.android.apps.maps',
    action: 'APP.OPEN',
    description: 'Launch Google Maps',
    invocationMethod: INVOCATION_METHODS.EXPLICIT_PACKAGE_LAUNCH,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'maps.directions',
    domain: 'NAVIGATION',
    appPackage: 'com.google.android.apps.maps',
    action: 'NAVIGATION.DIRECTIONS',
    description: 'Get navigation directions to destination',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'maps.search',
    domain: 'NAVIGATION',
    appPackage: 'com.google.android.apps.maps',
    action: 'NAVIGATION.SEARCH',
    description: 'Search places nearby in Maps',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),

  // Chrome / Browser
  new JarvisAppCapabilityContract({
    capabilityId: 'browser.open',
    domain: 'WEB',
    appPackage: 'com.android.chrome',
    action: 'APP.OPEN',
    description: 'Launch Chrome web browser',
    invocationMethod: INVOCATION_METHODS.EXPLICIT_PACKAGE_LAUNCH,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'browser.search',
    domain: 'WEB',
    appPackage: 'com.android.chrome',
    action: 'WEB.SEARCH',
    description: 'Search the web in Chrome',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),

  // Camera
  new JarvisAppCapabilityContract({
    capabilityId: 'camera.open',
    domain: 'CAMERA',
    appPackage: 'com.android.camera',
    action: 'CAMERA.OPEN',
    description: 'Open camera viewfinder',
    invocationMethod: INVOCATION_METHODS.EXPLICIT_PACKAGE_LAUNCH,
    requiredPermissions: ['CAMERA'],
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'camera.capture',
    domain: 'CAMERA',
    appPackage: 'com.android.camera',
    action: 'CAMERA.CAPTURE',
    description: 'Trigger camera capture intent',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_IMAGE_CAPTURE,
    requiredPermissions: ['CAMERA'],
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),

  // YouTube / Media
  new JarvisAppCapabilityContract({
    capabilityId: 'youtube.open',
    domain: 'MEDIA',
    appPackage: 'com.google.android.youtube',
    action: 'APP.OPEN',
    description: 'Launch YouTube app',
    invocationMethod: INVOCATION_METHODS.EXPLICIT_PACKAGE_LAUNCH,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),

  // Files
  new JarvisAppCapabilityContract({
    capabilityId: 'files.open',
    domain: 'FILES',
    appPackage: 'com.google.android.documentsui',
    action: 'FILE.OPEN',
    description: 'Open file manager or browse files',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_VIEW,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.FOREGROUND_PACKAGE_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'files.share',
    domain: 'FILES',
    appPackage: 'com.google.android.documentsui',
    action: 'FILE.SHARE',
    description: 'Share a document or file',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_SEND,
    riskLevel: 2,
    confirmationRequired: true,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),

  // Media
  new JarvisAppCapabilityContract({
    capabilityId: 'media.play',
    domain: 'MEDIA',
    appPackage: 'com.spotify.music',
    action: 'MEDIA.PLAY',
    description: 'Resume or start media playback',
    invocationMethod: INVOCATION_METHODS.MEDIA_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'media.pause',
    domain: 'MEDIA',
    appPackage: 'com.spotify.music',
    action: 'MEDIA.PAUSE',
    description: 'Pause current media playback',
    invocationMethod: INVOCATION_METHODS.MEDIA_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'media.next',
    domain: 'MEDIA',
    appPackage: 'com.spotify.music',
    action: 'MEDIA.NEXT',
    description: 'Skip to next media track',
    invocationMethod: INVOCATION_METHODS.MEDIA_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'media.previous',
    domain: 'MEDIA',
    appPackage: 'com.spotify.music',
    action: 'MEDIA.PREVIOUS',
    description: 'Skip to previous media track',
    invocationMethod: INVOCATION_METHODS.MEDIA_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),

  // System Settings
  new JarvisAppCapabilityContract({
    capabilityId: 'settings.open',
    domain: 'SYSTEM',
    appPackage: 'com.android.settings',
    action: 'SYSTEM.OPEN_SETTINGS',
    description: 'Open main Android settings',
    invocationMethod: INVOCATION_METHODS.ANDROID_SETTINGS_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.SETTINGS_ACTIVITY_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'settings.wifi',
    domain: 'SYSTEM',
    appPackage: 'com.android.settings',
    action: 'SYSTEM.WIFI_SETTINGS',
    description: 'Open Wi-Fi settings',
    invocationMethod: INVOCATION_METHODS.ANDROID_SETTINGS_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.SETTINGS_ACTIVITY_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'settings.bluetooth',
    domain: 'SYSTEM',
    appPackage: 'com.android.settings',
    action: 'SYSTEM.BLUETOOTH_SETTINGS',
    description: 'Open Bluetooth settings',
    invocationMethod: INVOCATION_METHODS.ANDROID_SETTINGS_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.SETTINGS_ACTIVITY_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'settings.battery',
    domain: 'SYSTEM',
    appPackage: 'com.android.settings',
    action: 'SYSTEM.BATTERY_STATUS',
    description: 'Open battery saver settings',
    invocationMethod: INVOCATION_METHODS.ANDROID_SETTINGS_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.SETTINGS_ACTIVITY_CHECK
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'settings.display',
    domain: 'SYSTEM',
    appPackage: 'com.android.settings',
    action: 'SYSTEM.DISPLAY_SETTINGS',
    description: 'Open display & brightness settings',
    invocationMethod: INVOCATION_METHODS.ANDROID_SETTINGS_INTENT,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.SETTINGS_ACTIVITY_CHECK
  }),

  // Telephony & SMS
  new JarvisAppCapabilityContract({
    capabilityId: 'phone.dial',
    domain: 'COMMUNICATION',
    appPackage: 'com.android.dialer',
    action: 'COMMUNICATION.DIAL',
    description: 'Open phone dialer with phone number',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_DIAL,
    riskLevel: 1,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'phone.call',
    domain: 'COMMUNICATION',
    appPackage: 'com.android.dialer',
    action: 'COMMUNICATION.CALL',
    description: 'Directly place a phone call (requires CALL_PHONE permission and confirmation)',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_CALL,
    requiredPermissions: ['CALL_PHONE'],
    confirmationRequired: true,
    riskLevel: 2,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  }),
  new JarvisAppCapabilityContract({
    capabilityId: 'messages.sms',
    domain: 'COMMUNICATION',
    appPackage: 'com.google.android.apps.messaging',
    action: 'COMMUNICATION.MESSAGE',
    description: 'Send SMS message (requires user confirmation)',
    invocationMethod: INVOCATION_METHODS.ANDROID_INTENT_SENDTO,
    requiredPermissions: ['SEND_SMS'],
    confirmationRequired: true,
    riskLevel: 2,
    verificationStrategy: VERIFICATION_STRATEGIES.INTENT_DISPATCH_CONFIRMED
  })
];

module.exports = {
  JarvisAppCapabilityContract,
  CAPABILITY_STATUS,
  INVOCATION_METHODS,
  VERIFICATION_STRATEGIES,
  ACTION_LIFECYCLE,
  STANDARD_CAPABILITY_CATALOG
};
