/**
 * JarvisIntentFabric
 * Universal standardized intent architecture.
 * Maps user goals across 20+ functional domains with structured parameters,
 * safety risk ratings, verification handlers, and idempotency policies.
 */

const INTENT_DOMAINS = Object.freeze({
  SYSTEM: 'SYSTEM',
  DEVICE: 'DEVICE',
  COMMUNICATION: 'COMMUNICATION',
  CALENDAR: 'CALENDAR',
  REMINDERS: 'REMINDERS',
  HEALTH: 'HEALTH',
  VISION: 'VISION',
  SCREEN: 'SCREEN',
  MEDIA: 'MEDIA',
  LOCATION: 'LOCATION',
  NAVIGATION: 'NAVIGATION',
  DOCUMENTS: 'DOCUMENTS',
  FILES: 'FILES',
  WEB: 'WEB',
  PRODUCTIVITY: 'PRODUCTIVITY',
  WORKFLOW: 'WORKFLOW',
  NOTIFICATIONS: 'NOTIFICATIONS',
  CONTACTS: 'CONTACTS',
  CAMERA: 'CAMERA',
  AUDIO: 'AUDIO',
  ACCESSIBILITY: 'ACCESSIBILITY'
});

const CONFIRMATION_POLICIES = Object.freeze({
  NEVER: 'NEVER',
  USER_CONFIGURED: 'USER_CONFIGURED',
  ALWAYS_REQUIRED: 'ALWAYS_REQUIRED',
  EXPLICIT_DESTRUCTIVE: 'EXPLICIT_DESTRUCTIVE'
});

class JarvisIntent {
  constructor({
    id,
    name,
    description,
    domain,
    parameters = {},
    entities = [],
    riskLevel = 0,
    confirmationPolicy = CONFIRMATION_POLICIES.NEVER,
    requiredPermissions = [],
    executionCapability = null,
    verificationCapability = null,
    rollbackCapability = null,
    timeoutMs = 10000,
    idempotent = true
  }) {
    this.id = id || name;
    this.name = name;
    this.description = description;
    this.domain = domain;
    this.parameters = parameters;
    this.entities = entities;
    this.riskLevel = riskLevel;
    this.confirmationPolicy = confirmationPolicy;
    this.requiredPermissions = requiredPermissions;
    this.executionCapability = executionCapability;
    this.verificationCapability = verificationCapability;
    this.rollbackCapability = rollbackCapability;
    this.timeoutMs = timeoutMs;
    this.idempotent = idempotent;
  }
}

class JarvisIntentFabric {
  constructor() {
    this.intents = new Map();
    this._registerStandardIntents();
  }

