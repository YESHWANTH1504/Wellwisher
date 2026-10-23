import '../../../services/api_client.dart';

/// Service interfacing with Phase 5 Personal Context, Memory, Briefing, and Autonomous Workflows.
class JarvisContextApiService {
  final ApiClient _apiClient;

  JarvisContextApiService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Retrieve unified context snapshot with real provenance and freshness markers
  Future<Map<String, dynamic>?> getContextSnapshot() async {
    try {
      final res = await _apiClient.get('/api/jarvis/context');
      if (res['success'] == true) {
        return (res['context'] ?? res['data']) as Map<String, dynamic>?;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Refresh context snapshot with live Android device telemetry
  Future<Map<String, dynamic>?> refreshContext({
    int? batteryLevel,
    bool? isCharging,
    String? screenState,
    bool? isLocked,
    String? network,
  }) async {
    try {
      final res = await _apiClient.post('/api/jarvis/context/refresh', {
        if (batteryLevel != null) 'batteryLevel': batteryLevel,
        if (isCharging != null) 'isCharging': isCharging,
        if (screenState != null) 'screenState': screenState,
        if (isLocked != null) 'isLocked': isLocked,
        if (network != null) 'network': network,
      });
      if (res['success'] == true) {
        return (res['context'] ?? res['data']) as Map<String, dynamic>?;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Retrieve stored durable memories
  Future<List<Map<String, dynamic>>> getMemories() async {
    try {
      final res = await _apiClient.get('/api/jarvis/memory');
      if (res['success'] == true) {
        final list = res['memories'] ?? res['data'];
        if (list is List) {
          return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Explicitly store personal preference
  Future<bool> storeMemory({
    required String key,
    required String value,
    String type = 'USER_PREFERENCE',
    int importance = 3,
  }) async {
    try {
      final res = await _apiClient.post('/api/jarvis/memory', {
        'memoryKey': key,
        'memoryValue': value,
        'memoryType': type,
        'source': 'USER_EXPLICIT',
        'importance': importance,
      });
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Delete / forget memory
  Future<bool> deleteMemory(dynamic id) async {
    try {
      final res = await _apiClient.delete('/api/jarvis/memory/$id');
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Retrieve proactive feed events
  Future<List<Map<String, dynamic>>> getProactiveFeed() async {
    try {
      final res = await _apiClient.get('/api/jarvis/proactive');
      if (res['success'] == true) {
        final feed = res['feed'] ?? res['data'];
        if (feed is List) {
          return feed.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Acknowledge, dismiss, or act on a proactive event
  Future<bool> acknowledgeProactiveEvent(String eventId, {String action = 'DELIVER'}) async {
    try {
      final res = await _apiClient.post('/api/jarvis/proactive/ack', {
        'eventId': eventId,
        'action': action,
      });
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Generate or fetch morning briefing
  Future<Map<String, dynamic>?> getMorningBriefing({bool force = false, bool respectQuietHours = true}) async {
    try {
      final res = await _apiClient.post('/api/jarvis/briefing', {
        'force': force,
        'respectQuietHours': respectQuietHours,
      });
      if (res['success'] == true) {
        return Map<String, dynamic>.from(res);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Retrieve registered autonomous workflows
  Future<List<Map<String, dynamic>>> getWorkflows() async {
    try {
      final res = await _apiClient.get('/api/jarvis/workflows');
      if (res['success'] == true) {
        final wf = res['workflows'] ?? res['data'];
        if (wf is List) {
          return wf.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
