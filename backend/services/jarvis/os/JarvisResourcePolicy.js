/**
 * JarvisResourcePolicy
 * Evaluates device battery, charging state, thermal status, and memory pressure
 * to prevent local AI execution from degrading device health or draining battery.
 */

const THERMAL_STATES = Object.freeze({
  NORMAL: 'NORMAL',
  LIGHT: 'LIGHT',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
  CRITICAL: 'CRITICAL',
  THROTTLED: 'THROTTLED'
});

class JarvisResourcePolicy {
  constructor(options = {}) {
    this._batteryLevel = options.batteryLevel !== undefined ? options.batteryLevel : 100;
    this._isCharging = options.isCharging !== undefined ? options.isCharging : false;
    this._thermalState = options.thermalState || THERMAL_STATES.NORMAL;
    this._cpuPressure = options.cpuPressure || 'LOW';
    this._memoryBudgetMb = options.memoryBudgetMb || 512;
  }

  setDeviceStatus({ batteryLevel, isCharging, thermalState, cpuPressure }) {
    if (batteryLevel !== undefined) this._batteryLevel = Number(batteryLevel);
    if (isCharging !== undefined) this._isCharging = Boolean(isCharging);
    if (thermalState) this._thermalState = String(thermalState).toUpperCase();
    if (cpuPressure) this._cpuPressure = String(cpuPressure).toUpperCase();
  }

  getDeviceStatus() {
    return {
      batteryLevel: this._batteryLevel,
      isCharging: this._isCharging,
      thermalState: this._thermalState,
      cpuPressure: this._cpuPressure,
      memoryBudgetMb: this._memoryBudgetMb
    };
  }

  /**
   * Evaluate whether local execution is permitted given current device thermals and battery
   * @param {string} taskType
   * @param {Object} options
   * @returns {{ permitted: boolean, reason: string, throttled: boolean }}
   */
  evaluateResourceConstraints(taskType = 'FAST', options = {}) {
    // 1. Critical battery constraint: < 15% and not plugged into charger
    if (this._batteryLevel < 15 && !this._isCharging) {
      if (taskType === 'HEAVY_LOCAL_REASONING' || taskType === 'VISION') {
        return {
          permitted: false,
          throttled: true,
          reason: 'Low battery (<15%) while discharging prevents intensive on-device inference.'
        };
      }
    }

    // 2. Severe Thermal Constraint: thermal throttling active
    if (
      this._thermalState === THERMAL_STATES.SEVERE ||
      this._thermalState === THERMAL_STATES.CRITICAL ||
      this._thermalState === THERMAL_STATES.THROTTLED
    ) {
      if (taskType === 'HEAVY_LOCAL_REASONING' || taskType === 'LOCAL_VISION') {
        return {
          permitted: false,
          throttled: true,
          reason: `Device thermal state (${this._thermalState}) prohibits high-compute local inference.`
        };
      }
    }

    // 3. Normal / light load permitted
    return {
      permitted: true,
      throttled: false,
      reason: 'Device resources within acceptable operating limits.'
    };
  }

  reset() {
    this._batteryLevel = 100;
    this._isCharging = false;
    this._thermalState = THERMAL_STATES.NORMAL;
    this._cpuPressure = 'LOW';
  }
}

const defaultResourcePolicy = new JarvisResourcePolicy();

module.exports = {
  JarvisResourcePolicy,
  defaultResourcePolicy,
  THERMAL_STATES
};
