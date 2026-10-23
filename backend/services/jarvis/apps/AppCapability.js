const { APP_ACTION_TYPES } = require('./AppAction');

/**
 * AppCapability
 * Encapsulates the specific capabilities and verified action surfaces of an Android app.
 */
class AppCapability {
  constructor({
    domain,
    appName,
    packageName,
    supportedActions = [APP_ACTION_TYPES.OPEN],
    intentTemplates = {}
  }) {
    this.domain = domain;
    this.appName = appName;
    this.packageName = packageName;
    this.supportedActions = supportedActions;
    this.intentTemplates = intentTemplates;
  }

  canPerform(actionType) {
    return this.supportedActions.includes(actionType);
  }
}

module.exports = AppCapability;
