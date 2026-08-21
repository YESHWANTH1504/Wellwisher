import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/proactive_models.dart';
import 'package:wellwisher/features/jarvis/services/proactive_api_service.dart';
import 'package:wellwisher/features/jarvis/widgets/proactive_card.dart';
import 'package:wellwisher/features/jarvis/widgets/daily_briefing_card.dart';
import 'package:wellwisher/features/jarvis/widgets/upcoming_task_card.dart';
import 'package:wellwisher/features/jarvis/widgets/insight_card.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_settings_screen.dart';

class MockProactiveApiService extends ProactiveApiService {
  AiPreferenceModel prefs = AiPreferenceModel();

  @override
  Future<AiPreferenceModel> getPreferences() async => prefs;

  @override
  Future<AiPreferenceModel> updatePreferences(AiPreferenceModel newPrefs) async {
    prefs = newPrefs;
    return prefs;
  }
}

void main() {
  group('Phase 6 - Proactive Model Serialization Tests', () {
    test('1. Parses ProactiveEventModel from JSON', () {
      final json = {
        'id': 'pro_123',
        'event_type': 'UPCOMING_TASK',
        'priority': 'HIGH',
        'title': 'Meeting in 15 mins',
        'message': 'Standup starting soon.',
        'status': 'PENDING'
      };

      final model = ProactiveEventModel.fromJson(json);
      expect(model.id, 'pro_123');
      expect(model.eventType, 'UPCOMING_TASK');
      expect(model.priority, 'HIGH');
      expect(model.title, 'Meeting in 15 mins');
    });

    test('2. Parses DailyBriefingModel from JSON', () {
      final json = {
        'title': 'Morning Briefing — Thursday',
        'message': 'You have 5 tasks scheduled today.',
        'data': {'totalTasks': 5, 'completedCount': 1}
      };

      final model = DailyBriefingModel.fromJson(json);
      expect(model.title, 'Morning Briefing — Thursday');
      expect(model.data?['totalTasks'], 5);
    });

    test('3. Parses and serializes AiPreferenceModel', () {
      final model = AiPreferenceModel(
        proactiveAssistanceEnabled: true,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:30',
        notificationFrequency: 'HIGH',
      );

      final json = model.toJson();
      expect(json['quietHoursStart'], '23:00');
      expect(json['notificationFrequency'], 'HIGH');

      final fromJson = AiPreferenceModel.fromJson(json);
      expect(fromJson.quietHoursEnd, '06:30');
    });
  });

  group('Phase 6 - Proactive UI Widget Tests', () {
    testWidgets('1. ProactiveCard renders event details and dismiss action', (tester) async {
      bool dismissed = false;
      final event = ProactiveEventModel(
        id: 'ev_1',
        eventType: 'UPCOMING_TASK',
        priority: 'CRITICAL',
        title: 'Doctor Appointment',
        message: 'Departs in 20 minutes.',
        status: 'PENDING',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProactiveCard(
              event: event,
              onDismiss: () => dismissed = true,
            ),
          ),
        ),
      );

      expect(find.text('Doctor Appointment'), findsOneWidget);
      expect(find.text('CRITICAL'), findsOneWidget);

      await tester.tap(find.byIcon(Icons.close));
      expect(dismissed, true);
    });

    testWidgets('2. DailyBriefingCard renders summary and plan action', (tester) async {
      bool planTapped = false;
      final briefing = DailyBriefingModel(
        title: 'Morning Briefing — Friday',
        message: 'You have 4 tasks scheduled today.',
        data: {'totalTasks': 4, 'completedCount': 0},
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: DailyBriefingCard(
              briefing: briefing,
              onPlanDay: () => planTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Morning Briefing — Friday'), findsOneWidget);
      expect(find.text('4 Tasks Scheduled • 0 Completed'), findsOneWidget);

      await tester.tap(find.text('Plan My Day with JARVIS'));
      expect(planTapped, true);
    });

    testWidgets('3. UpcomingTaskCard renders time and buttons', (tester) async {
      bool viewTapped = false;
      bool rescheduleTapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: UpcomingTaskCard(
              title: 'Team Standup',
              time: '09:30 AM',
              minutesUntil: 25,
              onView: () => viewTapped = true,
              onReschedule: () => rescheduleTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Team Standup'), findsOneWidget);
      expect(find.text('Starts in 25 mins'), findsOneWidget);

      await tester.tap(find.text('View'));
      expect(viewTapped, true);

      await tester.tap(find.text('Reschedule'));
      expect(rescheduleTapped, true);
    });

    testWidgets('4. InsightCard renders message and action label', (tester) async {
      bool actionTapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: InsightCard(
              title: 'Hydration Pace',
              message: 'Logged 1,500 ml today.',
              actionLabel: 'Log Water',
              onAction: () => actionTapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Hydration Pace'), findsOneWidget);
      expect(find.text('Log Water'), findsOneWidget);

      await tester.tap(find.text('Log Water'));
      expect(actionTapped, true);
    });

    testWidgets('5. JarvisSettingsScreen renders toggles and allows saving', (tester) async {
      final mockApi = MockProactiveApiService();

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisSettingsScreen(apiService: mockApi),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('JARVIS Personalization & Control'), findsOneWidget);
      expect(find.text('Enable Proactive Assistant'), findsOneWidget);
      expect(find.text('Smart Reminders'), findsOneWidget);
      expect(find.text('Daily Morning Briefing'), findsOneWidget);
      expect(find.text('Quiet Hours'), findsOneWidget);

      await tester.tap(find.text('SAVE'));
      await tester.pump();
    });
  });
}
