import 'jarvis_native_bridge.dart';

/// HealthConnectBridge
/// Flutter client bridge for Android Health Connect integration.
/// Authoritative client communication with native Android HealthConnectManager.
class HealthConnectBridge {
  static Future<bool> isAvailable() => JarvisNativeBridge.isHealthConnectAvailable();

  static Future<Map<String, bool>> checkPermissions() => JarvisNativeBridge.checkHealthPermissions();

  static Future<bool> openSettings() => JarvisNativeBridge.openHealthSettings();

  static Future<bool> requestPermissions() => JarvisNativeBridge.requestHealthPermissions();

  static Future<Map<String, dynamic>> getBackgroundCapability() => JarvisNativeBridge.getBackgroundHealthCapability();

  static Future<Map<String, dynamic>> getStepsToday() => JarvisNativeBridge.getStepsToday();

  static Future<Map<String, dynamic>> getStepsForDate(String? date) => JarvisNativeBridge.getStepsForDate(date);

  static Future<Map<String, dynamic>> getStepsRange(String start, String end) => JarvisNativeBridge.getStepsRange(start, end);

  static Future<Map<String, dynamic>> getActiveCaloriesToday() => JarvisNativeBridge.getActiveCaloriesToday();

  static Future<Map<String, dynamic>> getTotalCaloriesToday() => JarvisNativeBridge.getTotalCaloriesToday();

  static Future<Map<String, dynamic>> getCaloriesForDate(String? date) => JarvisNativeBridge.getCaloriesForDate(date);

  static Future<Map<String, dynamic>> getLatestHeartRate() => JarvisNativeBridge.getLatestHeartRate();

  static Future<Map<String, dynamic>> getRestingHeartRate() => JarvisNativeBridge.getRestingHeartRate();

  static Future<Map<String, dynamic>> getLatestBloodPressure() => JarvisNativeBridge.getLatestBloodPressure();

  static Future<Map<String, dynamic>> getBloodPressureRange(String start, String end) => JarvisNativeBridge.getBloodPressureRange(start, end);

  static Future<Map<String, dynamic>> getSleepSummary([String? date]) => JarvisNativeBridge.getSleepSummary(date);

  static Future<Map<String, dynamic>> getDistanceToday() => JarvisNativeBridge.getDistanceToday();

  static Future<Map<String, dynamic>> getDistanceForDate(String? date) => JarvisNativeBridge.getDistanceForDate(date);

  static Future<Map<String, dynamic>> getWorkouts([String? date]) => JarvisNativeBridge.getWorkouts(date);

  static Future<Map<String, dynamic>> getLatestWeight() => JarvisNativeBridge.getLatestWeight();

  static Future<Map<String, dynamic>> getWeightHistory() => JarvisNativeBridge.getWeightHistory();

  static Future<Map<String, dynamic>> getFullHealthSnapshot([String? date]) => JarvisNativeBridge.getFullHealthSnapshot(date);
}
