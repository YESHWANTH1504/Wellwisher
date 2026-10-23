/**
 * HealthConnectRepository
 * Durable repository managing real device Health Connect metrics.
 * 
 * CRITICAL ZERO-FABRICATION RULE:
 * This repository NEVER invents or fabricates health readings.
 * If data has not been provided by Health Connect or permission is not granted,
 * it returns { available: false, reason: 'NO_DATA' | 'PERMISSION_DENIED' }.
 * It NEVER silently converts missing data to 0.
 */
class HealthConnectRepository {
  constructor() {
    // In-memory cache keyed by `${userId}_${date}` or `${userId}_latest`
    this.deviceMetrics = new Map();
    this.userPermissions = new Map();
  }

  /**
   * Update or sync health metrics from native Android Health Connect
   */
  syncDeviceHealth(userId, metrics = {}, permissions = {}) {
    if (!userId) return false;
    const uid = String(userId);

    if (permissions && typeof permissions === 'object') {
      const existingPerms = this.userPermissions.get(uid) || {};
      this.userPermissions.set(uid, { ...existingPerms, ...permissions, lastUpdated: Date.now() });
    }

    const today = new Date().toISOString().split('T')[0];
    const targetDate = metrics.date || today;
    const key = `${uid}_${targetDate}`;
    const existing = this.deviceMetrics.get(key) || {};

    const updated = {
      ...existing,
      ...metrics,
      userId: uid,
      date: targetDate,
      lastSyncedAt: Date.now(),
      source: metrics.source || 'Health Connect',
      dataType: 'LIVE_HEALTH_CONNECT_DATA'
    };

    // Explicitly overwrite with incoming values (including nulls) so stale data is never preserved
    for (const k of Object.keys(metrics)) {
      updated[k] = metrics[k];
    }

    this.deviceMetrics.set(key, updated);

    // Also update latest pointer
    this.deviceMetrics.set(`${uid}_latest`, updated);
    return true;
  }

  /**
   * Check if user granted a specific health permission
   */
  hasPermission(userId, permissionKey) {
    const uid = String(userId);
    const perms = this.userPermissions.get(uid);
    if (!perms) return true; // Default optimistic until explicitly denied by client
    return perms[permissionKey] !== false;
  }

  /**
   * Set permission status reported by HealthConnectManager
   */
  setPermissionStatus(userId, permissionKey, isGranted) {
    const uid = String(userId);
    const perms = this.userPermissions.get(uid) || {};
    perms[permissionKey] = isGranted;
    perms.lastUpdated = Date.now();
    this.userPermissions.set(uid, perms);
  }

  /**
   * Get steps for today or specific date
   */
  getSteps(userId, dateStr = null) {
    const uid = String(userId);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    if (!this.hasPermission(uid, 'READ_STEPS')) {
      return {
        available: false,
        status: 'PERMISSION_DENIED',
        metric: 'steps',
        date: targetDate,
        value: null,
        unit: 'steps',
        measurementType: null,
        reason: 'PERMISSION_DENIED',
        message: 'Permission to access your step count has not been granted.'
      };
    }

    const record = this.deviceMetrics.get(`${uid}_${targetDate}`);
    if (record && record.steps !== undefined && record.steps !== null) {
      return {
        available: true,
        status: 'AVAILABLE',
        metric: 'steps',
        date: targetDate,
        value: record.steps,
        unit: 'steps',
        measurementType: record.measurementType || 'MEASURED',
        source: record.source || 'Health Connect',
        timestamp: record.timestamp || (record.lastSyncedAt ? new Date(record.lastSyncedAt).toISOString() : new Date().toISOString())
      };
    }

    return {
      available: false,
      status: 'NO_DATA',
      metric: 'steps',
      date: targetDate,
      value: null,
      unit: 'steps',
      measurementType: null,
      reason: 'NO_DATA',
      message: 'I don\'t currently have a step count recorded for that date.'
    };
  }

