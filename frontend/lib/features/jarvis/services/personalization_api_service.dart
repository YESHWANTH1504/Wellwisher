import '../../../services/api_client.dart';
import '../models/personalization_models.dart';

class PersonalizationApiService {
  final ApiClient _apiClient;

  PersonalizationApiService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Get Personal Profile
  Future<PersonalProfileModel?> getProfile() async {
    try {
      final res = await _apiClient.get('/ai/profile');
      if (res['success'] == true && res['data'] != null) {
        return PersonalProfileModel.fromJson(res['data']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Get user memories
  Future<List<AiMemoryItemModel>> getMemories({String? type, String? source}) async {
    try {
      String endpoint = '/ai/memories';
      final queryParams = <String>[];
      if (type != null) queryParams.add('type=$type');
      if (source != null) queryParams.add('source=$source');
      if (queryParams.isNotEmpty) {
        endpoint += '?${queryParams.join('&')}';
      }

      final res = await _apiClient.get(endpoint);
      if (res['success'] == true && res['data'] is List) {
        return (res['data'] as List).map((e) => AiMemoryItemModel.fromJson(e)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Update memory
  Future<bool> updateMemory(int id, {String? memoryValue, int? importance}) async {
    try {
      final body = <String, dynamic>{
        if (memoryValue != null) 'memoryValue': memoryValue,
        if (importance != null) 'importance': importance,
      };
      final res = await _apiClient.put('/ai/memories/$id', body);
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Delete single memory
  Future<bool> deleteMemory(int id) async {
    try {
      final res = await _apiClient.delete('/ai/memories/$id');
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Clear memories (all or inferred only)
  Future<int> clearMemories({bool inferredOnly = false}) async {
    try {
      final res = await _apiClient.post('/ai/memories/clear', {'inferredOnly': inferredOnly});
      return res['clearedCount'] ?? 0;
    } catch (_) {
      return 0;
    }
  }

  /// Get 7-day weekly summary
  Future<WeeklySummaryModel?> getWeeklySummary() async {
    try {
      final res = await _apiClient.get('/ai/weekly-summary');
      if (res['success'] == true && res['data'] != null) {
        return WeeklySummaryModel.fromJson(res['data']);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Reset personalization
  Future<bool> resetPersonalization() async {
    try {
      final res = await _apiClient.post('/ai/personalization/reset', {});
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }
}
