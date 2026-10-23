import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/health_models.dart';

/// ProactiveHealthNotifier
/// Evaluates live Health Connect metrics and produces safe, non-diagnostic notifications.
///
/// SAFETY & PRIVACY RULES:
/// - Strictly non-diagnostic: reports factual numbers only (never diagnoses diseases).
/// - 4-hour cooldown between repeated health notifications.
/// - Low activity / low sleep: maximum 1 notification per calendar day.
/// - State persisted in SharedPreferences to prevent notification spam across restarts.
class ProactiveHealthNotifier {
  static const String channelId = 'JARVIS_HEALTH_INSIGHTS';
  static const String channelName = 'JARVIS Health Insights';
  static const String channelDescription = 'Proactive personal wellness insights and alerts';

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    try {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const initSettings = InitializationSettings(android: androidSettings);
      await _notifications.initialize(initSettings);
    } catch (e) {
      debugPrint('[ProactiveHealthNotifier] Notification init handled: $e');
    }
    _initialized = true;
  }

  /// Evaluate daily summary and trigger notification if criteria met and cooldown passed
  Future<bool> evaluateAndNotify(HealthDailySummary summary, [DateTime? currentTime]) async {
    final prefs = await SharedPreferences.getInstance();
    final now = currentTime ?? DateTime.now();
    final todayStr = summary.date;

    // Check 4-hour global cooldown
    final lastGlobal = prefs.getInt('jarvis_health_last_global_notify') ?? 0;
    if (now.millisecondsSinceEpoch - lastGlobal < 4 * 3600 * 1000) {
      return false;
    }

    // 1. Check UNUSUAL_BP (Systolic > 140 or Diastolic > 90) - Informational, strictly non-diagnostic
    if (summary.bloodPressure.available &&
        summary.bloodPressure.systolic != null &&
        summary.bloodPressure.diastolic != null) {
      final sys = summary.bloodPressure.systolic!;
      final dia = summary.bloodPressure.diastolic!;
      if (sys > 140 || dia > 90) {
        final lastBp = prefs.getInt('jarvis_health_last_bp_notify') ?? 0;
        if (now.millisecondsSinceEpoch - lastBp >= 4 * 3600 * 1000) {
          await _postNotification(
            id: 9801,
            title: 'JARVIS Health Reading',
            body: 'Your latest blood-pressure reading is $sys/$dia mmHg.',
          );
          await prefs.setInt('jarvis_health_last_bp_notify', now.millisecondsSinceEpoch);
          await prefs.setInt('jarvis_health_last_global_notify', now.millisecondsSinceEpoch);
          return true;
        }
      }
    }

    // 2. Check HIGH_HEART_RATE (> 120 BPM) - Informational, non-diagnostic
    if (summary.heartRate.available && summary.heartRate.latestBpm != null) {
      final bpm = summary.heartRate.latestBpm!;
      if (bpm > 120) {
        final lastHr = prefs.getInt('jarvis_health_last_hr_notify') ?? 0;
        if (now.millisecondsSinceEpoch - lastHr >= 4 * 3600 * 1000) {
          await _postNotification(
            id: 9802,
            title: 'JARVIS Health Reading',
            body: 'Your latest heart-rate reading is $bpm BPM.',
          );
          await prefs.setInt('jarvis_health_last_hr_notify', now.millisecondsSinceEpoch);
          await prefs.setInt('jarvis_health_last_global_notify', now.millisecondsSinceEpoch);
          return true;
        }
      }
    }

    // 3. Check LOW_SLEEP (Once per day, evaluated in morning)
    if (summary.sleep.available && summary.sleep.totalMinutes != null && now.hour >= 6 && now.hour <= 12) {
      final sleepMins = summary.sleep.totalMinutes!;
      final targetMins = summary.goals.sleepGoalMinutes;
      if (sleepMins < targetMins - 60) {
        final lastSleepDate = prefs.getString('jarvis_health_last_sleep_date') ?? '';
        if (lastSleepDate != todayStr) {
          final hours = sleepMins ~/ 60;
          final mins = sleepMins % 60;
          await _postNotification(
            id: 9803,
            title: 'JARVIS Sleep Insight',
            body: 'You recorded ${hours}h ${mins}m of sleep last night, below your configured ${targetMins ~/ 60}-hour goal.',
          );
          await prefs.setString('jarvis_health_last_sleep_date', todayStr);
          await prefs.setInt('jarvis_health_last_global_notify', now.millisecondsSinceEpoch);
          return true;
        }
      }
    }

    // 4. Check LOW_ACTIVITY (Once per day, evaluated late in day after 6 PM)
    if (summary.steps.available && summary.steps.count != null && now.hour >= 18) {
      final count = summary.steps.count!;
      final goal = summary.goals.stepsGoal;
      if (count < goal * 0.5) {
        final lastActivityDate = prefs.getString('jarvis_health_last_activity_date') ?? '';
        if (lastActivityDate != todayStr) {
          final diff = goal - count;
          await _postNotification(
            id: 9804,
            title: 'JARVIS Activity Insight',
            body: "You've recorded $count steps today. You're $diff steps from your goal.",
          );
          await prefs.setString('jarvis_health_last_activity_date', todayStr);
          await prefs.setInt('jarvis_health_last_global_notify', now.millisecondsSinceEpoch);
          return true;
        }
      }
    }

    return false;
  }

  Future<void> _postNotification({
    required int id,
    required String title,
    required String body,
  }) async {
    try {
      await init();
      final androidDetails = AndroidNotificationDetails(
        channelId,
        channelName,
        channelDescription: channelDescription,
        importance: Importance.high,
        priority: Priority.high,
        showWhen: true,
      );
      final details = NotificationDetails(android: androidDetails);
      await _notifications.show(id, title, body, details);
    } catch (e) {
      debugPrint('[ProactiveHealthNotifier] Error posting notification: $e');
    }
  }
}