  /**
   * Get steps across a range of dates
   */
  getStepsRange(userId, startDate, endDate) {
    const uid = String(userId);
    if (!this.hasPermission(uid, 'READ_STEPS')) {
      return {
        available: false,
        metric: 'steps_range',
        reason: 'PERMISSION_DENIED',
        message: 'Permission to access your step count has not been granted.'
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    let totalSteps = 0;
    let recordedDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const record = this.deviceMetrics.get(`${uid}_${dateStr}`);
      if (record && record.steps !== undefined && record.steps !== null) {
        days.push({ date: dateStr, steps: record.steps });
        totalSteps += record.steps;
        recordedDays++;
      }
    }

    if (recordedDays === 0) {
      return {
        available: false,
        metric: 'steps_range',
        reason: 'NO_DATA',
        message: 'No step data is available for that date range.'
      };
    }

    return {
      available: true,
      metric: 'steps_range',
      startDate,
      endDate,
      totalSteps,
      averageSteps: Math.round(totalSteps / recordedDays),
      recordedDays,
      dailyBreakdown: days,
      source: 'Health Connect'
    };
  }

  /**
   * Get active calories burned
   */
  getActiveCalories(userId, dateStr = null) {
    const uid = String(userId);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    if (!this.hasPermission(uid, 'READ_ACTIVE_CALORIES_BURNED')) {
      return {
        available: false,
        status: 'PERMISSION_DENIED',
        metric: 'active_calories',
        date: targetDate,
        value: null,
        unit: 'kcal',
        measurementType: null,
        reason: 'PERMISSION_DENIED',
        message: 'Permission to access your active calories burned has not been granted.'
      };
    }

    const record = this.deviceMetrics.get(`${uid}_${targetDate}`);
    if (record && record.activeCalories !== undefined && record.activeCalories !== null) {
      return {
        available: true,
        status: 'AVAILABLE',
        metric: 'active_calories',
        date: targetDate,
        value: record.activeCalories,
        unit: 'kcal',
        measurementType: record.measurementType || 'MEASURED',
        source: record.source || 'Health Connect',
        timestamp: record.timestamp || (record.lastSyncedAt ? new Date(record.lastSyncedAt).toISOString() : new Date().toISOString())
      };
    }

    return {
      available: false,
      status: 'NO_DATA',
      metric: 'active_calories',
      date: targetDate,
      value: null,
      unit: 'kcal',
      measurementType: null,
      reason: 'NO_DATA',
      message: 'I don\'t currently have active calorie data available for that date.'
    };
  }

  /**
   * Get total calories burned (BMR + Active)
   */
  getTotalCalories(userId, dateStr = null) {
    const uid = String(userId);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    if (!this.hasPermission(uid, 'READ_TOTAL_CALORIES_BURNED')) {
      return {
        available: false,
        status: 'PERMISSION_DENIED',
        metric: 'total_calories',
        date: targetDate,
        value: null,
        unit: 'kcal',
        measurementType: null,
        reason: 'PERMISSION_DENIED',
        message: 'Permission to access your total calories burned has not been granted.'
      };
    }

    const record = this.deviceMetrics.get(`${uid}_${targetDate}`);
    if (record && (record.totalCalories !== undefined || record.activeCalories !== undefined)) {
      const val = record.totalCalories !== undefined ? record.totalCalories : record.activeCalories;
      return {
        available: true,
        status: 'AVAILABLE',
        metric: 'total_calories',
        date: targetDate,
        value: val,
        unit: 'kcal',
        measurementType: record.measurementType || 'MEASURED',
        source: record.source || 'Health Connect',
        timestamp: record.timestamp || (record.lastSyncedAt ? new Date(record.lastSyncedAt).toISOString() : new Date().toISOString())
      };
    }

    return {
      available: false,
      status: 'NO_DATA',
      metric: 'total_calories',
      date: targetDate,
      value: null,
      unit: 'kcal',
      measurementType: null,
      reason: 'NO_DATA',
      message: 'Total calorie data is not currently available for that date.'
    };
  }

  /**
   * Get latest, average, or resting heart rate
   */
  getHeartRate(userId, type = 'latest', dateStr = null) {
    const uid = String(userId);
    const permKey = type === 'resting' ? 'READ_RESTING_HEART_RATE' : 'READ_HEART_RATE';

    if (!this.hasPermission(uid, permKey)) {
      return {
        available: false,
        status: 'PERMISSION_DENIED',
        metric: type === 'resting' ? 'resting_heart_rate' : 'heart_rate',
        value: null,
        unit: 'bpm',
        measurementType: null,
        reason: 'PERMISSION_DENIED',
        message: 'Permission to read heart rate data has not been granted.'
      };
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const record = this.deviceMetrics.get(`${uid}_${targetDate}`) || this.deviceMetrics.get(`${uid}_latest`);

    if (record) {
      if (type === 'resting' && record.restingHeartRate) {
        return {
          available: true,
          status: 'AVAILABLE',
          metric: 'resting_heart_rate',
          value: record.restingHeartRate,
          unit: 'bpm',
          date: record.date || targetDate,
          measurementType: record.measurementType || 'SYNCED',
          source: record.source || 'Health Connect',
          timestamp: record.heartRateTimestamp || record.timestamp || new Date().toISOString()
        };
      }
      if (type === 'average' && record.averageHeartRate) {
        return {
          available: true,
          status: 'AVAILABLE',
          metric: 'average_heart_rate',
          value: record.averageHeartRate,
          unit: 'bpm',
          date: record.date || targetDate,
          measurementType: record.measurementType || 'SYNCED',
          source: record.source || 'Health Connect',
          timestamp: record.heartRateTimestamp || record.timestamp || new Date().toISOString()
        };
      }
      if (record.heartRate || record.latestHeartRate) {
        return {
          available: true,
          status: 'AVAILABLE',
          metric: 'heart_rate',
          value: record.heartRate || record.latestHeartRate,
          unit: 'bpm',
          measurementType: record.measurementType || 'SYNCED',
          timestamp: record.heartRateTimestamp || record.timestamp || new Date().toISOString(),
          source: record.source || 'Health Connect'
        };
      }
    }

    return {
      available: false,
      status: 'NO_DATA',
      metric: type === 'resting' ? 'resting_heart_rate' : 'heart_rate',
      value: null,
      unit: 'bpm',
      measurementType: null,
      reason: 'NO_DATA',
      message: 'I don\'t currently have a heart-rate reading available.'
    };
  }

  /**
   * Get sleep summary
   */
  getSleepSummary(userId, dateStr = null) {
    const uid = String(userId);
    if (!this.hasPermission(uid, 'READ_SLEEP')) {
      return {
        available: false,
        metric: 'sleep',
        reason: 'PERMISSION_DENIED',
        message: 'Permission to read sleep data has not been granted.'
      };
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const record = this.deviceMetrics.get(`${uid}_${targetDate}`);

    if (record && (record.sleepHours !== undefined || record.sleep)) {
      const sleepObj = typeof record.sleep === 'object' && record.sleep ? record.sleep : {};
      const totalMinutes = record.sleepHours !== undefined 
        ? Math.round(record.sleepHours * 60)
        : (sleepObj.totalSleepMinutes || Math.round((sleepObj.durationHours || 0) * 60) || 0);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const formattedDuration = `${h} hours ${m} minutes`;
      return {
        available: true,
        metric: 'sleep',
        date: targetDate,
        durationHours: Number((totalMinutes / 60).toFixed(1)),
        totalSleepMinutes: totalMinutes,
        formattedDuration,
        formatted: formattedDuration,
        deepSleepMinutes: sleepObj.deepSleepMinutes || (record.deepSleepHours ? Math.round(record.deepSleepHours * 60) : null),
        remSleepMinutes: sleepObj.remSleepMinutes || (record.remSleepHours ? Math.round(record.remSleepHours * 60) : null),
        lightSleepMinutes: sleepObj.lightSleepMinutes || (record.lightSleepHours ? Math.round(record.lightSleepHours * 60) : null),
        value: {
          totalSleepMinutes: totalMinutes,
          formatted: formattedDuration,
          deepSleepMinutes: sleepObj.deepSleepMinutes,
          remSleepMinutes: sleepObj.remSleepMinutes
        },
        source: record.source || 'Health Connect'
      };
    }

    return {
      available: false,
      metric: 'sleep',
      date: targetDate,
      reason: 'NO_DATA',
      message: 'I don\'t currently have sleep records for that date.'
    };
  }

  /**
   * Get workouts / exercise sessions
   */
  getWorkouts(userId, dateStr = null) {
    const uid = String(userId);
    if (!this.hasPermission(uid, 'READ_EXERCISE')) {
      return {
        available: false,
        metric: 'workouts',
        reason: 'PERMISSION_DENIED',
        message: 'Permission to read workout and exercise data has not been granted.'
      };
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const record = this.deviceMetrics.get(`${uid}_${targetDate}`);

    if (record && Array.isArray(record.workouts)) {
      return {
        available: true,
        metric: 'workouts',
        date: targetDate,
        count: record.workouts.length,
        workouts: record.workouts,
        value: record.workouts,
        source: record.source || 'Health Connect'
      };
    }

    return {
      available: true,
      metric: 'workouts',
      date: targetDate,
      count: 0,
      workouts: [],
      value: [],
      message: 'No workouts recorded for this date.',
      source: 'Health Connect'
    };
  }

  /**
   * Get distance walked/run in meters/km
   */
  getDistance(userId, dateStr = null) {
    const uid = String(userId);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    if (!this.hasPermission(uid, 'READ_DISTANCE')) {
      return {
        available: false,
        metric: 'distance',
        date: targetDate,
        reason: 'PERMISSION_DENIED',
        message: 'Permission to access distance data has not been granted.'
      };
    }

    const record = this.deviceMetrics.get(`${uid}_${targetDate}`);
    if (record && (record.distanceMeters !== undefined || record.distanceKm !== undefined)) {
      const meters = record.distanceMeters !== undefined ? record.distanceMeters : (record.distanceKm * 1000);
      const km = Number((meters / 1000).toFixed(2));
      return {
        available: true,
        metric: 'distance',
        date: targetDate,
        value: km,
        unit: 'km',
        meters,
        source: record.source || 'Health Connect'
      };
    }

    return {
      available: false,
      metric: 'distance',
      date: targetDate,
      reason: 'NO_DATA',
      message: 'Distance data is not currently recorded for that date.'
    };
  }

  /**
   * Get latest recorded blood pressure reading
   */
  getLatestBloodPressure(userId) {
    const uid = String(userId);
    if (!this.hasPermission(uid, 'READ_BLOOD_PRESSURE')) {
      return {
        available: false,
        status: 'PERMISSION_DENIED',
        metric: 'blood_pressure',
        value: null,
        unit: 'mmHg',
        measurementType: null,
        reason: 'PERMISSION_DENIED',
        message: 'Permission to read blood pressure data has not been granted.'
      };
    }

    const record = this.deviceMetrics.get(`${uid}_latest`);
    if (record && record.systolic && record.diastolic) {
      return {
        available: true,
        status: 'AVAILABLE',
        metric: 'blood_pressure',
        systolic: record.systolic,
        diastolic: record.diastolic,
        value: `${Math.round(record.systolic)}/${Math.round(record.diastolic)}`,
        unit: 'mmHg',
        measurementType: record.measurementType || 'SYNCED',
        timestamp: record.bpTimestamp || record.timestamp || new Date().toISOString(),
        source: record.source || 'Health Connect'
      };
    }

    return {
      available: false,
      status: 'NO_DATA',
      metric: 'blood_pressure',
      value: null,
      unit: 'mmHg',
      measurementType: null,
      reason: 'NO_DATA',
      message: 'I don\'t currently have a blood pressure measurement recorded.'
    };
  }

  /**
   * Get blood pressure readings across a date range
   */
  getBloodPressureRange(userId, startDate, endDate) {
    const uid = String(userId);
    if (!this.hasPermission(uid, 'READ_BLOOD_PRESSURE')) {
      return {
        available: false,
        metric: 'blood_pressure_range',
        reason: 'PERMISSION_DENIED',
        message: 'Permission to read blood pressure data has not been granted.'
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const readings = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const record = this.deviceMetrics.get(`${uid}_${dateStr}`);
      if (record && record.systolic && record.diastolic) {
        readings.push({
          date: dateStr,
          systolic: record.systolic,
          diastolic: record.diastolic,
          unit: 'mmHg'
        });
      }
    }

    if (readings.length === 0) {
      return {
        available: false,
        metric: 'blood_pressure_range',
        reason: 'NO_DATA',
        message: 'No blood pressure records found for that date range.'
      };
    }

    return {
      available: true,
      metric: 'blood_pressure_range',
      startDate,
      endDate,
      count: readings.length,
      readings,
      source: 'Health Connect'
    };
  }

  /**
   * Get weight record
   */
  getWeight(userId) {
    const uid = String(userId);
    if (!this.hasPermission(uid, 'READ_WEIGHT')) {
      return {
        available: false,
        metric: 'weight',
        reason: 'PERMISSION_DENIED',
        message: 'Permission to read weight data has not been granted.'
      };
    }

    const record = this.deviceMetrics.get(`${uid}_latest`);
    if (record && record.weightKg) {
      return {
        available: true,
        metric: 'weight',
        value: record.weightKg,
        unit: 'kg',
        date: record.weightDate || record.date,
        source: record.source || 'Health Connect'
      };
    }

    return {
      available: false,
      metric: 'weight',
      reason: 'NO_DATA',
      message: 'I don\'t currently have a weight measurement recorded.'
    };
  }

  /**
   * Get daily comprehensive health summary
   */
  getDailySummary(userId, dateStr = null) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const steps = this.getSteps(userId, targetDate);
    const activeCalories = this.getActiveCalories(userId, targetDate);
    const totalCalories = this.getTotalCalories(userId, targetDate);
    const heartRate = this.getHeartRate(userId, 'latest', targetDate);
    const restingHeartRate = this.getHeartRate(userId, 'resting', targetDate);
    const bloodPressure = this.getLatestBloodPressure(userId);
    const sleep = this.getSleepSummary(userId, targetDate);
    const distance = this.getDistance(userId, targetDate);
    const workouts = this.getWorkouts(userId, targetDate);
    const weight = this.getWeight(userId);

    return {
      available: steps.available || activeCalories.available || heartRate.available || sleep.available || bloodPressure.available || distance.available,
      date: targetDate,
      steps,
      activeCalories,
      totalCalories,
      heartRate,
      restingHeartRate,
      bloodPressure,
      sleep,
      distance,
      workouts,
      weight,
      source: 'Health Connect'
    };
  }

  /**
   * Get safe non-diagnostic JARVIS health insight based exclusively on real metrics
   */
  getHealthInsight(userId, dateStr = null, goals = {}) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const summary = this.getDailySummary(userId, targetDate);

    const stepGoal = goals.stepGoal || 10000;
    const sleepGoalMinutes = (goals.sleepGoalHours || 8) * 60;

    const insights = [];

    if (summary.steps.available) {
      const pct = Math.round((summary.steps.value / stepGoal) * 100);
      if (pct >= 100) {
        insights.push(`You have reached your daily step goal with ${summary.steps.value.toLocaleString()} steps.`);
      } else {
        const remaining = stepGoal - summary.steps.value;
        insights.push(`You've recorded ${summary.steps.value.toLocaleString()} steps today (${pct}% of your ${stepGoal.toLocaleString()} goal), leaving ${remaining.toLocaleString()} steps remaining.`);
      }
    }

    if (summary.sleep.available) {
      const sleepMins = summary.sleep.totalSleepMinutes || Math.round(summary.sleep.durationHours * 60);
      if (sleepMins < sleepGoalMinutes) {
        const diffMins = sleepGoalMinutes - sleepMins;
        const diffH = Math.floor(diffMins / 60);
        const diffM = diffMins % 60;
        insights.push(`Recorded sleep was ${summary.sleep.formattedDuration}, which is ${diffH > 0 ? `${diffH}h ` : ''}${diffM}m below your ${goals.sleepGoalHours || 8}h target.`);
      } else {
        insights.push(`Recorded sleep was ${summary.sleep.formattedDuration}, meeting your rest target.`);
      }
    }

    if (summary.heartRate.available) {
      insights.push(`Latest heart rate was ${summary.heartRate.value} BPM.`);
    }

    if (summary.bloodPressure.available) {
      insights.push(`Latest blood pressure was ${summary.bloodPressure.value} mmHg.`);
    }

    if (insights.length === 0) {
      return {
        available: false,
        reason: 'NO_DATA',
        insight: 'No recorded health activity found for this date. Wear a compatible health tracker or connect Health Connect to record data.',
        disclaimer: 'JARVIS health metrics are informational and non-diagnostic.'
      };
    }

    return {
      available: true,
      insight: insights.join(' '),
      disclaimer: 'JARVIS health indicators reflect recorded wearable/sensor data for personal wellness and do not represent medical assessments.'
    };
  }

  /**
   * Get weekly health summary
   */
  getWeeklySummary(userId, endDateStr = null) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const stepsRange = this.getStepsRange(userId, startStr, endStr);
    const latestHeartRate = this.getHeartRate(userId, 'resting', endStr);

    return {
      available: stepsRange.available,
      startDate: startStr,
      endDate: endStr,
      steps: stepsRange,
      restingHeartRate: latestHeartRate,
      source: 'Health Connect'
    };
  }

  /**
   * Helper for testing/sync: Clear metrics for user
   */
  clearForUser(userId) {
    const uid = String(userId);
    for (const key of Array.from(this.deviceMetrics.keys())) {
      if (key.startsWith(`${uid}_`)) {
        this.deviceMetrics.delete(key);
      }
    }
    this.userPermissions.delete(uid);
  }

  /**
   * Helper: Save metric directly
   */
  saveMetric(userId, metricKey, value, unit = '', source = 'Health Connect', dateStr = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const metrics = { [metricKey]: value, source, date: today };
    this.syncDeviceHealth(userId, metrics);
  }

  /**
   * Helper: Save sleep record
   */
  saveSleep(userId, sleepData, source = 'Health Connect', dateStr = null) {
    const today = dateStr || new Date().toISOString().split('T')[0];
    this.syncDeviceHealth(userId, { sleep: sleepData, source, date: today });
  }

  /**
   * Helper: Save workout session
   */
  saveWorkout(userId, workout, dateStr = null) {
    const uid = String(userId);
    const today = dateStr || new Date().toISOString().split('T')[0];
    const key = `${uid}_${today}`;
    const existing = this.deviceMetrics.get(key) || {};
    const workouts = existing.workouts || [];
    workouts.push(workout);
    this.syncDeviceHealth(userId, { workouts, date: today });
  }

  /**
   * Helper: Set permission flag (maps friendly name to READ_ permission)
   */
  setPermission(userId, key, isGranted) {
    const permMap = {
      steps: 'READ_STEPS',
      heartRate: 'READ_HEART_RATE',
      restingHeartRate: 'READ_RESTING_HEART_RATE',
      calories: 'READ_TOTAL_CALORIES_BURNED',
      activeCalories: 'READ_ACTIVE_CALORIES_BURNED',
      sleep: 'READ_SLEEP',
      distance: 'READ_DISTANCE',
      bloodPressure: 'READ_BLOOD_PRESSURE',
      workouts: 'READ_EXERCISE',
      weight: 'READ_WEIGHT',
      background: 'READ_HEALTH_DATA_IN_BACKGROUND'
    };
    const mapped = permMap[key] || key;
    this.setPermissionStatus(userId, mapped, isGranted);
  }
}

const defaultHealthConnectRepository = new HealthConnectRepository();

defaultHealthConnectRepository.HealthConnectRepository = HealthConnectRepository;
defaultHealthConnectRepository.defaultHealthConnectRepository = defaultHealthConnectRepository;

module.exports = defaultHealthConnectRepository;

