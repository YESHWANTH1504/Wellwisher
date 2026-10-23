import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../../core/config/app_config.dart';
import '../../../services/health_connect_bridge.dart';
import '../../../services/local_storage_service.dart';
import '../models/health_models.dart';

/// HealthRepository
/// Single source of truth for Health Connect communication in Flutter.
/// Strictly non-fabricating: raw platform maps are parsed into strongly typed
/// Health models with explicit semantic availability reasons.
class HealthRepository {
  final LocalStorageService _storage = LocalStorageService();

  /// Check Health Connect availability on this device
  Future<bool> isAvailable() async {
    return HealthConnectBridge.isAvailable();
  }

  /// Check currently granted permissions
  Future<Map<String, bool>> checkPermissions() async {
    return HealthConnectBridge.checkPermissions();
  }

  /// Request permissions or open Health Connect settings
  Future<bool> openSettings() async {
    return HealthConnectBridge.openSettings();
  }

  Future<bool> requestPermissions() async {
    return HealthConnectBridge.requestPermissions();
  }

  /// Check background read capability on the OS
  Future<Map<String, dynamic>> checkBackgroundCapability() async {
    return HealthConnectBridge.getBackgroundCapability();
  }

  /// Fetch full authoritative daily summary for specified local date
  Future<HealthDailySummary> fetchDailySummary(String dateStr, HealthGoal goals) async {
    final isAvail = await isAvailable();
    final perms = await checkPermissions();
    final bgCap = await checkBackgroundCapability();

    // Fetch metrics in parallel from Health Connect
    final results = await Future.wait([
      HealthConnectBridge.getStepsForDate(dateStr),
      HealthConnectBridge.getCaloriesForDate(dateStr),
      HealthConnectBridge.getLatestHeartRate(),
      HealthConnectBridge.getRestingHeartRate(),
      HealthConnectBridge.getLatestBloodPressure(),
      HealthConnectBridge.getSleepSummary(dateStr),
      HealthConnectBridge.getDistanceForDate(dateStr),
      HealthConnectBridge.getWorkouts(dateStr),
      HealthConnectBridge.getLatestWeight(),
      HealthConnectBridge.getWeightHistory(),
    ]);

    final rawSteps = results[0];
    final rawCalories = results[1];
    final rawHeart = results[2];
    final rawResting = results[3];
    final rawBp = results[4];
    final rawSleep = results[5];
    final rawDistance = results[6];
    final rawWorkouts = results[7];
    final rawWeight = results[8];
    final rawWeightHist = results[9];

    // Parse into structured models
    final steps = HealthSteps.fromMap(rawSteps, goal: goals.stepsGoal);
    final calories = HealthCalories.fromMap(rawCalories, goal: goals.activeCaloriesGoal);
    final heartRate = HealthHeartRate.fromMap(rawHeart, restingMap: rawResting);
    final bloodPressure = HealthBloodPressure.fromMap(rawBp);
    final sleep = HealthSleep.fromMap(rawSleep, targetMinutes: goals.sleepGoalMinutes);
    final distance = HealthDistance.fromMap(rawDistance);

    final workoutsList = <HealthWorkout>[];
    if (rawWorkouts['workouts'] is List) {
      for (final item in rawWorkouts['workouts'] as List) {
        if (item is Map) {
          workoutsList.add(HealthWorkout.fromMap(Map<String, dynamic>.from(item)));
        }
      }
    }

    final weightHistList = <double>[];
    if (rawWeightHist['history'] is List) {
      for (final item in rawWeightHist['history'] as List) {
        if (item is Map && item['weight'] is num) {
          weightHistList.add((item['weight'] as num).toDouble());
        }
      }
    }
    final weight = HealthWeight.fromMap(rawWeight, history: weightHistList);

    final summary = HealthDailySummary(
      date: dateStr,
      steps: steps,
      calories: calories,
      heartRate: heartRate,
      bloodPressure: bloodPressure,
      sleep: sleep,
      distance: distance,
      workouts: workoutsList,
      weight: weight,
      goals: goals,
      isHealthConnectAvailable: isAvail,
      permissions: perms,
      backgroundSupported: bgCap['supported'] == true,
      lastRefreshed: DateTime.now(),
    );

    // Sync snapshot with JARVIS backend for voice context (non-blocking)
    _syncToBackend(summary);

    return summary;
  }

  /// Push live device health metrics to backend for JARVIS voice reasoning
  Future<void> _syncToBackend(HealthDailySummary summary) async {
    try {
      final token = _storage.jwtToken;
      if (token == null || token.isEmpty) return;

      final url = Uri.parse('${AppConfig.baseUrl}/jarvis/health/sync');
      final payload = {
        'date': summary.date,
        'source': 'Health Connect',
        'steps': summary.steps.count,
        'activeCalories': summary.calories.activeCalories,
        'totalCalories': summary.calories.totalCalories,
        'heartRate': summary.heartRate.latestBpm,
        'restingHeartRate': summary.heartRate.restingBpm,
        'bloodPressure': summary.bloodPressure.available
            ? {
                'systolic': summary.bloodPressure.systolic,
                'diastolic': summary.bloodPressure.diastolic,
              }
            : null,
        'sleepMinutes': summary.sleep.totalMinutes,
        'distanceMeters': summary.distance.meters,
        'weightKg': summary.weight.weightKg,
        'workoutsCount': summary.workouts.length,
        'permissions': summary.permissions,
      };

      await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 4));
    } catch (e) {
      // Non-fatal: Health Connect is the primary local truth
      debugPrint('[HealthRepository] Backend sync non-fatal error: $e');
    }
  }
}
