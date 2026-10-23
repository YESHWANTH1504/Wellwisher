import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/health_models.dart';
import '../services/health_repository.dart';
import '../services/proactive_health_notifier.dart';

/// JarvisHealthController
/// State controller for JARVIS Health Dashboard and real-time Health Connect synchronization.
///
/// Features:
/// - Selected date management with strict local timezone preservation (no UTC date shifts).
/// - Dynamic foreground periodic refresh for fast-changing metrics (steps ~60s).
/// - Lifecycle-aware: refreshes metrics when resuming from background.
/// - Configurable user goals persisted to SharedPreferences.
/// - Proactive health notification triggering with cooldowns.
class JarvisHealthController extends ChangeNotifier with WidgetsBindingObserver {
  final HealthRepository _repository;
  final ProactiveHealthNotifier _notifier = ProactiveHealthNotifier();

  HealthDailySummary _summary;
  HealthGoal _goals = const HealthGoal();
  String _selectedDateStr;
  bool _isLoading = false;
  String? _errorMessage;
  Timer? _foregroundRefreshTimer;
  bool _isDisposed = false;

  JarvisHealthController({HealthRepository? repository})
      : _repository = repository ?? HealthRepository(),
        _selectedDateStr = _formatLocalDate(DateTime.now()),
        _summary = HealthDailySummary.initial(_formatLocalDate(DateTime.now())) {
    WidgetsBinding.instance.addObserver(this);
    _loadPersistedGoalsAndInit();
  }

  HealthDailySummary get summary => _summary;
  HealthGoal get goals => _goals;
  String get selectedDateStr => _selectedDateStr;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isToday => _selectedDateStr == _formatLocalDate(DateTime.now());

  static String _formatLocalDate(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> _loadPersistedGoalsAndInit() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final steps = prefs.getInt('jarvis_goal_steps') ?? 8000;
      final calories = prefs.getInt('jarvis_goal_calories') ?? 400;
      final sleepMins = prefs.getInt('jarvis_goal_sleep_mins') ?? 480;
      final distanceKm = prefs.getDouble('jarvis_goal_distance_km') ?? 5.0;

      _goals = HealthGoal(
        stepsGoal: steps,
        activeCaloriesGoal: calories,
        sleepGoalMinutes: sleepMins,
        distanceGoalKm: distanceKm,
      );

      await refreshAll();
      _startForegroundRefreshTimer();
    } catch (e) {
      debugPrint('[JarvisHealthController] Init error: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Returned from background or settings: refresh immediately
      refreshAll();
    }
  }

  void _startForegroundRefreshTimer() {
    _foregroundRefreshTimer?.cancel();
    // 60-second periodic foreground check for dynamic step counts
    _foregroundRefreshTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      if (isToday && !_isLoading && !_isDisposed) {
        refreshAll(silent: true);
      }
    });
  }

  /// Select a date to view historical or current metrics
  Future<void> selectDate(DateTime dt) async {
    final dateStr = _formatLocalDate(dt);
    if (_selectedDateStr == dateStr && !_isLoading) return;
    _selectedDateStr = dateStr;
    notifyListeners();
    await loadDate(dateStr);
  }

  /// Load health metrics for a specific date
  Future<void> loadDate(String dateStr) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _repository.fetchDailySummary(dateStr, _goals);
      if (!_isDisposed) {
        _summary = res;
        _isLoading = false;
        notifyListeners();

        // Evaluate proactive notifications if viewing today
        if (isToday) {
          _notifier.evaluateAndNotify(_summary);
        }
      }
    } catch (e) {
      if (!_isDisposed) {
        _isLoading = false;
        _errorMessage = 'Failed to load health data: $e';
        notifyListeners();
      }
    }
  }

  /// Full refresh for current selected date
  Future<void> refreshAll({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final res = await _repository.fetchDailySummary(_selectedDateStr, _goals);
      if (!_isDisposed) {
        _summary = res;
        _isLoading = false;
        notifyListeners();

        if (isToday) {
          _notifier.evaluateAndNotify(_summary);
        }
      }
    } catch (e) {
      if (!_isDisposed) {
        _isLoading = false;
        _errorMessage = 'Failed to refresh health data: $e';
        notifyListeners();
      }
    }
  }

  /// Refresh today's date directly
  Future<void> refreshToday() async {
    _selectedDateStr = _formatLocalDate(DateTime.now());
    await refreshAll();
  }

  /// Open Health Connect permissions management
  Future<void> requestPermissions() async {
    await _repository.requestPermissions();
  }

  /// Open Health Connect system settings
  Future<void> openSettings() async {
    await _repository.openSettings();
  }

  /// Update user goals and persist
  Future<void> updateGoals(HealthGoal newGoals) async {
    _goals = newGoals;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('jarvis_goal_steps', newGoals.stepsGoal);
      await prefs.setInt('jarvis_goal_calories', newGoals.activeCaloriesGoal);
      await prefs.setInt('jarvis_goal_sleep_mins', newGoals.sleepGoalMinutes);
      await prefs.setDouble('jarvis_goal_distance_km', newGoals.distanceGoalKm);

      // Re-fetch to apply new goals to calculation
      await refreshAll(silent: true);
    } catch (e) {
      debugPrint('[JarvisHealthController] Save goals error: $e');
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _foregroundRefreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }
}
