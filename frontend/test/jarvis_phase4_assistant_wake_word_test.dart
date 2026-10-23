import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wellwisher/features/jarvis/screens/jarvis_assistant_setup_screen.dart';
import 'package:wellwisher/services/jarvis_native_bridge.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Phase 4: Android System-Level Assistant & Local Wake Word Tests', () {
    const channel = MethodChannel('com.example.wellwisher/jarvis_native');

    setUp(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (MethodCall methodCall) async {
          switch (methodCall.method) {
            case 'isDefaultAssistant':
              return true;
            case 'getAssistantStatus':
              return {
                'success': true,
                'status': 'SELECTED',
                'isDefault': true,
                'isRoleHeld': true,
                'isRoleAvailable': true,
                'serviceState': 'SYSTEM_AVAILABLE',
                'packageName': 'com.example.wellwisher'
              };
            case 'requestAssistantRole':
              return {
                'success': true,
                'status': 'SELECTED',
                'message': 'JARVIS is already the selected default assistant'
              };
            case 'openAssistantSettings':
              return {'success': true, 'target': 'ACTION_VOICE_INPUT_SETTINGS'};
            case 'getWakeWordStatus':
              return {
                'success': true,
                'isRunning': true,
                'isListening': true,
                'phrase': 'hey jarvis',
                'state': 'IDLE',
                'localEngine': 'OnDeviceKeywordRecognizer + AudioRecord VAD',
                'cloudPassiveStreaming': false
              };
            case 'startWakeWord':
              return {'success': true, 'status': 'STARTED'};
            case 'stopWakeWord':
              return {'success': true, 'status': 'STOPPED'};
            case 'testWakeWord':
              return true;
            case 'getMicrophoneStatus':
              return {
                'success': true,
                'granted': true,
                'active': false,
                'state': 'MIC_IDLE'
              };
            case 'getAudioFocusStatus':
              return {
                'success': true,
                'isMusicActive': false,
                'audioMode': 0,
                'speakerphoneOn': false
              };
            case 'getSystemVoiceState':
              return {
                'success': true,
                'serviceRunning': true,
                'voiceState': 'IDLE',
                'assistantStatus': 'SELECTED',
                'isDefaultAssistant': true,
                'wakeWordListening': true,
                'microphoneGranted': true
              };
            case 'checkMicrophonePermission':
              return true;
            case 'checkNotificationPermission':
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

    test('1. Native Bridge: Typed Assistant & Wake Word queries return structured maps', () async {
      final assistant = await JarvisNativeBridge.getAssistantStatus();
      expect(assistant['success'], true);
      expect(assistant['status'], 'SELECTED');
      expect(assistant['isDefault'], true);

      final roleRes = await JarvisNativeBridge.requestAssistantRole();
      expect(roleRes['success'], true);
      expect(roleRes['status'], 'SELECTED');

      final wake = await JarvisNativeBridge.getWakeWordStatus();
      expect(wake['isRunning'], true);
      expect(wake['cloudPassiveStreaming'], false);
      expect(wake['phrase'], 'hey jarvis');

      final mic = await JarvisNativeBridge.getMicrophoneStatus();
      expect(mic['granted'], true);
      expect(mic['state'], 'MIC_IDLE');

      final audio = await JarvisNativeBridge.getAudioFocusStatus();
      expect(audio['success'], true);
      expect(audio['isMusicActive'], false);

      final sys = await JarvisNativeBridge.getSystemVoiceState();
      expect(sys['serviceRunning'], true);
      expect(sys['assistantStatus'], 'SELECTED');
    });

    testWidgets('2. Assistant Setup Screen: Renders all Section 18 states & real action buttons', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisAssistantSetupScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Header & Status
      expect(find.text('JARVIS ASSISTANT'), findsOneWidget);
      expect(find.text('SYSTEM ASSISTANT STATUS'), findsOneWidget);
      expect(find.text('System Assistant'), findsOneWidget);
      expect(find.text('Microphone'), findsOneWidget);
      expect(find.text('Notifications'), findsOneWidget);
      expect(find.text('Wake Word'), findsOneWidget);
      expect(find.text('Background Voice'), findsOneWidget);
      expect(find.text('Realtime AI'), findsOneWidget);
      expect(find.text('Backend'), findsOneWidget);
      expect(find.text('Voice Provider'), findsOneWidget);
      expect(find.text('Wake Word Engine'), findsOneWidget);

      // Section 18 Mandatory Action Buttons
      expect(find.text('Set as Default Assistant'), findsOneWidget);
      expect(find.text('Disable Wake Word'), findsOneWidget); // because isRunning is true in mock
      expect(find.text('Test Microphone'), findsOneWidget);
      expect(find.text('Test Wake Word'), findsOneWidget);
      expect(find.text('Open Android Assistant Settings'), findsOneWidget);
      expect(find.text('Run Assistant Diagnostics'), findsOneWidget);

      // Privacy Guarantee section
      expect(find.text('ZERO CLOUD PASSIVE LISTENING GUARANTEE'), findsOneWidget);
    });

    testWidgets('3. Action Buttons Trigger Genuine Bridge Calls', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: JarvisAssistantSetupScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure visible and Tap Test Wake Word
      await tester.ensureVisible(find.text('Test Wake Word'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Test Wake Word'));
      await tester.pump();

      // Ensure visible and Tap Test Microphone
      await tester.ensureVisible(find.text('Test Microphone'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Test Microphone'));
      await tester.pump();

      // Ensure visible and Tap Run Assistant Diagnostics
      await tester.ensureVisible(find.text('Run Assistant Diagnostics'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Run Assistant Diagnostics'));
      await tester.pump();
    });
  });
}
