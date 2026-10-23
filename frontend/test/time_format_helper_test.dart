import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/core/utils/time_format_helper.dart';

void main() {
  group('TimeFormatHelper Robustness & Presentation Invariance', () {
    test('Correctly parses and formats 12:00 AM to 00:00 and 12:00 AM', () {
      final parsed = TimeFormatHelper.parseToHourMinute('12:00 AM');
      expect(parsed, isNotNull);
      expect(parsed!.$1, equals(0));
      expect(parsed.$2, equals(0));
      expect(TimeFormatHelper.formatTo24H('12:00 AM'), equals('00:00'));
      expect(TimeFormatHelper.formatTo12H('12:00 AM'), equals('12:00 AM'));
    });

    test('Correctly parses and formats 12:30 AM to 00:30 and 12:30 AM', () {
      final parsed = TimeFormatHelper.parseToHourMinute('12:30 AM');
      expect(parsed, isNotNull);
      expect(parsed!.$1, equals(0));
      expect(parsed.$2, equals(30));
      expect(TimeFormatHelper.formatTo24H('12:30 AM'), equals('00:30'));
      expect(TimeFormatHelper.formatTo12H('12:30 AM'), equals('12:30 AM'));
    });

    test('Correctly parses and formats 12:00 PM to 12:00 and 12:00 PM', () {
      final parsed = TimeFormatHelper.parseToHourMinute('12:00 PM');
      expect(parsed, isNotNull);
      expect(parsed!.$1, equals(12));
      expect(parsed.$2, equals(0));
      expect(TimeFormatHelper.formatTo24H('12:00 PM'), equals('12:00'));
      expect(TimeFormatHelper.formatTo12H('12:00 PM'), equals('12:00 PM'));
    });

    test('Correctly parses and formats 12:30 PM to 12:30 and 12:30 PM', () {
      final parsed = TimeFormatHelper.parseToHourMinute('12:30 PM');
      expect(parsed, isNotNull);
      expect(parsed!.$1, equals(12));
      expect(parsed.$2, equals(30));
      expect(TimeFormatHelper.formatTo24H('12:30 PM'), equals('12:30'));
      expect(TimeFormatHelper.formatTo12H('12:30 PM'), equals('12:30 PM'));
    });

    test('Correctly parses 8:00 PM and 8:00 pm to 20:00 and 8:00 PM', () {
      expect(TimeFormatHelper.formatTo24H('8:00 PM'), equals('20:00'));
      expect(TimeFormatHelper.formatTo24H('8:00 pm'), equals('20:00'));
      expect(TimeFormatHelper.formatTo12H('20:00'), equals('8:00 PM'));
    });

    test('Correctly parses 14:30 to 14:30 and 2:30 PM', () {
      expect(TimeFormatHelper.formatTo24H('14:30'), equals('14:30'));
      expect(TimeFormatHelper.formatTo12H('14:30'), equals('2:30 PM'));
      expect(TimeFormatHelper.formatTo24H('2:30 PM'), equals('14:30'));
      expect(TimeFormatHelper.formatTo12H('2:30 PM'), equals('2:30 PM'));
    });

    test('Presentation mode change does not mutate underlying time string', () {
      const canonicalTime = '20:30';
      final formatted12 = TimeFormatHelper.format(canonicalTime, is24Hour: false);
      final formatted24 = TimeFormatHelper.format(canonicalTime, is24Hour: true);

      expect(formatted12, equals('8:30 PM'));
      expect(formatted24, equals('20:30'));
      // Underlying variable remains unchanged
      expect(canonicalTime, equals('20:30'));
    });

    test('safeTimeParts splits correctly for both 12h and 24h presentation', () {
      final (digits12, period12) = TimeFormatHelper.safeTimeParts('20:00', is24Hour: false);
      expect(digits12, equals('8:00'));
      expect(period12, equals('PM'));

      final (digits24, period24) = TimeFormatHelper.safeTimeParts('8:00 PM', is24Hour: true);
      expect(digits24, equals('20:00'));
      expect(period24, equals(''));
    });
  });
}
