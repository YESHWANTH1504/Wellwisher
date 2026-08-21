import 'api_client.dart';

class ScheduleService {
  final ApiClient apiClient;

  ScheduleService({required this.apiClient});

  Future<List<Map<String, dynamic>>> fetchSchedule(String dateStr) async {
    final response = await apiClient.get('/schedule?date=$dateStr');
    if (response['success'] == true && response['data'] is List) {
      return List<Map<String, dynamic>>.from(response['data']);
    }
    return [];
  }

  Future<Map<String, dynamic>?> createScheduleItem(Map<String, dynamic> itemJson) async {
    final response = await apiClient.post('/schedule', itemJson);
    if (response['success'] == true) {
      return response['data'] as Map<String, dynamic>?;
    }
    return null;
  }

  Future<Map<String, dynamic>?> updateScheduleItem(String id, Map<String, dynamic> itemJson) async {
    final response = await apiClient.put('/schedule/$id', itemJson);
    if (response['success'] == true) {
      return response['data'] as Map<String, dynamic>?;
    }
    return null;
  }

  Future<bool> deleteScheduleItem(String id) async {
    final response = await apiClient.delete('/schedule/$id');
    return response['success'] == true;
  }
}
