/**
 * AppAction
 * Typed application action schema.
 * Only actions supported through Android Intents, public APIs, or deep links are exposed.
 */
const APP_ACTION_TYPES = Object.freeze({
  OPEN: 'OPEN',
  LAUNCH_INTENT: 'LAUNCH_INTENT',
  CALL: 'CALL',
  SEND_SMS: 'SEND_SMS',
  SET_ALARM: 'SET_ALARM',
  OPEN_SETTINGS: 'OPEN_SETTINGS',
  CALENDAR_EVENT: 'CALENDAR_EVENT'
});

class AppAction {
  constructor({
    actionType,
    packageName,
    appName,
    intentAction,
    intentData,
    parameters = {}
  }) {
    this.actionType = actionType;
    this.packageName = packageName;
    this.appName = appName;
    this.intentAction = intentAction;
    this.intentData = intentData;
    this.parameters = parameters;
  }
}

module.exports = {
  AppAction,
  APP_ACTION_TYPES
};
