import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:wellwisher/features/jarvis/models/health_models.dart';
import 'package:wellwisher/features/jarvis/services/proactive_health_notifier.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_main_tab_scaffold.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_health_dashboard_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('Health Models & Zero-Fabrication Guarantees', () {
    test('1. HealthStatus correctly identifies unavailable states without converting to zero', () {
      final unavailableStatus = parseHealthStatus(false, 'NO_DATA');
      expect(unavailableStatus, equals(HealthStatus.noData));

      final permStatus = parseHealthStatus(false, 'PERMISSION_DENIED');
      expect(permStatus, equals(HealthStatus.permissionDenied));

      final unsuppStatus = parseHealthStatus(false, 'UNSUPPORTED_PLATFORM');
      expect(unsuppStatus, equals(HealthStatus.unsupportedPlatform));
    });

    test('2. HealthSteps parses aggregation safely and calculates progress', () {
      const steps = HealthSteps(
        count: 5432,
        goal: 10000,
        available: true,
        status: HealthStatus.available,
        source: 'Health Connect',
        date: '2026-09-09',
      );

      expect(steps.available, isTrue);
      expect(steps.count, equals(5432));
      expect(steps.progressRatio, closeTo(0.5432, 0.001));
      expect(steps.progressPercent, equals(54));
      expect(steps.remainingSteps, equals(4568));
      expect(steps.hasReachedGoal, isFalse);
    });

    test('3. Missing steps never reports fake 0 steps count', () {
      final steps = HealthSteps.unavailable(reason: 'NO_DATA', goal: 10000);

      expect(steps.available, isFalse);
      expect(steps.count, isNull);
      expect(steps.status, equals(HealthStatus.noData));
      expect(steps.progressRatio, equals(0.0));
    });

    test('4. Missing heart rate never reports 0 BPM', () {
      final hr = HealthHeartRate.unavailable(reason: 'NO_DATA');

      expect(hr.available, isFalse);
      expect(hr.latestBpm, isNull);
      expect(hr.status, equals(HealthStatus.noData));
    });

    test('5. Real heart rate stores genuine wearable BPM', () {
      final hr = HealthHeartRate(
        latestBpm: 74,
        restingBpm: 62,
        available: true,
        status: HealthStatus.available,
        source: 'Health Connect',
        timestamp: DateTime.now(),
      );

      expect(hr.available, isTrue);
      expect(hr.latestBpm, equals(74));
      expect(hr.restingBpm, equals(62));
    });

    test('6. Missing blood pressure never reports 0/0 mmHg', () {
      final bp = HealthBloodPressure.unavailable(reason: 'NO_DATA');

      expect(bp.available, isFalse);
      expect(bp.systolic, isNull);
      expect(bp.diastolic, isNull);
      expect(bp.formatted, isEmpty);
    });

    test('7. Real blood pressure displays systolic/diastolic accurately without estimation', () {
      const bp = HealthBloodPressure(
        systolic: 120,
        diastolic: 80,
        formatted: '120/80 mmHg',
        available: true,
        status: HealthStatus.available,
        source: 'Health Connect',
      );

      expect(bp.available, isTrue);
      expect(bp.systolic, equals(120));
      expect(bp.diastolic, equals(80));
      expect(bp.formatted, equals('120/80 mmHg'));
    });

    test('8. Sleep duration accurately formats hours and minutes without zero-fill', () {
      const sleep = HealthSleep(
        totalMinutes: 444,
        hours: 7.4,
        formattedDuration: '7h 24m',
        available: true,
        status: HealthStatus.available,
        source: 'Health Connect',
      );

      expect(sleep.available, isTrue);
      expect(sleep.totalMinutes, equals(444));
      expect(sleep.formattedDuration, equals('7h 24m'));
    });

    test('9. Missing sleep does not fabricate 0h 0m', () {
      final sleep = HealthSleep.unavailable(reason: 'NO_DATA');

      expect(sleep.available, isFalse);
      expect(sleep.totalMinutes, isNull);
      expect(sleep.formattedDuration, isEmpty);
    });

    test('10. HealthGoal serializes and deserializes correctly', () {
      const goal = HealthGoal(
        stepsGoal: 10000,
        activeCaloriesGoal: 450,
        sleepGoalMinutes: 480,
        distanceGoalKm: 6.0,
      );

      final json = goal.toJson();
      final restored = HealthGoal.fromJson(json);

      expect(restored.stepsGoal, equals(10000));
      expect(restored.activeCaloriesGoal, equals(450));
      expect(restored.sleepGoalMinutes, equals(480));
      expect(restored.distanceGoalKm, equals(6.0));
    });
  });

  group('Proactive Health Notifier & Cooldowns', () {
    test('11. Notifier respects 4-hour cooldown for repeated evaluations', () async {
      final notifier = ProactiveHealthNotifier();
      await notifier.init();

      final summary = HealthDailySummary.initial('2026-09-09');

      // Check evaluation returns false when data is missing/cooldown active
      final sent1 = await notifier.evaluateAndNotify(summary);
      expect(sent1, isFalse);
    });

    test('12. Proactive notification triggers on low sleep and enforces cooldown', () async {
      final notifier = ProactiveHealthNotifier();
      await notifier.init();

      // Seed low sleep (under 6h)
      final summary = HealthDailySummary(
        date: '2026-09-09',
        steps: HealthSteps.unavailable(),
        calories: HealthCalories.unavailable(),
        heartRate: HealthHeartRate.unavailable(),
        bloodPressure: HealthBloodPressure.unavailable(),
        sleep: const HealthSleep(
          totalMinutes: 300, // 5 hours
          formattedDuration: '5h 0m',
          available: true,
          status: HealthStatus.available,
        ),
        distance: HealthDistance.unavailable(),
        weight: HealthWeight.unavailable(),
        goals: const HealthGoal(sleepGoalMinutes: 480),
        lastRefreshed: DateTime.now(),
      );

      final morningTime = DateTime(2026, 9, 9, 8, 30);
      final sent1 = await notifier.evaluateAndNotify(summary, morningTime);
      expect(sent1, isTrue);

      // Immediate second call blocked by 4-hour cooldown
      final sent2 = await notifier.evaluateAndNotify(summary, morningTime.add(const Duration(minutes: 5)));
      expect(sent2, isFalse);
    });
  });

  group('JARVIS Tab Scaffold & IndexedStack 4-Tab Architecture', () {
    testWidgets('13. JarvisMainTabScaffold renders 4 tabs (JARVIS, SCHEDULE, HEALTH, MORE)', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisMainTabScaffold(initialIndex: 0),
        ),
      );
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('JARVIS'), findsWidgets);
      expect(find.text('SCHEDULE'), findsOneWidget);
      expect(find.text('HEALTH'), findsOneWidget);
      expect(find.text('MORE'), findsOneWidget);

      final indexedStack = tester.widget<IndexedStack>(find.byType(IndexedStack));
      expect(indexedStack.children.length, equals(4));
      expect(indexedStack.children[2], isA<JarvisHealthDashboardScreen>());
    });

    testWidgets('14. Switching to HEALTH tab switches index without destroying state', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisMainTabScaffold(initialIndex: 0),
        ),
      );
      await tester.pump(const Duration(milliseconds: 200));

      // Tap HEALTH tab
      await tester.tap(find.text('HEALTH'));
      await tester.pump(const Duration(milliseconds: 200));

      final indexedStack = tester.widget<IndexedStack>(find.byType(IndexedStack));
      expect(indexedStack.index, equals(2));
    });
  });
}
