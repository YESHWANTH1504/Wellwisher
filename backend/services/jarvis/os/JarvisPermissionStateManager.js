/**
 * JarvisPermissionStateManager.js
 * Tracks and dynamically evaluates Android permission states across all OS capabilities.
 * States: GRANTED, DENIED, REVOKED, RESTRICTED, NOT_REQUESTED.
 * Guarantees that permission revocation causes graceful fallback rather than false negative results.
 */

const PERMISSION_STATES = Object.freeze({
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
  REVOKED: 'REVOKED',
  RESTRICTED: 'RESTRICTED',
  NOT_REQUESTED: 'NOT_REQUESTED'
});

const PERMISSION_STATUS = PERMISSION_STATES;

const TRACKED_PERMISSIONS = Object.freeze({
  MICROPHONE: 'microphone',
  CAMERA: 'camera',
  NOTIFICATIONS: 'notifications',
  CALENDAR: 'calendar',
  CONTACTS: 'contacts',
  PHONE: 'phone',
  SMS: 'sms',
  LOCATION: 'location',
  ACCESSIBILITY: 'accessibility',
  ASSISTANT_ROLE: 'assistant_role'
});

class JarvisPermissionStateManager {
  constructor() {
    this._userPermissions = new Map(); // Key: `${userId}:${permission}` -> { status, rationale }
  }

  _getKey(userId, permission) {
    return `${userId}:${String(permission).toLowerCase()}`;
  }

  updatePermission(userId, permission, status, rationale = null) {
    if (!userId || !permission) return null;
    const upperState = String(status).toUpperCase();
    const key = this._getKey(userId, permission);
    const permRecord = {
      permission: String(permission).toLowerCase(),
      status: PERMISSION_STATES[upperState] || PERMISSION_STATES.DENIED,
      rationale: rationale || null,
      updatedAt: new Date().toISOString()
    };
    this._userPermissions.set(key, permRecord);
    return permRecord;
  }

  setPermissionState(userId, permission, state) {
    return this.updatePermission(userId, permission, state);
  }

  getPermissionState(userId, permission) {
    if (!userId || !permission) return { status: PERMISSION_STATES.NOT_REQUESTED };
    const key = this._getKey(userId, permission);
    const existing = this._userPermissions.get(key);
    if (existing) return existing;
    return { status: PERMISSION_STATES.NOT_REQUESTED };
  }

  getDegradedMessage(userId, permission) {
    return this.getDegradedExplanation(permission);
  }

  getDegradedExplanation(permission) {
    switch (String(permission).toLowerCase()) {
      case 'calendar':
        return "I don't currently have access to your calendar. The calendar permission is currently revoked in Settings.";
      case 'microphone':
        return "Microphone permission is currently unavailable. Voice commands cannot be recorded.";
      case 'camera':
        return "Camera permission is disabled. Visual perception is paused.";
      case 'contacts':
        return "Contacts access is disabled. I cannot look up phone numbers.";
      case 'location':
        return "Location permission is disabled. I cannot determine current navigation directions.";
      default:
        return `Permission for '${permission}' is currently disabled or revoked.`;
    }
  }

  getAllStates(userId) {
    const list = [];
    let granted = 0;
    let denied = 0;

    for (const perm of Object.values(TRACKED_PERMISSIONS)) {
      const stateObj = this.getPermissionState(userId, perm);
      list.push({ permission: perm, status: stateObj.status });
      if (stateObj.status === PERMISSION_STATES.GRANTED) {
        granted++;
      } else if (stateObj.status === PERMISSION_STATES.DENIED || stateObj.status === PERMISSION_STATES.REVOKED) {
        denied++;
      }
    }

    return {
      permissions: list,
      grantedCount: granted,
      deniedCount: denied
    };
  }
}

const defaultPermissionStateManager = new JarvisPermissionStateManager();

module.exports = {
  JarvisPermissionStateManager,
  defaultPermissionStateManager,
  PERMISSION_STATES,
  PERMISSION_STATUS,
  TRACKED_PERMISSIONS
};