  _registerStandardIntents() {
    // 1. Calendar Intents
    this.registerIntent(new JarvisIntent({
      name: 'calendar.get_today',
      description: 'Retrieve user agenda and events for today',
      domain: INTENT_DOMAINS.CALENDAR,
      riskLevel: 0,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: ['READ_CALENDAR'],
      executionCapability: 'calendar_get_today',
      verificationCapability: 'verify_calendar_read',
      idempotent: true
    }));

    this.registerIntent(new JarvisIntent({
      name: 'calendar.create_event',
      description: 'Schedule a new calendar event or meeting',
      domain: INTENT_DOMAINS.CALENDAR,
      parameters: { title: 'string', date: 'string', time: 'string', duration: 'number', location: 'string' },
      riskLevel: 1,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: ['WRITE_CALENDAR'],
      executionCapability: 'calendar_create_event',
      verificationCapability: 'verify_calendar_event_exists',
      rollbackCapability: 'calendar_delete_event',
      idempotent: false
    }));

    this.registerIntent(new JarvisIntent({
      name: 'calendar.update_event',
      description: 'Update or reschedule an existing calendar event',
      domain: INTENT_DOMAINS.CALENDAR,
      parameters: { eventId: 'string', newTime: 'string', newDate: 'string' },
      riskLevel: 2,
      confirmationPolicy: CONFIRMATION_POLICIES.USER_CONFIGURED,
      requiredPermissions: ['WRITE_CALENDAR'],
      executionCapability: 'calendar_update_event',
      verificationCapability: 'verify_calendar_event_updated',
      idempotent: false
    }));

    this.registerIntent(new JarvisIntent({
      name: 'calendar.delete_event',
      description: 'Cancel or delete an existing calendar event',
      domain: INTENT_DOMAINS.CALENDAR,
      parameters: { eventId: 'string' },
      riskLevel: 3,
      confirmationPolicy: CONFIRMATION_POLICIES.ALWAYS_REQUIRED,
      requiredPermissions: ['WRITE_CALENDAR'],
      executionCapability: 'calendar_delete_event',
      verificationCapability: 'verify_calendar_event_deleted',
      idempotent: true
    }));

    // 2. Reminder Intents
    this.registerIntent(new JarvisIntent({
      name: 'reminders.create',
      description: 'Set a scheduled reminder with notification and alarm',
      domain: INTENT_DOMAINS.REMINDERS,
      parameters: { title: 'string', time: 'string', date: 'string' },
      riskLevel: 1,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: ['SCHEDULE_EXACT_ALARM'],
      executionCapability: 'create_reminder',
      verificationCapability: 'verify_reminder_scheduled',
      rollbackCapability: 'cancel_reminder',
      idempotent: false
    }));

    this.registerIntent(new JarvisIntent({
      name: 'reminders.cancel',
      description: 'Cancel a scheduled reminder',
      domain: INTENT_DOMAINS.REMINDERS,
      parameters: { reminderId: 'string' },
      riskLevel: 2,
      confirmationPolicy: CONFIRMATION_POLICIES.USER_CONFIGURED,
      requiredPermissions: ['SCHEDULE_EXACT_ALARM'],
      executionCapability: 'cancel_reminder',
      verificationCapability: 'verify_reminder_cancelled',
      idempotent: true
    }));

    // 3. Device & Application Intents
    this.registerIntent(new JarvisIntent({
      name: 'device.open_app',
      description: 'Launch an installed Android application',
      domain: INTENT_DOMAINS.DEVICE,
      parameters: { appName: 'string', packageName: 'string' },
      riskLevel: 1,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: [],
      executionCapability: 'open_application',
      verificationCapability: 'verify_foreground_app',
      idempotent: true
    }));

    this.registerIntent(new JarvisIntent({
      name: 'device.open_settings',
      description: 'Open Android system settings screen',
      domain: INTENT_DOMAINS.DEVICE,
      parameters: { settingType: 'string' },
      riskLevel: 1,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: [],
      executionCapability: 'open_settings',
      verificationCapability: 'verify_settings_opened',
      idempotent: true
    }));

    this.registerIntent(new JarvisIntent({
      name: 'device.set_alarm',
      description: 'Set an Android system clock alarm',
      domain: INTENT_DOMAINS.DEVICE,
      parameters: { hour: 'number', minute: 'number', message: 'string' },
      riskLevel: 1,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: ['SET_ALARM'],
      executionCapability: 'set_device_alarm',
      verificationCapability: 'verify_alarm_set',
      idempotent: true
    }));

    // 4. Communication Intents
    this.registerIntent(new JarvisIntent({
      name: 'communication.make_call',
      description: 'Place a telephone call to contact or phone number',
      domain: INTENT_DOMAINS.COMMUNICATION,
      parameters: { phoneNumber: 'string', recipient: 'string' },
      riskLevel: 2,
      confirmationPolicy: CONFIRMATION_POLICIES.ALWAYS_REQUIRED,
      requiredPermissions: ['CALL_PHONE'],
      executionCapability: 'make_phone_call',
      verificationCapability: 'verify_call_intent_dispatched',
      idempotent: false
    }));

    this.registerIntent(new JarvisIntent({
      name: 'communication.send_sms',
      description: 'Compose and dispatch an SMS message',
      domain: INTENT_DOMAINS.COMMUNICATION,
      parameters: { phoneNumber: 'string', message: 'string' },
      riskLevel: 2,
      confirmationPolicy: CONFIRMATION_POLICIES.ALWAYS_REQUIRED,
      requiredPermissions: ['SEND_SMS'],
      executionCapability: 'send_sms_message',
      verificationCapability: 'verify_sms_dispatched',
      idempotent: false
    }));

    // 5. Health Connect Intents
    this.registerIntent(new JarvisIntent({
      name: 'health.get_vitals',
      description: 'Query verified biometric readings from Android Health Connect',
      domain: INTENT_DOMAINS.HEALTH,
      parameters: { metric: 'string', date: 'string' },
      riskLevel: 0,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: ['READ_HEALTH_DATA'],
      executionCapability: 'get_vitals',
      verificationCapability: 'verify_health_query',
      idempotent: true
    }));

    // 6. Vision & Screen Awareness Intents
    this.registerIntent(new JarvisIntent({
      name: 'vision.analyze_view',
      description: 'Observe camera view or photo and summarize',
      domain: INTENT_DOMAINS.VISION,
      riskLevel: 0,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: ['CAMERA'],
      executionCapability: 'analyze_camera_view',
      verificationCapability: 'verify_vision_observation',
      idempotent: true
    }));

    this.registerIntent(new JarvisIntent({
      name: 'screen.analyze_context',
      description: 'Read on-screen content and extract interactive context',
      domain: INTENT_DOMAINS.SCREEN,
      riskLevel: 0,
      confirmationPolicy: CONFIRMATION_POLICIES.NEVER,
      requiredPermissions: [],
      executionCapability: 'analyze_screen_context',
      verificationCapability: 'verify_screen_context',
      idempotent: true
    }));
  }

  registerIntent(intent) {
    this.intents.set(intent.name, intent);
    return intent;
  }

  getIntent(intentName) {
    return this.intents.get(intentName) || null;
  }

  listIntents(domain = null) {
    const all = Array.from(this.intents.values());
    return domain ? all.filter(i => i.domain === domain) : all;
  }
}

const defaultIntentFabric = new JarvisIntentFabric();

module.exports = {
  JarvisIntentFabric,
  JarvisIntent,
  defaultIntentFabric,
  INTENT_DOMAINS,
  CONFIRMATION_POLICIES
};
