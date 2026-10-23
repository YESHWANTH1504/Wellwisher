import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_assistant_setup_screen.dart';
import 'package:wellwisher/services/jarvis_native_bridge.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 18: JARVIS True Personal Companion Flutter Tests', () {
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
            case 'startAssistantService':
              return true;
            case 'stopAssistantService':
              return true;
            case 'requestBatteryOptimizationExemption':
              return true;
            case 'openAssistantSettings':
              return true;
            case 'getDeviceCalendarEvents':
              return [
                {
                  'id': 'cal_event_101',
                  'title': 'Consultation with Arun',
                  'dtStart': 1700000000000,
                  'dtEnd': 1700003600000,
                  'location': 'Bangalore HQ',
                  'description': 'Strategy review'
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

    test('1. JarvisNativeBridge queries all 8 diagnostic status and permission checks', () async {
      final isDefault = await JarvisNativeBridge.isDefaultAssistant();
      expect(isDefault, true);

      final mic = await JarvisNativeBridge.checkMicrophonePermission();
      expect(mic, true);

      final notif = await JarvisNativeBridge.checkNotificationPermission();
      expect(notif, true);

      final cal = await JarvisNativeBridge.checkCalendarPermission();
      expect(cal, true);

      final service = await JarvisNativeBridge.isAssistantServiceRunning();
      expect(service, true);

      final battery = await JarvisNativeBridge.isBatteryOptimizationIgnored();
      expect(battery, true);
    });

    test('2. JarvisNativeBridge performs complete Calendar CRUD (Read, Create, Update, Delete)', () async {
      final events = await JarvisNativeBridge.getDeviceCalendarEvents('2026-08-26');
      expect(events.length, 1);
      expect(events.first['title'], 'Consultation with Arun');

      final created = await JarvisNativeBridge.createDeviceCalendarEvent(
        title: 'Project Standup',
        startMillis: 1700000000000,
        endMillis: 1700003600000,
      );
      expect(created, true);

      final updated = await JarvisNativeBridge.updateDeviceCalendarEvent(
        eventId: 'cal_event_101',
        title: 'Updated Consultation',
        startMillis: 1700007200000,
      );
      expect(updated, true);

      final deleted = await JarvisNativeBridge.deleteDeviceCalendarEvent('cal_event_101');
      expect(deleted, true);
    });

    testWidgets('3. JarvisAssistantSetupScreen renders all 8 real-time diagnostic indicators', (tester) async {
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
      expect(find.text('Run Diagnostics'), findsOneWidget);
      expect(find.byTooltip('Run Diagnostics'), findsOneWidget);
    });
  });
}
