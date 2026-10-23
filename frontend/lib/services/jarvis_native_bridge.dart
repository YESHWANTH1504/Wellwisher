import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// JARVIS Native Android Bridge
/// Communicates with native Android Assistant Services, Battery Optimization,
/// and Device Calendar Provider.
class JarvisNativeBridge {
  static const MethodChannel _channel = MethodChannel('com.example.wellwisher/jarvis_native');

  /// Open an installed application by package name
  static Future<Map<String, dynamic>> openApplication(String packageName, {String? appName}) async {
    debugPrint('[JARVIS_NATIVE] request openApplication: $packageName');
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'executed': false, 'verified': false, 'error': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('openApplication', {
        'packageName': packageName,
        'appName': appName,
      });
      final map = res != null ? Map<String, dynamic>.from(res) : <String, dynamic>{'success': false, 'executed': false, 'verified': false, 'error': 'NULL_RESPONSE'};
      debugPrint('[JARVIS_NATIVE] openApplication result: $map');
      return map;
    } on PlatformException catch (e) {
      debugPrint('[JARVIS_NATIVE] PlatformException: ${e.message}');
      return {
        'success': false,
        'executed': false,
        'verified': false,
        'action': 'OPEN_APPLICATION',
        'packageName': packageName,
        'error': e.code,
        'message': e.message
      };
    } catch (e) {
      debugPrint('[JARVIS_NATIVE] Exception: $e');
      return {
        'success': false,
        'executed': false,
        'verified': false,
        'action': 'OPEN_APPLICATION',
        'packageName': packageName,
        'error': 'EXCEPTION',
        'message': e.toString()
      };
    }
  }

  /// Check if a package is installed on the device
  static Future<bool> isApplicationInstalled(String packageName) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('isApplicationInstalled', {
        'packageName': packageName,
      });
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Sync the active server base URL to native Android JARVIS services
  static Future<void> setBaseUrl(String url) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _channel.invokeMethod('setBaseUrl', {'url': url});
    } catch (_) {}
  }

  /// Sync authenticated JWT session token to native Android JARVIS services
  static Future<void> setAuthToken(String token) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _channel.invokeMethod('setAuthToken', {'token': token});
    } catch (_) {}
  }

  /// Sync authenticated user display name / username to native Android JARVIS services
  static Future<void> setUserName(String userName) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await _channel.invokeMethod('setUserName', {'userName': userName});
    } catch (_) {}
  }

  /// Launch an explicit or implicit Android intent
  static Future<Map<String, dynamic>> launchIntent({
    required String action,
    String? uri,
    String? packageName,
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false, 'error': 'UNSUPPORTED_PLATFORM'};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('launchIntent', {
        'action': action,
        'uri': uri,
        'packageName': packageName,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }


  /// Open specific system settings (e.g. wifi, bluetooth, sound, display, battery, apps)
  static Future<Map<String, dynamic>> openSettings(String settingType) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('openSettings', {
        'settingType': settingType,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Set native device alarm
  static Future<Map<String, dynamic>> setDeviceAlarm({required int hour, required int minute, String message = 'JARVIS Alarm'}) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('setDeviceAlarm', {
        'hour': hour,
        'minute': minute,
        'message': message,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Make phone call via dialer
  static Future<Map<String, dynamic>> makePhoneCall(String phoneNumber) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('makePhoneCall', {
        'phoneNumber': phoneNumber,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Send SMS message
  static Future<Map<String, dynamic>> sendSms({required String phoneNumber, required String message}) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('sendSms', {
        'phoneNumber': phoneNumber,
        'message': message,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get native device battery and network status
  static Future<Map<String, dynamic>> getDeviceStatus() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('getDeviceStatus');
      return res != null ? Map<String, dynamic>.from(res) : {};
    } catch (_) {
      return {};
    }
  }

  /// Schedule exact alarm reminder surviving process termination and reboot
  static Future<Map<String, dynamic>> scheduleReminder({
    required String reminderId,
    required String title,
    String time = '',
    required int triggerAtMillis,
    bool isRecurring = false,
    String? recurrenceRule,
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('scheduleReminder', {
        'reminderId': reminderId,
        'title': title,
        'time': time,
        'triggerAtMillis': triggerAtMillis,
        'isRecurring': isRecurring,
        'recurrenceRule': recurrenceRule,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] scheduleReminder error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Cancel scheduled exact alarm reminder
  static Future<Map<String, dynamic>> cancelReminder(String reminderId) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('cancelReminder', {
        'reminderId': reminderId,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'success': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] cancelReminder error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Query dynamically discovered installed launcher applications
  static Future<List<Map<String, dynamic>>> getInstalledApplications() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return [];
    try {
      final res = await _channel.invokeListMethod<Map<dynamic, dynamic>>('getInstalledApplications');
      return res?.map((e) => Map<String, dynamic>.from(e)).toList() ?? [];
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getInstalledApplications error: $e');
      return [];
    }
  }

  /// Get current foreground application status
  static Future<Map<String, dynamic>> getForegroundApplication() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('getForegroundApplication');
      return res != null ? Map<String, dynamic>.from(res) : {};
    } catch (_) {
      return {};
    }
  }

  /// Verify foreground application matches expected package name
  static Future<Map<String, dynamic>> verifyForegroundApplication(String packageName) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'verified': false};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('verifyForegroundApplication', {
        'packageName': packageName,
      });
      return res != null ? Map<String, dynamic>.from(res) : {'verified': false};
    } catch (_) {
      return {'verified': false};
    }
  }

  /// Get current screen context
  static Future<Map<String, dynamic>> getCurrentScreenContext() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {};
    try {
      final res = await _channel.invokeMethod<Map<dynamic, dynamic>>('getCurrentScreenContext');
      return res != null ? Map<String, dynamic>.from(res) : {};
    } catch (_) {
      return {};
    }
  }

  /// Get installed capabilities
  static Future<List<Map<String, dynamic>>> getInstalledCapabilities() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return [];
    try {
      final res = await _channel.invokeListMethod<Map<dynamic, dynamic>>('getInstalledCapabilities');
      return res?.map((e) => Map<String, dynamic>.from(e)).toList() ?? [];
    } catch (_) {
      return [];
    }
  }

  /// Start Android foreground assistant service
  static Future<bool> startAssistantService() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<dynamic>('startAssistantService');
      if (res is bool) return res;
      if (res is Map) return res['success'] == true;
      return false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] startAssistantService error: $e');
      return false;
    }
  }

  /// Stop Android foreground assistant service
  static Future<bool> stopAssistantService() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<dynamic>('stopAssistantService');
      if (res is bool) return res;
      if (res is Map) return res['success'] == true;
      return false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] stopAssistantService error: $e');
      return false;
    }
  }

  /// Check if Android assistant foreground service is active
  static Future<bool> isAssistantServiceRunning() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('isAssistantServiceRunning');
      return res ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Check if Battery Optimization exemption is granted
  static Future<bool> isBatteryOptimizationIgnored() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      final res = await _channel.invokeMethod<bool>('isBatteryOptimizationIgnored');
      return res ?? true;
    } catch (e) {
      return true;
    }
  }

  /// Request Battery Optimization exemption
  static Future<bool> requestBatteryOptimizationExemption() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      final res = await _channel.invokeMethod<bool>('requestBatteryOptimizationExemption');
      return res ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Open Android Default Digital Assistant settings
  static Future<Map<String, dynamic>> openAssistantSettings() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {'success': false};
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('openAssistantSettings');
      return res ?? {'success': true};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get structured Android default assistant status (SELECTED, AVAILABLE_NOT_SELECTED, REQUEST_REQUIRED, NOT_SUPPORTED)
  static Future<Map<String, dynamic>> getAssistantStatus() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'status': 'NOT_SUPPORTED', 'isDefault': false};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getAssistantStatus');
      return res ?? {'success': false, 'status': 'UNKNOWN', 'isDefault': false};
    } catch (e) {
      return {'success': false, 'status': 'UNKNOWN', 'error': e.toString()};
    }
  }

  /// Request the system ROLE_ASSISTANT via Android RoleManager
  static Future<Map<String, dynamic>> requestAssistantRole() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'status': 'NOT_SUPPORTED'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('requestAssistantRole');
      return res ?? {'success': false, 'status': 'UNKNOWN'};
    } catch (e) {
      return {'success': false, 'status': 'UNKNOWN', 'error': e.toString()};
    }
  }

  /// Get status of local on-device wake-word detection
  static Future<Map<String, dynamic>> getWakeWordStatus() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'isRunning': false, 'isListening': false};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getWakeWordStatus');
      return res ?? {'success': false, 'isRunning': false, 'isListening': false};
    } catch (e) {
      return {'success': false, 'isRunning': false, 'isListening': false, 'error': e.toString()};
    }
  }

  /// Start on-device wake word listening
  static Future<Map<String, dynamic>> startWakeWord() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'status': 'NOT_SUPPORTED'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('startWakeWord');
      return res ?? {'success': true, 'status': 'STARTED'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Stop on-device wake word listening
  static Future<Map<String, dynamic>> stopWakeWord() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'status': 'NOT_SUPPORTED'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('stopWakeWord');
      return res ?? {'success': true, 'status': 'STOPPED'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get status of microphone lifecycle and audio capture
  static Future<Map<String, dynamic>> getMicrophoneStatus() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'granted': false, 'active': false, 'state': 'MIC_RELEASED'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getMicrophoneStatus');
      return res ?? {'success': false, 'granted': false, 'active': false, 'state': 'MIC_RELEASED'};
    } catch (e) {
      return {'success': false, 'granted': false, 'active': false, 'state': 'MIC_ERROR', 'error': e.toString()};
    }
  }

  /// Get Android audio focus state
  static Future<Map<String, dynamic>> getAudioFocusStatus() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'isMusicActive': false, 'audioMode': 0};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getAudioFocusStatus');
      return res ?? {'success': false};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get aggregated system voice state
  static Future<Map<String, dynamic>> getSystemVoiceState() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'serviceRunning': false, 'voiceState': 'IDLE'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getSystemVoiceState');
      return res ?? {'success': false, 'serviceRunning': false, 'voiceState': 'IDLE'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Query native Android device calendar events
  static Future<List<Map<String, dynamic>>> getDeviceCalendarEvents(String dateStr) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return [];
    try {
      final res = await _channel.invokeListMethod<Map<dynamic, dynamic>>('getDeviceCalendarEvents', {'date': dateStr});
      if (res == null) return [];
      return res.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getDeviceCalendarEvents error: $e');
      return [];
    }
  }

  /// Insert event into native Android device calendar
  static Future<bool> createDeviceCalendarEvent({
    required String title,
    required int startMillis,
    required int endMillis,
    String location = '',
    String description = '',
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('createDeviceCalendarEvent', {
        'title': title,
        'startTime': startMillis,
        'endTime': endMillis,
        'location': location,
        'description': description,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] createDeviceCalendarEvent error: $e');
      return false;
    }
  }

  /// Check if WellWisher is selected as the default digital assistant
  static Future<bool> isDefaultAssistant() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('isDefaultAssistant');
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Check Microphone permission status
  static Future<bool> checkMicrophonePermission() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      final res = await _channel.invokeMethod<bool>('checkMicrophonePermission');
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Check Notification permission status
  static Future<bool> checkNotificationPermission() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      final res = await _channel.invokeMethod<bool>('checkNotificationPermission');
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Check Calendar permission status
  static Future<bool> checkCalendarPermission() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      final res = await _channel.invokeMethod<bool>('checkCalendarPermission');
      return res ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Update event in native Android device calendar
  static Future<bool> updateDeviceCalendarEvent({
    required String eventId,
    String? title,
    int? startMillis,
    int? endMillis,
    String? location,
  }) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('updateDeviceCalendarEvent', {
        'eventId': eventId,
        'title': title,
        'startTime': startMillis,
        'endTime': endMillis,
        'location': location,
      });
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] updateDeviceCalendarEvent error: $e');
      return false;
    }
  }

  /// Delete event from native Android device calendar
  static Future<bool> deleteDeviceCalendarEvent(String eventId) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('deleteDeviceCalendarEvent', {'eventId': eventId});
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] deleteDeviceCalendarEvent error: $e');
      return false;
    }
  }

  // ============================================================
  // Phase 51: Always-On Voice Assistant Bridge Methods
  // ============================================================

  /// Start Android Always-On Voice Assistant foreground service
  static Future<bool> startVoiceAssistant() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('startVoiceAssistant');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] startVoiceAssistant error: $e');
      return false;
    }
  }

  /// Stop Android Always-On Voice Assistant foreground service
  static Future<bool> stopVoiceAssistant() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('stopVoiceAssistant');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] stopVoiceAssistant error: $e');
      return false;
    }
  }

  /// Get status of Always-On Voice Assistant service & state machine
  static Future<Map<String, dynamic>> getVoiceAssistantStatus() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'isRunning': false, 'state': 'IDLE'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('getVoiceAssistantStatus');
      return res ?? {'isRunning': false, 'state': 'IDLE'};
    } catch (_) {
      return {'isRunning': false, 'state': 'IDLE'};
    }
  }

  /// Get comprehensive Android Voice Subsystem Diagnostics
  static Future<List<Map<String, dynamic>>> getDiagnostics() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return [];
    try {
      final res = await _channel.invokeListMethod<Map<dynamic, dynamic>>('getDiagnostics');
      if (res == null) return [];
      return res.map((e) => Map<String, dynamic>.from(e)).toList();
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getDiagnostics error: $e');
      return [];
    }
  }

  /// Request runtime RECORD_AUDIO and POST_NOTIFICATIONS permissions
  static Future<bool> requestVoicePermissions() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      final res = await _channel.invokeMethod<bool>('requestVoicePermissions');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] requestVoicePermissions error: $e');
      return false;
    }
  }

  /// Trigger Wake-Word simulation/test intent for testing
  static Future<bool> testWakeWord() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('testWakeWord');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] testWakeWord error: $e');
      return false;
    }
  }

  /// Trigger native Android TTS speech test
  static Future<bool> testTts({String? text}) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('testTts', {'text': text});
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] testTts error: $e');
      return false;
    }
  }

  /// Test LiveKit realtime WebRTC transport connectivity
  static Future<Map<String, dynamic>> testLiveKit() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'connected': false, 'message': 'Unsupported Platform'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('testLiveKit');
      return res ?? {'connected': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] testLiveKit error: $e');
      return {'connected': false, 'error': e.toString()};
    }
  }

  /// Run full end-to-end voice test suite
  static Future<Map<String, dynamic>> runFullVoiceTest() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'status': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('runFullVoiceTest');
      return res ?? {};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] runFullVoiceTest error: $e');
      return {'error': e.toString()};
    }
  }

  // ==========================================
  // HEALTH CONNECT INTEGRATION
  // ==========================================

  /// Check if Health Connect is available on the device
  static Future<bool> isHealthConnectAvailable() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('health_isAvailable');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] isHealthConnectAvailable error: $e');
      return false;
    }
  }

  /// Check which health permissions are granted
  static Future<Map<String, bool>> checkHealthPermissions() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return {};
    try {
      final res = await _channel.invokeMapMethod<String, bool>('health_checkPermissions');
      return res ?? {};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] checkHealthPermissions error: $e');
      return {};
    }
  }

  /// Check background health reading capability
  static Future<Map<String, dynamic>> getBackgroundHealthCapability() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'supported': false, 'permissionGranted': false, 'sdkAvailable': false};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getBackgroundCapability');
      return res ?? {'supported': false, 'permissionGranted': false, 'sdkAvailable': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getBackgroundHealthCapability error: $e');
      return {'supported': false, 'permissionGranted': false, 'sdkAvailable': false, 'error': e.toString()};
    }
  }

  /// Request Health Connect permissions or open Health Connect settings
  static Future<bool> openHealthSettings() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('health_openSettings');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] openHealthSettings error: $e');
      return false;
    }
  }

  /// Request Health Connect permissions
  static Future<bool> requestHealthPermissions() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('health_requestPermissions');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] requestHealthPermissions error: $e');
      return false;
    }
  }

  /// Get aggregated step count for today
  static Future<Map<String, dynamic>> getStepsToday() async => getStepsForDate(null);

  /// Get aggregated step count for a specific date (YYYY-MM-DD)
  static Future<Map<String, dynamic>> getStepsForDate(String? date) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'steps', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getStepsForDate', {'date': date});
      return res ?? {'available': false, 'metric': 'steps', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getStepsForDate error: $e');
      return {'available': false, 'metric': 'steps', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get aggregated step count for a date range
  static Future<Map<String, dynamic>> getStepsRange(String startDate, String endDate) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'steps', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getStepsRange', {
        'startDate': startDate,
        'endDate': endDate,
      });
      return res ?? {'available': false, 'metric': 'steps', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getStepsRange error: $e');
      return {'available': false, 'metric': 'steps', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get active calories burned today
  static Future<Map<String, dynamic>> getActiveCaloriesToday() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'active_calories', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getActiveCaloriesToday');
      return res ?? {'available': false, 'metric': 'active_calories', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getActiveCaloriesToday error: $e');
      return {'available': false, 'metric': 'active_calories', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get total calories burned today
  static Future<Map<String, dynamic>> getTotalCaloriesToday() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'total_calories', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getTotalCaloriesToday');
      return res ?? {'available': false, 'metric': 'total_calories', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getTotalCaloriesToday error: $e');
      return {'available': false, 'metric': 'total_calories', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get calories for a specific date (both active and total)
  static Future<Map<String, dynamic>> getCaloriesForDate(String? date) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'calories', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getCaloriesForDate', {'date': date});
      return res ?? {'available': false, 'metric': 'calories', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getCaloriesForDate error: $e');
      return {'available': false, 'metric': 'calories', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get latest recorded heart rate in BPM
  static Future<Map<String, dynamic>> getLatestHeartRate() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'heart_rate', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getLatestHeartRate');
      return res ?? {'available': false, 'metric': 'heart_rate', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getLatestHeartRate error: $e');
      return {'available': false, 'metric': 'heart_rate', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get resting heart rate in BPM
  static Future<Map<String, dynamic>> getRestingHeartRate() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'resting_heart_rate', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getRestingHeartRate');
      return res ?? {'available': false, 'metric': 'resting_heart_rate', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getRestingHeartRate error: $e');
      return {'available': false, 'metric': 'resting_heart_rate', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get latest blood pressure reading (Systolic/Diastolic in mmHg)
  static Future<Map<String, dynamic>> getLatestBloodPressure() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'blood_pressure', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getLatestBloodPressure');
      return res ?? {'available': false, 'metric': 'blood_pressure', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getLatestBloodPressure error: $e');
      return {'available': false, 'metric': 'blood_pressure', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get blood pressure readings range
  static Future<Map<String, dynamic>> getBloodPressureRange(String startDate, String endDate) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'blood_pressure', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getBloodPressureRange', {
        'startDate': startDate,
        'endDate': endDate,
      });
      return res ?? {'available': false, 'metric': 'blood_pressure', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getBloodPressureRange error: $e');
      return {'available': false, 'metric': 'blood_pressure', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get sleep summary for today / last night or specific date
  static Future<Map<String, dynamic>> getSleepSummary([String? date]) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'sleep', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getSleepSummary', {'date': date});
      return res ?? {'available': false, 'metric': 'sleep', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getSleepSummary error: $e');
      return {'available': false, 'metric': 'sleep', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get distance today
  static Future<Map<String, dynamic>> getDistanceToday() async => getDistanceForDate(null);

  /// Get distance for specific date
  static Future<Map<String, dynamic>> getDistanceForDate(String? date) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'distance', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getDistanceForDate', {'date': date});
      return res ?? {'available': false, 'metric': 'distance', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getDistanceForDate error: $e');
      return {'available': false, 'metric': 'distance', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get workouts for date
  static Future<Map<String, dynamic>> getWorkouts([String? date]) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'workouts', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getWorkouts', {'date': date});
      return res ?? {'available': false, 'metric': 'workouts', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getWorkouts error: $e');
      return {'available': false, 'metric': 'workouts', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get latest recorded body weight
  static Future<Map<String, dynamic>> getLatestWeight() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'weight', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getLatestWeight');
      return res ?? {'available': false, 'metric': 'weight', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getLatestWeight error: $e');
      return {'available': false, 'metric': 'weight', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get weight history
  static Future<Map<String, dynamic>> getWeightHistory() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'available': false, 'metric': 'weight', 'reason': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getWeightHistory');
      return res ?? {'available': false, 'metric': 'weight', 'reason': 'DATA_UNAVAILABLE'};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getWeightHistory error: $e');
      return {'available': false, 'metric': 'weight', 'reason': 'DATA_UNAVAILABLE', 'error': e.toString()};
    }
  }

  /// Get full daily health snapshot
  static Future<Map<String, dynamic>> getFullHealthSnapshot([String? date]) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getFullSnapshot', {'date': date});
      return res ?? {};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getFullHealthSnapshot error: $e');
      return {};
    }
  }

  /// Start on-device workout tracking
  static Future<Map<String, dynamic>> startWorkout([String exerciseType = 'walking']) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'active': false, 'error': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_startWorkout', {
        'exerciseType': exerciseType,
      });
      return res ?? {'active': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] startWorkout error: $e');
      return {'active': false, 'error': e.toString()};
    }
  }

  /// Stop on-device workout tracking and write ExerciseSessionRecord to Health Connect
  static Future<Map<String, dynamic>> stopWorkout() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'success': false, 'error': 'UNSUPPORTED_PLATFORM'};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_stopWorkout');
      return res ?? {'success': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] stopWorkout error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Get status of any active on-device workout
  static Future<Map<String, dynamic>> getActiveWorkout() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) {
      return {'isTracking': false};
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('health_getActiveWorkout');
      return res ?? {'isTracking': false};
    } catch (e) {
      debugPrint('[JarvisNativeBridge] getActiveWorkout error: $e');
      return {'isTracking': false, 'error': e.toString()};
    }
  }

  // ==========================================
  // PHASE 6: MULTIMODAL, VISION & SCREEN APIS
  // ==========================================

  /// Check if Camera permission is granted on Android
  static Future<bool> checkCameraPermission() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('checkCameraPermission');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] checkCameraPermission error: $e');
      return false;
    }
  }

  /// Request Camera permission on Android
  static Future<bool> requestCameraPermission() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return false;
    try {
      final res = await _channel.invokeMethod<bool>('requestCameraPermission');
      return res ?? false;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] requestCameraPermission error: $e');
      return false;
    }
  }

  /// Real Android camera capture returning base64 JPEG string
  static Future<String?> captureCameraPhoto() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return null;
    try {
      final base64Image = await _channel.invokeMethod<String>('captureCameraPhoto');
      return base64Image;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] captureCameraPhoto error: $e');
      return null;
    }
  }

  /// Real Android screenshot capture of current window context
  static Future<String?> captureScreenContext() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return null;
    try {
      final base64Screen = await _channel.invokeMethod<String>('captureScreenContext');
      return base64Screen;
    } catch (e) {
      debugPrint('[JarvisNativeBridge] captureScreenContext error: $e');
      return null;
    }
  }
}

