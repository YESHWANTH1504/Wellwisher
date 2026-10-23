const { registry: existingToolRegistry } = require('../tools');
const { INTENT_DOMAINS } = require('./JarvisIntentFabric');

/**
 * JarvisCapabilityRegistry
 * Authoritative registry of every executable action across Android and Backend domains.
 * Models never directly call Android APIs. Models emit structured intents;
 * CapabilityRegistry resolves trusted native or backend executors.
 */

const CAPABILITY_AVAILABILITY = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
  UNSUPPORTED: 'UNSUPPORTED',
  DEVICE_LIMITATION: 'DEVICE_LIMITATION',
  NETWORK_REQUIRED: 'NETWORK_REQUIRED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE'
});

class JarvisCapability {
  constructor({
    name,
    description,
    domain = INTENT_DOMAINS.SYSTEM,
    parameters = {},
    risk = 0,
    permissions = [],
    availability = CAPABILITY_AVAILABILITY.AVAILABLE,
    platform = 'ANDROID',
    executor = null,
    verifier = null,
    rollback = null,
    confirmation = false,
    privacyLevel = 'PROTECTED'
  }) {
    this.name = name;
    this.description = description;
    this.domain = domain;
    this.parameters = parameters;
    this.risk = risk;
    this.permissions = permissions;
    this.availability = availability;
    this.platform = platform;
    this.executor = executor;
    this.verifier = verifier;
    this.rollback = rollback;
    this.confirmation = confirmation;
    this.privacyLevel = privacyLevel;
  }
}

class JarvisCapabilityRegistry {
  constructor() {
    this.capabilities = new Map();
    this._bootstrapFromExistingTools();
  }

  _bootstrapFromExistingTools() {
    // Ingest all 50+ existing tools from Phase 1-6 toolRegistry
    const toolMap = existingToolRegistry._tools || existingToolRegistry.tools || new Map();
    for (const [name, tool] of toolMap.entries()) {
      let domain = INTENT_DOMAINS.SYSTEM;
      const cat = (tool.category || '').toLowerCase();
      if (cat.includes('schedule') || cat.includes('calendar')) domain = INTENT_DOMAINS.CALENDAR;
      else if (cat.includes('reminder')) domain = INTENT_DOMAINS.REMINDERS;
      else if (cat.includes('device')) domain = INTENT_DOMAINS.DEVICE;
      else if (cat.includes('health') || cat.includes('wellness') || cat.includes('vital')) domain = INTENT_DOMAINS.HEALTH;
      else if (cat.includes('multimodal') || cat.includes('vision') || cat.includes('screen')) domain = INTENT_DOMAINS.VISION;
      else if (cat.includes('document')) domain = INTENT_DOMAINS.DOCUMENTS;
      else if (cat.includes('workflow')) domain = INTENT_DOMAINS.WORKFLOW;
      else if (cat.includes('comm') || cat.includes('message') || cat.includes('call')) domain = INTENT_DOMAINS.COMMUNICATION;

      this.registerCapability(new JarvisCapability({
        name: tool.name,
        description: tool.description,
        domain,
        parameters: tool.inputSchema?.properties || {},
        risk: tool.riskLevel === 'HIGH' ? 3 : (tool.riskLevel === 'MEDIUM' ? 2 : 1),
        permissions: tool.permissionKey ? [tool.permissionKey] : [],
        confirmation: tool.requiresConfirmation || false,
        platform: (tool.requiresNativeExecution || tool.name.includes('application') || tool.name.includes('android') || tool.name.includes('device') || tool.name.includes('screen') || tool.name.includes('camera')) ? 'ANDROID' : 'BACKEND',
        executor: tool.execute.bind(tool),
        availability: CAPABILITY_AVAILABILITY.AVAILABLE
      }));
    }

    // Phase 9 Native Android Capabilities
    const { defaultAndroidCapabilityBridge } = require('./JarvisAndroidCapabilityBridge');

    this.registerCapability(new JarvisCapability({
      name: 'open_application',
      description: 'Launch an installed Android application to the foreground',
      domain: INTENT_DOMAINS.SYSTEM,
      parameters: { packageName: 'string', appName: 'string' },
      risk: 1,
      permissions: ['open_app'],
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.openApplication(args.packageName || args.appName, args)
    }));

    this.registerCapability(new JarvisCapability({
      name: 'open_system_settings',
      description: 'Launch specific Android system settings (wifi, bluetooth, battery, display, etc.)',
      domain: INTENT_DOMAINS.SYSTEM,
      parameters: { settingType: 'string' },
      risk: 1,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.openSettings(args.settingType)
    }));

    this.registerCapability(new JarvisCapability({
      name: 'navigate_to_location',
      description: 'Launch navigation or directions in Google Maps',
      domain: INTENT_DOMAINS.NAVIGATION,
      parameters: { destination: 'string', mode: 'string' },
      risk: 1,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.navigate(args.destination || args.query, args)
    }));

    this.registerCapability(new JarvisCapability({
      name: 'make_phone_call',
      description: 'Initiate a phone call via Android dialer or direct call intent',
      domain: INTENT_DOMAINS.COMMUNICATION,
      parameters: { phoneNumber: 'string', recipient: 'string' },
      risk: 2,
      permissions: ['CALL_PHONE'],
      confirmation: true,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.makeCall(args.phoneNumber, args)
    }));

    this.registerCapability(new JarvisCapability({
      name: 'send_sms',
      description: 'Compose and dispatch an SMS message',
      domain: INTENT_DOMAINS.COMMUNICATION,
      parameters: { phoneNumber: 'string', message: 'string' },
      risk: 2,
      permissions: ['SEND_SMS'],
      confirmation: true,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.sendSms(args.phoneNumber, args.message)
    }));

    this.registerCapability(new JarvisCapability({
      name: 'send_whatsapp_message',
      description: 'Compose and dispatch a message via WhatsApp',
      domain: INTENT_DOMAINS.COMMUNICATION,
      parameters: { recipient: 'string', message: 'string' },
      risk: 2,
      confirmation: true,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.sendSms(args.recipient || args.phoneNumber, args.message)
    }));

    this.registerCapability(new JarvisCapability({
      name: 'control_media',
      description: 'Control media playback (play, pause, next, previous)',
      domain: INTENT_DOMAINS.MEDIA || 'MEDIA',
      parameters: { mediaAction: 'string' },
      risk: 1,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.controlMedia(args.mediaAction || args.action || 'play')
    }));

    this.registerCapability(new JarvisCapability({
      name: 'share_content',
      description: 'Share content with another application or contact',
      domain: INTENT_DOMAINS.SYSTEM,
      parameters: { content: 'string', targetPackage: 'string' },
      risk: 2,
      confirmation: true,
      platform: 'ANDROID',
      executor: async (ctx, args) => defaultAndroidCapabilityBridge.shareContent(args.content, args)
    }));
  }

