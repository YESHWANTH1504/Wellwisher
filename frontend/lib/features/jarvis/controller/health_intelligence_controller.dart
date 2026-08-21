import 'package:flutter/foundation.dart';
import '../models/health_intelligence_models.dart';
import '../services/health_intelligence_api_service.dart';

class HealthIntelligenceController extends ChangeNotifier {
  final HealthIntelligenceApiService _apiService;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  HealthOverviewModel? _overview;
  HealthOverviewModel? get overview => _overview;

  List<HealthTrendModel> _trends = [];
  List<HealthTrendModel> get trends => _trends;

  List<HealthAlertModel> _alerts = [];
  List<HealthAlertModel> get alerts => _alerts;

  MedicationReconciliationModel? _medicationReconciliation;
  MedicationReconciliationModel? get medicationReconciliation => _medicationReconciliation;

  List<DoctorBriefingModel> _briefings = [];
  List<DoctorBriefingModel> get briefings => _briefings;

  DoctorBriefingModel? _activeBriefing;
  DoctorBriefingModel? get activeBriefing => _activeBriefing;

  HealthIntelligenceController({HealthIntelligenceApiService? apiService})
      : _apiService = apiService ?? HealthIntelligenceApiService();

  /// Initial load of all health intelligence data
  Future<void> loadAllData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _apiService.getOverview(),
        _apiService.getTrends(),
        _apiService.getAlerts(),
        _apiService.getMedicationConflicts(),
        _apiService.getDoctorBriefings(),
      ]);

      _overview = results[0] as HealthOverviewModel?;
      _trends = results[1] as List<HealthTrendModel>;
      _alerts = results[2] as List<HealthAlertModel>;
      _medicationReconciliation = results[3] as MedicationReconciliationModel?;
      _briefings = results[4] as List<DoctorBriefingModel>;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Dismiss an active health alert
  Future<bool> dismissAlert(String alertId) async {
    final success = await _apiService.dismissAlert(alertId);
    if (success) {
      _alerts.removeWhere((a) => a.id == alertId);
      notifyListeners();
    }
    return success;
  }

  /// Generate a new doctor visit briefing
  Future<DoctorBriefingModel?> generateDoctorBriefing() async {
    _isLoading = true;
    notifyListeners();

    try {
      final briefing = await _apiService.generateDoctorBriefing();
      if (briefing != null) {
        _activeBriefing = briefing;
        _briefings.insert(0, briefing);
      }
      return briefing;
    } catch (e) {
      _errorMessage = e.toString();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// View specific doctor briefing
  void selectBriefing(DoctorBriefingModel briefing) {
    _activeBriefing = briefing;
    notifyListeners();
  }
}
