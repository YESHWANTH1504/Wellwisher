import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_client.dart';
import 'local_storage_service.dart';
import 'notification_service.dart';
import 'sound_service.dart';

class HydrationService extends ChangeNotifier {
  static final HydrationService _instance = HydrationService._internal();
  factory HydrationService() => _instance;
  HydrationService._internal();

  final LocalStorageService _storage = LocalStorageService();
  final ApiClient _apiClient = ApiClient();
  bool _initialized = false;
  bool _isLoading = false;

  bool get isLoading => _isLoading;
  int get portionMl => _storage.hydrationPortionMl;
  int get goalMl => _storage.hydrationGoalMl;
  int get dailyHydrationTotalMl => _storage.dailyHydrationTotalMl;

  double get progressFraction => (dailyHydrationTotalMl / (goalMl > 0 ? goalMl : 2500)).clamp(0.0, 1.0);
  int get percentage => (progressFraction * 100).toInt();

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    final todayStr = _formatTodayDate();
    if (_storage.hydrationLastLogDate != todayStr) {
      _storage.hydrationLastLogDate = todayStr;
      // Start fresh or fetch from backend for new day
      _storage.dailyHydrationTotalMl = 0;
    }

    await fetchDailyHydration();
  }

  String _formatTodayDate() {
    final now = DateTime.now();
    return '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  }

  Future<void> fetchDailyHydration() async {
    try {
      final res = await _apiClient.get('/hydration');
      if (res['success'] == true && res['data'] != null) {
        final total = res['data']['totalMl'];
        if (total is int && total > 0) {
          _storage.dailyHydrationTotalMl = total;
          _storage.hydrationLastLogDate = _formatTodayDate();
          notifyListeners();
        }
      }
    } catch (_) {
      // Offline fallback: use local storage cache
    }
  }

  /// Automatically logs water intake (+150ml by default), persists locally,
  /// triggers celebratory alert if goal reached, plays water cue, and syncs to backend.
  Future<void> logWater(
    int amount, {
    bool playSound = true,
    bool checkGoal = true,
    String source = 'manual',
  }) async {
    final todayStr = _formatTodayDate();
    if (_storage.hydrationLastLogDate != todayStr) {
      _storage.hydrationLastLogDate = todayStr;
      _storage.dailyHydrationTotalMl = 0;
    }

    final previousTotal = _storage.dailyHydrationTotalMl;
    final newTotal = previousTotal + amount;
    _storage.dailyHydrationTotalMl = newTotal;

    if (playSound) {
      SoundService.playWaterDrop();
    }

    notifyListeners();

    if (kDebugMode) {
      print('💧 [HydrationService] Logged +${amount}ml water ($source). New total: ${newTotal}ml / ${goalMl}ml');
    }

    // Check if daily target has been reached or exceeded for the first time today
    if (checkGoal && previousTotal < goalMl && newTotal >= goalMl) {
      _triggerGoalReachedCelebration();
    }

    // Offline-first backend sync
    _syncWithBackend(amount);
  }

  Future<void> _syncWithBackend(int amount) async {
    try {
      final res = await _apiClient.post('/hydration', {'amountMl': amount});
      if (res['success'] == true && res['data'] != null) {
        final backendTotal = res['data']['totalMl'];
        if (backendTotal is int && backendTotal > _storage.dailyHydrationTotalMl) {
          _storage.dailyHydrationTotalMl = backendTotal;
          notifyListeners();
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('💧 [HydrationService] Backend sync queued offline: $e');
      }
    }
  }

  void _triggerGoalReachedCelebration() {
    final todayStr = _formatTodayDate();
    if (_storage.hydrationCelebratedDate == todayStr) return;
    _storage.hydrationCelebratedDate = todayStr;

    if (kDebugMode) {
      print('🎉 [HydrationService] Daily hydration goal reached: ${dailyHydrationTotalMl}ml!');
    }

    // Post celebratory notification to status bar
    NotificationService().showSystemNotification(
      id: 993888,
      title: '🎉 Daily Hydration Goal Reached (${goalMl}ml)!',
      body: 'Awesome job! You reached your daily hydration target (${dailyHydrationTotalMl}ml). Stay healthy and refreshed! 💧',
      includeActions: false,
    );
  }

  void setPortionSize(int portion) {
    _storage.hydrationPortionMl = portion;
    notifyListeners();
  }

  void setGoal(int goal) {
    _storage.hydrationGoalMl = goal;
    notifyListeners();
  }

  void resetDailyForTesting([int initial = 0]) {
    final todayStr = _formatTodayDate();
    _storage.hydrationLastLogDate = todayStr;
    _storage.dailyHydrationTotalMl = initial;
    _storage.hydrationCelebratedDate = null;
    notifyListeners();
  }
}
