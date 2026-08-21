import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:wellwisher/features/health/widgets/hydration_tracker_widget.dart';
import 'package:wellwisher/services/app_service_locator.dart';
import 'package:wellwisher/services/hydration_service.dart';
import 'package:wellwisher/services/local_storage_service.dart';
import 'package:wellwisher/services/notification_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('HydrationService & Automated Tracking Tests', () {
    late LocalStorageService storage;
    late HydrationService hydrationService;

    setUp(() async {
      storage = LocalStorageService();
      storage.clear();
      hydrationService = HydrationService();
      hydrationService.resetDailyForTesting();
    });

    test('Defaults to 150ml cup portion and 2500ml daily target', () {
      expect(hydrationService.portionMl, equals(150));
      expect(hydrationService.goalMl, equals(2500));
      expect(hydrationService.dailyHydrationTotalMl, equals(0));
      expect(hydrationService.percentage, equals(0));
    });

    test('Logging 150ml increases total and percentage', () async {
      await hydrationService.logWater(150, playSound: false, checkGoal: false);

      expect(hydrationService.dailyHydrationTotalMl, equals(150));
      expect(hydrationService.percentage, equals(6)); // 150/2500 = 6%

      await hydrationService.logWater(150, playSound: false, checkGoal: false);
      expect(hydrationService.dailyHydrationTotalMl, equals(300));
      expect(hydrationService.percentage, equals(12));
    });

    test('Goal celebration is triggered when reaching 2500ml', () async {
      // Set to 2400ml
      hydrationService.resetDailyForTesting(2400);
      expect(storage.hydrationCelebratedDate, isNull);

      // Log 150ml to exceed 2500ml
      await hydrationService.logWater(150, playSound: false, checkGoal: true);

      expect(hydrationService.dailyHydrationTotalMl, equals(2550));
      expect(hydrationService.progressFraction, equals(1.0));
      expect(storage.hydrationCelebratedDate, isNotNull);
    });

    test('Custom portion size (e.g. 200ml, 250ml) is remembered', () {
      hydrationService.setPortionSize(250);
      expect(hydrationService.portionMl, equals(250));
      expect(storage.hydrationPortionMl, equals(250));

      hydrationService.setPortionSize(150);
      expect(hydrationService.portionMl, equals(150));
    });

    test('Notification bar complete action automatically logs 150ml water for hydration alert', () async {
      final locator = AppServiceLocator();
      await locator.init();

      final initialWater = hydrationService.dailyHydrationTotalMl;

      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotificationAction,
        id: 993001,
        actionId: 'action_complete',
        payload: 'hydration_30min_alert',
      );

      await NotificationService.handleActionResponse(response);

      expect(hydrationService.dailyHydrationTotalMl, equals(initialWater + 150));
    });

    testWidgets('HydrationTrackerWidget renders and updates with HydrationService', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: HydrationTrackerWidget(),
          ),
        ),
      );

      expect(find.text('Daily Hydration Tracker'), findsOneWidget);
      expect(find.text('+150ml (Cup)'), findsOneWidget);
      expect(find.text('+250ml (Glass)'), findsOneWidget);

      // Tap +150ml button
      await tester.tap(find.text('+150ml (Cup)'));
      await tester.pump();

      expect(hydrationService.dailyHydrationTotalMl, greaterThanOrEqualTo(150));
    });
  });
}
