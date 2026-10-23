import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_assistant_setup_screen.dart';
import 'package:wellwisher/services/jarvis_native_bridge.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 19: JARVIS Real Android Device Acceptance Flutter Tests', () {
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
                  'id': 'device_cal_201',
                  'title': 'Strategy Sync with Arun',
                  'dtStart': 1700000000000,
                  'dtEnd': 1700003600000,
                  'location': 'Conference Room A',
                  'description': 'Product Roadmap'
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

    test('1. Native Bridge: Queries all 8 OS-level diagnostic and permission APIs', () async {
      expect(await JarvisNativeBridge.isDefaultAssistant(), true);
      expect(await JarvisNativeBridge.checkMicrophonePermission(), true);
      expect(await JarvisNativeBridge.checkNotificationPermission(), true);
      expect(await JarvisNativeBridge.checkCalendarPermission(), true);
      expect(await JarvisNativeBridge.isAssistantServiceRunning(), true);
      expect(await JarvisNativeBridge.isBatteryOptimizationIgnored(), true);
    });

    test('2. Calendar Provider: Executes native Read, Create, Update, and Delete operations', () async {
      final events = await JarvisNativeBridge.getDeviceCalendarEvents('2026-08-26');
      expect(events.length, 1);
      expect(events.first['title'], 'Strategy Sync with Arun');

      final created = await JarvisNativeBridge.createDeviceCalendarEvent(
        title: 'Strategy Sync with Arun',
        startMillis: 1700000000000,
        endMillis: 1700003600000,
      );
      expect(created, true);

      final updated = await JarvisNativeBridge.updateDeviceCalendarEvent(
        eventId: 'device_cal_201',
        title: 'Updated Strategy Sync',
      );
      expect(updated, true);

      final deleted = await JarvisNativeBridge.deleteDeviceCalendarEvent('device_cal_201');
      expect(deleted, true);
    });

    testWidgets('3. Setup Screen: Renders dynamic 8-check diagnostic dashboard and test commands', (tester) async {
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
    });
  });
}
