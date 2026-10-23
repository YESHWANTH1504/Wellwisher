const AppCapability = require('./AppCapability');
const { APP_ACTION_TYPES } = require('./AppAction');

/**
 * AppCapabilityRegistry
 * Maps supported Android applications and explicitly verified actions.
 */
class AppCapabilityRegistry {
  constructor() {
    this.apps = new Map();
    this._initDefaultApps();
  }

  _initDefaultApps() {
    this.registerApp(new AppCapability({
      domain: 'COMMUNICATION',
      appName: 'WhatsApp',
      packageName: 'com.whatsapp',
      supportedActions: [APP_ACTION_TYPES.OPEN]
    }));

    this.registerApp(new AppCapability({
      domain: 'MEDIA',
      appName: 'YouTube',
      packageName: 'com.google.android.youtube',
      supportedActions: [APP_ACTION_TYPES.OPEN]
    }));

    this.registerApp(new AppCapability({
      domain: 'NAVIGATION',
      appName: 'Google Maps',
      packageName: 'com.google.android.apps.maps',
      supportedActions: [APP_ACTION_TYPES.OPEN, APP_ACTION_TYPES.LAUNCH_INTENT]
    }));

    this.registerApp(new AppCapability({
      domain: 'DEVICE',
      appName: 'Settings',
      packageName: 'com.android.settings',
      supportedActions: [APP_ACTION_TYPES.OPEN, APP_ACTION_TYPES.OPEN_SETTINGS]
    }));

    this.registerApp(new AppCapability({
      domain: 'COMMUNICATION',
      appName: 'Phone',
      packageName: 'com.android.dialer',
      supportedActions: [APP_ACTION_TYPES.OPEN, APP_ACTION_TYPES.CALL]
    }));

    this.registerApp(new AppCapability({
      domain: 'COMMUNICATION',
      appName: 'Messages',
      packageName: 'com.google.android.apps.messaging',
      supportedActions: [APP_ACTION_TYPES.OPEN, APP_ACTION_TYPES.SEND_SMS]
    }));

    this.registerApp(new AppCapability({
      domain: 'DEVICE',
      appName: 'Clock',
      packageName: 'com.google.android.deskclock',
      supportedActions: [APP_ACTION_TYPES.OPEN, APP_ACTION_TYPES.SET_ALARM]
    }));
  }

  registerApp(appCapability) {
    this.apps.set(appCapability.packageName, appCapability);
    return appCapability;
  }

  getApp(packageName) {
    return this.apps.get(packageName) || null;
  }
}

const defaultAppRegistry = new AppCapabilityRegistry();

module.exports = {
  AppCapabilityRegistry,
  defaultAppRegistry
};
