import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_assistant_setup_screen.dart';
import 'package:wellwisher/services/jarvis_native_bridge.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 17: JARVIS True Standalone Assistant Flutter Tests', () {
    const channel = MethodChannel('com.example.wellwisher/jarvis_native');

    setUp(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (MethodCall methodCall) async {
          switch (methodCall.method) {
            case 'startAssistantService':
              return true;
            case 'stopAssistantService':
              return true;
            case 'isAssistantServiceRunning':
              return true;
            case 'isBatteryOptimizationIgnored':
              return true;
            case 'requestBatteryOptimizationExemption':
              return true;
            case 'openAssistantSettings':
              return true;
            case 'getDeviceCalendarEvents':
              return [
                {
                  'id': 'dev_cal_1',
                  'title': 'Dentist Checkup',
                  'dtStart': 1700000000000,
                  'dtEnd': 1700003600000,
                  'location': 'Clinic',
                  'description': 'Routine dental cleaning'
                }
              ];
            case 'createDeviceCalendarEvent':
              return true;
            default:
              return null;
          }
        },
      );
    });

    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(channel, null);
    });

    test('1. JarvisNativeBridge interacts with native Assistant service & battery methods', () async {
      final isRunning = await JarvisNativeBridge.isAssistantServiceRunning();
      expect(isRunning, isNotNull);

      final isIgnored = await JarvisNativeBridge.isBatteryOptimizationIgnored();
      expect(isIgnored, true);

      final startRes = await JarvisNativeBridge.startAssistantService();
      expect(startRes, isNotNull);
    });

    test('2. JarvisNativeBridge queries and creates device calendar events', () async {
      final events = await JarvisNativeBridge.getDeviceCalendarEvents('2026-08-26');
      expect(events, isA<List<Map<String, dynamic>>>());

      final created = await JarvisNativeBridge.createDeviceCalendarEvent(
        title: 'Board Meeting',
        startMillis: 1700000000000,
        endMillis: 1700003600000,
        location: 'Office Room 4',
      );
      expect(created, isNotNull);
    });

    testWidgets('3. JarvisAssistantSetupScreen renders checklist and interaction elements', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisAssistantSetupScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Assistant System Diagnostics'), findsOneWidget);
      expect(find.text('REAL-TIME OS DIAGNOSTICS (8 CHECKS)'), findsOneWidget);
      expect(find.text('1. Default System Assistant'), findsOneWidget);
      expect(find.text('2. Microphone Permission'), findsOneWidget);
      expect(find.text('3. Notification Permission'), findsOneWidget);
      expect(find.text('4. Device Calendar Provider'), findsOneWidget);
      expect(find.text('5. Background Assistant Service'), findsOneWidget);
      expect(find.text('6. Battery Optimization Exemption'), findsOneWidget);
      expect(find.text('7. Female Voice TTS Synthesis'), findsOneWidget);
      expect(find.text('8. Backend / Local Intelligence'), findsOneWidget);
    });
  });
}
