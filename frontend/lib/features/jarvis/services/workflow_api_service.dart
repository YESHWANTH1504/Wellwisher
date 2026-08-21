import '../../../services/api_client.dart';
import '../models/workflow_models.dart';

class WorkflowApiService {
  final ApiClient _client;

  WorkflowApiService({ApiClient? client}) : _client = client ?? ApiClient();

  /// Retrieve full Workflow / Action Center overview
  Future<WorkflowOverview?> getWorkflowOverview() async {
    try {
      final res = await _client.get('/ai/workflows');
      if (res['success'] == true && res['data'] is Map) {
        return WorkflowOverview.fromJson(Map<String, dynamic>.from(res['data'] as Map));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Retrieve appointment list with optional status filter
  Future<List<AppointmentItem>> getAppointments({String? status}) async {
    try {
      final query = status != null ? '?status=$status' : '';
      final res = await _client.get('/ai/appointments$query');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => AppointmentItem.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Create new appointment
  Future<AppointmentItem?> createAppointment(Map<String, dynamic> body) async {
    try {
      final res = await _client.post('/ai/appointments', body);
      if (res['success'] == true && res['data'] is Map) {
        return AppointmentItem.fromJson(Map<String, dynamic>.from(res['data'] as Map));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Retrieve calendar events
  Future<List<CalendarEventItem>> getCalendarEvents({String? date}) async {
    try {
      final query = date != null ? '?date=$date' : '';
      final res = await _client.get('/ai/calendar/events$query');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => CalendarEventItem.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Find calendar availability slots
  Future<List<CalendarSlotItem>> getAvailability({String? date, int durationMinutes = 30}) async {
    try {
      final res = await _client.get('/ai/calendar/availability?date=${date ?? ''}&durationMinutes=$durationMinutes');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => CalendarSlotItem.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Retrieve pending workflow actions
  Future<List<WorkflowActionItem>> getWorkflowActions({String? status}) async {
    try {
      final query = status != null ? '?status=$status' : '';
      final res = await _client.get('/ai/workflow-actions$query');
      if (res['success'] == true && res['data'] is List) {
        final list = res['data'] as List<dynamic>;
        return list.map((item) => WorkflowActionItem.fromJson(Map<String, dynamic>.from(item as Map))).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Confirm a pending workflow action
  Future<bool> confirmWorkflowAction(String id, {String? confirmationId, Map<String, dynamic>? argsHash}) async {
    try {
      final body = <String, dynamic>{};
      if (confirmationId != null) body['confirmationId'] = confirmationId;
      if (argsHash != null) body['argsHash'] = argsHash;
      final res = await _client.post('/ai/workflow-actions/$id/confirm', body);
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Dismiss a workflow action
  Future<bool> dismissWorkflowAction(String id) async {
    try {
      final res = await _client.post('/ai/workflow-actions/$id/dismiss', {});
      return res['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// Prepare doctor visit briefing for an appointment
  Future<Map<String, dynamic>?> prepareDoctorVisit(String appointmentId) async {
    try {
      final res = await _client.post('/ai/doctor-visit/$appointmentId/prepare', {});
      if (res['success'] == true && res['data'] is Map) {
        return Map<String, dynamic>.from(res['data'] as Map);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Complete an appointment with doctor instructions and follow-ups
  Future<Map<String, dynamic>?> completeAppointment(String appointmentId, Map<String, dynamic> payload) async {
    try {
      final res = await _client.post('/ai/appointments/$appointmentId/complete', payload);
      if (res['success'] == true && res['data'] is Map) {
        return Map<String, dynamic>.from(res['data'] as Map);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
