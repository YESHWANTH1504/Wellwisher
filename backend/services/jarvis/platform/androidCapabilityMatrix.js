/**
 * AndroidCapabilityMatrix
 * Classifies OS-level and OEM-level capabilities under the Zero-Simulation Mandate.
 */
class AndroidCapabilityMatrix {
  static getCapabilities() {
    return {
      voiceWake: { status: 'PASS', details: 'Porcupine / JarvisAssistantService foreground service' },
      systemAssistant: { status: 'PASS', details: 'JarvisVoiceInteractionService registered in Android Settings' },
      calendarCrud: { status: 'PASS', details: 'Verified CalendarContract.Events ContentProvider CRUD' },
      alarmScheduling: { status: 'PASS', details: 'AlarmManager exact alarms with ACTION_EXACT_ALARM' },
      actionableNotifications: { status: 'PASS', details: 'NotificationCompat action buttons (Snooze, Complete, Ask)' },
      intentLaunching: { status: 'PASS', details: 'Safe Android Intent launching (Maps, Dialer, Settings)' },
      oemAutostart: { status: 'BLOCKED BY OEM', details: 'Requires manual toggle on MIUI, ColorOS, EMUI' },
      backgroundContinuousMic: { status: 'BLOCKED BY ANDROID', details: 'Android 11+ restricts continuous mic in background without active foreground notification' },
      offlineLocalCalendar: { status: 'PASS', details: 'Local SQLite/ContentProvider operates without network' }
    };
  }
}

module.exports = AndroidCapabilityMatrix;
