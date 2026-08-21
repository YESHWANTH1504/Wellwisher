import '../../../services/api_client.dart';
import '../models/health_intelligence_models.dart';

class HealthIntelligenceApiService {
  final ApiClient _client;

  HealthIntelligenceApiService({ApiClient? client}) : _client = client ?? ApiClient();

  /// Retrieve computed biomarker trends
  Future<List<HealthTrendModel>> getTrends() async {
    try {
      final res = await _client.get('/ai/health/trends');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => HealthTrendModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Retrieve active health trend alerts
  Future<List<HealthAlertModel>> getAlerts() async {
    try {
      final res = await _client.get('/ai/health/alerts');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => HealthAlertModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Dismiss an active health alert
  Future<bool> dismissAlert(String alertId) async {
    try {
      final res = await _client.post('/ai/health/alerts/$alertId/dismiss', {});
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Retrieve medication reconciliation & review points
  Future<MedicationReconciliationModel?> getMedicationConflicts() async {
    try {
      final res = await _client.get('/ai/health/medication-conflicts');
      if (res['success'] == true && res['data'] != null) {
        return MedicationReconciliationModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Retrieve comprehensive health intelligence overview
  Future<HealthOverviewModel?> getOverview() async {
    try {
      final res = await _client.get('/ai/health/overview');
      if (res['success'] == true && res['data'] != null) {
        return HealthOverviewModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Generate a structured 1-page doctor visit briefing
  Future<DoctorBriefingModel?> generateDoctorBriefing() async {
    try {
      final res = await _client.post('/ai/health/doctor-briefing', {});
      if (res['success'] == true && res['data'] != null) {
        return DoctorBriefingModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// List historical doctor briefings
  Future<List<DoctorBriefingModel>> getDoctorBriefings() async {
    try {
      final res = await _client.get('/ai/health/doctor-briefings');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => DoctorBriefingModel.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Get doctor briefing by ID
  Future<DoctorBriefingModel?> getDoctorBriefingById(String id) async {
    try {
      final res = await _client.get('/ai/health/doctor-briefing/$id');
      if (res['success'] == true && res['data'] != null) {
        return DoctorBriefingModel.fromJson(Map<String, dynamic>.from(res['data'] as Map));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Export health data archive
  Future<Map<String, dynamic>?> exportHealthData() async {
    try {
      final res = await _client.post('/ai/health/export', {});
      if (res['success'] == true && res['data'] != null) {
        return Map<String, dynamic>.from(res['data'] as Map);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Clear health intelligence data
  Future<bool> clearHealthIntelligenceData() async {
    try {
      final res = await _client.post('/ai/health/clear', {});
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }
}
