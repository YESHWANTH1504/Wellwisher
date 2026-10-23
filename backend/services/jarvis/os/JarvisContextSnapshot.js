/**
 * JarvisContextSnapshot
 * Authoritative, immutable personal context snapshot unifying device state,
 * active task, semantic memory, health metrics, and on-screen awareness.
 */
class JarvisContextSnapshot {
  constructor({
    user = {},
    time = new Date().toISOString(),
    timezone = 'UTC',
    location = null,
    deviceState = {},
    currentApplication = null,
    currentApp = null,
    screenContext = null,
    previousApp = null,
    recentApps = [],
    activeCapability = null,
    lastAppAction = null,
    activeConversation = null,
    activeTask = null,
    recentEntities = [],
    calendar = [],
    reminders = [],
    notifications = [],
    healthState = {},
    memory = [],
    preferences = {},
    habits = [],
    workflowState = null,
    availableCapabilities = [],
    permissions = {},
    metadata = {}
  } = {}) {
    this.user = {
      userId: user.userId || user.id || null,
      name: user.name || 'User',
      email: user.email || ''
    };
    this.time = time;
    this.timezone = timezone;
    this.location = location; // null unless permitted
    this.deviceState = {
      batteryLevel: deviceState.batteryLevel ?? null,
      isCharging: deviceState.isCharging ?? false,
      networkConnected: deviceState.networkConnected ?? true,
      networkType: deviceState.networkType || 'WIFI',
      deviceModel: deviceState.deviceModel || 'Android Device',
      androidVersion: deviceState.androidVersion || '16',
      ...deviceState
    };
    const targetApp = currentApp || currentApplication;
    this.currentApplication = targetApp;
    this.currentApp = targetApp ? {
      packageName: typeof targetApp === 'string' ? targetApp : (targetApp.packageName || 'unknown'),
      applicationLabel: typeof targetApp === 'string' ? targetApp : (targetApp.applicationLabel || targetApp.appName || 'Application'),
      activity: typeof targetApp === 'object' ? targetApp.activity : null,
      timestamp: (typeof targetApp === 'object' && targetApp.timestamp) ? targetApp.timestamp : Date.now(),
      confidence: (typeof targetApp === 'object' && targetApp.confidence) ? targetApp.confidence : 0.98,
      source: (typeof targetApp === 'object' && targetApp.source) ? targetApp.source : 'SYSTEM_WINDOW_FOCUS'
    } : null;
    this.previousApp = previousApp;
    this.recentApps = Array.isArray(recentApps) ? recentApps : [];
    this.activeCapability = activeCapability;
    this.lastAppAction = lastAppAction;
    this.screenContext = screenContext;
    this.activeConversation = activeConversation;
    this.activeTask = activeTask;
    this.recentEntities = Array.isArray(recentEntities) ? recentEntities : [];
    this.calendar = Array.isArray(calendar) ? calendar : [];
    this.reminders = Array.isArray(reminders) ? reminders : [];
    this.notifications = Array.isArray(notifications) ? notifications : [];
    this.healthState = {
      steps: healthState.steps ?? null,
      heartRate: healthState.heartRate ?? null,
      restingHeartRate: healthState.restingHeartRate ?? null,
      activeCalories: healthState.activeCalories ?? null,
      sleepSummary: healthState.sleepSummary ?? null,
      source: healthState.source || 'HEALTH_CONNECT'
    };
    this.memory = Array.isArray(memory) ? memory : [];
    this.preferences = preferences || {};
    this.habits = habits || [];
    this.workflowState = workflowState;
    this.availableCapabilities = availableCapabilities;
    this.permissions = permissions;
    this.metadata = metadata || {};
    this.provenance = {
      createdAt: Date.now(),
      confidence: metadata.confidence || 1.0,
      privacyClassification: metadata.privacy || 'PROTECTED',
      ...this.metadata
    };
  }

  isTaskActive() {
    return Boolean(this.activeTask && this.activeTask.status !== 'COMPLETED' && this.activeTask.status !== 'CANCELLED');
  }

  hasHealthData(metric) {
    return this.healthState && this.healthState[metric] !== null && this.healthState[metric] !== undefined;
  }
}

module.exports = JarvisContextSnapshot;
