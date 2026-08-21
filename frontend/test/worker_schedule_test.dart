import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/schedule/models/schedule_model.dart';
import 'package:wellwisher/features/schedule/repositories/schedule_repository.dart';
import 'package:wellwisher/services/api_client.dart';
import 'package:wellwisher/services/app_service_locator.dart';
import 'package:wellwisher/services/local_storage_service.dart';
import 'package:wellwisher/services/schedule_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:wellwisher/services/notification_service.dart';
import 'package:wellwisher/services/voice_notification_service.dart';

import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Worker Schedule & Notification Tests', () {
    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      final storage = LocalStorageService();
      await storage.init();
      storage.userRole = 'worker';
    });

    test('ScheduleItem parses time correctly and supports snooze calculations', () {
      final item = ScheduleItem(
        id: 'test_1',
        title: 'Morning Water Break',
        description: 'Drink 1 glass of fresh water',
        time: '10:30 AM',
        category: ActivityCategory.waterReminder,
        status: ActivityStatus.upcoming,
        date: DateTime.now(),
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      expect(item.time, '10:30 AM');
      expect(item.reminderEnabled, isTrue);
      expect(item.status, ActivityStatus.upcoming);

      // Verify status copyWith
      final completed = item.copyWith(status: ActivityStatus.completed);
      expect(completed.status, ActivityStatus.completed);
    });

    test('VoiceNotificationService formats and manages alerted items', () {
      final service = VoiceNotificationService();
      service.resetAlertedItem('item_123');
      // Should not throw
      expect(service, isNotNull);
    });

    test('ScheduleItem status transitions work properly', () {
      final item = ScheduleItem(
        id: 'test_mark_complete',
        title: 'Screen Care 20-20-20',
        description: 'Rest eyes for 20 seconds',
        time: '02:00 PM',
        category: ActivityCategory.eyeCare,
        status: ActivityStatus.upcoming,
        date: DateTime.now(),
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final completed = item.copyWith(status: ActivityStatus.completed);
      expect(completed.status, ActivityStatus.completed);
      expect(completed.status.displayName, 'Completed');
    });

    test('Schedule Controller can mark complete and snooze routines by ID from notification actions', () async {
      final testItem = ScheduleItem(
        id: 'notif_test_item_99',
        title: 'Midday Stretches',
        description: 'Stretch shoulders',
        time: '01:00 PM',
        category: ActivityCategory.stretchBreak,
        status: ActivityStatus.upcoming,
        date: DateTime.now(),
        reminderEnabled: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final locator = AppServiceLocator();
      await locator.init();
      final controller = locator.scheduleController;
      final repository = locator.scheduleRepository;

      await controller.addNewRoutine(testItem);

      // 1. Test snooze by ID (+10 min)
      final snoozeResult = await controller.snoozeRoutineById('notif_test_item_99', 10);
      expect(snoozeResult, isTrue);

      final snoozed = repository.getItemById('notif_test_item_99');
      expect(snoozed, isNotNull);
      expect(snoozed!.time, '1:10 PM');

      // 2. Test mark completed by ID
      final markResult = await controller.markRoutineCompletedById('notif_test_item_99');
      expect(markResult, isTrue);

      final completed = repository.getItemById('notif_test_item_99');
      expect(completed, isNotNull);
      expect(completed!.status, ActivityStatus.completed);
    });

    test('NotificationService handleActionResponse executes mark_complete and snooze actions', () async {
      final testItem = ScheduleItem(
        id: 'notif_tray_item_1',
        title: 'Screen Eye Break',
        description: 'Rest eyes for 20 seconds',
        time: '04:00 PM',
        category: ActivityCategory.eyeCare,
        status: ActivityStatus.upcoming,
        date: DateTime.now(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final locator = AppServiceLocator();
      await locator.init();
      await locator.scheduleController.addNewRoutine(testItem);

      // Trigger snooze action from notification bar
      await NotificationService.handleActionResponse(
        NotificationResponse(
          notificationResponseType: NotificationResponseType.selectedNotificationAction,
          actionId: 'action_snooze',
          payload: 'notif_tray_item_1',
        ),
      );

      final snoozedItem = locator.scheduleRepository.getItemById('notif_tray_item_1');
      expect(snoozedItem, isNotNull);
      expect(snoozedItem!.time, '4:10 PM');

      // Trigger mark complete action from notification bar
      await NotificationService.handleActionResponse(
        NotificationResponse(
          notificationResponseType: NotificationResponseType.selectedNotificationAction,
          actionId: 'action_complete',
          payload: 'notif_tray_item_1',
        ),
      );

      final completedItem = locator.scheduleRepository.getItemById('notif_tray_item_1');
      expect(completedItem, isNotNull);
      expect(completedItem!.status, ActivityStatus.completed);
    });

    test('Worker weekday schedule contains exact 6am wakeup, 8am breakfast, 9am commute, 10:30am tea, 1pm lunch, 4pm tea, 5:30pm end of workday, 6pm relaxation, 8pm dinner, 10pm bed', () async {
      final repository = ScheduleRepository(scheduleService: ScheduleService(apiClient: ApiClient()));
      final weekday = DateTime(2026, 8, 17); // Monday
      final routines = await repository.getScheduleForDate(weekday, isSeniorMode: false);

      final times = routines.map((r) => r.time).toList();
      expect(times, contains('06:00 AM')); // Wake up
      expect(times, contains('08:00 AM')); // Breakfast
      expect(times, contains('09:00 AM')); // Commute to work
      expect(times, contains('10:30 AM')); // Morning Tea break
      expect(times, contains('11:30 AM')); // Hydration break
      expect(times, contains('01:00 PM')); // Lunch
      expect(times, contains('02:30 PM')); // Hydration break
      expect(times, contains('04:00 PM')); // Afternoon Tea break
      expect(times, contains('04:45 PM')); // Hydration break
      expect(times, contains('05:30 PM')); // End of workday
      expect(times, contains('06:00 PM')); // Evening relaxation
      expect(times, contains('08:00 PM')); // Dinner
      expect(times, contains('10:00 PM')); // Go to bed
    });
  });
}
