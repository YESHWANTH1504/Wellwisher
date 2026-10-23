/**
 * PermissionManager
 * Tracks unified permission states and generates natural explanations for required permissions.
 */

const PERMISSION_TYPES = {
  CAMERA: 'CAMERA',
  MICROPHONE: 'MICROPHONE',
  NOTIFICATIONS: 'NOTIFICATIONS',
  EXACT_ALARM: 'EXACT_ALARM',
  CONTACTS: 'CONTACTS',
  PHONE: 'PHONE',
  SMS: 'SMS',
  ACCESSIBILITY: 'ACCESSIBILITY',
  SCREEN_CAPTURE: 'SCREEN_CAPTURE'
};

const PERMISSION_STATES = {
  GRANTED: 'granted',
  DENIED: 'denied',
  RESTRICTED: 'restricted',
  NOT_REQUESTED: 'not_requested',
  UNSUPPORTED: 'unsupported'
};

const TOOL_PERMISSION_REQUIREMENTS = {
  analyze_camera_view: PERMISSION_TYPES.CAMERA,
  analyze_screen_context: PERMISSION_TYPES.SCREEN_CAPTURE,
  screen_tap: PERMISSION_TYPES.ACCESSIBILITY,
  screen_type: PERMISSION_TYPES.ACCESSIBILITY,
  screen_scroll: PERMISSION_TYPES.ACCESSIBILITY,
  screen_back: PERMISSION_TYPES.ACCESSIBILITY,
  set_device_alarm: PERMISSION_TYPES.EXACT_ALARM,
  make_phone_call: PERMISSION_TYPES.PHONE,
  send_sms_message: PERMISSION_TYPES.SMS,
  voice_interaction: PERMISSION_TYPES.MICROPHONE
};

class PermissionManager {
  /**
   * Determine required permission for a tool
   */
  static getRequiredPermission(toolName) {
    return TOOL_PERMISSION_REQUIREMENTS[toolName] || null;
  }

  /**
   * Generate natural human explanation for missing permission
   */
  static explainMissingPermission(permissionType) {
    switch (permissionType) {
      case PERMISSION_TYPES.CAMERA:
        return 'I need camera permission to see what you are looking at. Please grant Camera access in Android Settings.';
      case PERMISSION_TYPES.MICROPHONE:
        return 'I need microphone permission to hear your voice commands. Please allow Audio Recording in Settings.';
      case PERMISSION_TYPES.SCREEN_CAPTURE:
        return 'I need screen capture permission to read your current display.';
      case PERMISSION_TYPES.ACCESSIBILITY:
        return 'Controlled screen interactions require JARVIS Accessibility Service to be enabled with your explicit authorization.';
      case PERMISSION_TYPES.EXACT_ALARM:
        return 'I need permission to schedule exact alarms so your reminders ring reliably on time.';
      case PERMISSION_TYPES.PHONE:
        return 'I need phone permission to dial contacts on your behalf.';
      case PERMISSION_TYPES.SMS:
        return 'I need SMS permission to prepare or send text messages.';
      case PERMISSION_TYPES.NOTIFICATIONS:
        return 'Please enable notification permissions so I can alert you about upcoming tasks and routines.';
      default:
        return `This action requires ${permissionType} permission.`;
    }
  }

  /**
   * Evaluate if a tool execution can proceed given device permissions
   */
  static checkPermission(toolName, userPermissions = {}) {
    const required = PermissionManager.getRequiredPermission(toolName);
    if (!required) return { allowed: true };

    const state = userPermissions[required] || PERMISSION_STATES.NOT_REQUESTED;
    if (state === PERMISSION_STATES.GRANTED) {
      return { allowed: true, permission: required, state };
    }

    return {
      allowed: false,
      permission: required,
      state,
      explanation: PermissionManager.explainMissingPermission(required)
    };
  }
}

module.exports = {
  PermissionManager,
  PERMISSION_TYPES,
  PERMISSION_STATES,
  TOOL_PERMISSION_REQUIREMENTS
};
