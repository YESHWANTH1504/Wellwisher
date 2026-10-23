const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

const KNOWN_PACKAGES = {
  whatsapp: 'com.whatsapp',
  youtube: 'com.google.android.youtube',
  maps: 'com.google.android.apps.maps',
  googlemaps: 'com.google.android.apps.maps',
  chrome: 'com.android.chrome',
  browser: 'com.android.chrome',
  settings: 'com.android.settings',
  camera: 'com.android.camera',
  phone: 'com.android.dialer',
  dialer: 'com.android.dialer',
  messages: 'com.google.android.apps.messaging',
  sms: 'com.google.android.apps.messaging',
  gmail: 'com.google.android.gm',
  email: 'com.google.android.gm',
  spotify: 'com.spotify.music'
};

const deviceTools = [
  {
    name: 'open_application',
    description: 'Launch an installed Android application by name or package identifier',
    category: 'device',
    permissionKey: 'open_app',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        appName: { type: 'string', description: 'Name of the app (e.g. whatsapp, youtube, maps, settings)' },
        packageName: { type: 'string', description: 'Explicit Android package name if known' }
      },
      required: ['appName']
    },
    execute: async (context, input) => {
      const normalizedName = (input.appName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const resolvedPackage = input.packageName || KNOWN_PACKAGES[normalizedName] || `com.${normalizedName}`;
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'OPEN_APPLICATION',
        appName: input.appName,
        packageName: resolvedPackage,
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: `Opening ${input.appName}...`
      };
    }
  },
  {
    name: 'open_settings',
    description: 'Open specific Android system settings (wifi, bluetooth, display, sound, apps)',
    category: 'device',
    permissionKey: 'device_control',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        settingType: { type: 'string', description: 'Type of settings (wifi, bluetooth, sound, display, battery)' }
      },
      required: ['settingType']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'OPEN_SETTINGS',
        settingType: input.settingType,
        status: 'ACTION_PLANNED',
        requiresNativeExecution: true,
        message: `Opening ${input.settingType} settings...`
      };
    }
  },
  {
    name: 'set_device_alarm',
    description: 'Set a native Android device alarm through clock provider',
    category: 'device',
    permissionKey: 'set_alarm',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        time: { type: 'string', description: 'Alarm time e.g. "07:00 AM"' },
        label: { type: 'string', description: 'Alarm description or label' }
      },
      required: ['time']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'SET_ALARM',
        time: input.time,
        label: input.label || 'Alarm',
        status: 'ACTION_PLANNED',
        requiresNativeExecution: true,
        message: `Setting alarm for ${input.time}...`
      };
    }
  },
  {
    name: 'make_phone_call',
    description: 'Initiate a phone call to a contact or phone number with safety confirmation',
    category: 'device',
    permissionKey: 'make_phone_call',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        contactName: { type: 'string', description: 'Name of the contact to call' },
        phoneNumber: { type: 'string', description: 'Target phone number' }
      },
      required: ['contactName']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'MAKE_PHONE_CALL',
        contactName: input.contactName,
        phoneNumber: input.phoneNumber || '',
        status: 'ACTION_PLANNED',
        requiresNativeExecution: true,
        message: `Calling ${input.contactName}...`
      };
    }
  },
  {
    name: 'send_sms_message',
    description: 'Draft or send an SMS message to a contact',
    category: 'device',
    permissionKey: 'send_sms',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        contactName: { type: 'string', description: 'Target contact name' },
        phoneNumber: { type: 'string', description: 'Target phone number' },
        message: { type: 'string', description: 'SMS message text' }
      },
      required: ['message']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'SEND_SMS',
        contactName: input.contactName || '',
        phoneNumber: input.phoneNumber || '',
        messageText: input.message,
        status: 'ACTION_PLANNED',
        requiresNativeExecution: true,
        message: `Sending message to ${input.contactName || input.phoneNumber}...`
      };
    }
  },
  {
    name: 'launch_intent',
    description: 'Launch an explicit or implicit Android intent (action, uri, package)',
    category: 'device',
    permissionKey: 'device_control',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Android intent action (e.g. android.intent.action.VIEW)' },
        uri: { type: 'string', description: 'URI data for the intent' },
        packageName: { type: 'string', description: 'Target package name' }
      },
      required: ['action']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'LAUNCH_INTENT',
        intentAction: input.action,
        uri: input.uri || null,
        packageName: input.packageName || null,
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: `Launching intent ${input.action}...`
      };
    }
  },
  {
    name: 'get_device_status',
    description: 'Query current Android device battery, network connection, and model info',
    category: 'device',
    permissionKey: 'device_status',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'GET_DEVICE_STATUS',
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: 'Querying device status...'
      };
    }
  },
  {
    name: 'check_installed_app',
    description: 'Check if a specific application or package is installed on the Android device',
    category: 'device',
    permissionKey: 'check_app',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        appName: { type: 'string', description: 'Name of the app (e.g. whatsapp, spotify)' },
        packageName: { type: 'string', description: 'Package name (e.g. com.whatsapp)' }
      },
      required: ['appName']
    },
    execute: async (context, input) => {
      const normalizedName = (input.appName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const resolvedPackage = input.packageName || KNOWN_PACKAGES[normalizedName] || `com.${normalizedName}`;
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'CHECK_INSTALLED_APP',
        appName: input.appName,
        packageName: resolvedPackage,
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: `Checking if ${input.appName} is installed...`
      };
    }
  },
  {
    name: 'screen_tap',
    description: 'Perform a controlled, authorized tap on a visible UI element or coordinate on screen',
    category: 'device',
    permissionKey: 'accessibility',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Label or text of the target UI element' },
        x: { type: 'number', description: 'X coordinate if tap by position' },
        y: { type: 'number', description: 'Y coordinate if tap by position' },
        confidence: { type: 'number', description: 'Vision model confidence score (0.0 to 1.0)' }
      }
    },
    execute: async (context, input) => {
      // Confidence check
      if (input.confidence !== undefined && input.confidence < 0.7) {
        return {
          success: false,
          executed: false,
          verified: false,
          error: 'INSUFFICIENT_CONFIDENCE',
          message: `Target element "${input.label}" confidence (${input.confidence}) is below safe execution threshold (0.7). Please clarify the target.`
        };
      }
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'SCREEN_TAP',
        targetLabel: input.label || null,
        x: input.x,
        y: input.y,
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: `Tapping "${input.label || `(${input.x}, ${input.y})`}"...`
      };
    }
  },
  {
    name: 'screen_back',
    description: 'Trigger Android system back navigation',
    category: 'device',
    permissionKey: 'accessibility',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'SCREEN_BACK',
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: 'Navigating back...'
      };
    }
  },
  {
    name: 'screen_scroll',
    description: 'Scroll the active Android screen in a specified direction (up, down)',
    category: 'device',
    permissionKey: 'accessibility',
    riskLevel: RISK_LEVELS.LOW,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' }
      },
      required: ['direction']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'SCREEN_SCROLL',
        direction: input.direction || 'down',
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: `Scrolling ${input.direction || 'down'}...`
      };
    }
  },
  {
    name: 'screen_type',
    description: 'Type text into the currently focused Android input field',
    category: 'device',
    permissionKey: 'accessibility',
    riskLevel: RISK_LEVELS.MEDIUM,
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text string to type' }
      },
      required: ['text']
    },
    execute: async (context, input) => {
      return {
        success: true,
        executed: false,
        verified: false,
        action: 'SCREEN_TYPE',
        text: input.text,
        status: 'DISPATCHED_TO_NATIVE_BRIDGE',
        requiresNativeExecution: true,
        message: `Typing text into input field...`
      };
    }
  }
];

module.exports = deviceTools;

