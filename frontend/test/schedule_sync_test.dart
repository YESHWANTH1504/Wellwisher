import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/schedule/repositories/schedule_repository.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/services/schedule_service.dart';
import 'package:wellwisher/services/api_client.dart';

class MockScheduleService extends ScheduleService {
  MockScheduleService() : super(apiClient: ApiClient());

  List<Map<String, dynamic>> mockData = [];

  @override
  Future<List<Map<String, dynamic>>> fetchSchedule(String dateStr) async {
    return mockData;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('JARVIS & Schedule Tab Perfect Sync Tests', () {
    test('1. JarvisExecutionStep parses data from either data or result key', () {
      final stepWithData = JarvisExecutionStep.fromJson({
        'toolName': 'calendar_create_event',
        'status': 'COMPLETED',
        'data': {
          'eventId': 'ev_123',
          'title': 'Dentist Appointment',
          'time': '3:00 PM',
          'date': '2026-09-16'
        }
      });
      expect(stepWithData.data['title'], equals('Dentist Appointment'));
      expect(stepWithData.data['eventId'], equals('ev_123'));

      final stepWithResult = JarvisExecutionStep.fromJson({
        'toolName': 'calendar_create_event',
        'status': 'COMPLETED',
        'result': {
          'eventId': 'ev_456',
          'title': 'Team Sync',
          'time': '4:00 PM',
          'date': '2026-09-16'
        }
      });
      expect(stepWithResult.data['title'], equals('Team Sync'));
      expect(stepWithResult.data['eventId'], equals('ev_456'));
    });

    test('2. ScheduleRepository does not filter out MySQL routines containing "_w"', () async {
      final mockService = MockScheduleService();
      final repo = ScheduleRepository(scheduleService: mockService);

      mockService.mockData = [
        {
          'id': 'inst_tmpl_1_wk_0700_wakeup_2026-09-16',
          'title': 'Wake Up',
          'description': 'Wake Up',
          'time': '7:00 AM',
          'date': '2026-09-16',
          'category': 'sleep',
          'status': 'scheduled',
          'reminderEnabled': true
        },
        {
          'id': 'inst_tmpl_1_wk_0900_breakfast_2026-09-16',
          'title': 'Breakfast',
          'description': 'Breakfast',
          'time': '9:00 AM',
          'date': '2026-09-16',
          'category': 'meal',
          'status': 'scheduled',
          'reminderEnabled': true
        },
        {
          'id': 'ev_1789474049195_vpde',
          'title': 'Team Sync',
          'description': '',
          'time': '4:00 PM',
          'date': '2026-09-16',
          'category': 'task',
          'status': 'scheduled',
          'reminderEnabled': true
        }
      ];

      // Test with Senior Mode enabled
      final itemsSenior = await repo.getScheduleForDate(
        DateTime(2026, 9, 16),
        isSeniorMode: true,
        forceRefresh: true,
      );

      // All 3 items should be retained, not discarded!
      expect(itemsSenior.length, equals(3));
      expect(itemsSenior.any((i) => i.id == 'inst_tmpl_1_wk_0700_wakeup_2026-09-16'), isTrue);
      expect(itemsSenior.any((i) => i.id == 'inst_tmpl_1_wk_0900_breakfast_2026-09-16'), isTrue);
      expect(itemsSenior.any((i) => i.id == 'ev_1789474049195_vpde'), isTrue);

      // Test with Worker Mode enabled
      final itemsWorker = await repo.getScheduleForDate(
        DateTime(2026, 9, 16),
        isSeniorMode: false,
        forceRefresh: true,
      );

      expect(itemsWorker.length, equals(3));
      expect(itemsWorker.any((i) => i.id == 'inst_tmpl_1_wk_0700_wakeup_2026-09-16'), isTrue);
    });

    test('3. Only local fallback template IDs are isolated by role mode', () async {
      final mockService = MockScheduleService();
      final repo = ScheduleRepository(scheduleService: mockService);
      mockService.mockData = []; // Remote returns nothing

      final seniorItems = await repo.getScheduleForDate(
        DateTime(2026, 9, 20),
        isSeniorMode: true,
        forceRefresh: true,
      );

      // Should generate senior default routines
      expect(seniorItems.every((i) => i.id.startsWith('senior_') || i.id.endsWith('_s')), isTrue);
    });
  });
}
