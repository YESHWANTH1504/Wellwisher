/**
 * PredictiveHealthEngine
 * Detects environmental risks (e.g. revoked permissions, battery optimizations) before failures occur.
 */
class PredictiveHealthEngine {
  static evaluatePredictiveRisks({ notificationPermission, calendarPermission, batteryOptimizationIgnored }) {
    const risks = [];

    if (notificationPermission === false) {
      risks.push({
        type: 'NOTIFICATION_PERMISSION_REVOKED',
        severity: 'HIGH',
        userMessage: 'Your notification permission is disabled. Reminders and alerts may not appear.'
      });
    }

    if (calendarPermission === false) {
      risks.push({
        type: 'CALENDAR_PERMISSION_REVOKED',
        severity: 'HIGH',
        userMessage: 'Calendar permission is disabled. Assistant cannot read or write calendar events.'
      });
    }

    if (batteryOptimizationIgnored === false) {
      risks.push({
        type: 'BATTERY_OPTIMIZATION_ACTIVE',
        severity: 'MEDIUM',
        userMessage: 'Battery optimization is active. Foreground assistant service may be suspended by the OS.'
      });
    }

    return {
      overallStatus: risks.length === 0 ? 'HEALTHY' : (risks.some(r => r.severity === 'HIGH') ? 'DEGRADED' : 'AT_RISK'),
      risks,
      evaluatedAt: new Date().toISOString()
    };
  }
}

module.exports = PredictiveHealthEngine;
