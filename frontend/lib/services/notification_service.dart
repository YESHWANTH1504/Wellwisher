import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import '../features/schedule/models/schedule_model.dart';
import 'app_service_locator.dart';
import 'hydration_service.dart';
import 'sound_service.dart';
import 'voice_notification_service.dart';

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse notificationResponse) async {
  WidgetsFlutterBinding.ensureInitialized();
  await AppServiceLocator().init();
  await NotificationService.handleActionResponse(notificationResponse);
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    try {
      tz.initializeTimeZones();
    } catch (_) {}

    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    try {
      await _plugin.initialize(
        settings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          handleActionResponse(response);
        },
        onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
      );

      // Create explicit high-importance notification channel on Android
      final androidImplementation = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (androidImplementation != null) {
        const AndroidNotificationChannel channel = AndroidNotificationChannel(
          'wellwisher_routine_alerts_v3',
          'WellWisher Care & Routine Alerts',
          description: 'High-priority routine and medicine notifications with quick actions',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          showBadge: true,
          enableLights: true,
          audioAttributesUsage: AudioAttributesUsage.alarm,
        );
        await androidImplementation.createNotificationChannel(channel);
        await androidImplementation.requestNotificationsPermission();
        await androidImplementation.requestExactAlarmsPermission();
      }

      _initialized = true;
      if (kDebugMode) {
        print('✅ [NotificationService] Native background exact alarm notification service initialized with max priority channel');
      }
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ [NotificationService] Init error: $e');
      }
    }
  }

  /// Check if notifications are enabled by the Android OS
  Future<bool> areNotificationsEnabled() async {
    await init();
    try {
      final androidImplementation = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      final bool? enabled = await androidImplementation?.areNotificationsEnabled();
      return enabled ?? true;
    } catch (_) {
      return true;
    }
  }

  /// Request permissions actively
  Future<bool> requestPermissions() async {
    await init();
    try {
      final androidImplementation = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (androidImplementation != null) {
        final bool? granted = await androidImplementation.requestNotificationsPermission();
        await androidImplementation.requestExactAlarmsPermission();
        if (kDebugMode) {
          print('📲 [NotificationService] Notification permission granted: $granted');
        }
        return granted ?? false;
      }
    } catch (_) {}
    return true;
  }

  /// Process direct interactive actions from the notification bar (Mark Done or Snooze)
  static Future<void> handleActionResponse(NotificationResponse response) async {
    final actionId = response.actionId;
    final payload = response.payload;

    if (kDebugMode) {
      print('🔔 [Notification Action Clicked]: actionId=$actionId, payload=$payload');
    }

    // Cancel notification immediately from system bar upon action click
    if (payload != null && payload.isNotEmpty) {
      final numericId = payload.hashCode & 0x7FFFFFFF;
      try {
        await NotificationService()._plugin.cancel(numericId);
      } catch (_) {}
    }

    final locator = AppServiceLocator();
    await locator.init();
    final controller = locator.scheduleController;
    final hydrationService = locator.hydrationService;

    final isHydrationPayload = payload != null && (payload.contains('hydration') || payload.contains('water'));

    if (actionId == 'action_complete' || actionId == 'action_drink_water') {
      // 1. If it's a hydration alert or routine, automatically log portion (e.g. +150ml)
      ScheduleItem? matchedRoutine;
      if (payload != null && payload.isNotEmpty) {
        matchedRoutine = controller.repository.getItemById(payload);
      }

      final isHydrationItem = isHydrationPayload ||
          (matchedRoutine != null &&
              (matchedRoutine.category == ActivityCategory.waterReminder ||
                  matchedRoutine.title.toLowerCase().contains('hydration') ||
                  matchedRoutine.title.toLowerCase().contains('water')));

      if (isHydrationItem) {
        await hydrationService.logWater(
          hydrationService.portionMl,
          playSound: true,
          checkGoal: true,
          source: 'notification_bar',
        );
      } else {
        SoundService.playChime();
      }

      // 2. Mark routine completed in controller
      if (payload != null && payload.isNotEmpty) {
        await controller.markRoutineCompletedById(payload);
        VoiceNotificationService().resetAlertedItem(payload);
      }

      if (kDebugMode) {
        print('✅ [Notification Bar Action] Handled complete for $payload (isHydration: $isHydrationItem)');
      }
    } else if (actionId == 'action_snooze') {
      // Snooze for 10 minutes directly from notification bar
      if (payload == 'hydration_30min_alert') {
        // Schedule a 10-minute snooze reminder
        Timer(const Duration(minutes: 10), () {
          VoiceNotificationService().triggerWorkerHydrationNotification();
        });
        if (kDebugMode) {
          print('⏰ [Notification Bar Action] 30-min hydration break snoozed for 10 mins!');
        }
      } else if (payload != null && payload.isNotEmpty) {
        await controller.snoozeRoutineById(payload, 10);
        VoiceNotificationService().resetAlertedItem(payload);
        if (kDebugMode) {
          print('⏰ [Notification Bar Action] Routine $payload snoozed for 10 mins from notification bar!');
        }
      }
    }
  }

  /// Post a high-priority system status bar notification with direct Action Buttons (Heads-Up Pop-up)
  Future<void> showSystemNotification({
    required int id,
    required String title,
    required String body,
    String? payload,
    bool includeActions = true,
    bool? isHydration,
    int? portionMl,
  }) async {
    await init();

    // Ensure permissions are active
    final areEnabled = await areNotificationsEnabled();
    if (!areEnabled) {
      await requestPermissions();
    }

    final isHydrationNotif = isHydration == true ||
        (payload != null && (payload.contains('hydration') || payload.contains('water'))) ||
        title.toLowerCase().contains('hydration') ||
        title.toLowerCase().contains('water');

    final portion = portionMl ?? HydrationService().portionMl;

    final List<AndroidNotificationAction> actions = includeActions
        ? (isHydrationNotif
            ? [
                AndroidNotificationAction(
                  'action_complete',
                  '💧 +${portion}ml Drank',
                  showsUserInterface: false,
                  cancelNotification: true,
                ),
                const AndroidNotificationAction(
                  'action_snooze',
                  '🔴 Snooze (10m)',
                  showsUserInterface: false,
                  cancelNotification: true,
                ),
              ]
            : [
                const AndroidNotificationAction(
                  'action_complete',
                  '🟢 Mark Complete',
                  showsUserInterface: false,
                  cancelNotification: true,
                ),
                const AndroidNotificationAction(
                  'action_snooze',
                  '🔴 Snooze (10m)',
                  showsUserInterface: false,
                  cancelNotification: true,
                ),
              ])
        : [];

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'wellwisher_routine_alerts_v3',
      'WellWisher Care & Routine Alerts',
      channelDescription: 'High-priority routine and medicine notifications with quick actions',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
      visibility: NotificationVisibility.public,
      color: const Color(0xFF16A34A),
      ledColor: const Color(0xFF16A34A),
      enableLights: true,
      actions: actions,
      ticker: title,
      autoCancel: true,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      styleInformation: BigTextStyleInformation(
        body,
        contentTitle: title,
        summaryText: 'WellWisher Schedule',
        htmlFormatBigText: false,
        htmlFormatContentTitle: false,
      ),
    );

    final NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel: InterruptionLevel.timeSensitive,
      ),
    );

    try {
      await _plugin.show(id, title, body, details, payload: payload);
      if (kDebugMode) {
        print('📲 [Status Bar Notification Posted]: "$title" - "$body"');
      }
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ Notification post error with actions: $e, trying simple post fallback...');
      }
      try {
        // Fallback without action buttons in case OEM blocks notification action intents
        const simpleAndroid = AndroidNotificationDetails(
          'wellwisher_heads_up_channel',
          'WellWisher Care & Routine Alerts',
          importance: Importance.max,
          priority: Priority.max,
          playSound: true,
          enableVibration: true,
          visibility: NotificationVisibility.public,
          fullScreenIntent: true,
          category: AndroidNotificationCategory.alarm,
          audioAttributesUsage: AudioAttributesUsage.alarm,
          autoCancel: true,
        );
        await _plugin.show(
          id,
          title,
          body,
          const NotificationDetails(android: simpleAndroid),
          payload: payload,
        );
      } catch (e2) {
        if (kDebugMode) {
          print('⚠️ Notification fallback failed: $e2');
        }
      }
    }
  }

  /// Schedule an exact alarm notification that will pop up on the notification bar
  /// even when the app is closed, terminated, or the phone is in idle/sleep mode.
  Future<void> scheduleRoutineAlarm(ScheduleItem item) async {
    if (!item.reminderEnabled || item.status == ActivityStatus.completed || item.status == ActivityStatus.skipped) {
      return;
    }

    await init();
    final targetDateTime = _parseRoutineTimeToDateTime(item.date, item.time);
    if (targetDateTime == null) return;

    final now = DateTime.now();
    final durationUntilTarget = targetDateTime.difference(now);
    if (durationUntilTarget.isNegative || durationUntilTarget.inSeconds < 2) {
      return; // Already passed or immediate
    }

    final int numericId = item.id.hashCode & 0x7FFFFFFF;
    // Accurate duration-offset TZDateTime regardless of device timezone config
    final tzScheduledDate = tz.TZDateTime.now(tz.local).add(durationUntilTarget);

    final isHydrationItem = item.category == ActivityCategory.waterReminder ||
        item.title.toLowerCase().contains('hydration') ||
        item.title.toLowerCase().contains('water');

    final portion = HydrationService().portionMl;

    final List<AndroidNotificationAction> actions = [
      isHydrationItem
          ? AndroidNotificationAction(
              'action_complete',
              '💧 +${portion}ml Drank',
              showsUserInterface: false,
              cancelNotification: true,
            )
          : const AndroidNotificationAction(
              'action_complete',
              '🟢 Mark Complete',
              showsUserInterface: false,
              cancelNotification: true,
            ),
      const AndroidNotificationAction(
        'action_snooze',
        '🔴 Snooze (10m)',
        showsUserInterface: false,
        cancelNotification: true,
      ),
    ];

    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'wellwisher_routine_alerts_v3',
      'WellWisher Care & Routine Alerts',
      channelDescription: 'High-priority routine and medicine notifications with quick actions',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
      visibility: NotificationVisibility.public,
      color: const Color(0xFF16A34A),
      ledColor: const Color(0xFF16A34A),
      enableLights: true,
      actions: actions,
      ticker: item.title,
      autoCancel: true,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      styleInformation: BigTextStyleInformation(
        item.description.isNotEmpty ? item.description : 'Time for: ${item.title}',
        contentTitle: item.title,
        summaryText: 'WellWisher Schedule',
        htmlFormatBigText: false,
        htmlFormatContentTitle: false,
      ),
    );

    final NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel: InterruptionLevel.timeSensitive,
      ),
    );

    // Live In-Memory Timer backup for short durations (< 2 minutes)
    if (durationUntilTarget.inSeconds <= 120) {
      Timer(durationUntilTarget, () {
        showSystemNotification(
          id: numericId,
          title: item.title,
          body: item.description.isNotEmpty ? item.description : 'Time for: ${item.title}',
          payload: item.id,
          includeActions: item.requiresCompletionStatus,
        );
      });
    }

    try {
      await _plugin.zonedSchedule(
        numericId,
        item.title,
        item.description.isNotEmpty ? item.description : 'Time for: ${item.title}',
        tzScheduledDate,
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: item.id,
      );

      if (kDebugMode) {
        print('⏰ [Exact Background Alarm Scheduled]: "${item.title}" in ${durationUntilTarget.inSeconds}s at $tzScheduledDate (ID: $numericId)');
      }
    } catch (e) {
      if (kDebugMode) {
        print('⚠️ Exact alarm error, attempting fallback to inexact: $e');
      }
      try {
        await _plugin.zonedSchedule(
          numericId,
          item.title,
          item.description.isNotEmpty ? item.description : 'Time for: ${item.title}',
          tzScheduledDate,
          details,
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          payload: item.id,
        );
      } catch (e2) {
        if (kDebugMode) {
          print('⚠️ Inexact fallback error: $e2');
        }
      }
    }
  }

  /// Automatically schedules exact alarms for all upcoming routines in a list
  Future<void> scheduleAllUpcomingRoutines(List<ScheduleItem> routines) async {
    for (final routine in routines) {
      await scheduleRoutineAlarm(routine);
    }
  }

  DateTime? _parseRoutineTimeToDateTime(DateTime date, String timeStr) {
    try {
      final clean = timeStr.replaceAll(RegExp(r'[^\d:APMapm\s]'), '').trim();
      final parts = clean.split(' ');
      final hm = parts[0].split(':');
      int hour = int.parse(hm[0]);
      final int minute = int.parse(hm[1]);
      final isPm = parts.length > 1 && parts[1].toUpperCase() == 'PM';

      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour == 12) hour = 0;

      return DateTime(date.year, date.month, date.day, hour, minute);
    } catch (_) {
      return null;
    }
  }

  Future<void> scheduleNotification({
    required String id,
    required String title,
    required String body,
    required String time,
  }) async {
    final int numericId = id.hashCode & 0x7FFFFFFF;
    await showSystemNotification(
      id: numericId,
      title: title,
      body: body,
      payload: id,
    );
  }

  Future<void> cancelNotification(String id) async {
    final int numericId = id.hashCode & 0x7FFFFFFF;
    try {
      await _plugin.cancel(numericId);
    } catch (_) {}
  }

  Future<void> cancelAll() async {
    try {
      await _plugin.cancelAll();
    } catch (_) {}
  }
}
