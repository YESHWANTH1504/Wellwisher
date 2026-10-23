import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';

void main() {
  group('JarvisTtsService.sanitizeForSpeech Unit Tests', () {
    test('1. Bold and italic markdown asterisks are eliminated completely', () {
      const input = '**Scheduled!** 🤝 **Meeting with Arun** at *4:00 PM*.';
      final output = JarvisTtsService.sanitizeForSpeech(input);

      expect(output.contains('*'), isFalse, reason: 'Must never contain asterisks');
      expect(output.contains('**'), isFalse);
      expect(output.contains('Scheduled!'), isTrue);
      expect(output.contains('Meeting with Arun at 4:00 PM.'), isTrue);
    });

    test('2. Markdown bullet lists are converted into natural spoken pauses', () {
      const input = '''Here is your schedule for today:
* Meeting with Arun
* Call Mom
* Workout''';
      final output = JarvisTtsService.sanitizeForSpeech(input);

      expect(output.contains('*'), isFalse);
      expect(output.contains('-'), isFalse);
      expect(output.contains('Meeting with Arun'), isTrue);
      expect(output.contains('Call Mom'), isTrue);
      expect(output.contains('Workout'), isTrue);
    });

    test('3. Exact User Specification Example 1: Scheduled! Meeting with Arun at 4:00 PM', () {
      const input = 'Scheduled! Meeting with Arun at 4:00 PM';
      final output = JarvisTtsService.sanitizeForSpeech(input);
      expect(output, equals('Scheduled! Meeting with Arun at 4:00 PM'));
    });

    test('4. Exact User Specification Example 2: Multiline bullet list to natural speech', () {
      const input = '''* Meeting with Arun

Call Mom
Workout''';
      final output = JarvisTtsService.sanitizeForSpeech(input);
      expect(output, equals('Meeting with Arun. Call Mom. Workout.'));
    });

    test('5. Exact User Specification Example 3: Markdown links [Label](url) -> Label', () {
      const input = '[Open Settings](https://example.com)';
      final output = JarvisTtsService.sanitizeForSpeech(input);
      expect(output, equals('Open Settings'));
    });

    test('6. Exact User Specification Example 4: Multiline schedule headers and items', () {
      const input = '''Today's Schedule
Meeting at 4:00 PM
Workout at 6:30 PM''';
      final output = JarvisTtsService.sanitizeForSpeech(input);
      expect(output, equals("Today's Schedule. Meeting at 4:00 PM. Workout at 6:30 PM."));
    });

    test('7. Strikethrough, headers, and code fences are cleaned', () {
      const input = '### Summary: Task is ~~cancelled~~ completed with `exit_code_0`.\n```json\n{"ok": true}\n```';
      final output = JarvisTtsService.sanitizeForSpeech(input);

      expect(output.contains('#'), isFalse);
      expect(output.contains('~'), isFalse);
      expect(output.contains('`'), isFalse);
      expect(output.contains('{'), isFalse);
      expect(output.contains('Summary: Task is cancelled completed with exit_code_0.'), isTrue);
    });

    test('8. Legitimate snake_case identifiers, times, numbers, and punctuation are preserved', () {
      const input = 'Variable file_name and snake_case_id: scheduled for 6:30 PM. Count: 8,420 steps, score: 3.14. Well-being intact? Yes!';
      final output = JarvisTtsService.sanitizeForSpeech(input);

      expect(output.contains('file_name'), isTrue, reason: 'snake_case identifiers must be preserved');
      expect(output.contains('snake_case_id'), isTrue);
      expect(output.contains('6:30 PM'), isTrue);
      expect(output.contains('8,420'), isTrue);
      expect(output.contains('3.14'), isTrue);
      expect(output.contains('Well-being'), isTrue);
      expect(output.contains('intact? Yes!'), isTrue);
    });

    test('9. Numbered list prefixes are converted to natural pauses', () {
      const input = '''1. Drink water
2. Take medication
3. Morning walk''';
      final output = JarvisTtsService.sanitizeForSpeech(input);

      expect(output.contains('1.'), isFalse);
      expect(output.contains('2.'), isFalse);
      expect(output.contains('Drink water. Take medication. Morning walk.'), isTrue);
    });

    test('10. Edge cases: empty string, whitespace only', () {
      expect(JarvisTtsService.sanitizeForSpeech(''), equals(''));
      expect(JarvisTtsService.sanitizeForSpeech('   '), equals(''));
      expect(JarvisTtsService.sanitizeForSpeech('***'), equals(''));
      expect(JarvisTtsService.sanitizeForSpeech('###'), equals(''));
    });
  });
}
