/**
 * JarvisContextChangeDetector
 * Phase 11 Event-Driven Context Change Detection.
 * Detects meaningful environmental, temporal, device, calendar, and app focus changes
 * without resorting to expensive continuous cloud polling.
 */

const CONTEXT_CHANGE_TYPES = Object.freeze({
  CALENDAR_CHANGED: 'CALENDAR_CHANGED',
  TIME_THRESHOLD_REACHED: 'TIME_THRESHOLD_REACHED',
  DEVICE_STATE_CHANGED: 'DEVICE_STATE_CHANGED',
  APP_CHANGED: 'APP_CHANGED',
  LOCATION_CHANGED: 'LOCATION_CHANGED',
  WORKFLOW_CHANGED: 'WORKFLOW_CHANGED',
  USER_INTERACTION: 'USER_INTERACTION',
  TASK_UPDATED: 'TASK_UPDATED',
  MEMORY_UPDATED: 'MEMORY_UPDATED'
});

class JarvisContextChangeDetector {
  constructor() {
    this._lastStateByUser = new Map(); // userId -> { lastApp, lastBattery, lastCalendarCount, lastTimeMins }
  }

  /**
   * Detect single device state changes (e.g. low battery threshold drop)
   */
  detectDeviceStateChange(deviceState = {}, thresholds = {}) {
    const batt = deviceState.batteryLevel ?? 100;
    const isCharging = deviceState.isCharging === true;
    const thresh = thresholds.batteryThreshold || 20;

    if (batt <= thresh && !isCharging) {
      return {
        changeType: 'DEVICE_BATTERY_LOW',
        batteryLevel: batt,
        isCharging: false
      };
    }
    return null;
  }

  /**
   * Compare previous snapshot with current snapshot and identify significant changes
   * @param {number} userId
   * @param {Object} currentSnapshot
   * @returns {Array<{ changeType: string, summary: string, payload: Object }>}
   */
  detectSignificance(userId, currentSnapshot = {}) {
    const changes = [];
    const previous = this._lastStateByUser.get(userId) || null;

    const currentApp = currentSnapshot.activeApplication?.packageName || null;
    const currentBattery = currentSnapshot.deviceState?.batteryLevel ?? 100;
    const calendarEvents = Array.isArray(currentSnapshot.calendarEvents) ? currentSnapshot.calendarEvents : [];
    const currentTimeStr = currentSnapshot.temporal?.currentTime || new Date().toTimeString().substring(0, 5);

    if (!previous) {
      // First observation - establish baseline
      this._lastStateByUser.set(userId, {
        lastApp: currentApp,
        lastBattery: currentBattery,
        lastCalendarCount: calendarEvents.length,
        lastTimeStr: currentTimeStr,
        updatedAt: Date.now()
      });
      return changes;
    }

    // 1. Application Change
    if (currentApp && previous.lastApp && currentApp !== previous.lastApp) {
      changes.push({
        changeType: CONTEXT_CHANGE_TYPES.APP_CHANGED,
        summary: `Switched foreground app from ${previous.lastApp} to ${currentApp}`,
        payload: { previousApp: previous.lastApp, currentApp }
      });
    }

    // 2. Battery State Threshold (Dropped below critical threshold e.g. 15%)
    if (currentBattery <= 15 && previous.lastBattery > 15) {
      changes.push({
        changeType: CONTEXT_CHANGE_TYPES.DEVICE_STATE_CHANGED,
        summary: `Battery level critically low (${currentBattery}%)`,
        payload: { batteryLevel: currentBattery, isLow: true }
      });
    }

    // 3. Calendar Mutation
    if (calendarEvents.length !== previous.lastCalendarCount) {
      changes.push({
        changeType: CONTEXT_CHANGE_TYPES.CALENDAR_CHANGED,
        summary: `Calendar event count changed from ${previous.lastCalendarCount} to ${calendarEvents.length}`,
        payload: { previousCount: previous.lastCalendarCount, currentCount: calendarEvents.length }
      });
    }

    // 4. Time Threshold Trigger (e.g. Approaching an upcoming event within 15 mins)
    const upcoming = calendarEvents.find(e => {
      const diff = e.diffMinutes;
      return diff !== undefined && diff >= 0 && diff <= 20;
    });
    if (upcoming) {
      changes.push({
        changeType: CONTEXT_CHANGE_TYPES.TIME_THRESHOLD_REACHED,
        summary: `Event "${upcoming.title}" starting in ${upcoming.diffMinutes} minutes`,
        payload: { event: upcoming }
      });
    }

    // Update tracked state
    this._lastStateByUser.set(userId, {
      lastApp: currentApp,
      lastBattery: currentBattery,
      lastCalendarCount: calendarEvents.length,
      lastTimeStr: currentTimeStr,
      updatedAt: Date.now()
    });

    return changes;
  }
}

const defaultContextChangeDetector = new JarvisContextChangeDetector();

module.exports = {
  JarvisContextChangeDetector,
  defaultContextChangeDetector,
  CONTEXT_CHANGE_TYPES
};
