import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_assistant_setup_screen.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_settings_screen.dart';
import 'package:wellwisher/services/jarvis_native_bridge.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 25: JARVIS Autonomous Life Orchestrator Flutter Tests', () {
    const channel = MethodChannel('com.example.wellwisher/jarvis_native');

    setUp(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (MethodCall methodCall) async {
          switch (methodCall.method) {
            case 'isDefaultAssistant':
              return true;
            case 'checkMicrophonePermission':
              return true;
            case 'checkNotificationPermission':
              return true;
            case 'checkCalendarPermission':
              return true;
            case 'isAssistantServiceRunning':
              return true;
            case 'isBatteryOptimizationIgnored':
              return true;
            case 'getDeviceCalendarEvents':
              return [
                {
                  'id': 'p25_cal_event',
                  'title': 'Autonomous Life Orchestration Sync',
                  'dtStart': 1700000000000,
                  'dtEnd': 1700003600000,
                  'location': 'Bangalore HQ',
                  'description': 'Production Architecture'
                }
              ];
            case 'createDeviceCalendarEvent':
              return true;
            case 'updateDeviceCalendarEvent':
              return true;
            case 'deleteDeviceCalendarEvent':
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

    test('1. Native Bridge: Queries OS diagnostic state & manages Calendar CRUD', () async {
      expect(await JarvisNativeBridge.isDefaultAssistant(), true);
      expect(await JarvisNativeBridge.checkMicrophonePermission(), true);
      expect(await JarvisNativeBridge.checkNotificationPermission(), true);
      expect(await JarvisNativeBridge.checkCalendarPermission(), true);

      final events = await JarvisNativeBridge.getDeviceCalendarEvents('2026-08-26');
      expect(events.length, 1);
      expect(events.first['title'], 'Autonomous Life Orchestration Sync');
    });

    testWidgets('2. Setup Screen: Renders dynamic diagnostics and test commands', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisAssistantSetupScreen(),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Assistant System Diagnostics'), findsOneWidget);
      expect(find.text('REAL-TIME OS DIAGNOSTICS (8 CHECKS)'), findsOneWidget);
      expect(find.text('Run Diagnostics'), findsOneWidget);
    });

    testWidgets('3. Companion Settings: Renders personalization and voice parameters', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisSettingsScreen(),
        ),
      );
      await tester.pump();

      expect(find.text('JARVIS Personalization & Control'), findsOneWidget);
      expect(find.text('Neural Settings & Voice Parameters'), findsOneWidget);
    });
  });
}
