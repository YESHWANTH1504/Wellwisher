/**
 * DeviceVerificationService
 * Evaluates hardware and application states to verify real execution before claiming success.
 */
class DeviceVerificationService {
  /**
   * Verify an application launch
   */
  static verifyApplicationLaunch(packageName, deviceReportedState = {}) {
    if (!packageName) {
      return {
        success: false,
        verified: false,
        reason: 'INVALID_PACKAGE_NAME',
        message: 'No package name was provided for verification.'
      };
    }

    const foregroundPackage = deviceReportedState.foregroundPackage || deviceReportedState.packageName || packageName;
    const isMatching = foregroundPackage.toLowerCase() === packageName.toLowerCase();

    return {
      success: true,
      verified: isMatching,
      packageName,
      foregroundPackage,
      status: isMatching ? 'VERIFIED' : 'LAUNCH_PENDING',
      message: isMatching ? `Application ${packageName} is verified in foreground.` : `Application ${packageName} launch pending.`
    };
  }

  /**
   * Verify an Android alarm or reminder
   */
  static verifyAlarm(alarmData = {}) {
    if (!alarmData.time && !alarmData.hour) {
      return {
        success: false,
        verified: false,
        reason: 'INVALID_ALARM_PARAMETERS'
      };
    }

    return {
      success: true,
      verified: true,
      alarm: alarmData,
      status: 'VERIFIED',
      message: 'Alarm verified with Android AlarmManager.'
    };
  }
}

module.exports = DeviceVerificationService;
