/**
 * JarvisReliabilityDashboard
 * Gathers system-wide reliability statistics, provider health metrics, and workflow completion rates.
 */
const ReliabilityScoreEngine = require('../reliability/reliabilityScoreEngine');
const JarvisObservabilityEngine = require('./jarvisObservabilityEngine');

class JarvisReliabilityDashboard {
  static getDiagnosticReport() {
    return {
      timestamp: new Date().toISOString(),
      providers: {
        calendar: ReliabilityScoreEngine.getProviderHealth('ANDROID_CALENDAR_PROVIDER'),
        alarmManager: ReliabilityScoreEngine.getProviderHealth('ANDROID_ALARM_MANAGER'),
        notifications: ReliabilityScoreEngine.getProviderHealth('NOTIFICATION_SERVICE'),
        tts: ReliabilityScoreEngine.getProviderHealth('TTS_ENGINE')
      },
      latencyStats: {
        wakeDetection: JarvisObservabilityEngine.getAggregateStats('wake_detection_ms'),
        intentResolution: JarvisObservabilityEngine.getAggregateStats('intent_resolution_ms')
      },
      systemStatus: 'OPERATIONAL'
    };
  }
}

module.exports = JarvisReliabilityDashboard;
