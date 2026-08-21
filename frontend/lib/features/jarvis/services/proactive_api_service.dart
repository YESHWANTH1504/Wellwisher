import '../../../services/api_client.dart';
import '../models/proactive_models.dart';

class ProactiveApiService {
  final ApiClient _apiClient;

  ProactiveApiService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Get user's active proactive notification feed
  Future<List<ProactiveEventModel>> getFeed() async {
    try {
      final res = await _apiClient.get('/ai/proactive/feed');
      if (res['success'] == true && res['data'] is List) {
        return (res['data'] as List).map((e) => ProactiveEventModel.fromJson(e)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Request proactive engine evaluation
  Future<void> evaluateProactive() async {
    try {
      await _apiClient.post('/ai/proactive/evaluate', {});
    } catch (_) {}
  }

  /// Get morning daily briefing
  Future<DailyBriefingModel?> getDailyBriefing() async {
    try {
      final res = await _apiClient.get('/ai/briefing/today');
      if (res['success'] == true && res['data'] != null) {
        return DailyBriefingModel.fromJson(res['data']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Get evening summary
  Future<EveningSummaryModel?> getEveningSummary() async {
    try {
      final res = await _apiClient.get('/ai/summary/today');
      if (res['success'] == true && res['data'] != null) {
        return EveningSummaryModel.fromJson(res['data']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Dismiss proactive event
  Future<bool> dismissEvent(String eventId) async {
    try {
      final res = await _apiClient.post('/ai/proactive/$eventId/dismiss', {});
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Act on proactive event
  Future<bool> actOnEvent(String eventId) async {
    try {
      final res = await _apiClient.post('/ai/proactive/$eventId/act', {});
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Get AI preferences
  Future<AiPreferenceModel> getPreferences() async {
    try {
      final res = await _apiClient.get('/ai/preferences');
      if (res['success'] == true && res['data'] != null) {
        return AiPreferenceModel.fromJson(res['data']);
      }
      return AiPreferenceModel();
    } catch (_) {
      return AiPreferenceModel();
    }
  }

  /// Update AI preferences
  Future<AiPreferenceModel> updatePreferences(AiPreferenceModel prefs) async {
    try {
      final res = await _apiClient.put('/ai/preferences', prefs.toJson());
      if (res['success'] == true && res['data'] != null) {
        return AiPreferenceModel.fromJson(res['data']);
      }
      return prefs;
    } catch (_) {
      return prefs;
    }
  }
}
