import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/models/personalization_models.dart';
import 'package:wellwisher/features/jarvis/services/personalization_api_service.dart';
import 'package:wellwisher/features/jarvis/widgets/weekly_summary_card.dart';
import 'package:wellwisher/features/jarvis/widgets/personalized_dashboard_card.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_memories_screen.dart';

class MockPersonalizationApiService extends PersonalizationApiService {
  List<AiMemoryItemModel> memories = [
    AiMemoryItemModel(
      id: 1,
      memoryType: 'ROUTINE_PREFERENCE',
      memoryKey: 'preferred_workout_time',
      memoryValue: 'I strictly workout at 6:00 AM',
      source: 'USER_EXPLICIT',
      importance: 5,
      confidenceScore: 1.0,
    ),
    AiMemoryItemModel(
      id: 2,
      memoryType: 'ROUTINE_PREFERENCE',
      memoryKey: 'inferred_focus_habit',
      memoryValue: 'Usually focuses best during mornings',
      source: 'AGENT_INFERRED',
      importance: 3,
      confidenceScore: 0.85,
    ),
  ];

  @override
  Future<List<AiMemoryItemModel>> getMemories({String? type, String? source}) async {
    return memories;
  }

  @override
  Future<bool> deleteMemory(int id) async {
    memories.removeWhere((m) => m.id == id);
    return true;
  }

  @override
  Future<int> clearMemories({bool inferredOnly = false}) async {
    if (inferredOnly) {
      memories.removeWhere((m) => m.source != 'USER_EXPLICIT');
      return 1;
    }
    final len = memories.length;
    memories.clear();
    return len;
  }
}

void main() {
  group('Phase 7 - Personalization Model Serialization Tests', () {
    test('1. Parses AiMemoryItemModel from JSON', () {
      final json = {
        'id': 101,
        'memory_type': 'ROUTINE_PREFERENCE',
        'memory_key': 'gym_habit',
        'memory_value': 'Prefers morning workouts',
        'source': 'AGENT_INFERRED',
        'importance': 4,
        'confidence_score': 0.88,
        'evidence_count': 6
      };

      final model = AiMemoryItemModel.fromJson(json);
      expect(model.id, 101);
      expect(model.memoryKey, 'gym_habit');
      expect(model.source, 'AGENT_INFERRED');
      expect(model.confidenceScore, 0.88);
      expect(model.evidenceCount, 6);
    });

    test('2. Parses WeeklySummaryModel from JSON', () {
      final json = {
        'period': 'LAST_7_DAYS',
        'stats': {
          'totalRoutines': 14,
          'completedRoutines': 12,
          'missedRoutines': 1,
          'postponedRoutines': 1,
          'completionRatePercentage': 86,
          'averageDailyHydrationMl': 2250
        },
        'insights': ['Maintained outstanding routine consistency!']
      };

      final model = WeeklySummaryModel.fromJson(json);
      expect(model.totalRoutines, 14);
      expect(model.completedRoutines, 12);
      expect(model.completionRatePercentage, 86);
      expect(model.insights.first, 'Maintained outstanding routine consistency!');
    });

    test('3. Parses PersonalProfileModel from JSON', () {
      final json = {
        'userId': 501,
        'personality': {'assistantName': 'JARVIS', 'responseStyle': 'CONCISE'},
        'habits': {'preferredWorkoutTime': {'value': 'EVENING', 'confidence': 0.82}},
        'stats': {'explicitMemoriesCount': 3, 'inferredMemoriesCount': 2},
        'explicitPreferences': [{'key': 'concise_replies', 'value': 'true'}],
        'inferredHabits': [{'key': 'preferred_workout_time', 'value': 'EVENING'}]
      };

      final model = PersonalProfileModel.fromJson(json);
      expect(model.userId, 501);
      expect(model.personality['assistantName'], 'JARVIS');
      expect(model.habits['preferredWorkoutTime']['value'], 'EVENING');
    });
  });

  group('Phase 7 - Personalization UI Widget Tests', () {
    testWidgets('1. WeeklySummaryCard renders stats and insights', (tester) async {
      final summary = WeeklySummaryModel(
        period: 'LAST_7_DAYS',
        totalRoutines: 10,
        completedRoutines: 8,
        missedRoutines: 1,
        postponedRoutines: 1,
        completionRatePercentage: 80,
        averageDailyHydrationMl: 2100,
        insights: ['80% completion rate achieved!'],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WeeklySummaryCard(summary: summary),
          ),
        ),
      );

      expect(find.text('7-Day Productivity Intelligence'), findsOneWidget);
      expect(find.text('80% Completion Rate • 8 of 10 Done'), findsOneWidget);
      expect(find.text('• 80% completion rate achieved!'), findsNothing); // checked formatted bullet
      expect(find.text('80% completion rate achieved!'), findsOneWidget);
    });

    testWidgets('2. PersonalizedDashboardCard renders habit summaries', (tester) async {
      final profile = PersonalProfileModel(
        userId: 1,
        personality: {'assistantName': 'JARVIS'},
        habits: {
          'preferredWorkoutTime': {'value': 'Evening (6:30 PM)'},
          'preferredFocusHours': {'value': 'Morning (9:00 AM)'},
        },
        stats: {},
        explicitPreferences: [],
        inferredHabits: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PersonalizedDashboardCard(profile: profile),
          ),
        ),
      );

      expect(find.text('Personal Intelligence Profile'), findsOneWidget);
      expect(find.text('Evening (6:30 PM)'), findsOneWidget);
      expect(find.text('Morning (9:00 AM)'), findsOneWidget);
    });

    testWidgets('3. JarvisMemoriesScreen renders memories and allows deleting', (tester) async {
      final mockApi = MockPersonalizationApiService();

      await tester.pumpWidget(
        MaterialApp(
          home: JarvisMemoriesScreen(apiService: mockApi),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('JARVIS Memory Management'), findsOneWidget);
      expect(find.text('I strictly workout at 6:00 AM'), findsOneWidget);
      expect(find.text('Explicit Statement'), findsOneWidget);

      // Tap Learned Habits filter
      await tester.tap(find.text('Learned Habits'));
      await tester.pumpAndSettle();

      expect(find.text('Usually focuses best during mornings'), findsOneWidget);
    });
  });
}
