import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/schedule/models/schedule_model.dart';
import 'package:wellwisher/features/schedule/repositories/schedule_repository.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';
import 'package:wellwisher/services/schedule_service.dart';
import 'package:wellwisher/services/api_client.dart';
import 'package:wellwisher/core/utils/time_format_helper.dart';

class MockScheduleService extends ScheduleService {
  MockScheduleService() : super(apiClient: ApiClient());

  @override
  Future<List<Map<String, dynamic>>> fetchSchedule(String dateStr) async {
    return [];
  }

  @override
  Future<Map<String, dynamic>?> createScheduleItem(Map<String, dynamic> itemJson) async {
    return itemJson;
  }

  @override
  Future<Map<String, dynamic>?> updateScheduleItem(String id, Map<String, dynamic> itemJson) async {
    return itemJson;
  }

  @override
  Future<bool> deleteScheduleItem(String id) async {
    return true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('User Schedule Mutation & Voice Quality Verifications', () {
    late ScheduleRepository repository;
    late MockScheduleService mockService;

    setUp(() {
      mockService = MockScheduleService();
      repository = ScheduleRepository(scheduleService: mockService);
    });

    test('1. "add meeting at 4pm" adds routine and preserves canonical 04:00 PM time', () async {
      final now = DateTime.now();
      final formattedTime = TimeFormatHelper.formatTo12H('4pm');
      expect(formattedTime, equals('4:00 PM'));

      final parts = formattedTime.split(' ');
      final hm = parts[0].split(':');
      final paddedTime = '${hm[0].padLeft(2, '0')}:${hm[1].padLeft(2, '0')} ${parts[1]}';
      expect(paddedTime, equals('04:00 PM'));

      final meetingItem = ScheduleItem(
        id: 'test_meeting_4pm',
        title: '🤝 Meeting',
        description: 'Added by JARVIS',
        time: paddedTime,
        category: ActivityCategory.office,
        status: ActivityStatus.upcoming,
        date: now,
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      );

      await repository.addRoutine(meetingItem);

      // Verify item exists in repository
      final items = await repository.getScheduleForDate(now);
      final found = items.firstWhere((x) => x.id == 'test_meeting_4pm');
      expect(found.title, equals('🤝 Meeting'));
      expect(found.time, equals('04:00 PM'));

      // Ensure invalidateCache does NOT wipe the item!
      repository.invalidateCache(date: now);
      final itemsAfterInvalidate = await repository.getScheduleForDate(now);
      expect(itemsAfterInvalidate.any((x) => x.id == 'test_meeting_4pm'), isTrue);
    });

    test('2. "change the gentle garden walk to commute to work" successfully updates routine title', () async {
      final now = DateTime.now();
      final walkItem = ScheduleItem(
        id: 'senior_walk_test',
        title: '🚶 Gentle Garden Walk',
        description: '15-minute relaxed morning walk for fresh air.',
        time: '10:30 AM',
        category: ActivityCategory.exercise,
        status: ActivityStatus.upcoming,
        date: now,
        reminderEnabled: true,
        createdAt: now,
        updatedAt: now,
      );

      await repository.addRoutine(walkItem);

      // Update routine by query "gentle garden walk"
      final updated = await repository.updateRoutineByQuery(
        query: 'gentle garden walk',
        newTitle: '🚗 Commute to Work',
        targetDate: now,
      );

      expect(updated, isNotNull);
      expect(updated!.title, equals('🚗 Commute to Work'));
      expect(updated.id, equals('senior_walk_test'));

      // Verify in getScheduleForDate (with senior mode enabled)
      final items = await repository.getScheduleForDate(now, isSeniorMode: true);
      final found = items.firstWhere((x) => x.id == 'senior_walk_test');
      expect(found.title, equals('🚗 Commute to Work'));
    });

    test('3. Male voice keywords never match Google female voices (like en-us-x-sfg)', () {
      final femaleVoiceSample = 'en-us-x-sfg-local';
      final maleVoiceSample = 'en-us-x-iom-local';

      final femaleKeywords = [
        'female', 'woman', 'girl', 'siri', 'samantha', 'aria', 'jenny', 'zira',
        'karen', 'victoria', 'hazel', 'sfg', 'sfb', 'sfa', 'ioa', 'iof', 'tpf',
        '#female', '-female', 'f0', 'f1', 'f2', 'f3'
      ];
      final maleKeywords = [
        'male', 'man', 'boy', 'david', 'mark', 'george', 'guy', 'stefan',
        'rahul', 'richard', 'alex', 'daniel', 'oliver', 'james', 'brian', 'tom',
        'x-iom', 'x-iob', 'x-tpd', 'x-sfd', 'x-iol', 'x-cxx', 'x-ahp', 'x-rjs', 'x-fis',
        '#male', '-male', 'm0', 'm1', 'm2', 'm3'
      ];

      // Female voice must be identified as female and NEVER as male
      final isFemaleForSfg = femaleKeywords.any((k) => femaleVoiceSample.contains(k));
      final isMaleForSfg = !isFemaleForSfg && maleKeywords.any((k) => femaleVoiceSample.contains(k));
      expect(isFemaleForSfg, isTrue);
      expect(isMaleForSfg, isFalse);

      // Male voice must be identified as male and NOT as female
      final isFemaleForIom = femaleKeywords.any((k) => maleVoiceSample.contains(k));
      final isMaleForIom = !isFemaleForIom && maleKeywords.any((k) => maleVoiceSample.contains(k));
      expect(isFemaleForIom, isFalse);
      expect(isMaleForIom, isTrue);

      // Verify TTS service male pitch preset is tuned to authentic masculine baritone
      final tts = JarvisTtsService();
      tts.setGender(JarvisVoiceGender.male);
      expect(tts.pitch, lessThanOrEqualTo(0.72));
      expect(tts.pitch, greaterThanOrEqualTo(0.65));
    });
  });
}
