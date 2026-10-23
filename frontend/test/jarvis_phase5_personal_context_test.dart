import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_context_screen.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_proactive_screen.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_context_api_service.dart';

class MockJarvisContextApiService extends JarvisContextApiService {
  final Map<String, dynamic>? mockSnapshot;
  final List<Map<String, dynamic>> mockMemories;
  final Map<String, dynamic>? mockBriefing;
  final List<Map<String, dynamic>> mockFeed;
  final List<Map<String, dynamic>> mockWorkflows;

  MockJarvisContextApiService({
    this.mockSnapshot,
    this.mockMemories = const [],
    this.mockBriefing,
    this.mockFeed = const [],
    this.mockWorkflows = const [],
  });

  @override
  Future<Map<String, dynamic>?> getContextSnapshot() async {
    return mockSnapshot ?? {
      'currentTime': '14:30',
      'currentDate': '2026-09-29',
      'timezone': 'Asia/Kolkata',
      'isQuietHours': false,
      'identity': {'userId': 1, 'name': 'Yeshwanth'},
      'upcomingSchedule': [
        {'id': 101, 'title': 'Design Review', 'time': '16:00', 'reminderEnabled': true}
      ],
      'activeTasks': [],
      'healthSummary': {
        'steps': {'status': 'NO_DATA', 'value': null},
        'heartRate': {'status': 'AVAILABLE', 'value': 72},
        'sleep': {'status': 'NO_DATA', 'value': null}
      },
      'deviceState': {
        'batteryLevel': 85,
        'screenState': 'ON',
        'network': 'WIFI'
      },
      'freshness': {
        'schedule': 'fresh',
        'health': 'no_data'
      }
    };
  }

  @override
  Future<List<Map<String, dynamic>>> getMemories() async {
    return mockMemories.isNotEmpty
        ? mockMemories
        : [
            {'id': 1, 'memory_key': 'time_format', 'memory_value': '24-hour', 'source': 'USER_EXPLICIT'}
          ];
  }

  @override
  Future<Map<String, dynamic>?> getMorningBriefing({bool force = false, bool respectQuietHours = true}) async {
    return mockBriefing ?? {
      'success': true,
      'alreadyDelivered': true,
      'deduplicationKey': 'morning_briefing_2026_09_29',
      'briefingText': 'Good morning Yeshwanth. You have 1 scheduled event today.'
    };
  }

  @override
  Future<List<Map<String, dynamic>>> getProactiveFeed() async {
    return mockFeed.isNotEmpty
        ? mockFeed
        : [
            {
              'id': 'ev_1',
              'title': 'Hydration Check',
              'message': 'Remember to drink water.',
              'event_type': 'HYDRATION_NUDGE',
              'priority': 'MEDIUM',
              'status': 'PENDING'
            }
          ];
  }

  @override
  Future<List<Map<String, dynamic>>> getWorkflows() async {
    return mockWorkflows.isNotEmpty
        ? mockWorkflows
        : [
            {
              'id': 1,
              'action_type': 'SCHEDULE_PREPARE',
              'entity_type': 'CALENDAR_EVENT',
              'status': 'PENDING',
              'requires_confirmation': true
            }
          ];
  }
}

void main() {
  group('Phase 5 Personal Context & Proactive Intelligence Widget Tests', () {
    testWidgets('JarvisContextScreen renders zero-fabrication NO DATA when health is unavailable', (tester) async {
      final mockService = MockJarvisContextApiService();

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisContextScreen(apiService: mockService),
        ),
      );

      await tester.pumpAndSettle();

      // Verify User Identity and Time
      expect(find.text('Welcome, Yeshwanth'), findsOneWidget);
      expect(find.textContaining('14:30'), findsOneWidget);

      // Verify Strict Zero Fabrication: steps should show 'NO DATA', not '0'
      expect(find.text('NO DATA'), findsNWidgets(2)); // steps and sleep
      expect(find.text('72 bpm'), findsOneWidget); // heartRate

      // Verify Schedule
      expect(find.text('Design Review'), findsOneWidget);
      expect(find.text('16:00'), findsOneWidget);

      // Drag down to reveal memory section
      await tester.drag(find.byType(ListView), const Offset(0, -600));
      await tester.pumpAndSettle();

      // Verify Memory
      expect(find.text('time_format'), findsOneWidget);
      expect(find.text('24-hour'), findsOneWidget);
    });

    testWidgets('JarvisProactiveScreen renders Morning Briefing with deduplication indicator', (tester) async {
      final mockService = MockJarvisContextApiService();

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisProactiveScreen(apiService: mockService),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Briefing Tab
      expect(find.text('DAILY MORNING BRIEFING'), findsOneWidget);
      expect(find.text('Play Briefing'), findsOneWidget);

      // Tap Play Briefing
      await tester.tap(find.text('Play Briefing'));
      await tester.pumpAndSettle();

      // Verify briefing text and deduplication warning
      expect(find.textContaining('Good morning Yeshwanth'), findsOneWidget);
      expect(find.textContaining('Already delivered today'), findsOneWidget);
    });
  });
}
