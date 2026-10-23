import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:wellwisher/features/jarvis/services/jarvis_tts_service.dart';
import 'package:wellwisher/features/jarvis/models/jarvis_models.dart';
import 'package:wellwisher/features/jarvis/controller/jarvis_home_controller.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_main_tab_scaffold.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('JARVIS IndexedStack & Tab Architecture Regression', () {
    test('1. TTS Sanitizer eliminates all Markdown asterisks, backticks, hashes, and formatting', () {
      final cases = [
        ('**Bold text** and *italic note*', 'Bold text and italic note'),
        ('Schedule: * Meeting at 4:00 PM\n* Dinner at 8:00 PM', 'Schedule: Meeting at 4:00 PM. Dinner at 8:00 PM.'),
        ('`code_variable` with snake_case and [Link Text](https://url.com)', 'code_variable with snake_case and Link Text'),
        ('# Heading 1\n## Subheading\nDetails here', 'Heading 1. Subheading. Details here.'),
        ('User profile user_id_123 has 8,420 steps at 6:30 PM.', 'User profile user_id_123 has 8,420 steps at 6:30 PM.'),
      ];

      for (final (input, expected) in cases) {
        final sanitized = JarvisTtsService.sanitizeForSpeech(input);
        expect(sanitized.contains('*'), isFalse, reason: 'Must not contain asterisks: $sanitized');
        expect(sanitized.contains('#'), isFalse, reason: 'Must not contain hashes: $sanitized');
        expect(sanitized.contains('`'), isFalse, reason: 'Must not contain backticks: $sanitized');
        expect(sanitized.contains('astric'), isFalse, reason: 'Must not contain astric: $sanitized');
        expect(sanitized.contains('asterisk'), isFalse, reason: 'Must not contain asterisk: $sanitized');
        expect(sanitized.contains('star'), isFalse, reason: 'Must not contain star: $sanitized');
        expect(sanitized, equals(expected));
      }
    });

    test('2. Single shared JarvisHomeController starts sleeping and handles voice state without duplication', () {
      final controller = JarvisHomeController();

      // System starts in sleeping state as required by voice-first OS
      expect(controller.currentState, equals(JarvisState.sleeping));
      expect(controller.messages.isNotEmpty, isTrue);

      // Record context event
      controller.recordScheduleChanged(
        action: 'RESCHEDULED',
        scheduleId: '42',
        title: 'Meeting with Arun',
        previousTime: '16:00',
        newTime: '18:30',
        date: '2026-09-09',
      );

      // Context event is recorded in memory transcript
      expect(controller.messages.any((m) => m.text.contains('Meeting with Arun')), isTrue);
      controller.dispose();
    });

    testWidgets('3. JarvisMainTabScaffold uses IndexedStack to preserve child screen states', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisMainTabScaffold(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 200));

      // Verify IndexedStack exists in widget tree
      final indexedStackFinder = find.byType(IndexedStack);
      expect(indexedStackFinder, findsOneWidget);

      final IndexedStack indexedStack = tester.widget<IndexedStack>(indexedStackFinder);
      expect(indexedStack.index, equals(0), reason: 'Default tab must be JARVIS voice screen (index 0)');
      expect(indexedStack.children.length, equals(4), reason: 'Must contain JARVIS, SCHEDULE, HEALTH, and MORE children');

      // Tap tab 1 (SCHEDULE)
      final scheduleTabFinder = find.text('SCHEDULE');
      expect(scheduleTabFinder, findsOneWidget);
      await tester.tap(scheduleTabFinder);
      await tester.pump(const Duration(milliseconds: 200));

      // Verify index switched to 1 without destroying tab 0
      final IndexedStack updatedStack = tester.widget<IndexedStack>(indexedStackFinder);
      expect(updatedStack.index, equals(1));

      // Tap tab 2 (HEALTH)
      final healthTabFinder = find.text('HEALTH');
      expect(healthTabFinder, findsOneWidget);
      await tester.tap(healthTabFinder);
      await tester.pump(const Duration(milliseconds: 200));

      // Verify index switched to 2 (HEALTH)
      final IndexedStack healthStack = tester.widget<IndexedStack>(indexedStackFinder);
      expect(healthStack.index, equals(2));

      // Tap tab 3 (MORE)
      final moreTabFinder = find.text('MORE');
      expect(moreTabFinder, findsOneWidget);
      await tester.tap(moreTabFinder);
      await tester.pump(const Duration(milliseconds: 200));

      // Verify index switched to 3 (MORE)
      final IndexedStack moreStack = tester.widget<IndexedStack>(indexedStackFinder);
      expect(moreStack.index, equals(3));

      // Tap tab 0 (JARVIS)
      final jarvisTabFinder = find.text('JARVIS').first;
      await tester.tap(jarvisTabFinder);
      await tester.pump(const Duration(milliseconds: 200));

      // Verify index switched back to 0
      final IndexedStack revertedStack = tester.widget<IndexedStack>(indexedStackFinder);
      expect(revertedStack.index, equals(0));
    });
  });
}