  registerCapability(capability) {
    this.capabilities.set(capability.name, capability);
    return capability;
  }

  getCapability(name) {
    return this.capabilities.get(name) || null;
  }

  hasCapability(name) {
    return this.capabilities.has(name);
  }

  listCapabilities(domain = null) {
    const list = Array.from(this.capabilities.values());
    return domain ? list.filter(c => c.domain === domain) : list;
  }

  /**
   * Check capability availability against current device state and granted permissions
   */
  evaluateAvailability(capabilityName, grantedPermissions = [], deviceState = {}) {
    const cap = this.getCapability(capabilityName);
    if (!cap) {
      return { availability: CAPABILITY_AVAILABILITY.UNSUPPORTED, reason: `Capability ${capabilityName} is not registered in JARVIS OS.` };
    }

    const PERMISSION_ALIASES = {
      'get_schedule': ['READ_CALENDAR', 'get_schedule'],
      'READ_CALENDAR': ['READ_CALENDAR', 'get_schedule'],
      'create_event': ['WRITE_CALENDAR', 'create_event'],
      'WRITE_CALENDAR': ['WRITE_CALENDAR', 'create_event'],
      'open_app': ['open_app', 'SYSTEM_ALERT_WINDOW'],
      'contacts': ['READ_CONTACTS', 'contacts'],
      'READ_CONTACTS': ['READ_CONTACTS', 'contacts'],
      'phone_call': ['CALL_PHONE', 'phone_call'],
      'CALL_PHONE': ['CALL_PHONE', 'phone_call'],
      'send_sms': ['SEND_SMS', 'send_sms'],
      'SEND_SMS': ['SEND_SMS', 'send_sms']
    };

    // Check permissions
    for (const reqPerm of cap.permissions) {
      const allowedAliases = PERMISSION_ALIASES[reqPerm] || [reqPerm];
      const hasPerm = allowedAliases.some(alias => grantedPermissions.includes(alias));
      if (!hasPerm) {
        return {
          availability: CAPABILITY_AVAILABILITY.PERMISSION_REQUIRED,
          requiredPermission: reqPerm,
          reason: `Action requires permission: ${reqPerm}`
        };
      }
    }

    // Network check
    if (cap.platform === 'CLOUD' && deviceState.networkConnected === false) {
      return {
        availability: CAPABILITY_AVAILABILITY.NETWORK_REQUIRED,
        reason: 'Device network connection is offline.'
      };
    }

    return { availability: CAPABILITY_AVAILABILITY.AVAILABLE, capability: cap };
  }
}

const defaultCapabilityRegistry = new JarvisCapabilityRegistry();

module.exports = {
  JarvisCapabilityRegistry,
  JarvisCapability,
  defaultCapabilityRegistry,
  CAPABILITY_AVAILABILITY
};
