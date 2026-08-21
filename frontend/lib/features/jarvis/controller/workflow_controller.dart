import 'package:flutter/foundation.dart';
import '../models/workflow_models.dart';
import '../services/workflow_api_service.dart';

class WorkflowController extends ChangeNotifier {
  final WorkflowApiService _apiService;

  bool _isLoading = false;
  String? _error;
  WorkflowOverview? _overview;
  List<AppointmentItem> _appointments = [];
  List<WorkflowActionItem> _pendingActions = [];
  List<CalendarEventItem> _calendarEvents = [];
  List<CalendarSlotItem> _availabilitySlots = [];

  WorkflowController({WorkflowApiService? apiService})
      : _apiService = apiService ?? WorkflowApiService();

  bool get isLoading => _isLoading;
  String? get error => _error;
  WorkflowOverview? get overview => _overview;
  List<AppointmentItem> get appointments => _appointments;
  List<WorkflowActionItem> get pendingActions => _pendingActions;
  List<CalendarEventItem> get calendarEvents => _calendarEvents;
  List<CalendarSlotItem> get availabilitySlots => _availabilitySlots;

  Future<void> loadActionCenter() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _apiService.getWorkflowOverview();
      _overview = res;
      if (res != null) {
        _appointments = res.upcomingAppointments;
        _pendingActions = res.pendingActions;
        _calendarEvents = res.todayCalendarEvents;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadAppointments({String? status}) async {
    _isLoading = true;
    notifyListeners();
    try {
      _appointments = await _apiService.getAppointments(status: status);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadCalendarEvents({String? date}) async {
    try {
      _calendarEvents = await _apiService.getCalendarEvents(date: date);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> loadAvailability({String? date, int durationMinutes = 30}) async {
    try {
      _availabilitySlots = await _apiService.getAvailability(date: date, durationMinutes: durationMinutes);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<bool> confirmAction(String actionId, {String? confirmationId, Map<String, dynamic>? argsHash}) async {
    final success = await _apiService.confirmWorkflowAction(actionId, confirmationId: confirmationId, argsHash: argsHash);
    if (success) {
      _pendingActions.removeWhere((a) => a.id == actionId);
      await loadActionCenter();
    }
    return success;
  }

  Future<bool> dismissAction(String actionId) async {
    final success = await _apiService.dismissWorkflowAction(actionId);
    if (success) {
      _pendingActions.removeWhere((a) => a.id == actionId);
      notifyListeners();
    }
    return success;
  }

  Future<Map<String, dynamic>?> prepareVisitBriefing(String appointmentId) async {
    final res = await _apiService.prepareDoctorVisit(appointmentId);
    if (res != null) {
      await loadActionCenter();
    }
    return res;
  }

  Future<Map<String, dynamic>?> completeAppointment(String appointmentId, Map<String, dynamic> payload) async {
    final res = await _apiService.completeAppointment(appointmentId, payload);
    if (res != null) {
      await loadActionCenter();
    }
    return res;
  }
}
