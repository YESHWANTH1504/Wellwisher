import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/schedule/models/schedule_model.dart';
import 'package:wellwisher/services/voice_schedule_parser.dart';

void main() {
  group('VoiceScheduleParser Tests', () {
    test('Parses "set me a remainder to go for a early morning walk at 6.00AM"', () {
      final baseDate = DateTime(2026, 8, 18);
      final result = VoiceScheduleParser.parse(
        'set me a remainder to go for a early morning walk at 6.00AM',
        fallbackDate: baseDate,
      );

      expect(result.time, equals('06:00 AM'));
      expect(result.category, equals(ActivityCategory.exercise));
      expect(result.title.toLowerCase(), contains('early morning walk'));
      expect(result.date.day, equals(18));
    });

    test('Parses "remind me to drink fresh water in 30 minutes"', () {
      final result = VoiceScheduleParser.parse(
        'remind me to drink fresh water in 30 minutes',
      );

      expect(result.category, equals(ActivityCategory.waterReminder));
      expect(result.title.toLowerCase(), contains('fresh water'));
    });

    test('Parses "schedule nutritious lunch at 1:30 PM tomorrow"', () {
      final baseDate = DateTime(2026, 8, 18);
      final result = VoiceScheduleParser.parse(
        'schedule nutritious lunch at 1:30 PM tomorrow',
        fallbackDate: baseDate,
      );

      expect(result.time, equals('01:30 PM'));
      expect(result.category, equals(ActivityCategory.meal));
      expect(result.title.toLowerCase(), contains('nutritious lunch'));
      expect(result.date.day, equals(19)); // Tomorrow
    });

    test('Parses "set a reminder for evening green tea at 4.30 pm"', () {
      final baseDate = DateTime(2026, 8, 18);
      final result = VoiceScheduleParser.parse(
        'set a reminder for evening green tea at 4.30 pm',
        fallbackDate: baseDate,
      );

      expect(result.time, equals('04:30 PM'));
      expect(result.title.toLowerCase(), contains('green tea'));
    });
    test('Parses "remind me at 1 pm for lunch"', () {
      final result = VoiceScheduleParser.parse('remind me at 1 pm for lunch');
      expect(result.time, equals('01:00 PM'));
      expect(result.category, equals(ActivityCategory.meal));
      expect(result.title.toLowerCase(), contains('lunch'));
    });

    test('Parses "take medicine at six in the evening"', () {
      final result = VoiceScheduleParser.parse('take medicine at six in the evening');
      expect(result.time, equals('06:00 PM'));
      expect(result.category, equals(ActivityCategory.medicine));
      expect(result.title.toLowerCase(), contains('medicine'));
    });

    test('Parses "wake up at 6 o\'clock"', () {
      final result = VoiceScheduleParser.parse("wake up at 6 o'clock");
      expect(result.time, equals('06:00 AM'));
      expect(result.category, equals(ActivityCategory.wakeUp));
    });
  });
}
